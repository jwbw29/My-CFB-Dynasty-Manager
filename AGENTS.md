# Repository Guidelines

## Project Structure & Module Organization
The Next.js front end lives in `src/app/...` and uses the App Router. Legacy pages that still rely on file-based routing stay under `src/pages`. Shared UI composed for the dashboard sits in `src/components`, reusable logic in `src/hooks` and `src/utils`, data contracts in `src/types`, and provider wiring within `src/contexts`. Electron main-process code is under `electron/`, while static assets and icons belong in `public/`. Production builds emit to `out/`, and packaged desktop bundles land in `dist/`.

## Build, Test, and Development Commands
- `npm run dev` — Launch the Next.js dev server on port 3001.
- `npm run electron-dev` — Run the dev server and local Electron shell together.
- `npm run build` — Create an optimized Next.js production build.
- `npm run dist` — Build and package the Electron desktop app without publishing.
- `npm run start` — Serve the previously built app for production validation.

## Coding Style & Naming Conventions
Write UI in TypeScript React components with Tailwind classes for styling. Keep indentation at two spaces, favor functional components, and name them with PascalCase (e.g., `TeamDashboard`). Hooks should use the `useX` pattern, and utilities stay camelCase. Run `npx next lint` and address the `eslint-config-next` feedback before pushing. Update shared types in `src/types.ts` when adding new fields.

## Testing Guidelines
Automated tests are not yet committed; include targeted coverage when introducing complex logic. Prefer Next.js-compatible tooling such as `next/jest` or React Testing Library, placing files beside the feature (`Feature.test.tsx`). Document manual verification steps—especially save/load flows and schedule updates—in your PR so reviewers can reproduce them quickly.

## Commit & Pull Request Guidelines
Align with the concise, Title Case history already in `git log` (e.g., `Update Team Rank Retrieval`). Keep subject lines under ~72 characters and use additional bullet context in the body when needed. Pull requests should explain the user-facing impact, list commands run, and attach screenshots or GIFs for UI changes. Link related issues or discussions and call out follow-up work so it can be tracked.
