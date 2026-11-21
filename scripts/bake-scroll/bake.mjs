/*
 * Re-bakes the two hanging-scroll images used on the homepage.
 *
 * The mounts are public-domain museum photographs with the real silk damask;
 * scene.js turns them into physical objects — curved paper, a turned wooden
 * roller, ivory end knobs and a single upper-left key light — and renders
 * them with Three.js. The result is baked to a transparent WebP so the site
 * itself ships no WebGL and no runtime 3D dependency.
 *
 * Usage:
 *   node scripts/bake-scroll/bake.mjs
 *
 * Requires a local Chrome/Chromium. Override with CHROME_PATH.
 * puppeteer-core is only needed here at bake time, not by the site.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = path.resolve(ROOT, "../../public/assets/art");
const PORT = 8931;
const CHROME =
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

let puppeteer;
try {
    puppeteer = require("puppeteer-core");
} catch {
    console.error("bake-scroll: puppeteer-core is required at bake time.");
    console.error("  Install it outside the site deps, e.g. npm i -D puppeteer-core");
    process.exit(1);
}

const server = spawn(process.execPath, ["-e", `
const http=require('http'),fs=require('fs'),path=require('path');
const root=${JSON.stringify(ROOT)};
const types={'.html':'text/html','.js':'text/javascript','.webp':'image/webp','.png':'image/png'};
http.createServer((req,res)=>{
  const rel=decodeURIComponent(new URL(req.url,'http://x').pathname);
  let file=path.join(root,rel==='/'?'index.html':rel);
  if(!file.startsWith(root)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,buf)=>{
    if(err){res.writeHead(404).end('not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(buf);
  });
}).listen(${PORT},'127.0.0.1');
`], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/*
 * One bake renders the tallest step, and every smaller step is derived from
 * that supersampled PNG. Re-running the 3D scene per width would triple the
 * bake time for pixels that are only ever downsampled.
 *
 * The widths follow what the layout actually renders, measured across
 * 1240–3840px (see --wall-height and the 1792px root font-size ramp in
 * theme.css): the wider mount is 172px at 1240, 218px at 1280, 268px for
 * 1440–1919, 317px at 1920, 436px at 2560 and 549px at 3840.
 *
 * Exactly one step above the requested width is what a 2× display needs, so
 * the ladder is spaced where that ceiling lands: 350 covers 1× to 1919,
 * 480 covers 1× from 1920 and 2× to 1280, 640 covers 2× to 1919, 880 covers
 * 2× from 1920 to 3200, and 900 is the 2× original above that. A 760 step
 * was tried and dropped: the browser's candidate at 2560×2 is 872px, which
 * skipped it and fetched 900 anyway.
 *
 * The old 480/900 pair jumped straight over the middle, so a 2× 1600px
 * display pulled the 173 KB original for a 268px slot while a 1× 1280
 * pulled the 51 KB 480px file for a 218px slot.
 */
const STEPS = [900, 880, 640, 480, 350];

async function bake(art, name, width) {
    /*
     * Render at 2× and downsample. The sheet's silhouette is a gentle curve
     * against transparency, and at 1× the alpha edge went from 0 to 255 in a
     * single pixel — the page then scaled that staircase down and the bottom
     * edge came out visibly jagged. Supersampling gives the edge two or three
     * real coverage levels to interpolate from, which is what fixes it; adding
     * margin back to the bake only hid it.
     */
    const SS = 2;
    const renderW = width * SS;
    const page = await browser.newPage();
    await page.setViewport({ width: renderW, height: 2800, deviceScaleFactor: 1 });
    await page.goto(
        `http://127.0.0.1:${PORT}/index.html?art=${art}&theme=light&w=${renderW}&h=0`,
        { waitUntil: "networkidle0" }
    );
    await page.evaluate(() => new Promise((resolve) => {
        const t0 = performance.now();
        (function poll() {
            if (window.__READY && window.__ART_READY) return resolve(true);
            if (performance.now() - t0 > 20000) return resolve(false);
            requestAnimationFrame(poll);
        })();
    }));
    const canvas = await page.$("canvas");
    const png = path.join(ROOT, `.bake-${art}.png`);
    await canvas.screenshot({ path: png, omitBackground: true });
    await page.close();

    const sharp = require("sharp");
    for (const step of STEPS) {
        await sharp(png)
            .resize({ width: Math.min(step, width), kernel: "lanczos3" })
            .webp({ quality: step === width ? 88 : 84, effort: 6 })
            .toFile(path.join(OUT_DIR, `${name}-${step}.webp`));
    }
    const fs = await import("node:fs");
    fs.unlinkSync(png);
    console.log(`baked ${name}-{${STEPS.join(",")}}.webp`);
}

let browser;
try {
    for (let i = 0; i < 40; i++) {
        try {
            const res = await fetch(`http://127.0.0.1:${PORT}/index.html`);
            if (res.ok) break;
        } catch {}
        await sleep(100);
    }
    browser = await puppeteer.launch({
        executablePath: CHROME,
        headless: true,
        args: ["--enable-unsafe-swiftshader", "--hide-scrollbars"],
    });
    for (const [art, name] of [["wanghui", "scroll-wanghui"], ["morikage", "scroll-morikage"]]) {
        /*
         * `bake` renders the whole scene; skip it when every step already
         * exists and only the derived sizes changed. `BAKE_FORCE=1` re-runs
         * the 3D scene anyway.
         */
        const fs = await import("node:fs");
        const haveAll = STEPS.every((step) =>
            fs.existsSync(path.join(OUT_DIR, `${name}-${step}.webp`)),
        );
        if (haveAll && !process.env.BAKE_FORCE) {
            console.log(`skip ${name}: all ${STEPS.length} steps exist`);
            continue;
        }
        await bake(art, name, 900);
    }
} finally {
    if (browser) await browser.close();
    server.kill();
}
