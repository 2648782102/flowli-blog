/* This is a script to compile inline Stylus */

const fs = require('fs');
const path = require('path');
const stylus = require('stylus');

// Recursively list files under a directory
function walk(dir) {
  const res = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) res.push(...walk(full));
    else res.push(full);
  }
  return res;
}

const srcDir = path.resolve('src');
if (!fs.existsSync(srcDir)) {
  console.error('No src directory found.');
  process.exit(1);
}

const files = walk(srcDir);

const styleBlockRe = /<style[^>]*lang=["']stylus["'][^>]*>([\s\S]*?)<\/style>/ig;
let failed = false;

function compileStylusContent(content, tmpPath) {
  /*
   * Compile in-process instead of shelling out to the stylus CLI.
   *
   * The old version wrote a .tmp.styl next to the source and ran
   * `stylus <tmp> -o /dev/null`. On macOS the CLI treats the output argument
   * as a directory and calls mkdir('/dev/null'), which fails with EEXIST — so
   * every run reported a bogus error and, worse, left `.tmp.styl` files in
   * src/styles/ because the failure path deliberately kept the temp file.
   *
   * Passing `filename` to the renderer keeps @import resolution working
   * (variables.styl is imported by markdown-extend.styl) with no temp file at
   * all.
   */
  try {
    stylus.render(content, { filename: tmpPath });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

// Check .styl files
const stylFiles = files.filter(f => f.endsWith('.styl'));
for (const f of stylFiles) {
  const content = fs.readFileSync(f, 'utf8');
  const tmp = f + '.tmp.styl';
  const r = compileStylusContent(content, tmp);
  if (r.ok) console.log(`${f}: OK`);
  else {
    failed = true;
    console.error(`${f}: ERROR\n${r.error}`);
  }
}

// Check inline <style lang="stylus"> blocks in component files
const candidateExt = ['.astro', '.svelte', '.vue', '.html'];
for (const f of files) {
  if (!candidateExt.includes(path.extname(f))) continue;
  const text = fs.readFileSync(f, 'utf8');
  let m;
  styleBlockRe.lastIndex = 0;
  let idx = 0;
  while ((m = styleBlockRe.exec(text)) !== null) {
    idx += 1;
    const content = m[1].trim();
    const tmp = `${f}.style.${idx}.tmp.styl`;
    const r = compileStylusContent(content, tmp);
    if (r.ok) console.log(`${f} [style #${idx}]: OK`);
    else {
      failed = true;
      console.error(`${f} [style #${idx}]: ERROR\n${r.error}`);
    }
  }
}

if (failed) {
  console.error('\nStylus check failed. Fix above errors.');
  process.exit(1);
} else {
  console.log('\nAll Stylus checks passed.');
  process.exit(0);
}
