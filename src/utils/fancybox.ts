import { url } from "@utils/url";

// 由 scripts/build-with-pagefind.cjs 复制到 dist/vendor/。
const vendorCss = url("/vendor/fancybox.css");
const siteCss = url("/vendor/fancybox-theme.css");

let fancyboxSelectors: string[] = [];
let Fancybox: any;
let bound = false;
let armed = false;

const loadStyle = (href: string) =>
    new Promise<void>((resolve) => {
        if (document.querySelector(`link[data-dynamic-style="${href}"]`)) {
            resolve();
            return;
        }
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.setAttribute("data-dynamic-style", href);
        link.addEventListener("load", () => resolve(), { once: true });
        link.addEventListener("error", () => resolve(), { once: true });
        document.head.appendChild(link);
    });


// 相册图片选择器 (只绑定不在 a 标签内的图片，避免与链接绑定冲突)
const albumImagesSelector =
    ".custom-md img:not(a *), #post-cover img:not(a *), .moment-images img:not(a *), .photo-gallery img:not(a *)";
// 相册链接选择器
const albumLinksSelector = ".moment-images a[data-fancybox], .photo-gallery a[data-fancybox]";
// 单张图片选择器
const singleFancyboxSelector = "[data-fancybox]:not(.moment-images a):not(.photo-gallery a)";

const hasZoomableImage = () =>
    !!(
        document.querySelector(albumImagesSelector) ||
        document.querySelector(albumLinksSelector) ||
        document.querySelector(singleFancyboxSelector)
    );

const findTrigger = (target: EventTarget | null): Element | null => {
    if (!(target instanceof Element)) return null;
    return (
        target.closest(albumImagesSelector) ||
        target.closest(albumLinksSelector) ||
        target.closest(singleFancyboxSelector)
    );
};

/*
 * 图片灯箱按需加载。
 *
 * 以前每次 page:view 都直接 initFancybox()：只要页面上有一张正文图片
 * （文章页几乎必然有），就会立刻 import 整个 @fancyapps/ui（约 109KB），
 * 而多数访问者从不点开图片。
 *
 * 现在首屏只挂一个捕获阶段的 click 监听。真的点到可缩放图片时，才加载库、
 * 完成绑定，然后把这次点击重新派发给 Fancybox 自己的监听——它的分组、
 * 键盘与手势行为与原来完全一致，只是成本被推迟到真正需要的那一刻。
 */
export function armFancybox() {
    if (typeof document === "undefined" || armed) return;
    armed = true;

    document.addEventListener(
        "click",
        async (event) => {
            // 库已就绪时交给 Fancybox 自己的监听，这里不再插手。
            if (Fancybox) return;
            const trigger = findTrigger(event.target);
            if (!trigger) return;

            // 图片不该在加载期间被单独打开或跳转。
            event.preventDefault();
            event.stopImmediatePropagation();

            await initFancybox();

            trigger.dispatchEvent(
                new MouseEvent("click", { bubbles: true, cancelable: true, view: window }),
            );
        },
        true,
    );
}

// 图片灯箱：加载库并绑定所有可缩放图片
export async function initFancybox() {
    if (typeof document === "undefined") return;
    if (!hasZoomableImage()) return;
    if (!Fancybox) {
        const mod = await import("@fancyapps/ui");
        Fancybox = mod.Fancybox;
        /*
         * 样式用运行时注入，而不是 import：
         * Vite 会把动态 import 的 CSS 写进 __vite__mapDeps，并为每个入口
         * 生成一条 <link rel="stylesheet">，于是「懒加载」的样式仍然会在
         * 首屏同步请求。静态文件 + 点击时注入才能真正做到按需。
         */
        await Promise.all([loadStyle(vendorCss), loadStyle(siteCss)]);
    }
    if (bound) return;
    bound = true;
    // 公共配置
    const commonConfig = {
        Thumbs: {
            autoStart: true,
            showOnStart: "yes"
        },
        Toolbar: {
            display: {
                left: ["infobar"],
                middle: [
                    "zoomIn",
                    "zoomOut",
                    "toggle1to1",
                    "rotateCCW",
                    "rotateCW",
                    "flipX",
                    "flipY",
                ],
                right: ["slideshow", "thumbs", "close"],
            },
        },
        animated: true,
        dragToClose: true,
        keyboard: {
            Escape: "close",
            Delete: "close",
            Backspace: "close",
            PageUp: "next",
            PageDown: "prev",
            ArrowUp: "next",
            ArrowDown: "prev",
            ArrowRight: "next",
            ArrowLeft: "prev",
        },
        fitToView: true,
        preload: 3,
        infinite: true,
        Panzoom: {
            maxScale: 3,
            minScale: 1
        },
        caption: false,
    };
    // 绑定相册/文章图片
    Fancybox.bind(albumImagesSelector, {
        ...commonConfig,
        groupAll: true,
        Carousel: {
            transition: "slide",
            preload: 2,
        },
    });
    fancyboxSelectors.push(albumImagesSelector);
    // 绑定相册链接
    Fancybox.bind(albumLinksSelector, {
        ...commonConfig,
        source: (el: any) => {
            return el.getAttribute("data-src") || el.getAttribute("href");
        },
    });
    fancyboxSelectors.push(albumLinksSelector);
    // 绑定单独的 fancybox 图片
    Fancybox.bind(singleFancyboxSelector, commonConfig);
    fancyboxSelectors.push(singleFancyboxSelector);
}

// 清理 Fancybox 实例
export function cleanupFancybox() {
    if (!Fancybox) return; // 如果从未加载过，无需清理
    fancyboxSelectors.forEach((selector) => {
        Fancybox.unbind(selector);
    });
    fancyboxSelectors = [];
    bound = false;
}
