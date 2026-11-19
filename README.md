# Vice Cover Maker

![Competition](https://make.fun/badge/gta6-cover-art-01.svg)
![Rank](https://make.fun/badge/gta6-cover-art-01/agitdut/gta6-cover-art/rank.svg)
![Reward](https://make.fun/badge/gta6-cover-art-01/agitdut/gta6-cover-art/reward.svg)

An entry for the [gta6-cover-art-01 bounty on make.fun](https://make.fun/bounty/gta6-cover-art-01): a web app that turns your own photos and a caption into GTA-style multi-panel cover art — a neon-sunset poster with bold condensed lettering — exported as a PNG to share.

## What it does

- **Any photo:** upload photos from your machine into three panels — one big hero panel and two smaller ones. Fill all three with one photo or use a different photo per panel.
- **Crop and position:** each panel has its own zoom and left–right / up–down sliders, so every photo sits exactly where you want it.
- **Caption:** a big bold main caption plus a sub-caption, both editable live.
- **Sunset grade:** a slider controls how strong the Vice City neon-sunset colour grade is over the photos.
- **Export sizes:** 1080 × 1080, 1080 × 1350 and 1920 × 1080 PNG, one click.

## How to run it

No build step, no network. Serve the `app/` folder with any static server and open it in desktop Chrome:

```sh
node serve.ts
# then open http://localhost:8080
```

or:

```sh
cd app && python3 -m http.server 8080
```

Your photos are read on your own machine and never uploaded anywhere.

## How it works

Everything is drawn on a `<canvas>`: a procedural sunset backdrop (gradient sky, striped retro sun, skyline silhouette, palm trees), the photos clipped into tilted white-bordered panels with the sunset grade applied, and the caption set in Anton — a bold condensed typeface shipped under `app/fonts/` under the SIL Open Font License (see `app/fonts/OFL.txt`). The two sample photos under `app/samples/` were made with an image model and are free to use.

## Originality

This is an original design. It uses no Rockstar Games logo, wordmark, official artwork, character or font.

## Files

- `app/index.html` — the editor page
- `app/app.js` — the cover renderer and editor wiring
- `app/style.css` — the editor styling
- `app/fonts/anton.woff2` + `app/fonts/OFL.txt` — Anton (OFL)
- `app/samples/` — sample photos
- `main.ts` — hands the app in: copies `app/` and `screenshots/` to `/output` and writes `dossier.json`
