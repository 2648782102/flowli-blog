import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const playwrightPath = join(currentDir, "tools", "node_modules", "playwright");
const { chromium } = require(playwrightPath);

const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const baseUrl = process.env.BLOG_URL ?? "http://localhost:4321/flowli-blog/";
const browser = await chromium.launch({ executablePath, headless: true });

async function inspect(width, height, mobile = false) {
    const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 1,
        isMobile: mobile,
        hasTouch: mobile,
        colorScheme: "light",
        locale: "zh-CN",
    });
    const page = await context.newPage();
    const homeUrl = new URL("", baseUrl).href;
    const archiveUrl = new URL("archive/", baseUrl).href;
    const postUrl = new URL("posts/2026-11-10-20-02-03-/", baseUrl).href;
    let resultMenuOpen = null;

    await page.goto(homeUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    const probe = () => page.evaluate(() => ({
        activeTabs: Array.from(document.querySelectorAll('#navbar .nav-link-item[aria-current]'))
            .map((link) => `${link.getAttribute('data-link-name')}:${link.getAttribute('aria-current')}`),
        mobileActiveTabs: Array.from(document.querySelectorAll('#nav-menu-panel .mobile-menu-item > a[aria-current]'))
            .map((link) => `${link.getAttribute('data-link-name')}:${link.getAttribute('aria-current')}`),
        navbarHeight: document.querySelector('#navbar > div:last-child')?.getBoundingClientRect().height ?? null,
        contentTop: document.querySelector('#main-content')?.getBoundingClientRect().top ?? null,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollY: window.scrollY,
    }));

    const floatingState = () => page.evaluate(() => {
        const state = (id) => {
            const element = document.getElementById(id);
            if (!element) return null;
            const style = getComputedStyle(element);
            return {
                opacity: style.opacity,
                visibility: style.visibility,
                hidden: element.getAttribute("aria-hidden"),
            };
        };
        return {
            display: state("display-setting-wrapper"),
            translate: state("translate-panel-wrapper"),
            menu: state("nav-menu-panel"),
        };
    });

    const home = await probe();
    const closedPanels = await floatingState();
    if (mobile) {
        await page.click('#nav-menu-switch');
        const menuOpen = await page.evaluate(() => {
            const selected = document.querySelector('#nav-menu-panel .mobile-menu-item > a[aria-current]');
            const link = document.querySelector('#nav-menu-panel .mobile-menu-item > a');
            return {
                activeTab: selected?.getAttribute('data-link-name') ?? null,
                linkColor: link ? getComputedStyle(link.querySelector('div')).color : null,
            };
        });
        resultMenuOpen = menuOpen;
        await page.click(`#nav-menu-panel a[href="${new URL("archive/", baseUrl).pathname}"]`);
    } else {
        await page.click('a[href$="/archive/"]');
    }
    await page.waitForURL(archiveUrl);
    await page.waitForTimeout(900);
    const archive = await probe();

    await page.goto(postUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    const post = await probe();

    await page.goto(homeUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);
    const homeAgain = await probe();

    const panelTargets = mobile ? ["#nav-menu-switch"] : ["#display-settings-switch", "#translate-switch", "#scheme-switch"];
    const panelChecks = [];
    for (const selector of panelTargets) {
        await page.click(selector);
        await page.waitForTimeout(250);
        const opened = await floatingState();
        if (selector === "#scheme-switch") {
            await page.keyboard.press("Escape");
        } else {
            await page.click(selector);
        }
        await page.waitForTimeout(250);
        const closed = await floatingState();
        panelChecks.push({ selector, opened, closed });
    }

    const result = {
        viewport: `${width}x${height}${mobile ? " mobile" : ""}`,
        home,
        archive,
        post,
        homeAgain,
        closedPanels,
        menuOpen: resultMenuOpen ?? null,
        panelChecks,
        checks: {
            homeHasOneTab: home.activeTabs.length === 1 && home.activeTabs[0].startsWith("主页"),
            archiveHasOneTab: archive.activeTabs.length === 1 && archive.activeTabs[0].startsWith("归档"),
            postInheritsArchiveTab: post.activeTabs.length === 1 && post.activeTabs[0].startsWith("归档"),
            homeAgainHasOneTab: homeAgain.activeTabs.length === 1 && homeAgain.activeTabs[0].startsWith("主页"),
            navbarStable: [archive, post, homeAgain].every((state) => state.navbarHeight === home.navbarHeight),
            contentStartStable: [archive, post, homeAgain].every((state) => Math.abs(state.contentTop - home.contentTop) < 0.75),
            noHorizontalScroll: home.scrollWidth <= home.clientWidth
                && archive.scrollWidth <= archive.clientWidth
                && post.scrollWidth <= post.clientWidth
                && homeAgain.scrollWidth <= homeAgain.clientWidth,
            scrollReset: archive.scrollY === 0 && post.scrollY === 0 && homeAgain.scrollY === 0,
            mobileMenuSelected: mobile ? resultMenuOpen?.activeTab === "主页" && resultMenuOpen?.linkColor !== "rgba(0, 0, 0, 0.75)" : true,
            panelsStartClosed: Object.values(closedPanels).every((state) => state && (state.opacity === "0" || state.visibility === "hidden" || state.hidden === "true")),
            displayPanelToggles: mobile || (panelChecks[0]?.opened.display.opacity === "1"
                && panelChecks[0]?.closed.display.opacity === "0"),
            translatePanelToggles: mobile || (panelChecks[1]?.opened.translate.opacity === "1"
                && panelChecks[1]?.closed.translate.opacity === "0"),
            themePanelOpens: mobile || Boolean(panelChecks[2]?.selector === "#scheme-switch"),
            mobileMenuToggles: !mobile || (panelChecks[0]?.opened.menu.opacity === "1"
                && panelChecks[0]?.closed.menu.opacity === "0"),
        },
    };

    console.log(JSON.stringify(result, null, 2));
    await context.close();
    return result;
}

const desktop = await inspect(1440, 900);
const mobile = await inspect(390, 844, true);
await browser.close();

const allChecks = [desktop, mobile].flatMap((result) => Object.values(result.checks));
if (allChecks.some((passed) => !passed)) {
    process.exit(1);
}
