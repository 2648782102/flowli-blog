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
    await sharp(png)
        .resize({ width, kernel: "lanczos3" })
        .webp({ quality: 88, effort: 6 })
        .toFile(path.join(OUT_DIR, `${name}.webp`));
    await sharp(png).resize({ width: 480, kernel: "lanczos3" }).webp({ quality: 84, effort: 6 })
        .toFile(path.join(OUT_DIR, `${name}-sm.webp`));
    const fs = await import("node:fs");
    fs.unlinkSync(png);
    console.log(`baked ${name}.webp`);
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
    await bake("wanghui", "scroll-wanghui", 900);
    await bake("morikage", "scroll-morikage", 900);
} finally {
    if (browser) await browser.close();
    server.kill();
}
