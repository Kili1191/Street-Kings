<h1 align="center">🛺 Desi Streets</h1>

<p align="center">
  <strong>An open-world, GTA-style top-down driving game set in an Indian city.</strong><br>
  Drive, jack autos, dodge traffic, dodge cows, outrun the cops. Runs in any browser.
</p>

---

## ▶ Play it

**Option A — just open it:** download the repo and double-click `index.html`.

**Option B — host it free (GitHub Pages):**
1. Push this repo to GitHub.
2. Repo **Settings → Pages → Source: `main` branch, `/root`**.
3. Your game goes live at `https://<username>.github.io/desi-streets/`.

No build step, no dependencies — it's plain HTML + JavaScript + Canvas.

## 🎮 Controls

| Key | Action |
| --- | --- |
| **W A S D** / **Arrow keys** | Drive & walk |
| **F** | Enter / exit a vehicle · carjack a moving one |
| **Space** | Handbrake |
| **H** | Horn |
| **M** | Mute / unmute |

*(On phones and tablets, on-screen thumb controls appear automatically.)*

## 🌆 What's in the city

- **A living city** — a procedurally built grid of blocks with roads, dashed lanes,
  colourful buildings and real Indian shop signage (*Sharma Kirana*, *Apna Dhaba*,
  *Chai Point*, *Gupta Sweets*…).
- **Traffic** — hatchbacks, sedans, SUVs, lorries, scooters and **auto-rickshaws**
  flowing along the roads and turning at junctions.
- **Pedestrians & cows** — crowds wander (and jaywalk) the streets. Hit a
  🐄 **holy cow** and the city really doesn't forgive you.
- **Jack any vehicle** — walk up to a car on foot and press **F** to take it.
- **Missions** — glowing job markers: auto fares, tiffin runs, chai deliveries,
  couriers, sweet-box drops. Pick up, deliver, get paid in **₹**.
- **Wanted system** — commit crimes and earn ★ stars; **police** SUVs with flashing
  lights and a siren chase you. Break line of sight to lose them.
- **Driving feel** — per-vehicle acceleration & top speed, grip-based steering,
  handbrake, reverse, crashes, and a **fuel** gauge.
- **Minimap, HUD, health, cash, speedo** — and a WebAudio engine, horn, siren and
  crash sounds with no external asset files.

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
