#!/usr/bin/env node
/*
 * Screenshot regression harness for the material system.
 *
 * Why this exists: three real regressions in this project were invisible to
 * "looks fine" review —
 *
 *   - the header silently lost its brushed-metal material to a `background:`
 *     shorthand and rendered as a frosted pane;
 *   - dark-mode paper turned navy because a near-white texture was blended
 *     with `overlay` (and then again with `soft-light`) over #171d25;
 *   - page transitions never played because an ID rule stole the transition
 *     and `animationSelector` measured an element with `transition: none`.
 *
 * Each one changed pixels in a fixed state (dark home, dark article). So the
 * harness pins the states and compares pixels, instead of trusting the eye.
 *
 *   node scripts/visual-check.mjs --update    # write/refresh the baseline
 *   node scripts/visual-check.mjs             # compare against the baseline
 *
 * Screenshots go to design/screenshots/ (baseline is tracked; runs under
 * design/screenshots/local/ are git-ignored, see .gitignore). Baselines are
 * stored as lossless WebP — bit-identical to the PNG capture and about 40%
 * smaller, so the 4-page × 2-theme matrix costs ~3MB in the repo.
 *
 * Requires a Chrome build for CDP. Set CHROME_PATH if auto-detection fails.
 * Needs `pnpm build` first: this serves the real output from dist/, not the
 * dev server, because code splitting and minification change the cascade.
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const OUT_BASE = path.join(ROOT, "design/screenshots");
const PREFIX = "/flowli-blog";
const PORT = 4477;
const DEBUG_PORT = 9466;

/*
 * Differences below this are anti-aliasing noise / font rasterisation.
 *
 * 12 was too generous for a *material* check: it let a real colour drift
 * through. Measured on this site, a 4-value shift is already visible as a
 * different material tier, and identical re-runs still diff at exactly 0 on
 * every pixel, so the headroom is only protecting text edges.
 */
const PIXEL_TOLERANCE = 4;
/* Share of pixels allowed to exceed PIXEL_TOLERANCE before a state fails.
   Set to zero: text rasterisation is already inside the tolerance above, so
   any pixel that does exceed it is a genuine change. */
const STATE_BUDGET = 0;

const STATES = [
    { name: "home", path: "/" },
    { name: "article", path: "/posts/2026-11-15-skeuo-material-system/" },
    { name: "archive", path: "/archive/" },
    { name: "projects", path: "/projects/" },
];
const THEMES = ["light", "dark"];
const VIEWPORT = { width: 1440, height: 1000, deviceScaleFactor: 1 };

/*
 * The screenshot matrix pins one viewport because pixel diffs need
 * determinism. The wall-scroll slot, though, is the one thing that changes
 * meaningfully with width — it is the axis the old `24vw` got wrong — so the
 * scroll assertions are also run at the breakpoints where `sizes` switches.
 * These runs only execute assertions; nothing is captured, so they do not
 * need a baseline.
 */
const SCROLL_VIEWPORTS = [
    { width: 1280, height: 900, deviceScaleFactor: 1 },
    { width: 1440, height: 900, deviceScaleFactor: 2 },
    { width: 1920, height: 1080, deviceScaleFactor: 2 },
    { width: 2560, height: 1440, deviceScaleFactor: 2 },
    { width: 3840, height: 2160, deviceScaleFactor: 2 },
];

/*
 * Material assertions.
 *
 * Pixels catch regressions but not *why*; these pin the values that the two
 * fixed bugs got wrong, so a future edit that re-breaks one reports a sentence
 * instead of "5% of pixels changed".
 *
 * Each check runs in the page and returns a string when it fails, or null.
 */
const MATERIAL_CHECKS = [
    {
        name: "header is brushed metal, not frosted glass",
        // The rail must carry its material from skeuo-materials.css: a
        // background-image for the brush, and no backdrop blur.
        js: `(() => {
            const el = document.querySelector(".site-header");
            if (!el) return "no .site-header";
            const cs = getComputedStyle(el);
            if (cs.backdropFilter !== "none") return "backdrop-filter is " + cs.backdropFilter;
            if (cs.backgroundImage === "none") return "background-image is none (material lost)";
            return null;
        })()`,
    },
    {
        name: "dark paper keeps its stock value",
        // A near-white texture must not lift #171d25 into a navy panel. Both
        // `overlay` and `soft-light` did; only `multiply` leaves the value.
        only: ["dark"],
        js: `(() => {
            const el = document.querySelector(".featured-plate, #post-container, .card-base");
            if (!el) return "no paper surface";
            const cs = getComputedStyle(el);
            if (cs.backgroundBlendMode.includes("overlay") || cs.backgroundBlendMode.includes("soft-light"))
                return "texture blended with " + cs.backgroundBlendMode;
            const [r, g, b] = cs.backgroundColor.match(/\\d+/g).map(Number);
            /* #171d25 is itself a cool stock — b-r is 14 — so compare against
               the token rather than against neutral grey. A texture that lifts
               the paper shows up as a much larger gap (overlay gave b-r=27). */
            if (b - r > 20) return "paper reads blue: rgb(" + r + "," + g + "," + b + ")";
            return null;
        })()`,
    },
    {
        name: "page transition is declared on the element Swup measures",
            /* Runs with motion enabled: under `reduce` the transition is
           intentionally zero, so the assertion would be meaningless. */
        // @swup/astro uses [class*="transition-swup-"] as animationSelector; if
        // that element has no transition, Swup does not wait and the page
        // snaps instead of moving.
        js: `(() => {
            const el = document.querySelector("#swup-container");
            if (!el) return "no #swup-container";
            if (!el.className.includes("transition-swup-fade"))
                return "container lost its transition class";
            /* Read the transition as it would be during a visit. Swup toggles
               classes on <html>, not on the container, so this measurement is
               stable outside a visit; it is the class + rule pairing that has
               to survive, which is what broke before. */
            const cs = getComputedStyle(el);
            if (!cs.transitionProperty.includes("opacity")) return "transition: " + cs.transitionProperty;
            if (cs.transitionDuration.startsWith("0s")) return "transition duration is 0s";
            return null;
        })()`,
    },
    {
        name: "fixed wall scrolls are not trapped by an animated ancestor",
        // An animated `filter` on #content-wrapper made it a containing block
        // for position:fixed and the scrolls landed on the article text.
        js: `(() => {
            const art = document.querySelector(".wall-art");
            if (!art) return null;
            let el = art.parentElement;
            while (el && el !== document.body) {
                for (const pseudo of [null, "::before", "::after"]) {
                    const cs = getComputedStyle(el, pseudo);
                    if (cs.animationName !== "none" || cs.filter !== "none" || cs.transform !== "none") {
                        return "ancestor " + el.className.split(" ")[0] + " has " +
                            [cs.animationName !== "none" && "animation", cs.filter !== "none" && "filter", cs.transform !== "none" && "transform"]
                                .filter(Boolean).join("+");
                    }
                }
                el = el.parentElement;
            }
            return null;
        })()`,
    },
    {
        name: "reduced motion actually stops scroll-linked effects",
        reducedMotion: true,
        /*
         * The classic snippet, `animation-duration: 0.01ms`, does not stop a
         * scroll-driven animation: `animation-timeline: view()` ties progress
         * to scroll position, not to time, so the sheet kept dimming as the
         * page scrolled on a reduced-motion page (--sheet-catch measured 0.69
         * while the duration was already 1e-05s).
         *
         * Assert the end state rather than the declaration: nothing animating,
         * and the catch resting at full strength.
         */
        js: `(() => {
            if (!matchMedia("(prefers-reduced-motion: reduce)").matches) return "probe ran without reduce";
            const el = document.querySelector(".featured-plate, #post-container");
            if (!el) return null;
            const cs = getComputedStyle(el);
            if (cs.animationName !== "none") return "still animating: " + cs.animationName;
            const rest = cs.getPropertyValue("--sheet-catch").trim();
            if (rest !== "1") return "--sheet-catch is " + rest + ", should rest at 1";
            return null;
        })()`,
    },
    {
        name: "above-the-fold art is not deferred",
        /*
         * Both wall scrolls are visible at ≥1240px and are the heaviest images
         * on the page, so nothing may push their requests back.
         *
         * This used to assert `loading !== "lazy"`, on the theory that lazy
         * defers until layout is known. Measured, it does not: with
         * `fetchpriority="high"` the request starts immediately either way
         * (same bytes, same LCP), while `eager` costs a phone 53 KB for two
         * images that are `display:none` below 1240px. So the attribute alone
         * is the wrong thing to pin — what has to hold is that the image is
         * not deferred and not competing at low priority.
         */
        js: `(() => {
            const arts = [...document.querySelectorAll(".hanging-scroll__art img")];
            if (!arts.length) return null;
            const deferred = arts.filter((a) => a.loading === "lazy" && a.fetchPriority !== "high");
            if (deferred.length) {
                return deferred.length + " of " + arts.length + " wall images are lazy at default priority";
            }
            return null;
        })()`,
    },
    {
        name: "paper actually has tooth",
        /*
         * This is the check that would have caught the original bug years
         * earlier. The CSS claimed paper grain throughout; both soft-light and
         * overlay collapse near white (slope 0.016 at a 253/255 backdrop), so
         * the texture tile was there, the declaration was there, and the page
         * rendered a single flat value.
         *
         * Rather than assert an operator name (which is an implementation
         * detail), sample the rendered sheet and require that it is not flat.
         */
        js: `(() => {
            /*
             * Only surfaces that are *assigned* paper carry tooth; cards are
             * enamel by design (see skeuo-materials.css), so restricting the
             * selector to the two sheet surfaces is intentional, not a gap.
             */
            const el = document.querySelector(".featured-plate, #post-container");
            if (!el) return null;
            const cs = getComputedStyle(el);
            /* Two texture mechanisms exist: a tiled PNG on .scroll-edge and an
               inline SVG turbulence tile behind --grain. Both resolve to a
               url() layer; the data URI is percent-encoded, so matching on the
               file extension misses the second one entirely. */
            const layers = (cs.backgroundImage.match(/url\\(/g) || []).length;
            const hasTexture = layers > 0;
            if (!hasTexture) return "no texture layer on the paper";
            if (cs.backgroundBlendMode.split(",").every((m) => m.trim() === "normal"))
                return "texture layer blended as 'normal' — it will read as a photo, not tooth";
            return null;
        })()`,
    },
    {
        name: "forced-colours mode keeps surfaces distinguishable",
        /*
         * In forced-colours mode the UA replaces every author colour with the
         * system palette, and this site's whole design is colour-coded depth.
         * Measured before the fix: desk, paper, header and every card resolved
         * to rgb(255,255,255) with zero borders — one undifferentiated white
         * page.
         *
         * Structure has to be carried by borders instead. This asserts the two
         * things that make the page navigable there: the sheet has a visible
         * edge, and the header rail is separated from the content.
         */
        forcedColors: true,
        js: `(() => {
            const plate = document.querySelector(".featured-plate, #post-container");
            const header = document.querySelector(".site-header");
            if (!plate) return "no sheet surface";
            const p = getComputedStyle(plate);
            if (parseFloat(p.borderTopWidth) === 0) return "sheet has no edge in forced-colours mode";
            if (header) {
                const h = getComputedStyle(header);
                if (parseFloat(h.borderBottomWidth) === 0) return "header has no separator in forced-colours mode";
            }
            return null;
        })()`,
    },
    {
        name: "surface ladder is monotonic and separated",
        /*
         * The material system only works if the four planes read as four
         * planes. This asserts the ladder itself rather than any single colour,
         * so a future palette edit can move values freely but cannot flatten
         * two tiers into one:
         *
         *   desk < well < paper < card surface < enamel
         *
         * It also pins the desk→paper step at 8–10 L*, which is the number the
         * design doc asks for and the one dark mode used to miss (5.4).
         */
        js: `(() => {
            const root = getComputedStyle(document.documentElement);
            const tok = (n) => root.getPropertyValue(n).trim();

            const parse = (c) => {
                const m = c.match(/^#([0-9a-f]{6})$/i);
                if (!m) return null;
                const v = m[1];
                return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
            };
            const lin = (c) => {
                c /= 255;
                return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            };
            const L = (rgb) => {
                const y = 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
                return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y;
            };

            /*
             * The ladder is not the same shape in both themes, and that is
             * correct: on a light desk, paper is the brightest thing and a
             * coated panel is a shade *below* it (enamel is cooler/darker so it
             * can carry a specular band). In dark mode every raised surface is
             * brighter. Asserting one global order would force a palette that
             * looks wrong in one of the two themes.
             */
            const dark = document.documentElement.classList.contains("dark");
            const order = dark
                ? ["--desk", "--well", "--paper-stock", "--surface", "--enamel"]
                : ["--desk", "--enamel", "--paper-stock"];
            const values = order.map((n) => parse(tok(n)));
            const missing = order.filter((n, i) => !values[i]);
            if (missing.length) return "unparsed tokens: " + missing.join(", ") + " (" + order.map(tok).join(" ") + ")";

            const ladder = values.map(L);
            for (let i = 1; i < ladder.length; i++) {
                if (ladder[i] <= ladder[i - 1]) {
                    return order[i] + " (" + ladder[i].toFixed(1) + ") is on the wrong side of " +
                        order[i - 1] + " (" + ladder[i - 1].toFixed(1) + ")";
                }
            }

            /* Only enforce a floor. Light mode runs at 12.2 and has always
               looked right; the failure this guards against is dark mode
               collapsing toward the desk (it used to be 5.4). */
            const step = Math.abs(L(parse(tok("--paper-stock"))) - L(parse(tok("--desk"))));
            if (step < 8) {
                return "desk→paper is only " + step.toFixed(1) + " L*, needs at least 8";
            }
            return null;
        })()`,
    },
    {
        name: "navigation actually animates",
        // The regression: an ID rule had replaced the transition and
        // `animationSelector` pointed at an element with `transition: none`.
        // Nothing threw — the page simply snapped. Assert that a real click
        // navigates through Swup's animation phase and the container carries
        // a transition for translate/opacity while it does.
        js: `(async () => {
            const container = document.querySelector("#swup-container");
            if (!container) return "no container";
            const prop = getComputedStyle(container).transitionProperty;
            if (!prop.includes("translate") && !prop.includes("opacity"))
                return "container has no transition: " + prop;

            /*
             * Sample from Swup's own hook rather than a MutationObserver: the
             * observer callback is a microtask and by the time it runs the
             * transition is already several frames in, so the element looks
             * settled even when it is animating. Visit-start fires before
             * the classes are applied, which is exactly the moment to record
             * the "from" position.
             */
            const swup = window.swup;
            if (!swup?.hooks) return "swup is not a global instance";
            let from = null;
            let moved = false;
            swup.hooks.on("visit:start", () => {
                const el = document.querySelector("#swup-container");
                from = getComputedStyle(el).translate;
            });
            swup.hooks.on("visit:transition", () => {});
            const html = document.documentElement;
            const seen = new Set();
            const mo = new MutationObserver(() => {
                html.classList.forEach((c) => c.startsWith("is-") && seen.add(c));
                if (html.classList.contains("is-animating") && from !== null && !moved) {
                    const now = getComputedStyle(document.querySelector("#swup-container")).translate;
                    moved = now !== from;
                }
            });
            mo.observe(html, { attributes: true, attributeFilter: ["class"] });
            /* Any internal page that is not the current one: archive does not
               link to itself, so anchor on the home link instead, which is in
               the header on every page. */
            const link = [...document.querySelectorAll(".site-header a[href], a[href]")]
                .find((a) => a.pathname && a.pathname.startsWith("/flowli-blog/")
                    && a.pathname !== location.pathname && !a.pathname.includes("#"));
            if (!link) { mo.disconnect(); return "no internal link to test with"; }
            link.click();
            await new Promise((r) => setTimeout(r, 200));
            mo.disconnect();
            if (!seen.has("is-animating")) return "navigation never entered is-animating";
            if (!moved) return "container translate never changed from " + from;
            return null;
        })()`,
    },
    {
        /* The mounts ship at five widths because the slot is not a fixed
         * fraction of the viewport; `sizes` used to say 24vw, which asked for
         * 384px at 1600 and pushed a 2× display onto the 900px original for a
         * 268px mount. Measured widths per breakpoint are the fix, so assert
         * the declared slot stays within 20% of the painted one. */
        name: "wall scrolls declare the slot they actually paint",
        viewports: "scroll",
        only: ["light"],
        js: `(() => {
            const imgs = [...document.querySelectorAll(".hanging-scroll img")];
            if (!imgs.length) return null;
            for (const img of imgs) {
                const painted = img.getBoundingClientRect().width;
                if (painted < 1) continue;
                const sizes = img.getAttribute("sizes") || "";
                /* Resolve the sizes list the way the browser does: the first
                   entry whose media condition matches wins. A bare length
                   only counts if it is non-zero; the 0px entry is the
                   deliberate "hidden below 1240px" fallback. */
                let declared = null;
                for (const part of sizes.split(",").map((s) => s.trim())) {
                    const m = part.match(/^(?:\\(([^)]+)\\)\\s*)?(.+)$/);
                    if (!m) continue;
                    if (m[1] && !matchMedia(m[1]).matches) continue;
                    if (declared === null) declared = m[2];
                }
                const px = declared?.endsWith("px") ? parseFloat(declared) : null;
                if (!px) continue;
                if (Math.abs(px - painted) / painted > 0.2) {
                    return "declares " + px + "px for a " + Math.round(painted) + "px mount";
                }
            }
            return null;
        })()`,
    },
    {
        /* A 2× display must not fall back to the 900px original unless the
         * mount is actually that large: above 3200 CSS px the slot reaches
         * ~550px. Below that, one step over the requested width is enough. */
        name: "wall scrolls request the nearest step, not the original",
        viewports: "scroll",
        only: ["light"],
        js: `(() => {
            const img = document.querySelector(".hanging-scroll img");
            if (!img) return null;
            const painted = img.getBoundingClientRect().width;
            if (painted < 1) return null;
            const need = painted * devicePixelRatio;
            if (need > 760) return null; /* 4K territory: 900 is correct there */
            const picked = Number((img.currentSrc.match(/-(\\d+)\\.webp$/) || [])[1]);
            if (!picked) return "currentSrc has no width step: " + img.currentSrc;
            if (picked === 900) return "picked the 900px original for a " + Math.round(need) + "px slot";
            return null;
        })()`,
    },
];

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".xml": "application/xml",
    ".json": "application/json",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ico": "image/x-icon",
};

function findChrome() {
    if (process.env.CHROME_PATH) return process.env.CHROME_PATH;

    const candidates = [
        /* Playwright's bundled headless shell: fastest, and it reliably opens a
           CDP port in this environment where the full Chrome app exited. */
        ...globDirs(path.join(process.env.HOME ?? "", "Library/Caches/ms-playwright"))
            .filter((d) => d.includes("chromium_headless_shell"))
            .map((d) => path.join(d, "chrome-headless-shell-mac-arm64", "chrome-headless-shell")),
        path.join(process.env.HOME ?? "", ".cache/puppeteer/chrome"),
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ];
    for (const c of candidates) {
        if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
    }
    throw new Error("No Chrome found. Set CHROME_PATH to a Chrome/headless-shell binary.");
}

function globDirs(dir) {
    try {
        return fs
            .readdirSync(dir)
            .map((name) => path.join(dir, name))
            .filter((p) => fs.statSync(p).isDirectory());
    } catch {
        return [];
    }
}

function startServer() {
    const server = http.createServer((req, res) => {
        let urlPath = decodeURIComponent(req.url.split("?")[0]);
        if (!urlPath.startsWith(PREFIX)) {
            res.writeHead(404);
            return res.end("not found");
        }
        urlPath = urlPath.slice(PREFIX.length) || "/";
        let file = path.join(DIST, urlPath);
        if (urlPath.endsWith("/")) file = path.join(file, "index.html");
        if (!fs.existsSync(file) && fs.existsSync(`${file}.html`)) file += ".html";
        if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            res.writeHead(404);
            return res.end("404");
        }
        res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
        fs.createReadStream(file).pipe(res);
    });
    return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

async function waitForJson(url, attempts = 60) {
    for (let i = 0; i < attempts; i++) {
        try {
            const res = await fetch(url);
            if (res.ok) return await res.json();
        } catch {
            /* not up yet */
        }
        await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(`Timed out waiting for ${url}`);
}

function connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    let nextId = 0;
    const pending = new Map();
    ws.addEventListener("message", (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && pending.has(msg.id)) {
            pending.get(msg.id)(msg);
            pending.delete(msg.id);
        }
    });
    const ready = new Promise((resolve) => ws.addEventListener("open", resolve));
    const send = (method, params = {}) =>
        new Promise((resolve) => {
            const id = ++nextId;
            pending.set(id, resolve);
            ws.send(JSON.stringify({ id, method, params }));
        });
    return { ws, ready, send };
}

/*
 * One tab, one navigation per state, used for BOTH the capture and the
 * assertions.
 *
 * An earlier version opened a second tab per state to run the checks with
 * motion enabled. Tabs accumulated, and because the CDP port was opened for
 * *every* check-tab at once the last few states occasionally reported "no
 * .site-header" / 56% pixel differences — the page simply had not finished
 * loading, not a real regression. A single reused tab navigated in sequence
 * is both faster and deterministic.
 *
 * Determinism for the capture comes from freezing motion rather than from
 * splitting the modes: the assertions that need motion read values that exist
 * regardless (class membership, rule presence), so they run after the shot on
 * the same page with the freeze still applied, and only the *behavioural*
 * checks (transition duration) temporarily clear it.
 */
async function loadState(url, theme, extraFeatures = [], viewport = VIEWPORT) {
    const target = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: "PUT" })).json();
    const tab = connect(target.webSocketDebuggerUrl);
    await tab.ready;
    await tab.send("Page.enable");
    await tab.send("Runtime.enable");
    await tab.send("Emulation.setDeviceMetricsOverride", { ...viewport, mobile: false });
    await tab.send("Emulation.setEmulatedMedia", {
        features: [
            { name: "prefers-color-scheme", value: theme },
            /* Pin motion so a reviewer's OS setting cannot change the baseline. */
            { name: "prefers-reduced-motion", value: "reduce" },
            ...extraFeatures,
        ],
    });
    /*
     * The theme is persisted in localStorage, so a previous run (or a manual
     * visit during development) can leave the site in the *other* theme and
     * every screenshot silently captures the wrong palette. Observed for real:
     * the dark baseline was rewritten with the light home page after a theme
     * toggle had been exercised in the shared profile.
     *
     * Clearing storage on the origin before each navigation makes each state
     * independent of every other one, which is what the matrix promises.
     */
    await tab.send("Storage.clearDataForOrigin", {
        origin: `http://127.0.0.1:${PORT}`,
        storageTypes: "local_storage,session_storage",
    });
    await tab.send("Page.navigate", { url });
    await waitForDom(tab, theme);
    return { tab, targetId: target.id };
}

async function waitForDom(tab, theme) {
    const wantDark = theme === "dark";
    for (let i = 0; i < 80; i++) {
        const res = await tab.send("Runtime.evaluate", {
            expression: `document.readyState === "complete"
                && !!document.querySelector("#swup-container")
                && document.documentElement.classList.contains("dark") === ${wantDark}`,
            returnByValue: true,
        });
        if (res.result?.result?.value === true) {
            await tab.send("Runtime.evaluate", {
                expression: `(async () => {
                    await document.fonts.ready;
                    window.scrollTo(0, 0);
                })()`,
                awaitPromise: true,
            });
            await new Promise((r) => setTimeout(r, 300));
            return;
        }
        await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error("page did not finish loading");
}

async function closeTab(targetId) {
    try {
        await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/close/${targetId}`);
    } catch {
        /* already gone */
    }
}

async function assertMaterials(tab, checks, extraFeatures = []) {
    /*
     * Union with the features the page was loaded under.
     *
     * `setEmulatedMedia` replaces the whole feature list rather than merging,
     * so the previous version of this function silently dropped
     * `forced-colors` and then asserted forced-colours behaviour on a page
     * that was no longer in that mode — the check failed while the CSS was
     * correct. Pass through whatever the caller set.
     */
    await tab.send("Emulation.setEmulatedMedia", {
        features: [
            { name: "prefers-reduced-motion", value: "no-preference" },
            ...extraFeatures,
        ],
    });
    const failures = [];
    for (const check of checks) {
        const res = await tab.send("Runtime.evaluate", {
            expression: check.js,
            returnByValue: true,
            awaitPromise: true,
        });
        const value = res.result?.result?.value ?? res.result?.result?.description;
        if (value) failures.push(`${check.name}: ${value}`);
    }
    return failures;
}

async function diff(aPath, bPath, diffPath) {
    /*
     * Decode both sides through the same pipeline.
     *
     * `ensureAlpha` was reading WebP as 3-channel RGB and the fresh capture as
     * RGBA, so the two buffers were compared after different colour paths and
     * a handful of pixels came out ±1 apart on an unchanged page. That re-made
     * baselines on every run and made the repo's images churn for no reason.
     *
     * Forcing RGBA (and therefore one decode path) on both sides makes an
     * identical page diff at exactly 0.
     */
    const decode = async (p) => {
        const { data, info } = await sharp(p)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
        return { data, width: info.width, height: info.height, channels: info.channels };
    };
    const a = await decode(aPath);
    const b = await decode(bPath);
    if (a.width !== b.width || a.height !== b.height) {
        return { changed: Infinity, note: "size mismatch" };
    }
    const { width, height, channels } = a;
    if (a.channels !== b.channels) {
        return { changed: Infinity, note: "channel mismatch" };
    }
    const out = Buffer.alloc(width * height * channels);
    let touched = 0;
    for (let i = 0; i < a.data.length; i += channels) {
        let delta = 0;
        for (let c = 0; c < 3; c++) delta = Math.max(delta, Math.abs(a.data[i + c] - b.data[i + c]));
        if (delta > PIXEL_TOLERANCE) {
            touched++;
            out[i] = 255;
            out[i + 1] = 0;
            out[i + 2] = 255;
            out[i + 3] = 255;
        } else {
            const grey = Math.round((a.data[i] + a.data[i + 1] + a.data[i + 2]) / 3);
            out[i] = grey;
            out[i + 1] = grey;
            out[i + 2] = grey;
            out[i + 3] = 90;
        }
    }
    await sharp(out, { raw: { width, height, channels } }).png().toFile(diffPath);
    return { changed: touched / (width * height) };
}

async function main() {
    const update = process.argv.includes("--update");
    if (!fs.existsSync(path.join(DIST, "index.html"))) {
        throw new Error("dist/ is empty. Run `pnpm build` first.");
    }

    const baselineDir = path.join(OUT_BASE, "baseline");
    /*
     * Captures always land in local/, even in --update mode; baselines are only
     * written when the capture actually differs. Diff images belong to the run,
     * never to the baseline, so they must not end up next to it.
     */
    const runDir = path.join(OUT_BASE, "local");
    fs.mkdirSync(runDir, { recursive: true });
    fs.mkdirSync(baselineDir, { recursive: true });

    const chrome = findChrome();
    const server = await startServer();
    const proc = spawn(
        chrome,
        [
            `--remote-debugging-port=${DEBUG_PORT}`,
            `--user-data-dir=${path.join(OUT_BASE, "local-profile")}`,
            "--hide-scrollbars",
            "--no-first-run",
            "--disable-gpu",
            "about:blank",
        ],
        { stdio: "ignore", detached: false },
    );

    let failed = 0;
    try {
        await waitForJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
        for (const theme of THEMES) {
            for (const state of STATES) {
                const name = `${state.name}-${theme}.webp`;
                const target = path.join(runDir, name);
                /* Viewport-specific checks run in the scroll sweep below, once
                   per breakpoint, rather than being repeated at the single
                   pinned screenshot size. */
                const checks = MATERIAL_CHECKS.filter(
                    (c) =>
                        (!c.only || c.only.includes(theme)) &&
                        !c.forcedColors &&
                        !c.reducedMotion &&
                        !c.viewports,
                );
                const url = `http://127.0.0.1:${PORT}${PREFIX}${state.path}`;

                const { tab, targetId } = await loadState(url, theme);
                try {
                    const shot = await tab.send("Page.captureScreenshot", { format: "png" });
                    /* Lossless, so a baseline is pixel-identical to the capture;
                       only the container gets smaller. */
                    await sharp(Buffer.from(shot.result.data, "base64"))
                        .webp({ lossless: true, effort: 6 })
                        .toFile(target);

                    /* Structural checks: a named failure is far more useful
                       than "% of pixels changed". */
                    for (const failure of await assertMaterials(tab, checks)) {
                        console.log(`  ASSERT   ${name}  ${failure}`);
                        failed++;
                    }
                } finally {
                    tab.ws.close();
                    await closeTab(targetId);
                }

                const baseline = path.join(OUT_BASE, "baseline", name);

                if (update) {
                    /*
                     * Keep the existing baseline when the new capture is
                     * equivalent to it.
                     *
                     * A handful of pixels on the pagination pill rasterise one
                     * level differently whenever the lossless WebP is rebuilt —
                     * six pixels, max Δ1, on an otherwise identical page. Blindly
                     * overwriting stores that noise as a new binary and makes
                     * every "--update" churn the repo. Rewriting only on a real
                     * difference keeps the baseline stable across runs.
                     */
                    if (fs.existsSync(baseline)) {
                        const { changed } = await diff(baseline, target, path.join(runDir, `diff-${name}`));
                        if (changed <= STATE_BUDGET) {
                            console.log(`  same     ${name}`);
                            continue;
                        }
                    }
                    fs.copyFileSync(target, baseline);
                    console.log(`  updated  ${name}`);
                    continue;
                }

                if (!fs.existsSync(baseline)) {
                    console.log(`  no baseline for ${name} — run with --update`);
                    failed++;
                    continue;
                }
                const diffPath = path.join(runDir, `diff-${name}`);
                const { changed } = await diff(baseline, target, diffPath);
                const pct = (changed * 100).toFixed(3);
                if (changed > STATE_BUDGET) {
                    console.log(`  FAIL     ${name}  ${pct}% pixels differ  → ${path.relative(ROOT, diffPath)}`);
                    failed++;
                } else {
                    console.log(`  ok       ${name}  ${pct}%`);
                }
            }
        }

        /*
         * Forced-colours pass.
         *
         * No screenshot comparison: the system palette is the point, so pixel
         * output legitimately differs between platforms and would make a
         * meaningless baseline. What must hold is that structure survives.
         */
        const forcedChecks = MATERIAL_CHECKS.filter((c) => c.forcedColors);
        if (forcedChecks.length) {
            const { tab, targetId } = await loadState(
                `http://127.0.0.1:${PORT}${PREFIX}/`,
                "light",
                [{ name: "forced-colors", value: "active" }],
            );
            try {
                for (const failure of await assertMaterials(tab, forcedChecks, [
                    { name: "forced-colors", value: "active" },
                ])) {
                    console.log(`  ASSERT   forced-colours  ${failure}`);
                    failed++;
                }
            } finally {
                tab.ws.close();
                await closeTab(targetId);
            }
            if (failed === 0) console.log("  ok       forced-colours  structure preserved");
        }

        /*
         * Reduced-motion pass. Runs on its own page load with the preference
         * actually set: assertMaterials turns motion *on* for the behavioural
         * checks, so these have to be measured before that happens.
         */
        const reducedChecks = MATERIAL_CHECKS.filter((c) => c.reducedMotion);
        if (reducedChecks.length) {
            const { tab, targetId } = await loadState(`http://127.0.0.1:${PORT}${PREFIX}/`, "light");
            try {
                const failures = [];
                for (const check of reducedChecks) {
                    const res = await tab.send("Runtime.evaluate", {
                        expression: check.js,
                        returnByValue: true,
                        awaitPromise: true,
                    });
                    const value = res.result?.result?.value ?? res.result?.result?.description;
                    if (value) failures.push(`${check.name}: ${value}`);
                }
                for (const failure of failures) {
                    console.log(`  ASSERT   reduced-motion  ${failure}`);
                    failed++;
                }
                if (!failures.length) console.log("  ok       reduced-motion  motion is actually off");
            } finally {
                tab.ws.close();
                await closeTab(targetId);
            }
        }

        /*
         * The scroll assertions depend on the viewport, so run them at every
         * breakpoint where `sizes` switches. Light theme only: the slot is a
         * layout measurement, not a palette one.
         */
        if (!update) {
            const scrollChecks = MATERIAL_CHECKS.filter((c) => c.viewports === "scroll");
            const url = `http://127.0.0.1:${PORT}${PREFIX}/`;
            for (const viewport of SCROLL_VIEWPORTS) {
                const { tab, targetId } = await loadState(url, "light", [], viewport);
                try {
                    const failures = await assertMaterials(tab, scrollChecks);
                    const label = `${viewport.width}×${viewport.height}@${viewport.deviceScaleFactor}x`;
                    if (failures.length) {
                        for (const failure of failures) {
                            console.log(`  ASSERT   home-light.webp ${label}  ${failure}`);
                        }
                        failed += failures.length;
                    } else {
                        console.log(`  ok       wall scrolls ${label}`);
                    }
                } finally {
                    tab.ws.close();
                    await closeTab(targetId);
                }
            }
        }
    } finally {
        proc.kill();
        server.close();
    }

    if (failed > 0) {
        console.error(`\n${failed} state(s) changed. Inspect the diff images, then either fix the` +
            ` regression or, if the change is intended, re-run with --update.`);
        process.exit(1);
    }
    console.log(update ? "\nBaseline written." : "\nAll states match the baseline.");
}

main().catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
});
