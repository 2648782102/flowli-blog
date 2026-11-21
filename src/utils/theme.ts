import {
    SYSTEM_MODE,
    DARK_MODE,
    LIGHT_MODE,
} from "@constants/style";
import type {
    LIGHT_DARK_MODE,
} from "@/types/config";
import {
    siteConfig,
} from "@/config";


// Function to apply theme to document
export function applyThemeToDocument(theme: LIGHT_DARK_MODE, force = false) {
    if (typeof document === "undefined") return;
    // 获取当前主题状态的完整信息
    const currentIsDark = document.documentElement.classList.contains("dark");
    const currentTheme = document.documentElement.getAttribute("data-theme");
    // 计算目标主题状态
    let targetIsDark: boolean;
    switch (theme) {
        case LIGHT_MODE:
            targetIsDark = false;
            break;
        case DARK_MODE:
            targetIsDark = true;
            break;
        case SYSTEM_MODE:
            targetIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            break;
        default:
            targetIsDark = currentIsDark; // fallback to current mode if theme is unknown
            break;
    }
    // 检测是否真的需要主题切换
    const needsThemeChange = currentIsDark !== targetIsDark;
    const targetTheme = targetIsDark ? "github-dark" : "github-light";
    const needsCodeThemeUpdate = currentTheme !== targetTheme;
    // 如果既不需要主题切换也不需要代码主题更新且不是强制更新，直接返回
    if (!force && !needsThemeChange && !needsCodeThemeUpdate) {
        return;
    }
    /*
     * Changing the theme is the lights being moved.
     *
     * The page is one desk under one lamp, so all of its materials change
     * together — there is no partial state worth showing. The previous
     * approach froze every transition with `is-theme-transitioning`, flipped
     * the classes in one frame, and unfroze: correct, but it threw away the
     * one moment where the material system could prove it is a single scene.
     *
     * A view transition does the same thing as one cross-fade of the whole
     * document, which is exactly the gesture: the same room, relit. Browsers
     * without it fall back to the freeze path.
     */
    const apply = () => {
        if (needsThemeChange) {
            document.documentElement.classList.toggle("dark", targetIsDark);
        }
        // Set the theme for Expressive Code based on current mode
        document.documentElement.setAttribute("data-theme", targetTheme);
    };

    if (!needsThemeChange) {
        requestAnimationFrame(apply);
        return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canTransition = typeof document.startViewTransition === "function" && !reduced;

    if (!canTransition) {
        /* No view transitions (or motion is unwanted): keep the freeze, so the
           palette swaps in one paint instead of cross-fading per element. */
        document.documentElement.classList.add("is-theme-transitioning");
        requestAnimationFrame(() => {
            apply();
            requestAnimationFrame(() => {
                document.documentElement.classList.remove("is-theme-transitioning");
            });
        });
        return;
    }

    /*
     * `is-relighting` lets CSS pause decorative motion (the scroll-linked
     * catch) for the duration of the change: a snapshot of a page that is
     * itself moving cross-fades badly.
     */
    document.documentElement.classList.add("is-relighting");
    const transition = document.startViewTransition(apply);
    transition.finished.finally(() => {
        document.documentElement.classList.remove("is-relighting");
    });
}

// Function to set theme
export function setTheme(theme: LIGHT_DARK_MODE): void {
    if (typeof localStorage !== "undefined") {
        localStorage.setItem("theme", theme);
    }
    applyThemeToDocument(theme);
}

// Function to get default theme from config-carrier
export function getDefaultTheme(): LIGHT_DARK_MODE {
    const fallback = siteConfig.defaultTheme;
    if (typeof document !== "undefined") {
        const configCarrier = document.getElementById("config-carrier");
        return (configCarrier?.dataset.theme as LIGHT_DARK_MODE) || fallback;
    }
    return fallback;
}

// Function to get stored theme from local storage or default
export function getStoredTheme(): LIGHT_DARK_MODE {
    if (typeof localStorage !== "undefined") {
        return (localStorage.getItem("theme") as LIGHT_DARK_MODE) || getDefaultTheme();
    }
    return getDefaultTheme();
}

// Function to initialize theme from local storage or default
export function initTheme(): void {
    if (typeof window === "undefined") return;
    const storedTheme = getStoredTheme();
    applyThemeToDocument(storedTheme, true);
    // 监听系统主题变化
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        const currentStored = getStoredTheme();
        if (currentStored === SYSTEM_MODE) {
            applyThemeToDocument(SYSTEM_MODE);
        }
    });
}