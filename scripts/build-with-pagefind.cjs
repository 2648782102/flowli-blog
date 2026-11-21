/* This is a script to build the site with Pagefind */

const { execSync } = require('child_process');
const { existsSync, cpSync, mkdirSync } = require('fs');
const { join } = require('path');

/*
 * KaTeX is only linked by post pages that actually contain math, so its
 * stylesheet and fonts are copied as static assets instead of being bundled.
 * Shipping them to every page cost ~31KB of CSS on a site with no formulas.
 */
function copyKatexAssets() {
    const from = join(process.cwd(), 'node_modules', 'katex', 'dist');
    const to = join(process.cwd(), 'dist', 'katex');
    if (!existsSync(from)) {
        console.warn('⚠️  katex/dist not found, skipping KaTeX assets');
        return;
    }
    mkdirSync(to, { recursive: true });
    cpSync(join(from, 'katex.min.css'), join(to, 'katex.min.css'), { recursive: false });
    cpSync(join(from, 'fonts'), join(to, 'fonts'), { recursive: true });
    console.log('📐 Copied KaTeX stylesheet and fonts to dist/katex/');
}

/*
 * Fancybox 的样式表也走静态资源。
 *
 * 动态 import CSS 时 Vite 会把它登记进 __vite__mapDeps，然后为每个入口页
 * 生成一条 <link rel="stylesheet">——也就是说「懒加载」的样式其实每次都会
 * 同步请求。既然灯箱只在点击后才出现，样式就没必要参与首屏渲染：
 * 这里把它复制成静态文件，由 fancybox.ts 在真正加载库时注入。
 */
function copyFancyboxStyles() {
    const from = join(process.cwd(), 'node_modules', '@fancyapps', 'ui', 'dist', 'fancybox', 'fancybox.css');
    const to = join(process.cwd(), 'dist', 'vendor', 'fancybox.css');
    if (!existsSync(from)) {
        console.warn('⚠️  @fancyapps/ui fancybox.css not found, skipping');
        return;
    }
    mkdirSync(join(process.cwd(), 'dist', 'vendor'), { recursive: true });
    cpSync(from, to);

    // 站点自己的灯箱覆盖样式，同样只在打开灯箱时才需要。
    const theme = join(process.cwd(), 'src', 'styles', 'fancybox.css');
    if (existsSync(theme)) {
        cpSync(theme, join(process.cwd(), 'dist', 'vendor', 'fancybox-theme.css'));
    }
    console.log('🖼  Copied Fancybox stylesheets to dist/vendor/');
}

// Main function
function main() {
    const outputDir = 'dist';

    console.log(`📁 Pagefind output directory: ${outputDir}`);

    try {
        // Run Astro build
        console.log('🔨 Running Astro build...');
        execSync(`npx astro build`.trim(), {
            stdio: 'inherit',
            cwd: process.cwd() // Ensure in the correct directory
        });

        // Check if output directory exists
        if (!existsSync(outputDir)) {
            console.error(`❌ Output directory does not exist: ${outputDir}`);
            process.exit(1);
        }

        copyKatexAssets();
        copyFancyboxStyles();

        // Run Pagefind
        console.log(`🔍 Running Pagefind search index generation...`);
        execSync(`npx pagefind --site ${outputDir}`, {
            stdio: 'inherit',
            cwd: process.cwd() // Ensure in the correct directory
        });

        console.log('✅ Build completed!');
        console.log(`📊 Search index generated at: ${outputDir}/pagefind/`);

    } catch (error) {
        console.error('❌ Build failed:', error.message);
        process.exit(1);
    }
}

main();
