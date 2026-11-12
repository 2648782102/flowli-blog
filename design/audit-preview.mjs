import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require(join(currentDir, "tools", "node_modules", "playwright"));
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const baseUrl = process.env.BLOG_URL ?? "http://localhost:4321/flowli-blog/";
const outputDir = process.env.OUTPUT_DIR ?? "design/screenshots/audit";

const browser = await chromium.launch({ executablePath, headless: true });

async function newPage(width, height, scheme = "light", mobile = false) {
    const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 1,
        isMobile: mobile,
        hasTouch: mobile,
        colorScheme: scheme,
        locale: "zh-CN",
    });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    return { context, page, consoleErrors };
}

async function capture(name, path, width, height, scheme = "light", mobile = false, action) {
    const { context, page, consoleErrors } = await newPage(width, height, scheme, mobile);
    await page.goto(new URL(path, baseUrl).href, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    if (action) await action(page);
    const floatingPanelState = async () => page.evaluate(() => {
        const ids = ["display-setting-wrapper", "translate-panel-wrapper", "nav-menu-panel", "search-panel"];
        return Object.fromEntries(ids.map((id) => {
            const element = document.getElementById(id);
            if (!element) return [id, null];
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return [id, {
                opacity: style.opacity,
                visibility: style.visibility,
                background: style.backgroundColor,
                backdrop: style.backdropFilter,
                hidden: element.getAttribute("aria-hidden"),
                rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
            }];
        }));
    });
    await page.screenshot({ path: join(outputDir, `${name}.png`), fullPage: false });
    const floatingPanels = await floatingPanelState();
    const metrics = await page.evaluate(() => {
        const navbar = document.querySelector("#navbar > div:last-child");
        const main = document.querySelector("#main-content");
        const content = document.querySelector("#content-wrapper");
        const styles = (selector) => {
            const element = document.querySelector(selector);
            if (!element) return null;
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return {
                rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
                background: style.backgroundColor,
                border: style.border,
                radius: style.borderRadius,
                shadow: style.boxShadow,
                backdrop: style.backdropFilter,
                color: style.color,
            };
        };
        return {
            title: document.title,
            url: location.pathname,
            scrollY: window.scrollY,
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            navbar: styles("#navbar > div:last-child"),
            main: main ? styles("#main-content") : null,
            content: content ? styles("#content-wrapper") : null,
            activeTabs: Array.from(document.querySelectorAll('#navbar .nav-link-item[aria-current]')).map((link) => link.getAttribute("data-link-name")),
            visibleText: Array.from(document.querySelectorAll("#content-wrapper h1, #content-wrapper h2, .post-row-title, .desk-title, .home-feed-label"))
                .slice(0, 8)
                .map((element) => element.textContent?.trim().replace(/\s+/g, " ")),
            overflowing: Array.from(document.querySelectorAll("body *"))
                .filter((element) => {
                    const rect = element.getBoundingClientRect();
                    return rect.width > 0 && (rect.right > document.documentElement.clientWidth + 1 || rect.left < -1);
                })
                .slice(0, 12)
                .map((element) => ({ tag: element.tagName, id: element.id, className: String(element.className).slice(0, 80) })),
        };
    });
    console.log(JSON.stringify({ name, scheme, viewport: `${width}x${height}`, consoleErrors, ...metrics }, null, 2));
    console.log(JSON.stringify({ name, floatingPanels }, null, 2));
    await context.close();
}

await capture("home-light", "", 1440, 900);
await capture("home-dark", "", 1440, 900, "dark");
await capture("home-mobile", "", 390, 844, "light", true);
await capture("post-light", "posts/2026-11-10-20-02-03-/", 1440, 900);
await capture("archive-light", "archive/", 1440, 900);
await capture("about-light", "about/", 1440, 900);
await capture("search-open", "", 1440, 900, "light", false, async (page) => {
    await page.hover("#search-bar");
    await page.waitForTimeout(350);
});
await capture("settings-open", "", 1440, 900, "light", false, async (page) => {
    await page.click("#display-settings-switch");
    await page.waitForTimeout(350);
});
await capture("theme-open", "", 1440, 900, "light", false, async (page) => {
    await page.click("#scheme-switch");
    await page.waitForTimeout(350);
});
await capture("translate-open", "", 1440, 900, "light", false, async (page) => {
    await page.click("#translate-switch");
    await page.waitForTimeout(350);
});
await capture("search-results", "", 1440, 900, "light", false, async (page) => {
    await page.click("#search-bar");
    await page.fill("#search-input-desktop", "flowli");
    await page.waitForTimeout(900);
});
await capture("menu-open", "", 390, 844, "light", true, async (page) => {
    await page.click("#nav-menu-switch");
    await page.waitForTimeout(350);
});
await capture("home-reduced-motion", "", 1440, 900, "light", false, async (page) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
});

await browser.close();
