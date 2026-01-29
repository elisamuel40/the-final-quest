# The Final Quest: Bianca & John
*With Megabyte by their side*

## Purpose
A short, emotional, pixel-art micro-game created as a **wedding gift**.
Playable in a browser, shareable via link or QR.
No AI usage at runtime. All content is scripted and deterministic.

Target playtime: **75–120 seconds**

Made with love by **Eli & Cheska**.

---

## Core Principles
- Simple mechanics, symbolic meaning
- No failure states
- No timers
- No medical or traumatic explicit references
- Minimal text, strong visual metaphors
- Zero LLM usage at runtime

---

## Tech Stack (Target)
- Engine: Phaser 3
- Language: TypeScript
- Build: Vite
- Level data: JSON (LDtk or Tiled export)
- Dialog & narrative: JSON
- Flags: simple boolean state machine

---

## Art Direction
- Pixel art
- Clean, elegant, non-cartoonish
- Limited palette per scene
- Minimal animations (idle / walk / sit / glow)

---

## Characters
- **John** – playable (primary)
- **Bianca** – companion (follows / proximity-based)
- **Megabyte** – companion (joins later, unlocks mechanics)
- **Kora** – temporary NPC (crossroad event only)

---

## Global Mechanics
- Player controls John
- Bianca follows when close
- Megabyte follows once unlocked
- Interactions are proximity-based
- No combat
- No inventory except symbolic items

---

## Global Flags
```ts
met_bianca
friendship_unlocked
moved_in
home_built
megabyte_joined
health_challenge_complete
kora_crossroad_complete
at_altar
quest_complete


⸻

Scene Flow Overview
	1.	Prologue – Where It All Began (Hotel)
	2.	Challenge 1 – Moving In Together
	3.	Challenge 2 – Buying a Home Together
	4.	Event – Megabyte Joins the Party
	5.	Challenge 3 – Health Issues (Care Potion)
	6.	Challenge 4 – The Crossroad (Kora)
	7.	Final Path
	8.	Altar
	9.	Quest Complete Screen

⸻

Scene Details

⸻

1. Prologue — Where It All Began

Location: Hotel lobby (Coronado Springs-inspired)
Duration: 12–15s

Gameplay
	•	Player controls John
	•	Bianca NPC nearby
	•	Interaction trigger on proximity

Dialogue (exact)

[
  { "speaker": "Bianca", "text": "What do you call a fake noodle?" },
  { "speaker": "Bianca", "text": "Impasta." },
  { "speaker": "John", "action": "laugh" },
  { "speaker": "John", "text": "Funny… wanna tell this joke to somebody else?" }
]

Result
	•	Bianca stays next to John
	•	Flag set: friendship_unlocked = true
	•	Fade to next scene

⸻

2. Challenge — Moving In Together

Location: Small apartment with boxes
Duration: 15–18s

Mechanic
	•	Boxes block paths
	•	Pushing solo = slow
	•	Pushing together = fast

Text (optional, single line)

Some things only work when shared.

Result
	•	All boxes cleared
	•	Flag: moved_in = true

⸻

3. Challenge — Buying a Home Together

Location: Empty lot → house build
Duration: 15–20s

Mechanic
	•	Blueprint visible
	•	Structure progresses only when both are present

Text

Building takes trust.

Result
	•	House fully built
	•	Flag: home_built = true

⸻

4. Event — Megabyte Joins the Party

Location: Outside the new home
Duration: 10–12s

Gameplay
	•	Door opens
	•	Megabyte enters
	•	Automatically joins party

Text

Every home finds its heart.

Result
	•	Megabyte now follows player
	•	Flag: megabyte_joined = true

⸻

5. Challenge — Health Issues

Location: Fragile ground
Duration: 25–30s

Visual
	•	Cracked ground
	•	Reduced movement speed

Item
	•	Care Potion
	•	Color: mint green
	•	Symbol: white “+”
	•	Glow: subtle

Mechanic
	•	Potion does nothing alone
	•	Works only when:
	•	Bianca is close
	•	Megabyte is sitting

Text (single line)

Care changes everything.

Result
	•	Ground stabilizes
	•	Flag: health_challenge_complete = true

⸻

6. Challenge — The Crossroad (Kora)

Location: Forked path
Duration: 20–25s

Gameplay
	•	Kora appears
	•	Two paths visible
	•	One slowly fades away

Text

Not every companion is meant for every journey.

Result
	•	Kora exits calmly
	•	Megabyte remains
	•	Flag: kora_crossroad_complete = true

⸻

7. Final Path — Together Forward

Duration: 10–12s

Gameplay
	•	Clear path
	•	All characters walking together

⸻

8. Pre-Final — The Last Tile

Duration: 8–10s

Condition
	•	Altar visible
	•	If Megabyte is not close:

Something feels missing…

⸻

9. Final — Quest Complete

Duration: 12–15s

Text

Quest Complete

Bianca & John

This adventure doesn’t end here.
It just unlocked co-op mode.

With Megabyte 🐾

Made with love by Eli & Cheska

Result
	•	Flag: quest_complete = true
	•	End

⸻

Out of Scope (Explicitly)
	•	Combat
	•	Enemies
	•	Timers
	•	Procedural generation
	•	Runtime AI / LLM usage
	•	Voice acting
	•	Long dialogue trees

⸻

Success Criteria
	•	Playable start to finish in under 2 minutes
	•	Works on desktop and mobile browsers
	•	Emotionally clear without explanation
	•	Zero runtime costs beyond hosting