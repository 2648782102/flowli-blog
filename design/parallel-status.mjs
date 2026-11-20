#!/usr/bin/env node
/**
 * Read-only view of every worktree working on this repository.
 *
 * Parallel sessions used to share one checkout: one HEAD, one index, one
 * working tree. That is how two sessions end up overwriting each other's
 * uncommitted edits. The rule is one writable checkout per session, so this
 * script reports what each checkout currently owns.
 *
 * Everything is derived from Git and the dev server's listening port on
 * demand. There is no shared status file to keep in sync, so no session can
 * overwrite another's progress.
 *
 * This file is tracked, so it must run without node_modules: plain Node, no
 * project imports.
 *
 * Usage:
 *   node design/parallel-status.mjs
 *   node design/parallel-status.mjs --json
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: import.meta.dirname,
    encoding: "utf8",
}).trim();

function git(cwd, args) {
    try {
        return execFileSync("git", args, {
            cwd,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
    } catch {
        return "";
    }
}

function worktrees() {
    const blocks = git(repoRoot, ["worktree", "list", "--porcelain"])
        .split("\n\n")
        .filter(Boolean);

    return blocks.map((block) => {
        const fields = new Map();
        for (const line of block.split("\n")) {
            const [key, ...rest] = line.split(" ");
            if (key) fields.set(key, rest.join(" "));
        }

        const worktreePath = fields.get("worktree");
        const branch = fields.get("branch")?.replace("refs/heads/", "") ?? "detached";
        const dirty = git(worktreePath, ["status", "--porcelain"])
            .split("\n")
            .filter(Boolean);
        const [ahead, behind] = git(worktreePath, [
            "rev-list",
            "--left-right",
            "--count",
            `HEAD...origin/main`,
        ])
            .split("\t")
            .map(Number);

        return {
            path: worktreePath,
            name: path.basename(worktreePath),
            branch,
            head: (fields.get("HEAD") ?? "").slice(0, 9),
            ahead: Number.isFinite(ahead) ? ahead : 0,
            behind: Number.isFinite(behind) ? behind : 0,
            dirtyCount: dirty.length,
            dirty: dirty.slice(0, 40),
        };
    });
}

/*
 * Two sessions on one port is a real collision even though Git cannot see it:
 * the second `astro dev` silently moves to another port, and the session that
 * thought it owned 4321 is now refreshing someone else's build.
 */
function listeners() {
    try {
        return execFileSync("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN"], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        })
            .split("\n")
            .map((line) => line.trim().split(/\s+/))
            .filter((cols) => cols.length > 8 && /:(43\d\d|44\d\d)$/.test(cols[8]))
            .map((cols) => {
                const pid = cols[1];
                const port = Number(cols[8].split(":").pop());
                /*
                 * The command line of an npm script is `sh -c ...`, so the
                 * direct PID belongs to a shell outside the worktree. Ask the
                 * process for its real working directory instead of guessing
                 * from argv, which also avoids attributing a port to the
                 * wrong checkout when two servers share a script name.
                 */
                const cwd = execFileSync("lsof", ["-a", "-d", "cwd", "-Fn", "-p", pid], {
                    encoding: "utf8",
                    stdio: ["ignore", "pipe", "ignore"],
                })
                    .split("\n")
                    .find((line) => line.startsWith("n"))
                    ?.slice(1);
                return { pid, port, cwd: cwd ?? "" };
            });
    } catch {
        return [];
    }
}

/*
 * A plain `startsWith` is wrong here: `…/GitHub 相关` is a prefix of
 * `…/GitHub 相关.codex-precision-pass`, so 4400 would be reported under both
 * checkouts. Compare path segments instead.
 */
function inside(cwd, worktreePath) {
    if (!cwd) return false;
    return cwd === worktreePath || cwd.startsWith(`${worktreePath}/`);
}

const report = {
    repository: repoRoot,
    worktrees: worktrees(),
    listeners: listeners(),
};

if (process.argv.includes("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
    const rows = report.worktrees.map((worktree) => {
        const ports = report.listeners
            .filter((listener) => inside(listener.cwd, worktree.path))
            .map((listener) => listener.port);
        return [
            worktree.name,
            worktree.branch,
            worktree.head,
            `+${worktree.ahead}/-${worktree.behind}`,
            String(worktree.dirtyCount),
            ports.length ? ports.join(",") : "-",
        ];
    });

    const header = ["WORKTREE", "BRANCH", "HEAD", "MAIN", "DIRTY", "PORT"];
    const widths = header.map((title, index) =>
        Math.max(title.length, ...rows.map((row) => row[index].length)),
    );
    const line = (cells) =>
        cells.map((cell, index) => cell.padEnd(widths[index])).join("  ").trimEnd();

    process.stdout.write(`${line(header)}\n`);
    for (const row of rows) process.stdout.write(`${line(row)}\n`);

    const busy = report.worktrees.filter((worktree) => worktree.dirtyCount > 0);
    if (busy.length > 1) {
        process.stdout.write(
            `\n${busy.length} worktrees have uncommitted changes. Do not edit a worktree you do not own.\n`,
        );
    }
}
