<script lang="ts">
import type { Snippet } from "svelte";

interface Props {
    material?: "surface" | "paper" | "metal" | "inset";
    padding?: "none" | "sm" | "md" | "lg";
    children: Snippet;
}

let { material = "surface", padding = "md", children }: Props = $props();
</script>

<div class="sk-panel sk-{material} sk-panel-{padding}">
    {@render children()}
</div>

<style>
    .sk-panel {
        border-radius: 0.6rem;
        min-width: 0;
    }

    .sk-paper { background-image: repeating-linear-gradient(0deg, rgb(0 0 0 / 0.012) 0 1px, transparent 1px 3px); }

    .sk-panel-none { padding: 0; }
    .sk-panel-sm { padding: 0.75rem; }
    .sk-panel-md { padding: 1.25rem; }
    .sk-panel-lg { padding: 2rem; }
</style>
