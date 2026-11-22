#!/usr/bin/env node
/*
 * Rebuilds the couplet's brush face.
 *
 * The wall couplet uses Zhi Mang Xing (SIL OFL 1.1) from only the characters
 * that actually appear in the two lines — 12 unique glyphs, ~4.4 KB. Shipping
 * the full face costs 4 MB, so the subset is committed instead and this script
 * is what regenerates it after the lines change.
 *
 *   pnpm font:couplet
 *
 * The characters are read from the component itself, not restated here, so
 * editing a line and forgetting this script still produces a file with exactly
 * the glyphs the page asks for. Run it, then check the result: the old
 * `unicode-range` in wallCouplet.astro has to list every codepoint the new text
 * uses, or those characters fall back to the serif.
 *
 * Google Fonts' subsetter (the `text=` endpoint) is used instead of a local
 * `pyftsubset` run so the output is reproducible without a Python/fontTools
 * install, and it is the same pipeline that produced the committed file:
 * re-running this today reproduces it byte for byte.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMPONENT = path.join(ROOT, "src/components/home/wallCouplet.astro");
const OUT = path.join(ROOT, "src/assets/fonts/brush-poem.woff2");

/* Google Fonts serves different formats per UA; this one gets woff2. */
const UA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120 Safari/537.36";

const source = fs.readFileSync(COMPONENT, "utf8");

function readLine(name) {
    const match = source.match(new RegExp(`const ${name} = "([^"]+)"`));
    if (!match) throw new Error(`找不到 ${name}：组件里的写法变了？`);
    return match[1];
}

const text = readLine("RIGHT") + readLine("LEFT");
const unique = [...new Set(text)];

const cssUrl =
    "https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&text=" +
    encodeURIComponent(text);
const cssResponse = await fetch(cssUrl, { headers: { "User-Agent": UA } });
if (!cssResponse.ok) {
    throw new Error(`取 CSS 失败：HTTP ${cssResponse.status}`);
}

const css = await cssResponse.text();
const fontUrl = css.match(/url\((https:[^)]+)\)/)?.[1];
if (!fontUrl) {
    throw new Error("CSS 里没有字体地址——字形可能一个都没匹配上。");
}

const fontResponse = await fetch(fontUrl);
if (!fontResponse.ok) {
    throw new Error(`取字体失败：HTTP ${fontResponse.status}`);
}
const buffer = Buffer.from(await fontResponse.arrayBuffer());

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, buffer);

/*
 * The component's unicode-range is the other half of the subset. Printing it
 * here means the mismatch is noticed while editing rather than by spotting a
 * serif character on the wall.
 */
const ranges = unique
    .map((char) => `U+${char.codePointAt(0).toString(16).toUpperCase()}`)
    .join(", ");

console.log(`取舍 ${unique.length} 个字：${unique.join("")}`);
console.log(`写入 ${path.relative(ROOT, OUT)}（${buffer.length} 字节）`);
console.log(`unicode-range: ${ranges}`);
