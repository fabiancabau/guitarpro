# Guitar Pro Browser Reader

Client-side Guitar Pro tab reader built with React + Vite + TypeScript. The app parses and renders local `.gp*` files directly in the browser through an adapter around `alphaTab` and provides core playback controls.

## Features

- On-device file loading (`.gp`, `.gpx`, `.gp3`-`.gp8`)
- Tablature + notation rendering via `alphaTab`
- Track selector
- Playback controls: play/pause, seek, tempo, loop range
- Graceful error handling for unsupported/corrupt files
- Adapter-driven architecture (`TabEngine`) so renderer can be swapped later

## Project Layout

- `src/domain`: contracts, types, error model
- `src/adapters`: alphaTab and test/mock engines
- `src/state`: reader orchestration and UI state
- `src/components`: file picker, transport, track selector, viewport
- `src/lib`: validation, playback math, error mapping

## Scripts

- `npm run dev`: start development server
- `npm run build`: type-check and build production bundle
- `npm run lint`: run ESLint
- `npm run test`: run unit and integration tests (Vitest)
- `npm run test:e2e`: run Playwright end-to-end tests

## Notes

- `postinstall` copies required alphaTab WASM/font/soundfont assets into `public/alphatab`.
- E2E tests use `?mockEngine=1` to run deterministic UI flows without real GP fixtures.
