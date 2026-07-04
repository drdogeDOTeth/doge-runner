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

## How to play

- **A D** run (arrows work too) &nbsp; **SPACE** jump (hold for height, press again mid-air to double jump)
- **SHIFT / X** roll attack &nbsp; **P** pause &nbsp; **M** mute
- Stomp or roll the critters; never touch the spiky ones.
- Collect 100 pickups (bananas / coins / rings) for an extra life; grab all four
  **D-O-G-E** letters for a bonus life at the clear screen.
- The star barrel is a checkpoint. Jump into barrel cannons and fire with SPACE;
  walk onto springs to bounce.

## Your avatar

Drop a `.vrm` or `.glb` anywhere on either page. The model's skeleton is procedurally posed
(idle, 4-frame run, jump, fall, roll, victory, hurt) and rasterized into outlined pixel
sprites — nothing is uploaded anywhere. VRM humanoid rigs work best; Mixamo-style GLB bone
names are auto-detected; unrigged models get static poses. Your converted avatar is saved in
`localStorage` per mode and survives reloads.
