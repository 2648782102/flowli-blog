# Agent instructions

## Parallel sessions

Several agent sessions may work in this repository at the same time. Read
`docs/parallel-development.md` before touching files.

- Work in your own Git worktree, never in the shared checkout at
  `/Users/flowli/Documents/ChatGPT/GitHub 相关`. That checkout stays on `main`.
- Run `node design/parallel-status.mjs` to see which checkout owns which branch
  and port before you start. Do not edit a worktree you do not own.
- Use a port no other session is listening on. A second `astro dev` on a busy
  port silently moves to another number.
- Commit only the files you intended to change. If `git status` shows work you
  did not write, stop and check with its owner.
- Land work through a pull request; do not push to `main` directly.

## Design work

Materials, motion and CSS conventions are described in
`docs/skeuomorphic-design.md`. When changing a surface, keep the four-part
model: flat body colour, one light source from the upper left, a thin lit rim on
the lit side only, and a tight contact shadow. No full-height gradients.

## Verification

Run `pnpm check` and `node scripts/build-with-pagefind.cjs` before claiming a
change is done. `pnpm check` currently reports a few pre-existing hints; do not
treat them as regressions you caused.
