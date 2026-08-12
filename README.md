<h1 align="center">🛺 Sher-e-Sadak</h1>
<p align="center"><em>“Lion of the Streets”</em></p>

<p align="center">
  <strong>A 3D, third-person, open-world game across nine Indian districts.</strong><br>
  Build your turbaned Raja, roam the streets, drive an auto-rickshaw, throw hands,
  paan-spit, and bribe the cops. Runs in any modern browser — no install.
</p>

<p align="center"><em>Now in 3D (Three.js). The original top-down build lives on as <a href="classic.html">Classic 2D mode</a>.</em></p>

---

## ▶ Play it

**Option A — just open it:** download the repo and open `index.html` in a browser
(the 3D game). `classic.html` is the original 2D version.

**Option B — host it free (GitHub Pages):**
1. Push this repo to GitHub.
2. Repo **Settings → Pages → Source: `main` branch, `/root`**.
3. Your game goes live at `https://<username>.github.io/desi-streets/`.

No build step. The only dependency is **Three.js**, vendored in `vendor/three.min.js`
so it works fully offline.

## 🧔🏽 Character creator

Before you spawn, build your **Raja** — traditional looks only:

- **Skin tone**, **kurta** colour, **dhoti / pyjama** colour
- **Pagdi (turban)** on/off with a jewelled *kalgi* plume, in nine colours
- **Beard** — clean / stubble / full / long — and **moustache** on/off
- A **painted face** (eyes with irises, brows, nose, lips, skin shading) so the
  character has a recognisable human face, not a blank head
- Name your Raja; drag the live 3D preview to spin him

> **On realism:** the character is a clean *stylised* human built procedurally in
> the browser. True photoreal humans need an authored, rigged `.glb` model (e.g.
> exported from Blender / Mixamo, or a CC0 asset). The engine can be extended with
> `GLTFLoader` to drop one in — see “Ideas for v2”.

## 🎮 Controls (3D)

| Key | Action |
| --- | --- |
| **W A S D** | Move (camera-relative) |
| **Mouse drag** | Look / orbit the camera |
| **Shift** | Sprint |
| **F** | Enter / exit the auto-rickshaw |
| **J** | Punch (knock down NPCs) |
| **T** | Paan-spit 🔴 (leaves a red splat) |
| **B** | Bribe a nearby cop |
| **H** | Horn (in vehicle) |

*(On phones and tablets, on-screen thumb controls appear automatically.)*

## 🌆 One city, nine Indias

You spawn in the middle and drive outward through **nine districts**, each its own
world with its own colours, buildings, shop signs, landmark and an **arrival banner
that teaches you a real cultural fact**:

| District | Flavour | Landmark |
| --- | --- | --- |
| **Purani Dilli** | Mughal bazaars, kebabs, jalebi | Jama-Masjid-style mosque |
| **Bambai** | Bollywood + dabbawalas + chawls | "Film City" hillside sign |
| **Marwar** | Rajasthan's Pink & Blue cities, desert | Hilltop fort |
| **Kashi** | Varanasi's ghats, sadhus, spirituality | Riverside ghats |
| **Punjab** | Gurudwara, tractors, bhangra | Golden Temple + sarovar |
| **Kerala** | Backwaters, churches & temples | White cathedral |
| **Kolkata** | Yellow taxis, trams, Durga Puja | Howrah-style bridge |
| **Chennai** | Tamil temples, filter kaapi, Marina | Tiered gopuram |
| **Goa** | Beaches, feni, susegad | Church + beach |

## 🛺 The streets (the "wtf, I'm really there" effect)

- **Overloaded everything** — bikes carrying a family of five, gas cylinders, a
  fridge, a mattress, a sofa, a ladder, chickens, sugarcane; cycle-rickshaws,
  bullock carts and buses with people packed on the roof.
- **Chaotic traffic** — autos, taxis, lorries, tempos, tractors and scooters that
  turn wherever, plus potholes and roadside garbage.
- **A whole zoo** — pedestrians, cows, street dogs, goats, monkeys and pigs.
  Hit a 🐄 **holy cow** and the heat spikes hard.
- **Street food on every corner** — dosa, vada pav, momos, pani puri, chai,
  biryani, jalebi, chaat stalls, steam and all.

## 🎯 Play it your way

- **Total freedom** — jack any vehicle (**F**), drive however you like, cause chaos.
- **Culture-soaked missions** — carry the **Ganpati idol** to visarjan, deliver
  **langar** to the gurudwara, run the **dabbawala** tiffins, ferry a **pilgrim** to
  the ghats, get the **baraat** dancing to the wedding, haul the **Durga idol** to the
  pandal, serve **filter kaapi** still frothy… each pays in **₹** and teaches you
  something real.
- **Bribery, not just bullets** — there's **less police than GTA**, and this is
  India: when the ★ stars come out, find a **corrupt cop (gold badge)** and press
  **B** to buy your freedom. Try it on an **honest cop (white cap)** and it backfires.
- **Driving feel** — per-vehicle acceleration & top speed, grip-based steering,
  handbrake, reverse, crashes, fuel.
- **Minimap, HUD, health, cash, speedo** — plus a WebAudio engine, horn, siren and
  crash sounds, all generated in-browser with **zero asset files**.

## 🛠 Tech

Single-file game, zero dependencies:

```
index.html   → layout, HUD, start screen, styling
game.js      → the whole engine: world gen, physics, AI, wanted system, rendering
```

Everything (audio included) is generated at runtime, so the game is tiny and works
offline.

## 📈 Ideas for v2

- Enterable buildings & interiors
- Day/night cycle and monsoon weather
- Weapons and gang territory
- Bigger story missions with characters
- High-score / cash leaderboard

---

<p align="center"><em>Sab kuch milega, bas street pe chalao. 🚦</em></p>
