# Renovation Schedule

A single-page web app to plan a renovation:

- Set **when the renovation starts** and **how long it lasts** (in days).
- Add **steps** (demolition, plumbing, tiling, …) with a start date, duration and a **room**.
- Add **rooms** (kitchen, bathroom, hallway, …) — the calendar can show one lane per room, or one lane per professional.
- Add **professionals** (plumber, electrician, …) and assign each step to one of them.
- See everything **two ways**: a **calendar view** (one month grid per room/professional, weeks as rows, month cards side by side) and a **timeline view**, switchable with one toggle. Colored task bars, weekends shaded, **Brazilian holidays** marked in red (with their names), a today marker, and **hover tooltips** with the task details.
- **Drag** a bar to move it, drag its right edge to change the duration — in both views, snapping to days.
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

- Every edit is pushed automatically (debounced) to `plans/{your uid}`; if you edit offline on two devices, the newest edit wins.
- The browser keeps its `localStorage` copy, so the app loads instantly and keeps working offline; changes sync when you're back online.
- Signing out stops syncing; the local copy stays on that device.
- Export/import remains available as a manual backup at all times.

## Sharing a renovation (link with editing)

Signed in? Click the **share icon** in the header to create a share link:

- **Anyone with the link can view and edit** the plan in their browser — no account, no install. Changes sync live between everyone who has the link, and come back into your own plan (and your other devices) automatically.
- **Stop sharing** (in the same dialog) deletes the shared copy immediately — the link stops working for everyone.
- Opening a share link never touches the local plan of the device: it runs in a separate “shared editing” mode with a banner offering **Save a copy to my plan** or **Leave**.
- The newest edit wins if two people change the plan at the same time — same rule as your personal sync.

This uses a `shares/{id}` document in the same Firestore database; the rules in [`firestore.rules`](firestore.rules) allow public read/edit of that document but only its owner can create or delete it.

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
