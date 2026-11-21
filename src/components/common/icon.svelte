<script lang="ts">
/**
 * Svelte 图标组件 - 纯构建时内联 SVG
 *
 * 没有运行时回退：旧版本在图标缺失时会 fetch api.iconify.design，
 * 并在失败时唤醒 iconifyLoader 再试一次。那让一个纯静态站点依赖
 * 第三方 API，也让首屏多了可避免的网络往返。缺失的图标应该在
 * scripts/generate-icons.js 里补上，而不是留到运行时。
 */
import { getIconSvg, hasIcon } from "@utils/icons";


interface Props {
    icon: string;
    class?: string;
    style?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
    color?: string;
}

let {
    icon,
    class: className = "",
    style = "",
    size = "md",
    color,
}: Props = $props();

// 尺寸映射
const sizeClasses: Record<string, string> = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
};

const sizeClass = $derived(sizeClasses[size] || sizeClasses.md);
const colorStyle = $derived(color ? `color: ${color};` : "");
const combinedStyle = $derived(`${colorStyle}${style}`);
const combinedClass = $derived(`${sizeClass} ${className}`.trim());

const svgContent = $derived(getIconSvg(icon));
const iconExists = $derived(hasIcon(icon));
</script>

{#if iconExists && svgContent}
    <span
        class="inline-icon inline-flex items-center justify-center {combinedClass}"
        style={combinedStyle}
        aria-hidden="true"
    >
        {@html svgContent}
    </span>
{:else}
    <!-- 缺失图标留一个 1em 占位，避免布局跳动；开发环境会在控制台报错。 -->
    <span
        class="inline-icon inline-flex items-center justify-center {combinedClass}"
        style={combinedStyle}
        aria-hidden="true"
    ></span>
{/if}

<style>
    .inline-icon :global(svg) {
        width: 1em;
        height: 1em;
        display: inline-block;
        vertical-align: middle;
        fill: currentColor;
    }
</style>
