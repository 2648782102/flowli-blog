<script lang="ts">
import { onMount } from "svelte";

import { getDefaultHue, getHue, setHue } from "@utils/hue";
import { onClickOutside } from "@utils/widget";
import { i18n } from "@i18n/translation";
import I18nKey from "@i18n/i18nKey";
import Icon from "@components/common/icon.svelte";


let hue = $state(getDefaultHue());
const defaultHue = getDefaultHue();
let isOpen = $state(false);

function resetHue() {
    hue = getDefaultHue();
}

function togglePanel() {
    isOpen = !isOpen;
}

function closePanel() {
    isOpen = false;
}

// 点击外部关闭面板
function handleClickOutside(event: MouseEvent) {
    if (!isOpen) return;
    onClickOutside(event, "display-setting", "display-settings-switch", () => {
        closePanel();
    });
}

function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && isOpen) {
        closePanel();
    }
}

onMount(() => {
    hue = getHue();
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
        document.removeEventListener("click", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
    };
});

$effect(() => {
    if (hue || hue === 0) {
        setHue(hue);
    }
});
</script>

<div class="relative z-50">
    <button aria-label="显示设置" class="btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90 flex items-center justify-center" 
        id="display-settings-switch"
        data-header-trigger
        aria-expanded={isOpen}
        aria-controls="display-setting-wrapper"
        onclick={togglePanel}
    >
        <Icon icon="material-symbols:palette-outline" class="text-[1.25rem]"></Icon>
    </button>
    <div id="display-setting-wrapper" class="fixed top-14.5 pt-5 right-4 w-[calc(100vw-2rem)] max-w-80 md:absolute md:top-11 md:right-0 md:w-80 md:pt-5 transition-all z-50" class:float-panel-closed={!isOpen} aria-hidden={!isOpen}>
        <div id="display-setting" class="card-base float-panel px-4 py-4 w-full">
            <div class="flex flex-row gap-2 mb-3 items-center justify-between">
                <div class="flex gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100 transition relative ml-3
                    before:w-1 before:h-4 before:rounded-md before:bg-(--primary)
                    before:absolute before:-left-3 before:top-[0.33rem]"
                >
                    {i18n(I18nKey.themeColor)}
                    <button aria-label="恢复默认" class="btn-regular w-7 h-7 rounded-md active:scale-90 flex items-center justify-center"
                            class:opacity-0={hue === defaultHue} class:pointer-events-none={hue === defaultHue} onclick={resetHue}>
                        <div class="text-(--btn-content) flex items-center justify-center">
                            <Icon icon="fa6-solid:arrow-rotate-left" class="text-[0.875rem]"></Icon>
                        </div>
                    </button>
                </div>
                <div class="flex gap-1">
                    <div id="hueValue" class="transition bg-(--btn-regular-bg) w-10 h-7 rounded-md flex justify-center
                    font-bold text-sm items-center text-(--btn-content)">
                        {hue}
                    </div>
                </div>
            </div>
            <div class="w-full h-6 px-1 rounded-sm select-none">
                <input aria-label={i18n(I18nKey.themeColor)} type="range" min="0" max="360" bind:value={hue}
                    class="slider" id="colorSlider" step="5" style="width: 100%">
            </div>
        </div>
    </div>
</div>


<style lang="stylus">
    #display-setting
        input[type="range"]
            -webkit-appearance none
            height 0.45rem
            padding 0
            border 0
            border-radius 999px
            /*
             * A machined track: the hue ramp is the only saturated element, and
             * the recess is drawn by the same inset shadow used elsewhere.
             */
            box-shadow inset 0 1px 2px rgb(38 30 18 / 0.35), inset 0 -1px 0 rgb(255 255 255 / 0.35), 0 1px 0 rgb(255 255 255 / 0.5)
            background linear-gradient(90deg, hsl(0deg 55% 62%), hsl(60deg 55% 58%), hsl(120deg 45% 50%), hsl(180deg 50% 48%), hsl(240deg 55% 55%), hsl(300deg 50% 55%), hsl(360deg 55% 62%))

            /* Input Thumb */
            &::-webkit-slider-thumb
                -webkit-appearance none
                height 0.9rem
                width 0.9rem
                border 2px solid var(--paper-stock)
                border-radius 50%
                background linear-gradient(180deg, #ffffff, #dfe3e9)
                box-shadow 0 1px 2px rgb(38 30 18 / 0.35), 0 2px 6px -1px rgb(38 30 18 / 0.25)
                &:hover
                    background linear-gradient(180deg, #ffffff, #e9edf2)
                &:active
                    background linear-gradient(180deg, #f4f6f8, #d5dae1)

            &::-moz-range-thumb
                -webkit-appearance none
                height 0.9rem
                width 0.9rem
                border 2px solid var(--paper-stock)
                border-radius 50%
                border-width 2px
                background linear-gradient(180deg, #ffffff, #dfe3e9)
                box-shadow 0 1px 2px rgb(38 30 18 / 0.35), 0 2px 6px -1px rgb(38 30 18 / 0.25)
                &:hover
                    background linear-gradient(180deg, #ffffff, #e9edf2)
                &:active
                    background linear-gradient(180deg, #f4f6f8, #d5dae1)

            &::-ms-thumb
                -webkit-appearance none
                height 0.9rem
                width 0.9rem
                border 2px solid var(--paper-stock)
                border-radius 50%
                background linear-gradient(180deg, #ffffff, #dfe3e9)
                box-shadow 0 1px 2px rgb(38 30 18 / 0.35), 0 2px 6px -1px rgb(38 30 18 / 0.25)
                &:hover
                    background rgba(255, 255, 255, 0.8)
                &:active
                    background rgba(255, 255, 255, 0.6)
</style>
