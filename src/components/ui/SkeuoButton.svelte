<script lang="ts">
import type { Snippet } from "svelte";

interface Props {
    variant?: "raised" | "metal" | "rubber";
    size?: "sm" | "md";
    type?: "button" | "submit";
    disabled?: boolean;
    onclick?: (event: MouseEvent) => void;
    children: Snippet;
}

let {
    variant = "raised",
    size = "md",
    type = "button",
    disabled = false,
    onclick,
    children,
}: Props = $props();
</script>

<button
    {type}
    {disabled}
    {onclick}
    class="sk-button sk-{variant} sk-press"
    class:sk-button-sm={size === "sm"}
    class:sk-button-disabled={disabled}
>
    {@render children()}
</button>

<style>
    .sk-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.45rem;
        height: 2.5rem;
        padding-inline: 1rem;
        border: 0;
        border-radius: 0.45rem;
        color: var(--ink);
        font-size: 0.85rem;
        font-weight: 550;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
    }

    .sk-button-sm {
        height: 2rem;
        padding-inline: 0.75rem;
        font-size: 0.78rem;
    }

    .sk-button-disabled {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: none;
    }

    .sk-button:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
    }
</style>
