#!/usr/bin/env node
/*
 * Build self-hosted Noto Serif/Sans SC subsets for the site.
 *
 * Google Fonts' Chinese CSS is 300–450 KB per family just to describe its
 * unicode-range shards. The site needs a few hundred glyphs at most, so a
 * local subset removes both the third-party request and the bulk of that CSS.
 *
 * Source TTFs are downloaded from the Google Fonts CSS endpoint by
 * `download-sources.py`; this script only works on local files.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = path.join(ROOT, "work", "fonts", "sources");
const OUTPUT_DIR = path.join(ROOT, "public", "assets", "fonts", "noto");
const CONTENT_DIR = path.join(ROOT, "src");

const SOURCE_SPECS = [
    { family: "serif", weights: [500, 600, 700] },
    { family: "sans", weights: [400, 500, 600, 700] },
];

const EXTRA_CHARACTERS = [
    ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    ..." .,:;!?'\"()[]{}<>/\\|@#$%^&*_-+=~`",
    ..."，。！？：；、（）「」『』《》〈〉【】—…·￥％＆＋－＝～／＼｜·“”‘’",
    ..."←→↑↓✓✗★☆●○◆◇■□",
];

function collectCharacters() {
    const characters = new Set(EXTRA_CHARACTERS);
    const extensions = new Set([".md", ".json", ".astro", ".svelte", ".ts", ".js", ".mjs", ".yaml"]);

    const walk = (directory) => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (extensions.has(path.extname(entry.name))) {
                const text = fs.readFileSync(fullPath, "utf8");
                for (const character of text) {
                    const codePoint = character.codePointAt(0);
                    if (codePoint >= 0x20 && codePoint <= 0xffff) characters.add(character);
                }
            }
        }
    };

    walk(CONTENT_DIR);
    return [...characters].join("");
}

function subsetFamily(spec, characters) {
    const familyName = spec.family === "serif" ? "Serif" : "Sans";
    for (const weight of spec.weights) {
        const input = path.join(SOURCE_DIR, `Noto${familyName}SC-${weight}.ttf`);
        const output = path.join(OUTPUT_DIR, `noto-${spec.family}-sc-${weight}.woff2`);
        if (!fs.existsSync(input)) throw new Error(`Missing font source: ${input}`);

        const result = spawnSync("python3", [
            "-m",
            "fontTools.subset",
            input,
            `--text=${characters}`,
            "--flavor=woff2",
            "--layout-features=*",
            `--output-file=${output}`,
        ], { stdio: "inherit" });

        if (result.status !== 0) throw new Error(`pyftsubset failed for ${input}`);
        console.log(`✓ ${path.relative(ROOT, output)} (${fs.statSync(output).size} bytes)`);
    }
}

const characters = collectCharacters();
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
console.log(`Subsetting ${[...characters].length} unique characters`);
for (const spec of SOURCE_SPECS) subsetFamily(spec, characters);
