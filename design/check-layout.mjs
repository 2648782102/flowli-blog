import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require(join(currentDir, "tools", "node_modules", "playwright"));
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const baseUrl = process.env.BLOG_URL ?? "http://localhost:4321/flowli-blog/";
const outputDir = process.env.OUTPUT_DIR ?? "design/screenshots/layout";

const browser = await chromium.launch({ executablePath, headless: true });

const viewports = [
    { name: "mobile", width: 390, height: 844 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "small-laptop", width: 1024, height: 800 },
    { name: "laptop", width: 1280, height: 900 },
    { name: "desktop", width: 1440, height: 900 },
    { name: "wide", width: 1920, height: 1080 },
];

const targets = [
    { name: "home", path: "" },
    { name: "archive", path: "archive/" },
    { name: "post", path: "posts/2026-11-10-20-02-03-/" },
    { name: "about", path: "about/" },
];

const rectOf = (element) => {
    const rect = element.getBoundingClientRect();
    return {
        x: Number(rect.x.toFixed(2)),
        y: Number(rect.y.toFixed(2)),
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2)),
        right: Number(rect.right.toFixed(2)),
        bottom: Number(rect.bottom.toFixed(2)),
    };
};

async function inspectViewport(viewport) {
    const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        colorScheme: "light",
        locale: "zh-CN",
    });
    const page = await context.newPage();
    const results = [];

    for (const target of targets) {
        await page.goto(new URL(target.path, baseUrl).href, { waitUntil: "networkidle" });
        await page.waitForTimeout(400);

        const measurement = await page.evaluate(() => {
            const rect = (selector) => {
                const element = document.querySelector(selector);
                if (!element) return null;
                const box = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                return {
                    rect: {
                        x: Number(box.x.toFixed(2)),
                        y: Number(box.y.toFixed(2)),
                        width: Number(box.width.toFixed(2)),
                        height: Number(box.height.toFixed(2)),
                        right: Number(box.right.toFixed(2)),
                        bottom: Number(box.bottom.toFixed(2)),
                    },
                    background: style.backgroundColor,
                    border: style.border,
                    transform: style.transform,
                    translate: style.translate,
                    scale: style.scale,
                };
            };
            const shell = document.querySelector(".editorial-shell");
            const grid = document.querySelector("#main-grid");
            const rail = document.querySelector("#editorial-sidebar-rail");
            const content = document.querySelector("#swup-container");
            const primaryBox = document.querySelector("#post-container, #content-wrapper > .flex > .card-base, .home-intro, .night-cover");
            const gridStyle = grid ? getComputedStyle(grid) : null;
            const railStyle = rail ? getComputedStyle(rail) : null;
            return {
                url: location.pathname,
                shell: shell ? rect(".editorial-shell") : null,
                grid: grid ? {
                    ...rect("#main-grid"),
                    position: gridStyle?.position,
                } : null,
                columns: gridStyle?.gridTemplateColumns ?? null,
                content: content ? rect("#swup-container") : null,
                rail: rail ? {
                    ...rect("#editorial-sidebar-rail"),
                    position: railStyle?.position,
                    overflow: railStyle?.overflowY,
                } : null,
                primaryBox: primaryBox ? rect("#post-container, #content-wrapper > .flex > .card-base, .home-intro, .night-cover") : null,
                gridPosition: gridStyle?.position ?? null,
                railPosition: railStyle?.position ?? null,
                scrollWidth: document.documentElement.scrollWidth,
                clientWidth: document.documentElement.clientWidth,
                overflowing: Array.from(document.querySelectorAll("body *"))
                    .filter((element) => {
                        const box = element.getBoundingClientRect();
                        return box.width > 0 && (box.right > document.documentElement.clientWidth + 1 || box.left < -1);
                    })
                    .slice(0, 8)
                    .map((element) => ({ tag: element.tagName, id: element.id, className: String(element.className).slice(0, 100) })),
            };
        });

        const hoverSelector = "#content-wrapper .post-row-title, #content-wrapper .archive-row-title, #content-wrapper .home-intro-link, #content-wrapper .night-cover-primary, #content-wrapper .desk-title, #content-wrapper .menu-card, #content-wrapper .album-card";
        const hoverTarget = page.locator(`${hoverSelector}:visible`).first();
        const hover = await hoverTarget.count()
            ? await (async () => {
                const readTarget = async () => hoverTarget.evaluate((element) => {
                    const box = element.getBoundingClientRect();
                    const style = getComputedStyle(element);
                    return {
                        x: Number(box.x.toFixed(2)),
                        y: Number(box.y.toFixed(2)),
                        width: Number(box.width.toFixed(2)),
                        height: Number(box.height.toFixed(2)),
                        transform: style.transform,
                        translate: style.translate,
                        scale: style.scale,
                    };
                });
                const before = await readTarget();
                const beforeScroll = await page.evaluate(() => window.scrollY);
                await hoverTarget.hover();
                await page.waitForTimeout(220);
                const after = await readTarget();
                const afterScroll = await page.evaluate(() => window.scrollY);
                const scrollDelta = afterScroll - beforeScroll;
                const visualTransform = after.transform !== "none" && after.transform !== "matrix(1, 0, 0, 1, 0, 0)";
                return {
                    hasTarget: true,
                    before,
                    after,
                    scrollDelta,
                    geometryChanged: before.width !== after.width || before.height !== after.height
                        || Math.abs(before.x - after.x) > 1
                        || Math.abs((before.y - scrollDelta) - after.y) > 1,
                    transformChanged: visualTransform || after.translate !== "none" || after.scale !== "none",
                };
            })()
            : { hasTarget: false };

        results.push({ ...target, ...measurement, hover });

        if (["home", "post"].includes(target.name)) {
            await page.screenshot({
                path: join(outputDir, `${viewport.name}-${target.name}.png`),
                fullPage: false,
            });
        }
    }

    await context.close();
    return { viewport, results };
}

const reports = [];
for (const viewport of viewports) {
    reports.push(await inspectViewport(viewport));
}
await browser.close();

const checks = reports.flatMap(({ viewport, results }) => results.flatMap((result) => [
    {
        label: `${viewport.name}:${result.name}:no-horizontal-scroll`,
        passed: result.scrollWidth <= result.clientWidth + 1 && result.overflowing.length === 0,
    },
    {
        label: `${viewport.name}:${result.name}:content-dominant`,
        passed: Boolean(result.content?.rect && result.grid?.rect && (!result.rail?.rect
            || Math.abs(result.content.rect.width - result.grid.rect.width) < 1
            || result.content.rect.width > result.grid.rect.width * 0.72
            || result.railPosition === "absolute"
            || result.railPosition === "sticky")),
    },
    {
        label: `${viewport.name}:${result.name}:primary-box-inside-grid`,
        passed: Boolean(result.primaryBox?.rect && result.grid?.rect
            && result.primaryBox.rect.x >= result.grid.rect.x - 1
            && result.primaryBox.rect.right <= result.grid.rect.right + 1),
    },
    {
        label: `${viewport.name}:${result.name}:hover-stable`,
        passed: !result.hover.hasTarget || (!result.hover.geometryChanged && !result.hover.transformChanged),
    },
]));

for (const report of reports) {
    console.log(JSON.stringify({
        viewport: `${report.viewport.width}x${report.viewport.height}`,
        pages: report.results.map((result) => ({
            name: result.name,
            columns: result.columns,
            grid: result.grid,
            content: result.content,
            rail: result.rail,
            primaryBox: result.primaryBox,
            scrollWidth: result.scrollWidth,
            clientWidth: result.clientWidth,
            overflowing: result.overflowing,
            hover: result.hover,
        })),
    }, null, 2));
}

console.log(JSON.stringify({ checks, passed: checks.every((check) => check.passed) }, null, 2));

if (checks.some((check) => !check.passed)) {
    process.exit(1);
}
