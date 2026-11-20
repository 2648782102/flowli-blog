# 并行开发规范

多个 Codex 会话同时改一个博客仓库时，分支名不构成隔离：它们共用同一个
HEAD、同一个索引和同一份工作区，一个会话切分支、保存文件，另一个会话就
跟着变。所以这里按「一个会话一个可写检出」来分工。

## 硬性规则

1. **一个会话一个 worktree。** 开工前先 `git worktree list` 确认自己站在
   哪个检出里。不要在手写会话的检出里改文件，也不要在别人的检出里切分支。
2. **主检出保留给默认分支。** `/Users/flowli/Documents/ChatGPT/GitHub 相关`
   停留在 `main`，用来对齐 `origin/main`、做最终验证；特性开发一律在
   worktree 里发生。
3. **一个会话一个端口。** 同一个端口被第二个 `astro dev` 占用时，Astro 会
   静默换号，于是「我在 4321 上看的效果」其实是别人的构建。启动前先
   `lsof -nP -iTCP:<port> -sTCP:LISTEN` 确认端口空闲。
4. **只提交自己的改动。** 提交前 `git status --porcelain` 里应当只出现本会话
   意图修改的文件。看到别人正在写的文件，停下来核对，不要顺手提交或回滚。
5. **合并走 PR。** 不直接往 `main` 推。`main` 由 PR 合并推进，本地的
   `main` 只做快进同步。

## 目录与命名

worktree 放在主检出的同级目录，用 `.codex-<主题>` 后缀：

```
GitHub 相关/                       main，只读对齐
GitHub 相关.codex-precision-pass/  codex/precision-pass
GitHub 相关.codex-<下一个主题>/     codex/<下一个主题>
```

新建一个：

```sh
cd "/Users/flowli/Documents/ChatGPT/GitHub 相关"
wt switch --create codex/<主题> --base=main
```

`wt` 的 shell 集成没有激活时不会自动 `cd`，把返回的路径当作工作目录即可。
worktree 是同级目录，不在仓库内部，因此不会被主检出的 `git status` 看见，
也不需要额外的忽略规则。

依赖装一次即可：`pnpm install` 的 store 是共享的，第二个 worktree 走硬链接，
基本不额外占磁盘。

## 端口分配

| 用途 | 端口 | 归属 |
| --- | --- | --- |
| 主检出 dev | 4321 | 手写会话 |
| 主检出 preview | 4322 | 手写会话 |
| 副检出 dev | 4399 起 | 其它会话 |
| 本规范创建的第一个 worktree | 4400 | `codex/precision-pass` |

新会话取一个未被占用的端口，并在自己的分支名里体现主题。冲突时不要抢占，
换端口；抢占会让对方以为自己的改动没生效。

## 只读状态视图

`design/parallel-status.mjs` 从 Git 和进程状态实时推导，不写任何共享状态
文件，所以两个会话不会互相覆盖进度：

```sh
node design/parallel-status.mjs
```

它列出每个 worktree 的分支、HEAD、相对 `origin/main` 的领先/落后、未提交
文件数，以及正在监听的端口（按进程真实工作目录归属，不按命令行猜）。

当输出提示「多个 worktree 有未提交改动」时，先确认自己只碰自己那一个。

## 收尾

1. 在自己的 worktree 里跑 `pnpm check` 与 `node scripts/build-with-pagefind.cjs`。
2. 提交并推分支，开 PR，写清验证方式。
3. 合并后回到主检出 `git fetch && git merge --ff-only origin/main`。
4. 确认没有未提交内容后 `wt remove codex/<主题>`；有未合并改动时不要删。
