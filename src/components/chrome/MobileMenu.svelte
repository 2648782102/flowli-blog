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
        border-radius: var(--r-sm);
        background: transparent;
        color: var(--ink);
        cursor: pointer;
        transition: background-color var(--motion-touch), box-shadow var(--motion-touch), translate var(--motion-touch);
    }

    .menu__toggle:hover {
        background: color-mix(in srgb, var(--ink) 9%, transparent);
        box-shadow: 0 1px 2px rgb(38 30 18 / 0.14);
    }

    .menu__toggle:active {
        translate: 0 1px;
        box-shadow: 0 1px 2px rgb(38 30 18 / 0.2) inset;
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

    /* A sheet of paper lifted off the desk, matching every other panel. */
    .menu__panel {
        position: absolute;
        top: calc(100% + 0.6rem);
        right: 0;
        z-index: 41;
        display: flex;
        flex-direction: column;
        min-width: 11rem;
        padding: 0.4rem;
        border: 0;
        border-radius: var(--r-lg, 0.875rem);
        background-color: var(--paper-stock, #fdfbf5);
        background-image: linear-gradient(
            175deg,
            rgb(255 255 255 / 0.9) 0,
            rgb(255 255 255 / 0) 2.5rem
        );
        box-shadow: var(--lift-float, 0 12px 32px rgb(0 0 0 / 0.16));
        outline: 1px solid rgb(38 30 18 / 0.12);
        outline-offset: -1px;
        animation: menu-settle 200ms cubic-bezier(0.22, 0.61, 0.36, 1);
    }

    .menu__item {
        display: flex;
        align-items: center;
        padding: 0.6rem 0.75rem;
        border-radius: var(--r-sm, 0.375rem);
        color: var(--ink-soft, var(--ink));
        font-size: 0.9rem;
        font-weight: 500;
        line-height: 1.4;
        text-decoration: none;
        transition:
            background-color 140ms ease,
            box-shadow var(--motion-touch),
            color var(--motion-touch),
            translate var(--motion-touch);
    }

    .menu__item:hover {
        background-color: var(--enamel, #f3f1ec);
        background-image: none;
        box-shadow: var(--lift-1, none);
        color: var(--ink);
    }

    .menu__item:active {
        translate: 0 1px;
        box-shadow: var(--sink-1, none);
    }

    .menu__item.is-active {
        background-color: var(--well, #f4f0e6);
        background-image: none;
        box-shadow: var(--sink-1, none);
        color: var(--foil, var(--accent));
        font-weight: 600;
    }

    .menu__item.is-active:hover {
        translate: none;
        background-color: var(--well, #f4f0e6);
        box-shadow: var(--sink-1, none);
    }

    /* Dark theme: the top catch must stay a faint bounce, never a white band. */
    :global(html:root.dark) .menu__panel {
        background-image: linear-gradient(
            175deg,
            rgb(255 255 255 / 0.07) 0,
            rgb(255 255 255 / 0) 2.5rem
        );
        outline-color: rgb(255 255 255 / 0.09);
    }

    /*
     * The panel is set down, not thrown: it arrives already in place with a
     * small settle of the shadow, rather than sliding in from above. Sliding
     * a floating panel contradicts the material rule that a panel is *lifted*
     * off the desk — it should appear above the surface, not travel across it.
     */
    @keyframes menu-settle {
        from {
            opacity: 0;
            translate: 0 -3px;
        }
        to {
            opacity: 1;
            translate: none;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .menu__panel {
            animation: none;
        }
    }
</style>
