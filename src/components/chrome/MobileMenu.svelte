<script lang="ts">
import { onMount } from "svelte";
import type { NavbarLink } from "@/types/config";
import { url } from "@utils/url";

interface Props {
    links: NavbarLink[];
}

let { links }: Props = $props();
let open = $state(false);
let currentPath = $state("");

function normalize(pathname: string) {
    return pathname.replace(/\/+$/, "") || "/";
}

function isActive(link: NavbarLink) {
    if (link.external) return false;
    const target = normalize(new URL(url(link.url), location.href).pathname);
    const root = normalize(new URL(url("/"), location.href).pathname);
    if (target === root) return currentPath === root;
    return currentPath === target || currentPath.startsWith(`${target}/`);
}

function syncCurrentPath() {
    currentPath = normalize(location.pathname);
}

function close() {
    open = false;
}

function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && open) close();
}

onMount(() => {
    syncCurrentPath();
    document.addEventListener("keydown", onKeydown);
    document.addEventListener("swup:page:view", syncCurrentPath);
    return () => {
        document.removeEventListener("keydown", onKeydown);
        document.removeEventListener("swup:page:view", syncCurrentPath);
    };
});
</script>

<div class="menu">
    <button
        class="menu__toggle"
        type="button"
        aria-label="打开菜单"
        aria-expanded={open}
        aria-controls="site-mobile-menu"
        onclick={() => (open = !open)}
    >
        <span class="menu__bars" aria-hidden="true"><i></i><i></i><i></i></span>
    </button>

    {#if open}
        <div class="menu__scrim" role="presentation" onclick={close}></div>
        <nav id="site-mobile-menu" class="menu__panel" aria-label="移动导航">
            {#each links as link}
                <a
                    class={`menu__item${isActive(link) ? " is-active" : ""}`}
                    href={link.external ? link.url : url(link.url)}
                    target={link.external ? "_blank" : null}
                    rel={link.external ? "noreferrer" : null}
                    aria-current={isActive(link) ? "page" : undefined}
                    onclick={close}
                >
                    {link.name}
                </a>
            {/each}
        </nav>
    {/if}
</div>

<style>
    .menu {
        position: relative;
        display: flex;
        align-items: center;
    }

    .menu__toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.25rem;
        height: 2.25rem;
        padding: 0;
        border: 0;
        border-radius: 0.4rem;
        background: transparent;
        color: var(--ink);
        cursor: pointer;
    }

    .menu__toggle:hover {
        background: color-mix(in srgb, var(--ink) 8%, transparent);
    }

    .menu__bars {
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 16px;
    }

    .menu__bars i {
        display: block;
        height: 1.5px;
        border-radius: 1px;
        background: currentColor;
    }

    .menu__scrim {
        position: fixed;
        inset: 0;
        z-index: 40;
    }

    .menu__panel {
        position: absolute;
        top: calc(100% + 0.6rem);
        right: 0;
        z-index: 41;
        display: flex;
        flex-direction: column;
        min-width: 11rem;
        padding: 0.4rem;
        border: 1px solid var(--hairline);
        border-radius: 0.5rem;
        background: var(--mat-surface-raised, #fff);
        box-shadow: var(--shadow-float, 0 12px 32px rgb(0 0 0 / 0.16));
    }

    .menu__item {
        padding: 0.55rem 0.75rem;
        border-radius: 0.35rem;
        color: var(--ink);
        font-size: 0.88rem;
        text-decoration: none;
    }

    .menu__item:hover {
        background: color-mix(in srgb, var(--ink) 7%, transparent);
    }

    .menu__item.is-active {
        background: color-mix(in srgb, var(--ink) 9%, transparent);
        font-weight: 600;
    }
</style>
