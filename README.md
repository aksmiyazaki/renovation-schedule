# Renovation Schedule

A single-page web app to plan a renovation:

- Set **when the renovation starts** and **how long it lasts** (weeks).
- Add **steps** (demolition, plumbing, tiling, …) with a start date and duration.
- Add **professionals** (plumber, electrician, …) and assign each step to one of them.
- See everything on a **timeline calendar**: one lane per professional, colored task bars across the whole period, weekends shaded, a today marker and **hover tooltips** with the task details.
- **Drag** a bar to move it, drag its right edge to change the duration — snapping to days.
- Track **status** (to do / in progress / done), use **dark mode**, **print** the schedule, and **export/import** the plan as JSON.
- Optional **cloud sync** (Firebase + Google sign-in) so the same plan is available on every device.

Data is stored in your browser (`localStorage`) and, when cloud sync is enabled, also in your private Firestore document — no other backend.

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

## Cloud sync (optional, one-time setup)

Without configuration the app is a local-only planner. To sync the plan across your devices, connect a free Firebase project:

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project** (Analytics not needed).
2. **Build → Authentication → Get started**, then enable the **Google** sign-in provider (pick a support email).
3. In **Authentication → Settings → Authorized domains**, add the domain you deploy to (e.g. `your-app.vercel.app`). `localhost` is already allowed.
4. **Build → Firestore Database → Create database** (production mode, any region).
5. Open the **Rules** tab, paste the contents of [`firestore.rules`](firestore.rules), and press **Publish** — this makes each plan readable only by its owner.
6. **Project settings → Your apps → Web (`</>`)** → register an app and copy the config values.
7. Locally: `cp .env.example .env` and fill in the six `VITE_FIREBASE_*` values, then `make dev`.
   On Vercel: **Project → Settings → Environment Variables** → add the same six variables → redeploy.
8. Open the app and click the cloud icon in the header → **sign in with Google** → repeat on every device with the same account.

How it behaves:

- Every edit is pushed automatically (debounced) to `plans/{your uid}`; the newest edit wins in the rare case of conflicting offline changes.
- The browser keeps its `localStorage` copy, so the app loads instantly and keeps working offline; changes sync when you're back online.
- Signing out stops syncing; the local copy stays on that device.
- Export/import remains available as a manual backup at all times.

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
