# COMS3011 test kit

Notes and verified templates for building a Next.js + PostgreSQL app in Docker with an agentic IDE (Qoder).

| File | Use it when |
|---|---|
| [PLAYBOOK.md](PLAYBOOK.md) | Start here: timeline, setup commands, GitHub token steps, feature picks, final checks, troubleshooting |
| [PROMPTS.md](PROMPTS.md) | Copy-paste prompts: skeleton, core, one per feature, fix-it templates |
| [AGENTS-rules.md](AGENTS-rules.md) | Append to the project's `AGENTS.md` so the agent follows the rules on every request |
| [templates/](templates/) | Tested skeleton: data layer (pg + PGlite), migrations, health route, Dockerfile, compose.yml, start.sh, tests, README |

Copy `templates/` into a fresh `create-next-app` project (same folder layout), then run `chmod +x start.sh`.
