# COMS3011 test kit

Notes and a tested, topic-neutral skeleton for building a Next.js + PostgreSQL app in Docker with an agentic IDE (Qoder).

| File | Use it when |
|---|---|
| [PLAYBOOK.md](PLAYBOOK.md) | Start here: timeline, setup commands, GitHub token steps, feature-picking rules, final checks, troubleshooting |
| [PROMPTS.md](PROMPTS.md) | P0 plan (Ask mode), P1 skeleton, P2 core, feature template, fix-it prompts, plus worked todo examples |
| [AGENTS-rules.md](AGENTS-rules.md) | Append to the project's `AGENTS.md`; fill in its Domain rules from the P0 plan |
| [templates/](templates/) | Skeleton to copy into a fresh `create-next-app` project: data layer (pg + PGlite), migration runner, health route, Dockerfile, compose.yml, start.sh, tests, README |
| [examples/todo/](examples/todo/) | Reference only, don't copy into the project: the todo schema, repo functions, tests and domain rules, showing the level of detail to aim for |

Order at the test: setup commands → copy `templates/` → save the brief as `docs/BRIEF.md` → P0 → fill Domain rules → P2 → features.
