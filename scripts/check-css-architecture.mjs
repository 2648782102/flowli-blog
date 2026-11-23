#!/usr/bin/env node
/*
 * Guards the CSS layering contract documented in docs/css-architecture.md.
 * This is intentionally mechanical: it catches structural drift, not style.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STYLES = path.join(ROOT, "src", "styles");
const LAYOUT = path.join(ROOT, "src", "layouts", "base.astro");

const ALLOWED = {
    foundation: new Set([
        "albums.css",
        "editorial-paper.css",
        "expressive-code.css",
        "main.css",
        "markdown-extend.generated.css",
        "markdown.css",
        "transition.css",
    ]),
    tokens: new Set(["theme.css"]),
    materials: new Set(["fancybox.css", "skeuo-materials.css", "skeuo.css"]),
    layout: new Set(["site-layout.css", "skeuo-layout.css"]),
    components: new Set([
        "site-header.css",
        "skeuo-archive.css",
        "skeuo-home.css",
        "skeuo-read.css",
        "skeuo-tools.css",
    ]),
    motion: new Set(["motion.css"]),
};

const IMPORT_ORDER = [
    '@styles/foundation/editorial-paper.css',
    '@styles/tokens/theme.css',
    '@styles/materials/skeuo.css',
    '@styles/materials/skeuo-materials.css',
    '@styles/components/skeuo-archive.css',
    '@styles/components/skeuo-home.css',
    '@styles/components/skeuo-read.css',
    '@styles/components/skeuo-tools.css',
    '@styles/layout/skeuo-layout.css',
    '@styles/layout/site-layout.css',
    '@styles/components/site-header.css',
    '@styles/motion/motion.css',
];

const IMPORTERS = new Set([
    path.join(STYLES, "foundation", "editorial-paper.css"),
    path.join(STYLES, "foundation", "main.css"),
]);

const errors = [];

const rootCss = fs.readdirSync(STYLES).filter((name) => name.endsWith(".css"));
if (rootCss.length) errors.push(`CSS files must live in a layer directory: ${rootCss.join(", ")}`);

for (const [layer, allowed] of Object.entries(ALLOWED)) {
    const directory = path.join(STYLES, layer);
    if (!fs.existsSync(directory)) {
        errors.push(`Missing layer directory: src/styles/${layer}`);
        continue;
    }
    const found = fs.readdirSync(directory).filter((name) => name.endsWith(".css"));
    for (const file of found) {
        if (!allowed.has(file)) errors.push(`Unexpected CSS in src/styles/${layer}: ${file}`);
    }
    for (const file of allowed) {
        if (!found.includes(file)) errors.push(`Missing CSS in src/styles/${layer}: ${file}`);
    }
}

const layoutSource = fs.readFileSync(LAYOUT, "utf8");
const actualImports = [...layoutSource.matchAll(/^import\s+["']([^"']+\.css)["'];?$/gm)].map((m) => m[1]);
if (JSON.stringify(actualImports) !== JSON.stringify(IMPORT_ORDER)) {
    errors.push("CSS import order in src/layouts/base.astro does not match docs/css-architecture.md");
}
if (!layoutSource.includes('@reference "../styles/foundation/main.css";')) {
    errors.push("base.astro must reference src/styles/foundation/main.css for Tailwind utilities");
}

const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
});

for (const file of walk(STYLES).filter((name) => name.endsWith(".css"))) {
    const source = fs.readFileSync(file, "utf8");
    const relative = path.relative(ROOT, file);
    if (source.includes("@import") && !IMPORTERS.has(file)) {
        errors.push(`${relative} must not contain @import; add it to the base.astro import list`);
    }
    if (/url\(["']?\/flowli-blog\//.test(source)) {
        errors.push(`${relative} hardcodes the /flowli-blog base path`);
    }
}

if (errors.length) {
    console.error("CSS architecture check failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
}

console.log("CSS architecture OK: 12 layered imports, 6 directories, no hardcoded base.");
