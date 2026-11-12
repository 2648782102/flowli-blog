<script lang="ts">
import { onMount } from "svelte";

import { getPostUrl } from "@utils/url";
import { getCategoryPathLabel, getCategoryPathParts } from "@utils/category";
import { parseTags } from "@utils/tag";
import { i18n } from "@i18n/translation";
import I18nKey from "@i18n/i18nKey";


interface Post {
    id: string;
    data: {
        title: string;
        tags: string[];
        category?: string | string[] | null;
        published: Date | string;
        routeName?: string;
    };
}

interface Group {
    year: number;
    posts: Post[];
}

interface Props {
    sortedPosts?: Post[];
}

let { sortedPosts = [] }: Props = $props();

let tags = $state<string[]>([]);
let categories = $state<string[]>([]);
let uncategorized = $state<string | null>(null);

onMount(() => {
    const params = new URLSearchParams(window.location.search);
    tags = params.has("tag") ? params.getAll("tag") : [];
    categories = params.has("category") ? params.getAll("category") : [];
    uncategorized = params.get("uncategorized");
});

function formatDate(date: Date | string) {
    const d = new Date(date);
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${month}-${day}`;
}

function formatTag(tagList: string[]) {
    return tagList.map((t) => `#${t}`).join(" ");
}

function isCategoryMatch(category: string | string[] | null | undefined, targets: string[]) {
    const postParts = getCategoryPathParts(category);
    if (!postParts || postParts.length === 0) return false;
    return targets.some((target) => {
        const targetParts = target
            .split(" / ")
            .map((part) => part.trim())
            .filter((part) => part.length > 0);
        if (targetParts.length === 0) return false;
        if (targetParts.length > postParts.length) return false;
        return targetParts.every((part, index) => part === postParts[index]);
    });
}

let groups = $derived.by(() => {
    let filteredPosts = sortedPosts.map((post) => ({
        ...post,
        data: {
            ...post.data,
            published: new Date(post.data.published),
        },
    }));

    if (tags.length > 0) {
        filteredPosts = filteredPosts.filter(
            (post) =>
            {
                const postTags = parseTags(post.data.tags);
                return postTags.some((tag) => tags.includes(tag));
            }
        );
    }

    if (categories.length > 0) {
        filteredPosts = filteredPosts.filter(
            (post) => isCategoryMatch(post.data.category, categories),
        );
    }

    if (uncategorized !== null) {
        filteredPosts = filteredPosts.filter((post) => !getCategoryPathLabel(post.data.category));
    }

    // 按发布时间倒序排序，确保不受置顶影响
    filteredPosts = filteredPosts.slice().sort((a, b) => b.data.published.getTime() - a.data.published.getTime());

    const grouped = filteredPosts.reduce(
        (acc, post) => {
            const year = post.data.published.getFullYear();
            if (!acc[year]) {
                acc[year] = [];
            }
            acc[year].push(post);
            return acc;
        },
        {} as Record<number, Post[]>,
    );

    const groupedPostsArray = Object.keys(grouped).map((yearStr) => ({
        year: Number.parseInt(yearStr, 10),
        posts: grouped[Number.parseInt(yearStr, 10)],
    }));

    groupedPostsArray.sort((a, b) => b.year - a.year);

    return groupedPostsArray;
});
</script>

<div id="archive-index">
    {#each groups as group}
        <section>
            <div class="archive-year">
                <h2>{group.year}</h2>
                <div class="archive-count">
                    {group.posts.length} {i18n(group.posts.length === 1 ? I18nKey.postCount : I18nKey.postsCount)}
                </div>
            </div>
            {#each group.posts as post}
                <a href={getPostUrl(post)}
                    aria-label={post.data.title}
                    class="archive-row btn-plain"
                >
                    <time datetime={new Date(post.data.published).toISOString()}>{formatDate(post.data.published)}</time>
                    <span class="archive-row-title">{post.data.title}</span>
                    <span class="archive-row-tags">{formatTag(post.data.tags)}</span>
                </a>
            {/each}
        </section>
    {/each}
</div>
