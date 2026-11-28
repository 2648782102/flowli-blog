// biome-ignore lint/suspicious/noShadowRestrictedNames: <toString from mdast-util-to-string>
import { toString } from "mdast-util-to-string";
import getReadingTime from "reading-time";


/**
 * Remove diagram markup before counting.
 *
 * Notes now carry inline `<svg>` figures. Rehype runs after remark, so at this
 * point the figure is still raw HTML in an `html` node — and `toString` happily
 * counts every attribute and path coordinate. A one-sentence note with a
 * diagram reported 353 words.
 *
 * The figure's <figcaption> is real prose, so it is kept: it adds to reading
 * time the same way any other caption does.
 *
 * This walks a copy of the text instead of editing the tree — remark plugins
 * run on the live document, so mutating here would delete the figure itself.
 */
function readableText(node) {
    if (!node) return "";
    if (node.type === "html" && typeof node.value === "string") {
        if (!node.value.includes("<svg")) return node.value;
        return [...node.value.matchAll(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g)]
            .map((m) => m[1].replace(/<[^>]+>/g, " ").trim())
            .join(" ");
    }
    if (typeof node.value === "string" && ["text", "inlineCode", "code"].includes(node.type)) {
        return node.value;
    }
    if (Array.isArray(node.children)) {
        return node.children.map(readableText).join(" ");
    }
    return "";
}

export function remarkReadingTime() {
    return (tree, { data }) => {
        /* `toString` would count raw <svg> attributes as words. */
        const textOnPage = readableText(tree) || toString(tree);
        const readingTime = getReadingTime(textOnPage);
        data.astro.frontmatter.minutes = Math.max(
            1,
            Math.round(readingTime.minutes),
        );
        data.astro.frontmatter.words = readingTime.words;
    };
}
