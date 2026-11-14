<script lang="ts">
import { Switch } from "bits-ui";

interface Props {
    checked?: boolean;
    label?: string;
    onCheckedChange?: (checked: boolean) => void;
}

let { checked = $bindable(false), label = "", onCheckedChange }: Props = $props();
</script>

<label class="skeuo-switch">
    <Switch.Root
        bind:checked
        {onCheckedChange}
        class="skeuo-switch-track"
        aria-label={label}
    >
        <Switch.Thumb class="skeuo-switch-thumb" />
    </Switch.Root>
    {#if label}<span class="skeuo-switch-label">{label}</span>{/if}
</label>

<style>
    .skeuo-switch {
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        cursor: pointer;
    }

    .skeuo-switch-track {
        position: relative;
        display: inline-flex;
        align-items: center;
        width: 3rem;
        height: 1.65rem;
        padding: 0.15rem;
        border-radius: 999px;
        background: var(--mat-surface-sunken);
        box-shadow: var(--shadow-inset);
        transition: background-color 160ms ease;
    }

    .skeuo-switch-track[data-state="checked"] {
        background: linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 70%, black));
    }

    .skeuo-switch-thumb {
        display: block;
        width: 1.35rem;
        height: 1.35rem;
        border-radius: 50%;
        background: linear-gradient(180deg, #fff, #d8dee6);
        box-shadow:
            0 1px 0 rgb(255 255 255 / 0.9) inset,
            0 1px 3px rgb(0 0 0 / 0.35);
        transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .skeuo-switch-track[data-state="checked"] .skeuo-switch-thumb {
        transform: translateX(1.35rem);
    }

    .skeuo-switch-label {
        font-size: 0.85rem;
        color: var(--ink-soft);
    }

    @media (prefers-reduced-motion: reduce) {
        .skeuo-switch-thumb { transition: none; }
    }
</style>
