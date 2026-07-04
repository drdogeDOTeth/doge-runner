# DOGE RUNNER

**▶ Play it now: https://drdogedoteth.github.io/doge-runner/** (arcade mode:
[/arcade.html](https://drdogedoteth.github.io/doge-runner/arcade.html))

A retro browser platformer with one twist: **drag & drop any `.vrm` or `.glb` avatar and it
becomes the playable pixel-art hero** — rendered from the 3D model into sprite frames
locally in your browser, the same "pre-rendered 3D" trick Donkey Kong Country used in 1994.

## The games

- **`index.html` — DOGE RUNNER**: side-scrolling platformer with three retro zones that
  rotate as you clear them, each faster than the last:
  1. **Jungle Jaunt** — DKC-style jungle with barrel cannon chains over the big pit.
  2. **Pipe Panic** — plumber-style meadow with green pipes, brick platforms, and coins.
  3. **Emerald Rush** — speedway with checkerboard cliffs, sea horizon, rings, and
     springs that launch you sky-high.
- **`arcade.html` — DK REMIX (1981 arcade mode)**: single-screen barrels-and-ladders
  classic. Girders, ladders, hammers, fireballs, bonus timer, high score.

## Run it

Any static file server works, e.g.:

```
npx http-server -p 4173 .
```

then open http://localhost:4173.

### Docker / Coolify

Every push to `main` builds `ghcr.io/drdogedoteth/doge-runner:main` (nginx serving the
two games — see [`Dockerfile`](Dockerfile)). To self-host with Coolify: New Resource →
Service → Docker Compose → paste [`docker-compose.yml`](docker-compose.yml), then add a
domain. Same flow as 007remix. (One-time: make the GHCR package public under
github.com → your packages, or add registry credentials in Coolify.)

## How to play

- On the title screen, press **A / D** to pick your starting zone, then **ENTER**.
- **A D** run (arrows work too) &nbsp; **SPACE** jump (hold for height, press again mid-air to double jump)
- **SHIFT / X** roll attack &nbsp; **P** pause &nbsp; **M** mute
- Stomp or roll the critters; never touch the spiky ones.
- Collect 100 pickups (bananas / coins / rings) for an extra life; grab all four
  **D-O-G-E** letters for a bonus life at the clear screen.
- The star barrel is a checkpoint. Jump into barrel cannons and fire with SPACE;
  walk onto springs to bounce.
- Defeated critters sometimes drop goodies: a pickup bundle, a heart, a rare 1UP
  mushroom, or an **invincibility star** (rainbow mode — nothing can touch you).
- Rumor has it one of the pipes in Pipe Panic goes somewhere... old-school rules
  apply. And something shiny sits on the highest plank in Emerald Rush.

## Your avatar

Drop a `.vrm` or `.glb` anywhere on either page. The model's skeleton is procedurally posed
(idle, 4-frame run, jump, fall, roll, victory, hurt) and rasterized into outlined pixel
sprites — nothing is uploaded anywhere. VRM humanoid rigs work best; Mixamo-style GLB bone
names are auto-detected; unrigged models (cars, props, animals) are auto-fit to the frame,
face the camera along their longest axis, and get a waddle animation. In Doge Runner you can
also re-skin the **critters**: pick the WALKER, SPIKY, or FLYER slot before dropping a model
(spikies keep hazard spikes stamped on top so they stay readable). In DK arcade mode you can
re-skin **KONG** and the **LADY** the same way. Everything is saved in `localStorage` per
slot and survives reloads; each slot has a reset button.

## Load an avatar from a URL

Both games accept model URLs as query parameters, so external sites (avatar generators,
VRM collections) can deep-link straight into the game:

```
https://drdogedoteth.github.io/doge-runner/index.html?hero=https://example.com/avatar.vrm
https://drdogedoteth.github.io/doge-runner/arcade.html?hero=...&kong=...&lady=...
```

- `index.html` params: `hero` (alias `avatar`), `walker`, `spiky`, `bird`
- `arcade.html` params: `hero` (alias `avatar`), `kong` (alias `ape`), `lady`
- URLs without a `.vrm`/`.glb`/`.gltf` extension are assumed to be VRM.
- The model's host must allow CORS (e.g. raw GitHub, IPFS gateways, most CDNs).
- There's also a "paste a model URL" box in the sidebar of both games.

The model is fetched, converted to sprites locally, and saved per slot like a drop.

## Global leaderboard (optional)

Out of the box the leaderboards are per-browser (`localStorage`) and show one row per
player (their best). To make them **global across all players**, deploy the tiny
Cloudflare Worker in [`worker/leaderboard.js`](worker/leaderboard.js) (free tier is plenty):

1. [dash.cloudflare.com](https://dash.cloudflare.com) → Workers &amp; Pages → Create →
   Worker → paste `worker/leaderboard.js` → Deploy.
2. In the Worker: Settings → Bindings → Add → **KV namespace** — create a namespace
   (any name) and set the **binding name** to `SCORES`.
3. Copy the Worker URL (e.g. `https://dk-leaderboard.yourname.workers.dev`) into the
   `LB_API` constant near the top of the leaderboard code in **both** `index.html` and
   `arcade.html`.

Scores then submit on every clear (runner) / game over (arcade), the sidebar switches to
**WORLD BEST / GLOBAL HIGH SCORES**, and the server keeps only each player's best. If the
Worker is unreachable the games silently fall back to the local boards.
