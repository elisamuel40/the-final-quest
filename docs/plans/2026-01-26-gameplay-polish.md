# Gameplay Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix dialogue timing/skip issues, construction sound behavior, Megabyte stage 3 rework (path + heart trigger), Kira stage 6 sprite/path overhaul, and crossroad exit hotspot adjustment.

**Architecture:** All changes are in WorldScene.ts (stage logic), UIScene.ts (dialogue debounce), SoundSystem.ts (seek/volume), and PreloadScene.ts (Kira PNG). No new systems needed — just refining existing stage methods and sound behavior.

**Tech Stack:** TypeScript, Phaser 3.90.0, Vite 7.2.4

---

### Task 1: Scene 1 — Add input debounce to dialogue advancement

**Problem:** Space/Enter/tap can "double-jump" through dialogue lines because there's no cooldown between advances. The advance happens instantly every keypress.

**Files:**
- Modify: `src/game/scenes/UIScene.ts:93-97` (advanceDialogue method)

**Step 1: Add debounce to advanceDialogue**

In `UIScene.ts`, add a `lastAdvanceTime` property and a minimum interval between advances:

```typescript
// Add property at line ~11 (after messageTimer declaration)
private lastAdvanceTime = 0
private readonly ADVANCE_DEBOUNCE = 250 // ms between dialogue advances
```

Then modify `advanceDialogue()` (line 93-97):

```typescript
private advanceDialogue() {
  if (!this.dialogue.isActive()) return
  const now = this.time.now
  if (now - this.lastAdvanceTime < this.ADVANCE_DEBOUNCE) return
  this.lastAdvanceTime = now
  this.sounds.play('dialogue-advance')
  this.dialogue.advance()
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/game/scenes/UIScene.ts
git commit -m "fix: add 250ms debounce to dialogue advance to prevent double-skip"
```

---

### Task 2: Scene 0 — Fix last prologue message timing

**Problem:** The stacked delayed messages in `setupPrologue()` (lines 348-354) create awkward pauses. The sequence is: "FRIENDSHIP UNLOCKED" (3000ms) → wait 3500ms → prologueHint (5400ms) → wait 5900ms → transition. The last message stays too long or transitions too fast.

**Files:**
- Modify: `src/game/scenes/WorldScene.ts:326-360` (setupPrologue)

**Step 1: Tighten the prologue message chain timing**

Replace the post-dialogue callback chain (lines 347-354) with better-spaced timing:

```typescript
// Current code (lines 347-354):
gameEvents.emit('ui-message', '✨ FRIENDSHIP UNLOCKED ✨', 3000)
this.time.delayedCall(3500, () => {
  gameEvents.emit('ui-message', this.dialogue.prologueHint, 5400)
  this.time.delayedCall(5900, () => {
    this.transitionToNextStage()
  })
})

// Replace with:
gameEvents.emit('ui-message', '✨ FRIENDSHIP UNLOCKED ✨', 2400)
this.time.delayedCall(3000, () => {
  gameEvents.emit('ui-message', this.dialogue.prologueHint, 3600)
  this.time.delayedCall(4200, () => {
    this.transitionToNextStage()
  })
})
```

Key changes:
- "FRIENDSHIP UNLOCKED" displays for 2400ms (was 3000ms) — snappier
- Gap before prologueHint: 3000ms (was 3500ms) — tighter
- prologueHint displays for 3600ms (was 5400ms) — still readable, not lingering
- Transition fires 4200ms after hint appears (was 5900ms) — reduces dead air

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/game/scenes/WorldScene.ts
git commit -m "fix: tighten prologue message timing to reduce dead air"
```

---

### Task 3: Scene 2 — Fix construction 'building' SFX (no loop, offset, volume)

**Problem:** The `building` sound plays as a loop at 0.5 volume, which is too loud and restarts. It should play once, starting from ~2-4 seconds into the audio, at a lower volume.

**Files:**
- Modify: `src/game/scenes/WorldScene.ts:461-502` (updateHomeBuild)
- Modify: `src/game/systems/SoundSystem.ts` (add seek/offset support)

**Step 1: Update SoundSystem to support seek offset on play**

Phaser's `play()` config supports a `seek` property (seconds offset). The current `SoundSystem.play()` already passes config through, so this works out of the box. No SoundSystem changes needed — we just pass `{ seek: 2 }` from the caller.

However, we need to change from `playLoop` to `play` (one-shot) and track whether it's been started for this build cycle.

**Step 2: Modify updateHomeBuild to play sound once with offset and lower volume**

In `WorldScene.ts`, add a property to track if the building sound has started:

```typescript
// Add near line 82 (after homeBuildCompleted)
private buildingSoundStarted = false
```

Reset it in `cleanupStage()` — add after line 304:

```typescript
this.buildingSoundStarted = false
```

Replace the sound logic in `updateHomeBuild()` (lines 467-474):

```typescript
// Current code:
if (bothPresent) {
  this.buildProgress = Math.min(1, this.buildProgress + delta * 0.00035)
  if (!this.sounds.isPlaying('building')) {
    this.sounds.playLoop('building', { volume: 0.5 })
  }
} else {
  this.sounds.stop('building')
}

// Replace with:
if (bothPresent) {
  this.buildProgress = Math.min(1, this.buildProgress + delta * 0.00035)
  if (!this.buildingSoundStarted) {
    this.buildingSoundStarted = true
    this.sounds.play('building', { volume: 0.25, seek: 2 })
  }
} else {
  if (this.buildingSoundStarted && this.sounds.isPlaying('building')) {
    this.sounds.stop('building')
    this.buildingSoundStarted = false
  }
}
```

Key changes:
- No loop — plays once from seek offset 2s
- Volume 0.25 (was 0.5) — balanced with rest of SFX
- If player leaves zone, sound stops and resets so it restarts from offset if they re-enter
- When build completes (line 481), the existing `this.sounds.stop('building')` handles cleanup

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/game/scenes/WorldScene.ts
git commit -m "fix: building SFX plays once from 2s offset at lower volume"
```

---

### Task 4: Stage 3 — Rework Megabyte join (path → follow → sit → heart trigger)

**Problem:** Currently Megabyte auto-tweens directly to the player and auto-transitions. New behavior: Megabyte walks to ~(508, 265), then follows the player/couple, then sits + shows a clickable heart that triggers the next stage.

**Files:**
- Modify: `src/game/scenes/WorldScene.ts:504-535` (setupMegabyteJoin)
- Add update case for stage 3 in `update()` switch (line 180-201)

**Step 1: Rewrite setupMegabyteJoin**

Replace `setupMegabyteJoin()` (lines 504-535) entirely:

```typescript
private setupMegabyteJoin() {
  this.cameras.main.setBackgroundColor(0x2b2a2f)
  const background = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'scene-4-megabyte-joins')
  background.setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
  background.setDepth(-100)
  this.player.setPosition(160, GAME_HEIGHT / 2)
  this.bianca.setPosition(130, GAME_HEIGHT / 2 + 14)
  this.logPositions('megabyte_join')

  gameEvents.emit('ui-message', this.dialogue.megabyteJoinHint, 5000)

  this.stageObjects.push(background)

  // Megabyte starts at top-right
  this.megabyte.setActive(true).setVisible(true)
  this.megabyte.setPosition(486, 93)
  this.megabyteFollow.enabled = false

  this.sounds.play('megabyte-join')

  // Phase 1: Tween to intermediate position (508, 265)
  this.tweens.add({
    targets: this.megabyte,
    x: 508,
    y: 265,
    duration: 3000,
    onComplete: () => {
      // Phase 2: Enable follow to walk toward the player
      this.megabyteFollow.enabled = true
      this.flags.set('megabyte_joined', true)
      this.sounds.play('megabyte-bark')
      gameEvents.emit('ui-message', this.dialogue.megabyteWelcome, 3500)
      // stageState.triggered will be checked in updateMegabyteJoin
      this.stageState.triggered = true
    },
  })
}
```

**Step 2: Add updateMegabyteJoin method**

Add a new method after `setupMegabyteJoin`:

```typescript
private updateMegabyteJoin() {
  if (!this.stageState.triggered || this.stageState.completed) return

  // Check if Megabyte is close to the player
  const distance = Phaser.Math.Distance.Between(
    this.megabyte.x, this.megabyte.y,
    this.player.x, this.player.y
  )

  if (distance < 50 && !this.megabyteSitting) {
    // Megabyte arrived — stop and sit
    this.megabyteFollow.enabled = false
    this.megabyte.setVelocity(0, 0)
    this.megabyteSitting = true
    this.megabyte.setTexture('megabyte-sitting')

    // Spawn clickable heart above Megabyte
    const heart = this.add.text(this.megabyte.x, this.megabyte.y - 30, '❤️', {
      fontSize: '24px',
    })
    heart.setOrigin(0.5)
    heart.setInteractive({ useHandCursor: true })
    this.stageObjects.push(heart)

    // Pulse animation on the heart
    this.tweens.add({
      targets: heart,
      scale: 1.2,
      yoyo: true,
      repeat: -1,
      duration: 600,
    })

    // Click/tap on heart triggers transition
    heart.on('pointerdown', () => {
      if (this.stageState.completed) return
      this.sounds.play('megabyte-bark')
      heart.destroy()
      this.transitionToNextStage(800)
    })
  }
}
```

**Step 3: Wire up updateMegabyteJoin in the update switch**

Add case 3 in the switch statement (after line 183):

```typescript
case 3:
  this.updateMegabyteJoin()
  break
```

**Step 4: Verify build**

Run: `npm run build`

**Step 5: Commit**

```bash
git add src/game/scenes/WorldScene.ts
git commit -m "feat: rework Megabyte join with path, follow, sit, and heart trigger"
```

---

### Task 5: Stage 6 — Replace Kira SVG with PNG + new entry/exit paths

**Problem:** Kira uses an SVG sprite. Need to swap to PNG. Entry path: from bottom (186, 354) → up to (180, 233). Exit path: follows waypoints then fades/disappears.

Note: This is stage 5 in the code (`setupCrossroad`, stageIndex=5), which is the Kira crossroad scene.

**Files:**
- Copy: `/Users/eli/Projects/the-final-quest/import/kira.png` → `public/assets/sprites/kira.png`
- Modify: `src/game/scenes/PreloadScene.ts:23` (change SVG to PNG load)
- Modify: `src/game/scenes/WorldScene.ts:602-692` (setupCrossroad + updateCrossroad)

**Step 1: Copy Kira PNG to sprites directory**

```bash
cp /Users/eli/Projects/the-final-quest/import/kira.png /Users/eli/Projects/the-final-quest/public/assets/sprites/kira.png
```

**Step 2: Update PreloadScene to load PNG instead of SVG**

In `PreloadScene.ts`, change line 23:

```typescript
// From:
this.load.svg('kira', 'assets/sprites/kira.svg', { width: 16, height: 16 })

// To:
this.load.image('kira', 'assets/sprites/kira.png')
```

**Step 3: Update Kira sprite sizing in WorldScene create()**

Since the PNG is likely larger than 16x16, we need to set display size. In WorldScene `create()` after line 121, add sizing:

```typescript
this.kira.setDisplaySize(40, 40)
this.kira.setSize(40, 40)
```

(Adjust 40x40 based on what looks right — Kira is a cat/companion, similar scale to Megabyte's 45x36.)

**Step 4: Rewrite setupCrossroad with new Kira paths**

Replace the Kira tween section in `setupCrossroad()` (lines 619-639):

```typescript
// Kira enters from below
this.kira.setActive(true).setVisible(true)
this.kira.setPosition(186, 354)  // Start below screen bottom
this.kira.setAlpha(0)

// Animate Kira entering: (186,354) → (180,233)
this.tweens.add({
  targets: this.kira,
  x: 180,
  y: 233,
  alpha: 1,
  duration: 2500,
  delay: 1000,
  onComplete: () => {
    this.time.delayedCall(1500, () => {
      this.sounds.play('megabyte-anxious')
      gameEvents.emit('ui-message', 'Megabyte looks anxious. Press E to comfort her.', 5000)
      this.stageState.triggered = true
    })
  }
})
```

**Step 5: Rewrite updateCrossroad with waypoint-based exit**

Replace `updateCrossroad()` (lines 675-692):

```typescript
private updateCrossroad() {
  if (this.stageState.triggered && !this.megabyteSitting && this.kira.visible) {
    this.stageState.triggered = false

    gameEvents.emit('ui-message', 'Kira found her own path. Time to move forward.', 4500)

    // Kira exit via waypoints
    const waypoints = [
      { x: 175, y: 298 },
      { x: 248, y: 154 },
      { x: 206, y: 121 },
      { x: 108, y: 103 },
      { x: 180, y: 149 },
    ]

    let waypointIndex = 0
    const moveToNext = () => {
      if (waypointIndex >= waypoints.length) {
        // Fade out at final waypoint
        this.tweens.add({
          targets: this.kira,
          alpha: 0,
          duration: 600,
          onComplete: () => {
            this.kira.setActive(false).setVisible(false)
          },
        })
        return
      }
      const wp = waypoints[waypointIndex]
      waypointIndex++
      const dist = Phaser.Math.Distance.Between(this.kira.x, this.kira.y, wp.x, wp.y)
      const speed = 80 // pixels per second
      const duration = (dist / speed) * 1000
      this.tweens.add({
        targets: this.kira,
        x: wp.x,
        y: wp.y,
        duration,
        onComplete: moveToNext,
      })
    }

    // Start after a brief delay
    this.time.delayedCall(500, moveToNext)
  }
}
```

**Step 6: Verify build**

Run: `npm run build`

**Step 7: Commit**

```bash
git add public/assets/sprites/kira.png src/game/scenes/PreloadScene.ts src/game/scenes/WorldScene.ts
git commit -m "feat: Kira PNG sprite, entry from bottom, waypoint exit path with fade"
```

---

### Task 6: Stage 5 — Move crossroad exit zone 20px higher

**Problem:** The exit trigger zone is at Y=240. It should be 20px higher at Y=220.

**Files:**
- Modify: `src/game/scenes/WorldScene.ts:642-648` (exit zone creation in setupCrossroad)

**Step 1: Update exit zone and indicator Y positions**

Change the Y coordinate from 240 to 220 for both the visual indicator and the physics zone (lines 642-648):

```typescript
// From:
const exitIndicator = this.add.rectangle(GAME_WIDTH - 60, 240, 60, 70)
// ...
const exitZone = this.add.zone(GAME_WIDTH - 60, 240, 60, 70)

// To:
const exitIndicator = this.add.rectangle(GAME_WIDTH - 60, 220, 60, 70)
// ...
const exitZone = this.add.zone(GAME_WIDTH - 60, 220, 60, 70)
```

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/game/scenes/WorldScene.ts
git commit -m "fix: move crossroad exit zone 20px higher to Y=220"
```

---

### Task 7: Final build verification

**Step 1: Run full build**

Run: `npm run build`
Expected: Clean build, no TypeScript errors

**Step 2: Manual play-test checklist**

Run: `npm run dev`

Test each change:
1. **Stage 0 (Prologue):** Walk Bianca to Jon, go through dialogue. Verify no double-skip on Space/Enter. Verify "FRIENDSHIP UNLOCKED" and hint messages flow smoothly without dead air.
2. **Stage 2 (Construction):** Stand in blueprint zone. Verify building SFX starts from ~2s offset, plays once (not looping), at reasonable volume. Leave zone and re-enter — sound should restart from offset.
3. **Stage 3 (Megabyte):** Verify Megabyte tweens to (508, 265), then follows player. When close, Megabyte sits and heart appears. Click heart → transitions.
4. **Stage 5 (Crossroad):** Verify Kira enters from bottom (186, 354) to (180, 233) using PNG sprite. Press E to comfort Megabyte. After Megabyte stands, Kira exits via waypoints and fades. Verify exit zone triggers at Y=220 (higher than before).

**Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address play-test issues from gameplay polish"
```
