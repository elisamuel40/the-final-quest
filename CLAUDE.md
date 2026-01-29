# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**The Final Quest: Bianca & John** is a short pixel-art micro-game built as a wedding gift. It's a browser-based Phaser 3 game (~75-120 seconds playtime) that tells an interactive love story through 9 linear stages.

- **Language:** TypeScript (strict mode)
- **Framework:** Phaser 3.90.0
- **Build:** Vite 7.2.4
- **Resolution:** 640x360 (pixel-perfect, scales responsively)

## Commands

```bash
npm run dev      # Start dev server at localhost:5173 (hot reload)
npm run build    # TypeScript check + Vite production build
npm run preview  # Preview production build locally
```

## Architecture

### Scene Flow
```
BootScene → PreloadScene → [WorldScene + UIScene running in parallel]
```

- **WorldScene** (`src/game/scenes/WorldScene.ts`): Main game logic, manages 9 stages with stage-specific setup/update/cleanup methods
- **UIScene** (`src/game/scenes/UIScene.ts`): Dialogue rendering, progress bars, mobile D-pad controls

### Stage System
WorldScene uses a stage index (0-9) with three methods per stage:
- `startStage{N}()` - Initialize stage, position characters
- `updateStage{N}()` - Per-frame logic, interaction checks
- `cleanupStage{N}()` - Teardown before transition

Stage transitions use 300ms fade effects. Press N to skip stages (debug).

### Systems
- **FlagSystem** (`src/game/systems/FlagSystem.ts`): Boolean flags tracking story progression
- **DialogueSystem** (`src/game/systems/DialogueSystem.ts`): Sequential line-by-line dialogue with `advance()` progression
- **PartyFollowSystem** (`src/game/systems/PartyFollowSystem.ts`): Companion AI using distance-based pathfinding

### Event Communication
Global `gameEvents` emitter (`src/game/events.ts`) for scene communication:
- `ui-dialogue` / `ui-message` - Trigger dialogue display
- `heart-progress` - Update progress bar
- `mobile-action-pressed` - Mobile button events

### Data Files
- `src/game/data/dialogue.json` - All dialogue lines and messages
- `src/game/data/flags.json` - Initial flag state

### Assets
Assets live in `public/assets/`:
- `sprites/` - Character PNGs and SVGs (jon, bianca, megabyte, kora with variants)
- `backgrounds/` - Scene backgrounds (9 stages)

Loaded in `PreloadScene.ts`. Characters have multiple texture variants (e.g., `jon-wedding`, `jon-proposal-knee`).

### Controls
- **Keyboard:** Arrow keys/WASD movement, E for actions, Space/Enter to advance dialogue
- **Mobile:** UIScene creates D-pad + action button on touch devices

## Key Implementation Details

- Direction flipping uses velocity-based sprite.flipX
- Proximity triggers use distance calculations between characters
- Progress bars fill based on time spent in trigger zones
- Mobile detection via user agent + window dimensions
- No failure states, timers, or combat - purely narrative
