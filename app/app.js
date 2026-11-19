// Vice Cover Maker: turns the user's photos and a caption into a neon-sunset
// multi-panel poster, drawn on a canvas and exported as a PNG. Static, offline,
// no network: photos are read on the user's machine, never uploaded.

const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 x 1350' },
  wide: { w: 1920, h: 1080, label: '1920 x 1080' },
};

// Panel boxes as fractions [x, y, w, h] of the cover plus a slight tilt in degrees.
// hero is the big panel; left and right are the two small panels under it.
const LAYOUTS = {
  square: {
    hero: [0.037, 0.115, 0.926, 0.44, -0.7],
    left: [0.037, 0.575, 0.45, 0.185, 0.5],
    right: [0.513, 0.575, 0.45, 0.185, -0.5],
    captionTop: 0.77,
  },
  portrait: {
    hero: [0.037, 0.105, 0.926, 0.415, -0.7],
    left: [0.037, 0.54, 0.45, 0.19, 0.5],
    right: [0.513, 0.54, 0.45, 0.19, -0.5],
    captionTop: 0.755,
  },
  wide: {
    hero: [0.021, 0.11, 0.583, 0.565, -0.6],
    left: [0.625, 0.11, 0.354, 0.27, 0.5],
    right: [0.625, 0.405, 0.354, 0.27, -0.5],
    captionTop: 0.68,
  },
};

const state = {
  size: 'portrait',
  caption: 'Sunset Heist',
  subcaption: 'One last ride down the boulevard',
  grade: 0.55,
  photos: {
    hero: { img: null, zoom: 1.2, offX: 0, offY: 0 },
    left: { img: null, zoom: 1.2, offX: 0, offY: 0 },
    right: { img: null, zoom: 1.2, offX: 0, offY: 0 },
  },
};

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');

/** Deterministic pseudo-random stream, so the skyline is the same every run. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function drawSunsetBackdrop(W, H) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#1a0b2e');
  sky.addColorStop(0.35, '#7b1e5b');
  sky.addColorStop(0.62, '#ff5e3a');
  sky.addColorStop(0.85, '#ff9e4f');
  sky.addColorStop(1, '#ffc46b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Retro striped sun, top right, peeking above the hero panel.
  const sunX = W * 0.8;
  const sunY = H * 0.055;
  const sunR = W * 0.085;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 1.9);
  glow.addColorStop(0, 'rgba(255, 214, 120, 0.85)');
  glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - sunR * 2, sunY - sunR * 2, sunR * 4, sunR * 4);
  const sun = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  sun.addColorStop(0, '#fff7ae');
  sun.addColorStop(0.6, '#ffb347');
  sun.addColorStop(1, '#ff5e3a');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  // Cut horizontal stripes through the sun's lower half.
  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#1a0b2e';
  let stripeY = sunY + sunR * 0.05;
  let stripeH = sunR * 0.045;
  while (stripeY < sunY + sunR) {
    ctx.fillRect(sunX - sunR, stripeY, sunR * 2, stripeH);
    stripeY += stripeH * 2.4;
    stripeH *= 1.25;
  }
  ctx.restore();
}

function drawSkyline(W, H, baseY) {
  const rnd = mulberry32(20261119);
  ctx.fillStyle = '#2a0a3d';
  let x = 0;
  while (x < W) {
    const bw = W * (0.05 + rnd() * 0.09);
    const bh = H * (0.012 + rnd() * 0.035);
    ctx.fillRect(x, baseY - bh, bw, bh);
    // A lit window or two on some buildings.
    if (rnd() > 0.45) {
      ctx.fillStyle = 'rgba(255, 214, 120, 0.9)';
      ctx.fillRect(x + bw * 0.3, baseY - bh * 0.6, bw * 0.12, bh * 0.18);
      ctx.fillStyle = '#2a0a3d';
    }
    x += bw + W * 0.008;
  }
}

function drawPalm(x, y, s, flip) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -s : s, s);
  ctx.strokeStyle = '#2a0a3d';
  ctx.lineCap = 'round';
  // Leaning trunk.
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(10, -50, 30, -84);
  ctx.stroke();
  // Fronds: arc out from the crown, then droop down.
  ctx.lineWidth = 7;
  const crownX = 30;
  const crownY = -84;
  for (const deg of [-168, -135, -102, -68, -34, -2]) {
    const a = (deg * Math.PI) / 180;
    const tipX = crownX + Math.cos(a) * 62;
    const tipY = crownY + Math.sin(a) * 44 + 30;
    const midX = crownX + Math.cos(a) * 42;
    const midY = crownY + Math.sin(a) * 36 - 8;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPhotoIntoPanel(panel, photo, W, H, grade) {
  const [fx, fy, fw, fh, tilt] = panel;
  const px = fx * W;
  const py = fy * H;
  const pw = fw * W;
  const ph = fh * H;
  ctx.save();
  ctx.translate(px + pw / 2, py + ph / 2);
  ctx.rotate((tilt * Math.PI) / 180);
  ctx.translate(-pw / 2, -ph / 2);
  ctx.shadowColor = 'rgba(10, 2, 20, 0.55)';
  ctx.shadowBlur = W * 0.02;
  ctx.shadowOffsetY = W * 0.008;
  ctx.fillStyle = '#fff';
  ctx.fillRect(-W * 0.006, -W * 0.006, pw + W * 0.012, ph + W * 0.012);
  ctx.shadowColor = 'transparent';
  ctx.beginPath();
  ctx.rect(0, 0, pw, ph);
  ctx.clip();

  if (photo.img) {
    const iw = photo.img.naturalWidth;
    const ih = photo.img.naturalHeight;
    const scale = Math.max(pw / iw, ph / ih) * photo.zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(photo.img, (pw - dw) / 2 + photo.offX * pw, (ph - dh) / 2 + photo.offY * ph, dw, dh);
    // Neon-sunset grade: a warm overlay that unifies every photo.
    if (grade > 0) {
      const tint = ctx.createLinearGradient(0, 0, 0, ph);
      tint.addColorStop(0, 'rgba(255, 94, 58, 0.9)');
      tint.addColorStop(0.55, 'rgba(255, 46, 136, 0.55)');
      tint.addColorStop(1, 'rgba(123, 30, 91, 0.7)');
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = grade * 0.6;
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, pw, ph);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    // Vignette to seat the photo in the poster.
    const vig = ctx.createRadialGradient(pw / 2, ph / 2, Math.min(pw, ph) * 0.42, pw / 2, ph / 2, Math.max(pw, ph) * 0.75);
    vig.addColorStop(0, 'rgba(20, 4, 31, 0)');
    vig.addColorStop(1, 'rgba(20, 4, 31, 0.38)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, pw, ph);
  } else {
    const empty = ctx.createLinearGradient(0, 0, pw, ph);
    empty.addColorStop(0, '#3a1550');
    empty.addColorStop(1, '#1d0a2c');
    ctx.fillStyle = empty;
    ctx.fillRect(0, 0, pw, ph);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = `${Math.round(pw * 0.055)}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD YOUR PHOTO', pw / 2, ph / 2);
  }
  ctx.restore();
}

function wrapCaption(text, maxWidth) {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function drawCaptionBand(W, H, layout) {
  const top = layout.captionTop * H;
  const shade = ctx.createLinearGradient(0, top - H * 0.03, 0, H);
  shade.addColorStop(0, 'rgba(20, 4, 31, 0)');
  shade.addColorStop(0.3, 'rgba(20, 4, 31, 0.62)');
  shade.addColorStop(1, 'rgba(20, 4, 31, 0.85)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, top - H * 0.03, W, H - top + H * 0.03);

  drawSkyline(W, H, top + H * 0.012);
  const palmScale = Math.min(W, H) * 0.0016;
  drawPalm(W * 0.05, H * 0.99, palmScale, false);
  drawPalm(W * 0.95, H * 0.99, palmScale, true);

  const fontSize = Math.round(W * (state.size === 'wide' ? 0.075 : 0.105));
  ctx.font = `${fontSize}px Anton, sans-serif`;
  const lines = wrapCaption(state.caption || 'Sunset Heist', W * 0.86);
  const lineHeight = fontSize * 1.04;
  const blockH = lines.length * lineHeight;
  const bandH = H - top;
  // Leave room for the sub-caption below the main caption, so nothing is cut.
  const subGap = state.subcaption ? fontSize * 0.38 + Math.round(W * 0.024) : 0;
  const totalH = blockH + subGap;
  let startY = top + (bandH - totalH) / 2 + fontSize * 0.36;
  if (state.subcaption) startY -= fontSize * 0.1;

  ctx.save();
  ctx.translate(W / 2, startY + blockH / 2);
  ctx.rotate((-1.6 * Math.PI) / 180);
  ctx.translate(-W / 2, -(startY + blockH / 2));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const fill = ctx.createLinearGradient(0, startY - fontSize / 2, 0, startY + blockH);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(0.55, '#ffe9a8');
  fill.addColorStop(1, '#ffb347');
  lines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    ctx.strokeStyle = '#1c0530';
    ctx.lineWidth = fontSize * 0.16;
    ctx.strokeText(line, W / 2, y);
    ctx.fillStyle = fill;
    ctx.fillText(line, W / 2, y);
  });
  ctx.restore();

  if (state.subcaption) {
    ctx.font = `700 ${Math.round(W * 0.024)}px system-ui, sans-serif`;
    try { ctx.letterSpacing = '4px'; } catch { /* older canvas: ignore */ }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd6f2';
    ctx.shadowColor = 'rgba(20, 4, 31, 0.9)';
    ctx.shadowBlur = 8;
    ctx.fillText(state.subcaption.toUpperCase(), W / 2, startY + blockH + fontSize * 0.38);
    ctx.shadowColor = 'transparent';
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas: ignore */ }
  }
}

/** Renders the whole cover onto the page canvas at the chosen export size. */
export function renderCover() {
  const { w, h } = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const layout = LAYOUTS[state.size];
  drawSunsetBackdrop(w, h);
  drawPhotoIntoPanel(layout.hero, state.photos.hero, w, h, state.grade);
  drawPhotoIntoPanel(layout.left, state.photos.left, w, h, state.grade);
  drawPhotoIntoPanel(layout.right, state.photos.right, w, h, state.grade);
  drawCaptionBand(w, h, layout);
  // Thin poster frame.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = Math.max(3, w * 0.004);
  ctx.strokeRect(w * 0.012, h * 0.012, w * 0.976, h * 0.976);
}

function redraw() {
  renderCover();
}

function setPhoto(key, img) {
  state.photos[key].img = img;
  redraw();
}

async function loadSample(key, name) {
  const img = await loadImage(`samples/${name}.jpg`);
  setPhoto(key, img);
}

function otherSample(name) {
  return name === 'pier' ? 'boulevard' : 'pier';
}

// --- Editor wiring ---------------------------------------------------------

document.querySelectorAll('[data-photo]').forEach((input) => {
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(input.dataset.photo, await loadImage(URL.createObjectURL(file)));
  });
});

document.querySelectorAll('[data-sample]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const key = btn.dataset.sample;
    const name = key === 'left' ? 'boulevard' : 'pier';
    await loadSample(key, name);
  });
});

document.querySelectorAll('[data-fillall]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const img = state.photos[btn.dataset.fillall].img;
    if (!img) return;
    for (const key of Object.keys(state.photos)) state.photos[key].img = img;
    redraw();
  });
});

for (const kind of ['zoom', 'offx', 'offy']) {
  document.querySelectorAll(`[data-${kind}]`).forEach((slider) => {
    slider.addEventListener('input', () => {
      const key = slider.dataset[kind];
      const prop = kind === 'zoom' ? 'zoom' : kind === 'offx' ? 'offX' : 'offY';
      state.photos[key][prop] = Number(slider.value);
      redraw();
    });
  });
}

document.getElementById('caption').addEventListener('input', (e) => {
  state.caption = e.target.value;
  redraw();
});
document.getElementById('subcaption').addEventListener('input', (e) => {
  state.subcaption = e.target.value;
  redraw();
});
document.getElementById('grade').addEventListener('input', (e) => {
  state.grade = Number(e.target.value);
  redraw();
});

document.querySelectorAll('[data-size]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.size = btn.dataset.size;
    document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b === btn));
    redraw();
  });
});

document.getElementById('export').addEventListener('click', () => {
  const status = document.getElementById('status');
  renderCover();
  canvas.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed — please try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${SIZES[state.size].label.replace(/ x /g, 'x').replace(/ /g, '')}.png`;
    a.click();
    status.textContent = `Saved vice-cover-${SIZES[state.size].label.replace(/ x /g, 'x').replace(/ /g, '')}.png`;
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
});

// --- Screenshot scenes -----------------------------------------------------
// ?shot=cover shows the cover alone; ?shot=editor shows the editor with photos
// loaded. `photo` picks the hero sample, `caption` / `subcaption` / `size` set the
// words and the export size. window.__shotReady signals the shot is painted.

function setPanelCrop(key, zoom, offX, offY) {
  const photo = state.photos[key];
  photo.zoom = zoom;
  photo.offX = offX;
  photo.offY = offY;
  const zoomSlider = document.querySelector(`[data-zoom="${key}"]`);
  const xSlider = document.querySelector(`[data-offx="${key}"]`);
  const ySlider = document.querySelector(`[data-offy="${key}"]`);
  if (zoomSlider) zoomSlider.value = String(zoom);
  if (xSlider) xSlider.value = String(offX);
  if (ySlider) ySlider.value = String(offY);
}

async function runShot(query) {
  const shot = query.get('shot');
  const photo = query.get('photo') ?? 'pier';
  const size = query.get('size');
  if (size && SIZES[size]) {
    state.size = size;
    document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b.dataset.size === size));
  }
  const caption = query.get('caption');
  if (caption !== null) {
    state.caption = caption;
    document.getElementById('caption').value = caption;
  }
  const sub = query.get('subcaption');
  if (sub !== null) {
    state.subcaption = sub;
    document.getElementById('subcaption').value = sub;
  }
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const hero = await loadImage(`samples/${photo}.jpg`);
  const other = await loadImage(`samples/${otherSample(photo)}.jpg`);
  state.photos.hero.img = hero;
  state.photos.left.img = other;
  state.photos.right.img = hero;
  // Frame the sample photos so the people in them stay in view: the wide hero
  // panel crops a square photo top and bottom, so shift it down to the faces.
  setPanelCrop('hero', 1.05, 0, 0.32);
  setPanelCrop('left', 1.1, 0, 0.1);
  setPanelCrop('right', 1.05, 0, 0.32);
  await document.fonts.load('100px Anton');
  await document.fonts.ready;
  renderCover();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

const query = new URLSearchParams(location.search);
if (query.get('shot')) {
  runShot(query).catch((err) => {
    document.getElementById('status').textContent = `Shot failed: ${err.message}`;
  });
} else {
  document.fonts.load('100px Anton').then(redraw).catch(redraw);
  redraw();
}
