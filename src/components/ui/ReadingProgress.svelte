<script lang="ts">
import { onMount } from "svelte";

let progress = $state(0);

onMount(() => {
    const target = document.querySelector("#post-container");
    if (!target) return;

    const update = () => {
        const rect = target.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        if (total <= 0) {
            progress = 100;
            return;
        }
        const scrolled = Math.min(Math.max(-rect.top, 0), total);
        progress = Math.round((scrolled / total) * 100);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
        window.removeEventListener("scroll", update);
        window.removeEventListener("resize", update);
    };
});
</script>

<div
    class="reading-progress"
    role="progressbar"
    aria-label="阅读进度"
    aria-valuenow={progress}
    aria-valuemin="0"
    aria-valuemax="100"
>
    <div class="reading-progress-bar" style={`width: ${progress}%`}></div>
</div>

<style>
    .reading-progress {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 60;
        height: 3px;
        background: transparent;
        pointer-events: none;
    }

    .reading-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 60%, white));
        box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 45%, transparent);
        transition: width 90ms linear;
    }

    @media (prefers-reduced-motion: reduce) {
        .reading-progress-bar { transition: none; }
    }
</style>
