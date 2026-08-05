# One Night Werewolf Dealer

A pass-and-play digital dealer for One Night Ultimate Werewolf. Deals secret role cards privately to each player, then provides a role-specific night action flow on a circular table board.

## Run & Operate

- `pnpm --filter @workspace/werewolf-dealer run dev` — run the frontend (port from `$PORT`)
- `pnpm --filter @workspace/api-server run dev` — run the API server (requires `DATABASE_URL`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (API server only; frontend has no DB dependency)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind + shadcn/ui + Framer Motion + Wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/werewolf-dealer/` — React frontend (the player-facing app)
  - `src/pages/setup.tsx` — player count, names, scenario/deck selection
  - `src/pages/deal.tsx` — private role reveal flow + circular night table board
  - `src/components/NightActionScreen.tsx` — full-screen private night action overlay
  - `src/store/game-store.tsx` — game state (dealt cards, night card positions, completed actions)
  - `src/lib/game-data.ts` — all 16 role definitions + scenarios
- `artifacts/api-server/` — Express API (routes under `/api`)
- `lib/db/` — Drizzle ORM schema + DB client
- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/api-zod/` — Zod schemas auto-generated from OpenAPI spec
- `lib/api-client-react/` — React query hooks auto-generated from OpenAPI spec

## Architecture decisions

- All game state is client-side only (React context). No server round-trips during gameplay — keeps the night action flow instant and offline-capable.
- Night card positions are tracked separately from starting dealt cards. `dealtCards[i]` = starting role (used to determine which action screen each player sees). `nightCards[i]` = current position after Robber/Troublemaker/Drunk swaps (used for Insomniac peek and Seer/Shapeshifter card views).
- Night action screen is a full-screen overlay with AnimatePresence — completely hides the table board while a player takes their private action.

## Product

Players set up a game (player count, names, role cards), then each player privately sees their starting role on the device. The device is placed in the center of the table. During the night phase, players who have night actions tap "Perform Night Action", select their name, and the app shows them a private action screen (Seer peeks, Robber swaps and peeks, Troublemaker swaps silently, etc.). Card swaps are tracked silently so the final board state is preserved for the day phase.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The frontend has no `DATABASE_URL` dependency — it runs standalone. Only the API server needs it.
- Center card indices in nightCards: `nightCards[playerCount + 0/1/2]` for center slots I/II/III.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
