# Renovation Schedule

A single-page web app to plan a renovation:

- Set **when the renovation starts** and **how long it lasts** (weeks).
- Add **steps** (demolition, plumbing, tiling, …) with a start date and duration.
- Add **professionals** (plumber, electrician, …) and assign each step to one of them.
- See everything on a **timeline calendar**: one lane per professional, colored task bars across the whole period, weekends shaded, a today marker and **hover tooltips** with the task details.
- **Drag** a bar to move it, drag its right edge to change the duration — snapping to days.
- Track **status** (to do / in progress / done), use **dark mode**, **print** the schedule, and **export/import** the plan as JSON.

Data is stored in your browser (`localStorage`) — no account, no backend.

## Requirements

- Node.js 20+ (developed on Node 26) and npm.

## Local development

```sh
make install   # install dependencies
make dev       # start the dev server → http://localhost:5173
```

### Make targets

| Command           | What it does                                        |
| ----------------- | --------------------------------------------------- |
| `make install`    | Install dependencies                                |
| `make dev`        | Start the dev server (http://localhost:5173)        |
| `make build`      | Type-check and build the production bundle           |
| `make preview`    | Build, then serve the production bundle locally      |
| `make test`       | Run the unit tests once                             |
| `make test-watch` | Run the unit tests in watch mode                    |
| `make typecheck`  | Type-check without building                         |
| `make clean`      | Remove `dist/` and `node_modules/`                  |
| `make deploy`     | Deploy to Vercel in production                      |

Run `make` (or `make help`) to list every command.

## Deploying to Vercel

Vercel auto-detects Vite (build `npm run build`, output `dist/`), so there is nothing to configure:

- **From this machine:** `make deploy` (or `npx vercel`), then follow the prompts.
- **From Git:** push the repo to GitHub and import it on [vercel.com/new](https://vercel.com/new) — every push deploys automatically.

## Tech stack

- [Vite](https://vite.dev) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) with class-based dark mode
- [zustand](https://zustand.docs.pmnd.rs) (with `persist`) for state
- [date-fns](https://date-fns.org) for date math, [motion](https://motion.dev) for animations
- [Vitest](https://vitest.dev) for the scheduling-logic unit tests
