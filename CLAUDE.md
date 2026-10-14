# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Vanilla JS Tetris (HTML5 Canvas). No dependencies, no build step, no tests, no linter. Files: `index.html`, `style.css`, `game.js`.

## Running

Open `index.html` directly, or serve statically (e.g. `python3 -m http.server 8000`) and visit `http://localhost:8000`.

## Gotchas

- Board size is defined twice: `COLS`/`ROWS`/`BLOCK` in `game.js` and the `width`/`height` attributes of `<canvas id="board">` in `index.html` (must equal `COLS × BLOCK` by `ROWS × BLOCK`). Change both together.
- `game.js` uses `'use strict'` and global state (`board`, `current`, `next`, etc.); keep it dependency-free, with no frameworks or bundlers.
- The README and some UI text (`Reiniciar`, `PAUSA`) are in Spanish; keep new user-facing docs/text consistent with the existing language of the surrounding file.
- Scoring/speed rules are documented in `README.md` (`LINE_SCORES` × level; drop interval `max(100, 1000 − (level − 1) × 90)` ms). Update the README if you change them.
