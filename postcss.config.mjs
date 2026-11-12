// PostCSS config for CSS imports.
// Stylus imports are compiled into plain CSS at build time so the Vite dev
// server never tries to parse `.styl` syntax as PostCSS.
import fs from 'node:fs';

const sourcePath = 'src/styles/markdown-extend.styl';
const outputPath = 'src/styles/markdown-extend.generated.css';
const { render } = await import('stylus');

fs.writeFileSync(
    outputPath,
    render(fs.readFileSync(sourcePath, 'utf8'), { filename: sourcePath }),
    'utf8',
);

export default {};
