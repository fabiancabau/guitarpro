# Guitar Pro Browser Reader

Client-side Guitar Pro tab reader built with React + Vite + TypeScript. The app parses and renders local `.gp*` files directly in the browser through an adapter around `alphaTab` and provides core playback controls.

## Features

- On-device file loading (`.gp`, `.gpx`, `.gp3`-`.gp8`)
- Local song JSON import: select one or more track `.json` files from the same song revision
- Bundled `song_data/*.json` score, available from **Open Silhouette from song_data**
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

- The official `@coderline/alphatab-vite` plugin handles worker/worklet wiring and copies AlphaTab font/soundfont assets from `node_modules` into `public/` when Vite runs.
- E2E tests use `?mockEngine=1` to run deterministic UI flows without real GP fixtures.
- The JSON parser builds an alphaTab score from the local track files. It preserves bar timing, tuning, sections, percussion, and the note techniques present in `song_data`. Playback uses the bundled Sonivox soundfont, so instrument tone can differ from the original tab player.
- For offline practice on this computer, run `npm run build` once, then `npm run preview -- --host 127.0.0.1` and open the local address. The score, renderer, and soundfont are served locally; the optional YouTube sync panel still needs an internet connection.
