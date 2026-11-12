import { access, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

async function loadChromium() {
    try {
        return require("playwright").chromium;
    } catch {
        const fallback = join(currentDir, "tools", "node_modules", "playwright");
        await access(fallback);
        return createRequire(join(fallback, "package.json"))("playwright").chromium;
    }
}

const chromium = await loadChromium();

const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const baseUrl = process.env.BLOG_URL ?? "https://2648782102.github.io/flowli-blog/";
const outputDir = process.env.OUTPUT_DIR ?? "design/screenshots/local";

const targets = [
    { name: "home-desktop", path: "", width: 1440, height: 900 },
    { name: "home-mobile", path: "", width: 390, height: 844, mobile: true },
    { name: "post-desktop", path: "posts/2026-11-10-20-02-03-/", width: 1440, height: 900 },
    { name: "archive-desktop", path: "archive/", width: 1440, height: 900 },
    { name: "about-desktop", path: "about/", width: 1440, height: 900 },
];

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });

for (const target of targets) {
    const context = await browser.newContext({
        viewport: { width: target.width, height: target.height },
        deviceScaleFactor: 1,
        isMobile: Boolean(target.mobile),
        hasTouch: Boolean(target.mobile),
        colorScheme: "light",
        locale: "zh-CN",
    });
    const page = await context.newPage();
    const url = new URL(target.path, baseUrl).href;
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${outputDir}/${target.name}.png`, fullPage: true });
    console.log(`${target.name}: ${response?.status() ?? "no-response"} ${url}`);
    await context.close();
}

await browser.close();
