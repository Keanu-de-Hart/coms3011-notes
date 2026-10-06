# Test playbook: 14:30–17:00

**Prediction:** a Lab 2-style blitz (Next.js app: Core + a feature menu with points) on a **new topic**, with Lab 3's Docker requirement (`app` + `postgres` services) on top, so **Postgres replaces SQLite**, plus a public repo with README + `start.sh`.
The skeleton in `templates/` is topic-neutral: data layer, migrations, Docker, tests. The topic-specific design happens at the test in prompt **P0** (5 min, Ask mode). The todo material in `examples/todo/` and PROMPTS.md shows how detailed the prompts should be.

**Credits are not your bottleneck. Time is.** Agent mode costs about 7–12 credits per request. You have about 3000, and you'll use about 40 requests (~500). So use **Auto or Performance**, never Lite/Efficient "to save". Skip Repo Wiki (~50 credits, minutes of indexing, useless on a fresh repo). Minimise **round trips**, not credits: precise prompts with the design decided (PROMPTS.md) get it right first time.

---

## Do TODAY (at home)

1. **GitHub:** create an **empty public** repo (no README/licence, so the first push is clean), e.g. `coms3011-test`.
2. **Token:** don't make it today and don't email it. Make it **on the lab PC** at 14:30 (see "GitHub token" below), so it never has to travel. Today, just check you can log into github.com with your 2FA (phone/authenticator app) and practise the token steps once.
3. **Notes online:** put this kit somewhere you can open from the lab (a private repo needs auth, so a **secret gist** or a public repo of notes works). Open book allows notes. Ask a tutor in the first minute whether copying your own prepared template files is fine. If not, use prompt P1 instead.
4. **Rehearse** once end-to-end with me playing Qoder (see the bottom of this file).

---

## Timeline

| Clock | Phase | Done when |
|---|---|---|
| 14:30–14:40 | **Setup** (no AI): read the WHOLE brief, run the commands below, copy the skeleton, save the brief as `docs/BRIEF.md`, first push, clone test | Skeleton on GitHub, clone works |
| 14:40–14:50 | **Plan** (P0, Ask mode) and fill in the Domain rules in AGENTS.md. Meanwhile `bash start.sh` once | Invariants + schema + feature picks written down; health ok |
| 14:50–15:20 | **Core** (P2) | Every Core requirement passes in the browser. **Pushed. This is your safety net.** |
| 15:20–16:30 | **Features**, one at a time: prompt, verify, `ship` | Required points + overflow |
| 16:30 | **Feature freeze.** Nothing new after this. | |
| 16:30–16:50 | **Clean-clone check** (below), fix only blockers | Fresh clone starts with `bash start.sh` |
| 16:50 | Final push; check the GitHub web page shows the latest commit | |

Every `ship` is a valid submission. At 16:59 you want nothing in flight.

---

## 14:30: setup commands (Linux lab PC)

```bash
git config --global user.name "<your name>"
git config --global user.email "<your GitHub email>"
git config --global credential.helper 'cache --timeout=14400'   # remembers the token in RAM only, for 4h
docker compose version && docker run --rm hello-world             # Docker works without sudo? If not, tell a tutor NOW
docker pull node:22-alpine & docker pull postgres:17-alpine &      # pre-pull while you work (lab network will be busy)
node --version                                                    # 22.x or 24.x is fine
```

```bash
npx create-next-app@latest app --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
cd app
npm install pg @electric-sql/pglite
npm install -D @types/node@22 @types/pg vitest     # @types/node@22 is REQUIRED: the default ^20 conflicts with vitest
npm pkg set scripts.test="vitest run"
echo ".data/" >> .gitignore
mkdir -p docs
pdftotext -layout ~/Downloads/<brief>.pdf docs/BRIEF.md   # if pdftotext is missing: open the PDF in the browser, Ctrl+A, Ctrl+C, paste into docs/BRIEF.md
```

- **Never** let Qoder "fix" an install with `--legacy-peer-deps` / `--force`: `npm ci` in Docker then fails.
- `AGENTS-rules.md` gets appended to the generated `AGENTS.md` below (keep Next's block at the top; `next dev` re-adds it anyway). Its Domain rules section gets filled in after P0.
- Copy the templates in (the notes repo is public, so no token is needed). Run this from inside the new project folder:

```bash
git clone https://github.com/Keanu-de-Hart/coms3011-notes ~/notes
cp -r ~/notes/templates/. .            # keeps the folder layout; its README replaces the generated one
cat ~/notes/AGENTS-rules.md >> AGENTS.md
chmod +x start.sh
```

```bash
npm test && npm run build                        # both green before the first push
git add -A && git commit -m "Scaffold Next.js app with Postgres data layer, migrations and Docker stack"
git remote add origin https://github.com/<you>/<repo>.git
git branch -M main && git push -u origin main    # username + token
```

### GitHub token (2 min, in the lab browser)

1. Log into github.com in the lab browser.
2. Profile picture → **Settings** → **Developer settings** (bottom of the left menu) → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
3. Name `lab-test`. Expiration: **custom, tomorrow**. Repository access: **Only select repositories** → your test repo.
4. Permissions → Repository permissions → **Contents: Read and write**. (Metadata read-only is added automatically.)
5. **Generate**, then **copy** it. GitHub shows it only once; if you lose it, just make a new one.
6. At `git push`: Username = your GitHub username, Password = **paste the token** with **Ctrl+Shift+V** (Linux terminal paste). Nothing appears while pasting, which is normal. Press Enter.

`credential.helper cache` keeps it in memory for 4h, so you paste it once. **Never** put the token in the remote URL, a file, the README, a commit or the Qoder chat. After the test, delete it on the same GitHub page (or let it expire).

Clone check, **in a different folder**:

```bash
cd /tmp && rm -rf c && git clone https://github.com/<you>/<repo>.git c && ls c && cd -
```

Shortcut for the rest of the test (paste into the terminal once):

```bash
ship() { npm test && git add -A && git commit -m "$1" && git push; }
```

Then after each verified feature: `ship "Tags: join table, rename, colour, two-tag intersection filter"`. Messages say **what + why** (Lab 1 marked commit history).

---

## Dev loop (fast, no Docker)

- `npm run dev` uses **PGlite** at `.data/pglite`: real Postgres, no server, data persists across restarts. Wipe with `rm -rf .data`.
- `npm test`: each test gets a fresh in-memory Postgres.
- `bash start.sh`: the real Docker stack (app + postgres). Run it after Core and then every ~3 features, because Docker-only bugs show up here. Stop `npm run dev` first (both use port 3000).
- Docker resets: `docker compose down` keeps data; `docker compose down -v` wipes it. `docker compose logs -f app` shows logs.

---

## Feature picks

P0 gives you a ranked list; sanity-check it with these rules:
- **Points per minute, then risk.** Small, self-contained features (a new table + one page) are cheap. Avoid anything with calendar arithmetic (recurrence, month ends, DST), parsers (natural language, query languages), 10k-row performance work, live demos of external tools, or browser-test installs.
- **Claim about 1.3x the required points.** A feature judged "partial" earns half, so the extras are insurance.
- **Build order:** anything that wraps every mutation (activity log, history) first; then schema additions (new columns/tables); views and exports last, because they only read.
- **Done when is the bar.** Before shipping a feature, do its "Done when" in the browser exactly as written.

### Worked example: picks for the Lab 2 todo menu

The order matters: the activity log goes first so later mutations get logged.

| # | Feature | Pts | Running | Risk |
|---|---|---|---|---|
| F1 | Activity log + Task history | 10 | 10 | low (must wrap all mutations) |
| F2 | Seed (via `POST /api/seed`) | 3 | 13 | very low |
| F3 | Priority & effort | 3 | 16 | very low |
| F4 | Projects | 4 | 20 | low |
| F5 | Tags | 5 | 25 | low |
| F6 | Start dates/snooze + Today | 8 | 33 | low |
| F7 | Kanban (native DnD) | 7 | 40 | medium |
| F8 | Statistics | 5 | 45 | low |
| F9 | Appearance | 3 | 48 | low |
| F10 | iCal export | 4 | 52 | low |
| F11 | Saved views | 4 | 56 | low |
| F12 | Dependencies (overflow) | 8 | 64 | medium |

**Avoid:** Recurrence (31 Feb / DST traps), NL quick add, query language, Scale (10k rows + virtualisation), Timeline, Undo/redo, MCP server (needs a live demo), Playwright E2E (browser install on a lab PC), axe, and the 20-test suite (it needs recurrence and dependencies).

If you're behind at 16:00: stop picking new features and make sure every claimed one meets its **Done when** exactly. A half-point feature is worth less than a finished small one.

---

## 16:30: clean-clone check (do it for real)

```bash
cd ~/app && docker compose down           # free port 3000; also stop npm run dev
cd /tmp && rm -rf final && git clone https://github.com/<you>/<repo>.git final && cd final
bash start.sh                              # must print "Ready"
```

Then in the browser: the Core checklist + 2 features, `docker compose down && docker compose up -d` (data still there?), and check README commands match reality. Afterwards `docker compose down -v` in `/tmp/final`.

README must contain: requirements (Docker + Compose v2; Node 22 for dev), **`bash start.sh`** (or `docker compose up -d --build`), the URL, how to stop, dev (`npm install && npm run dev`), tests (`npm test`), seed, third-party code with a reason per package, database design (tables + relationships), features list.

---

## When things go wrong

| Symptom | Fix |
|---|---|
| Docker build fails at `npm run build` with a DB/connection error | A page reads the DB without `export const dynamic = "force-dynamic"`, or something connects at import time |
| `npm ci` fails in Docker (ERESOLVE) | Lockfile made with `--legacy-peer-deps`/`--force`. Fix the versions, delete `package-lock.json` + `node_modules`, run `npm install` |
| App container restarts in a loop | `docker compose logs app`. Usually a migration SQL error |
| Data gone after `down`/`up` | Volume missing or you used `down -v`. Postgres must stay 17 (the 18 image moved its data dir) |
| Agent wrote a 2nd migration that edits an old one | Revert that file (`git checkout -- src/lib/migrations.ts`) and re-prompt: "append a new migration" |
| Agent broke something unrelated | `git diff`, then `git checkout -- <file>` or `git stash`. You've shipped after every feature, so you lose at most one |
| Port 3000 busy | Stop `npm run dev` / the other stack (`docker ps`, `docker compose down`) |
| `git push` rejected (auth) | Token expired/wrong scope. Username = GitHub username, password = token |
| Docker unusable on the lab PC | Tell a tutor at 14:31. Keep building with `npm run dev` (PGlite), and keep Dockerfile/compose in the repo anyway |

---

## If the brief hands you an existing app (Lab 3 style, e.g. SvelteKit + Postgres)

Reuse `compose.yml` as-is (change `DATABASE_URL`'s db name if wanted, and the healthcheck URL to the app's diagnostic route, e.g. `/api/marking-test`). Dockerfile (not verified tonight; it follows the Lab 3 build steps exactly):

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc* ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./
USER node
EXPOSE 3000
CMD ["node", "build"]
```

If Lab 3's `automark.sh` is provided again, run it (`./automark.sh`) before every push of Docker changes.

---

## Rehearsal tonight (me as Qoder)

1. You paste the prompts to me exactly as you would into Qoder tomorrow, and time each phase against the table above.
2. Note every place you had to correct the agent and turn it into a sentence in `AGENTS-rules.md` or the prompt.
3. Run the clean-clone check at the end.
