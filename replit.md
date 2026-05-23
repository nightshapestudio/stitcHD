# NIGHTSHAPE STITCHD

Browser-based audio repair editor for AI-generated music — import multiple song versions, align them on a timeline, and replace broken sections with clean ones.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (API server only, not needed for STITCHD)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- STITCHD: React + Vite + Zustand + Web Audio API + Canvas (pure frontend, no DB)

## Where things live

- `artifacts/stitchd/` — STITCHD audio editor (pure frontend, port 25107)
  - `src/store/useProjectStore.ts` — Zustand store (source of truth for all state)
  - `src/hooks/useAudioEngine.ts` — Web Audio API engine + WAV renderer
  - `src/components/StitchdEditor.tsx` — top-level editor layout
  - `src/types/audio.ts` — all TypeScript types
- `artifacts/api-server/` — Express API (port 8080, proxied at /api)
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for API)

## Architecture decisions

- STITCHD is entirely client-side — Web Audio API for playback, Canvas for waveforms, Zustand for state. No server round-trips needed.
- Time stretching via `playbackRate` is intentionally labeled **"DRAFT ONLY — changes pitch"** in the UI. Real pitch-preserving stretch is not implemented — this is the non-negotiable design rule.
- Beat grid snapping uses Shift key modifier on drag operations.
- Clip arrangement lane uses pointer capture API for smooth drag without losing events.
- WAV export renders the arrangement via an OfflineAudioContext at the target sample rate.

## Product

- **Import**: Drag & drop WAV/MP3/M4A/AIFF files; each becomes a track with decoded waveform
- **Align**: Set BPM manually or tap-to-detect; beat grid overlaid on all waveforms
- **Segment**: Click waveform to stamp a clip into the Arrangement Lane (8-bar, 4-bar, 2-bar, custom)
- **Edit**: Move/trim/split/duplicate clips; fade in/out with preset ms buttons; nudge offset
- **Audition**: "Audition Seam" loops ±2 bars around a clip boundary for seam verification
- **Export**: Render arrangement to WAV (44.1 kHz or 48 kHz, 16-bit PCM stereo)
- **Project**: Save/load `.stitchd` session files (audio re-imported by filename on load)

## User preferences

- NO PITCH DRIFT rule: any `playbackRate`-based time stretching MUST be labeled "DRAFT ONLY — changes pitch" in the UI. Never present it as pitch-preserving. This is non-negotiable.

## Gotchas

- STITCHD does not use the API server or database — it's a pure frontend app
- Audio files cannot be bundled in `.stitchd` project files due to browser security restrictions; users must re-import files with matching names on load
- `vite.config.ts` uses `dedupe: ["react", "react-dom", "zustand"]` to prevent multiple Zustand instances

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
