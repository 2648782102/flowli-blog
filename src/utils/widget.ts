/**
 * 功能层工具（收敛版）。
 *
 * 侧栏 widget 组件及其布局 / 排序 / 可见性计算已全部移除，这里只保留两个
 * 被真实依赖的导出：
 *   - onClickOutside：导航栏搜索 / 主题 / 翻译 / 壁纸 / 菜单 / 显示设置面板的关闭逻辑；
 *   - widgetManager.getPageHeadings：文章页浮动目录（components/sidebar/toc.ts）读取标题。
 * 两者都是功能层底线，不可删。
 */

export class WidgetManager {
    /** 获取页面中带 id 的标题列表，供浮动目录使用 */
    getPageHeadings() {
        if (typeof document === "undefined") return [];
        return Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"))
            .filter((h) => h.id)
            .map((h) => ({
                depth: parseInt(h.tagName.substring(1)),
                slug: h.id,
                text: (h.textContent || "").replace(/#+\s*$/, ""),
            }));
    }
}

export const widgetManager = new WidgetManager();

/** 点击面板外部时关闭；ignoreIds 中的按钮不触发关闭 */
export function onClickOutside(
    event: MouseEvent,
    panelId: string,
    ignoreIds: string | string[],
    action: () => void
) {
    if (typeof document === "undefined") {
        return;
    }
    const panel = document.getElementById(panelId);
    const target = event.target as HTMLElement;
    const ids = Array.isArray(ignoreIds) ? ignoreIds : [ignoreIds];

    for (const id of ids) {
        if (target.closest(`#${id}`)) {
            return;
        }
    }

    if (panel && !panel.contains(target)) {
        action();
    }
}
