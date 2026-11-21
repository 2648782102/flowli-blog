import { type CollectionEntry, getCollection } from "astro:content";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { CATEGORY_SEPARATOR, type CategoryPath, getCategoryPathParts } from "@utils/category";
import { parseTags, type Tag } from "@utils/tag";
import { getCategoryUrl } from "@utils/url";
import { i18n } from "@i18n/translation";
import I18nKey from "@i18n/i18nKey";


type ResolvedPost = CollectionEntry<"posts"> & {
    data: CollectionEntry<"posts">["data"] & { published: Date };
};

function getFileBirthtime(filePath: string): Date {
    try {
        return fs.statSync(filePath).birthtime;
    } catch {
        return new Date();
    }
}

/**
 * 一次构建只问 git 一次。
 *
 * 旧实现对每篇缺 published 的文章各跑一次 `git log --follow`，
 * 是典型的 N+1：文章越多，构建越慢，而且每次都是一个同步子进程。
 * 这里改成整库只取一次「文件 → 首次提交日期」，之后按路径查表。
 */
let gitDateMap: Map<string, Date> | null = null;

function loadGitDates(): Map<string, Date> {
    if (gitDateMap) return gitDateMap;
    gitDateMap = new Map();
    try {
        const output = execSync(
            'git log --diff-filter=A --format="%aI%x1f%n" --name-only -- "src/content/posts"',
            { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"], timeout: 15000 },
        );
        let currentDate: Date | null = null;
        for (const rawLine of output.split("\n")) {
            const line = rawLine.trim();
            if (!line) continue;
            if (line.includes("\u001f") || /^\d{4}-\d{2}-\d{2}T/.test(line)) {
                const parsed = new Date(line.replace("\u001f", ""));
                if (!Number.isNaN(parsed.getTime())) currentDate = parsed;
                continue;
            }
            if (currentDate && !gitDateMap.has(line)) {
                gitDateMap.set(line, currentDate);
            }
        }
    } catch {
        // 没有 git 历史（例如浅克隆）时退回文件时间，不阻断构建。
    }
    return gitDateMap;
}

function getGitFirstCommitDate(filePath: string): Date | null {
    const dates = loadGitDates();
    const relative = path.relative(process.cwd(), path.resolve(filePath));
    return dates.get(relative) ?? dates.get(filePath) ?? null;
}

function resolvePublishDate(post: CollectionEntry<"posts">) {
    if (post.data.published) return;
    const filePath = post.filePath || path.join(process.cwd(), "src", "content", "posts", post.id);

    const gitDate = getGitFirstCommitDate(filePath);
    if (gitDate && !isNaN(gitDate.getTime())) {
        (post.data as Record<string, unknown>).published = gitDate;
        return;
    }

    (post.data as Record<string, unknown>).published = getFileBirthtime(filePath);
}

/*
 * 构建期缓存。
 *
 * getSortedPosts / getSortedPostsList / getTagList / getCategoryList 分属
 * 不同页面，但它们读的是同一份内容集合。以前每个入口都重新 getCollection
 * 并重新排序一遍，文章多了以后是明显的重复工作。
 */
let sortedPostsCache: Promise<ResolvedPost[]> | null = null;

// 构建目录下内容不会变化，缓存生命周期与进程一致即可。
async function getRawSortedPosts(): Promise<ResolvedPost[]> {
    if (!sortedPostsCache) {
        sortedPostsCache = computeRawSortedPosts();
    }
    return sortedPostsCache;
}

async function computeRawSortedPosts(): Promise<ResolvedPost[]> {
    // 与标签/分类共用同一份集合，避免重复读取。
    const allBlogPosts = [...(await getPublishedPosts())];

    for (const post of allBlogPosts) {
        resolvePublishDate(post);
    }

    const sorted = allBlogPosts.sort((a, b) => {
        // 首先按置顶状态排序，置顶文章在前
        if (a.data.pinned && !b.data.pinned) return -1;
        if (!a.data.pinned && b.data.pinned) return 1;

        // 如果置顶状态相同，则按发布日期排序
        const dateA = new Date(a.data.published!);
        const dateB = new Date(b.data.published!);
        return dateA > dateB ? -1 : 1;
    });

    return sorted as ResolvedPost[];
}

let prevNextLinked = false;

/**
 * 给每篇文章补上前后篇链接。
 *
 * 这组字段是幂等的，而且指向同一批缓存对象——以前每次调用都重跑一遍
 * 两个循环，等于对同一份数据反复写同样的值。
 */
export async function getSortedPosts() {
    const sorted = await getRawSortedPosts();
    if (prevNextLinked) return sorted;

    for (let i = 1; i < sorted.length; i++) {
        sorted[i].data.nextSlug = sorted[i - 1].id;
        sorted[i].data.nextTitle = sorted[i - 1].data.title;
    }
    for (let i = 0; i < sorted.length - 1; i++) {
        sorted[i].data.prevSlug = sorted[i + 1].id;
        sorted[i].data.prevTitle = sorted[i + 1].data.title;
    }
    prevNextLinked = true;

    return sorted;
}
export type PostForList = {
    id: string;
    data: ResolvedPost["data"];
};
export async function getSortedPostsList(): Promise<PostForList[]> {
    const sortedFullPosts = await getRawSortedPosts();

    // delete post.body
    const sortedPostsList = sortedFullPosts.map((post) => ({
        id: post.id,
        data: post.data,
    }));

    return sortedPostsList;
}
/*
 * 发布集合：标签、分类、目录树都只需要「已发布的文章」，不必各自再查一遍。
 */
let publishedPostsCache: Promise<CollectionEntry<"posts">[]> | null = null;

function getPublishedPosts(): Promise<CollectionEntry<"posts">[]> {
    if (!publishedPostsCache) {
        publishedPostsCache = getCollection<"posts">("posts", ({ data }) => {
            return import.meta.env.PROD ? data.draft !== true : true;
        });
    }
    return publishedPostsCache;
}

export async function getTagList(): Promise<Tag[]> {
    const allBlogPosts = await getPublishedPosts();

    const countMap: { [key: string]: number } = {};
    allBlogPosts.forEach((post: { data: { tags: string[] } }) => {
        const tags = parseTags(post.data.tags);
        tags.forEach((tag: string) => {
            if (!countMap[tag]) countMap[tag] = 0;
            countMap[tag]++;
        });
    });

    // sort tags
    const keys: string[] = Object.keys(countMap).sort((a, b) => {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    });

    return keys.map((key) => ({ name: key, count: countMap[key] }));
}

export type Category = {
    name: string;
    count: number;
    url: string;
};

export type CategoryTreeItem = {
    name: string;
    count: number;
    url: string;
    path: CategoryPath;
    children: CategoryTreeItem[];
};

export async function getCategoryList(): Promise<Category[]> {
    const allBlogPosts = await getPublishedPosts();
    const count: { [key: string]: number } = {};
    allBlogPosts.forEach((post: { data: { category: string | string[] | null } }) => {
        const categoryParts = getCategoryPathParts(post.data.category);
        if (!categoryParts) {
            const ucKey = i18n(I18nKey.uncategorized);
            count[ucKey] = count[ucKey] ? count[ucKey] + 1 : 1;
            return;
        }

        const categoryName = categoryParts.join(CATEGORY_SEPARATOR);
        count[categoryName] = count[categoryName] ? count[categoryName] + 1 : 1;
    });

    const lst = Object.keys(count).sort((a, b) => {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    });

    const ret: Category[] = [];
    for (const c of lst) {
        ret.push({
            name: c,
            count: count[c],
            url: getCategoryUrl(c),
        });
    }
    return ret;
}

export async function getCategoryTree(): Promise<CategoryTreeItem[]> {
    const allBlogPosts = await getPublishedPosts();

    type CategoryTreeInternal = {
        name: string;
        count: number;
        path: CategoryPath;
        children: Map<string, CategoryTreeInternal>;
    };

    const root = new Map<string, CategoryTreeInternal>();
    const uncategorizedKey = i18n(I18nKey.uncategorized);

    for (const post of allBlogPosts) {
        const rawParts = getCategoryPathParts(post.data.category);
        const categoryParts = rawParts && rawParts.length > 0 ? rawParts : [uncategorizedKey];
        let currentLevel = root;
        let currentPath: string[] = [];

        for (const rawName of categoryParts) {
            const name = rawName.trim();
            if (!name) continue;
            currentPath = [...currentPath, name];
            let node = currentLevel.get(name);
            if (!node) {
                node = {
                    name,
                    count: 0,
                    path: currentPath,
                    children: new Map<string, CategoryTreeInternal>(),
                };
                currentLevel.set(name, node);
            }
            node.count += 1;
            currentLevel = node.children;
        }
    }

    const buildTree = (level: Map<string, CategoryTreeInternal>): CategoryTreeItem[] => {
        const sorted = Array.from(level.values()).sort((a, b) =>
            a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
        );
        return sorted.map((node) => ({
            name: node.name,
            count: node.count,
            path: node.path,
            url: getCategoryUrl(node.path),
            children: buildTree(node.children),
        }));
    };

    return buildTree(root);
}
