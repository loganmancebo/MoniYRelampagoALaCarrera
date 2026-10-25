// Convierte las imágenes generadas (fondo magenta) en assets listos para Phaser:
// recorta el fondo, separa frames, alinea los pies y hace repetibles suelo y cielo.
// Uso: npm run assets
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'public/assets';
const META = 'src/generated/assets.ts';
mkdirSync(OUT, { recursive: true });
mkdirSync('src/generated', { recursive: true });

const CHAR_RUN_HEIGHT = 220; // alto (px) del frame de carrera exportado
const GROUND_DEPTH = 150; // px de tierra bajo la superficie en el suelo exportado

async function load(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

// Quita el magenta: alpha según "cuánto magenta" tiene el píxel y elimina el halo rosado.
function chromaKey(img) {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const m = Math.min(r, b) - g;
    if (m >= 170) {
      d[i + 3] = 0;
    } else if (m > 60) {
      d[i + 3] = Math.round(255 * (170 - m) / 110);
      d[i] = d[i + 2] = g; // halo -> gris oscuro del contorno
    }
  }
  return img;
}

function crop(img, x0, y0, w, h) {
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    img.data.copy(out, y * w * 4, ((y0 + y) * img.width + x0) * 4, ((y0 + y) * img.width + x0 + w) * 4);
  }
  return { data: out, width: w, height: h };
}

// Separa los frames de una cuadrícula. Cada mancha conectada va a la casilla donde cae su centro,
// así no se cortan las partes que sobresalen de su casilla (p. ej. la borla del gorro).
function cells(img, cols, rows) {
  const { data, width, height } = img;
  const cw = width / cols, ch = height / rows;
  const label = new Int32Array(width * height).fill(-1);
  const boxes = Array.from({ length: cols * rows }, () => ({ x0: Infinity, y0: Infinity, x1: -1, y1: -1 }));
  const owner = [];
  const stack = [];
  for (let start = 0; start < width * height; start++) {
    if (label[start] !== -1 || data[start * 4 + 3] <= 40) continue;
    const id = owner.length, pixels = [];
    label[start] = id;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop();
      pixels.push(p);
      const x = p % width, y = (p - x) / width;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const q = ny * width + nx;
        if (label[q] === -1 && data[q * 4 + 3] > 40) { label[q] = id; stack.push(q); }
      }
    }
    if (pixels.length < 40) { owner.push(-1); continue; } // mota del JPG
    let sx = 0, sy = 0;
    for (const p of pixels) { sx += p % width; sy += Math.floor(p / width); }
    const cell = Math.floor(sy / pixels.length / ch) * cols + Math.floor(sx / pixels.length / cw);
    owner.push(cell);
    const b = boxes[cell];
    for (const p of pixels) {
      const x = p % width, y = (p - x) / width;
      b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y);
    }
  }
  return boxes.map((b, cell) => {
    const w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1, out = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = (b.y0 + y) * width + b.x0 + x, l = label[p];
        if (l === -1 || owner[l] === cell) data.copy(out, (y * w + x) * 4, p * 4, p * 4 + 4);
      }
    }
    return { data: out, width: w, height: h };
  });
}

const raw = (img) => sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } });

async function resized(img, scale) {
  const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
  const { data } = await raw(img).resize(w, h).raw().toBuffer({ resolveWithObject: true });
  return { data, width: w, height: h };
}

// Spritesheet horizontal con frames del mismo tamaño: centrados en X y con los pies abajo.
async function characterSheet(file, name) {
  const frames = cells(chromaKey(await load(file)), 4, 2);
  const runH = frames.slice(0, 4).reduce((s, f) => s + f.height, 0) / 4;
  const scaled = await Promise.all(frames.map((f) => resized(f, CHAR_RUN_HEIGHT / runH)));
  const fw = Math.max(...scaled.map((f) => f.width)) + 4;
  const fh = Math.max(...scaled.map((f) => f.height)) + 4;
  await sharp({ create: { width: fw * scaled.length, height: fh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(scaled.map((f, i) => ({
      input: f.data,
      raw: { width: f.width, height: f.height, channels: 4 },
      left: i * fw + Math.round((fw - f.width) / 2),
      top: fh - 2 - f.height,
    })))
    .png()
    .toFile(`${OUT}/${name}.png`);
  return { frameWidth: fw, frameHeight: fh, sizes: scaled.map((f) => [f.width, f.height]) };
}

const OBSTACLE_NAMES = [
  'mushroom', 'carrot', 'rock', 'fence',
  'rod', 'stump', 'puddle', 'stones',
  'cloud1', 'cloud2', 'bee1', 'bee2',
];

// Obstáculos que vienen en una imagen suelta. Se reducen a `height` px (≈2× su alto en pantalla, como
// los de la hoja) porque Phaser no usa mipmaps y una reducción grande en el juego deja la línea rota.
const SINGLE_OBSTACLES = {
  tree: { file: 'Tree_887x1774.png', height: 600 },
};

// Obstáculos cuyo verde se cambia de tono para que se distingan de las colinas (tono en grados).
const RECOLOR_GREEN = {
  mushroom: { hue: 6, saturation: 1.7 }, // sombrero rojo
};

// Cambia el tono de los píxeles verdes manteniendo la luminosidad (y con ella el sombreado y la textura).
function recolorGreen(img, { hue, saturation }) {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, c = max - min;
    if (c < 0.08 || max !== g) continue;
    const h = 60 * ((b - r) / c + 2);
    if (h < 55 || h > 150) continue;
    const s = Math.min(1, (c / (1 - Math.abs(2 * l - 1))) * saturation);
    const k = (n) => (n + hue / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    d[i] = Math.round(f(0) * 255); d[i + 1] = Math.round(f(8) * 255); d[i + 2] = Math.round(f(4) * 255);
  }
  return img;
}

async function obstacles(file) {
  const frames = cells(chromaKey(await load(file)), 4, 3);
  const meta = {};
  for (let i = 0; i < frames.length; i++) {
    const recolor = RECOLOR_GREEN[OBSTACLE_NAMES[i]];
    if (recolor) recolorGreen(frames[i], recolor);
    await raw(frames[i]).png().toFile(`${OUT}/obstacle_${OBSTACLE_NAMES[i]}.png`);
    meta[OBSTACLE_NAMES[i]] = [frames[i].width, frames[i].height];
  }
  for (const [name, { file: single, height }] of Object.entries(SINGLE_OBSTACLES)) {
    const [frame] = cells(chromaKey(await load(single)), 1, 1);
    const out = await resized(frame, height / frame.height);
    await raw(out).png().toFile(`${OUT}/obstacle_${name}.png`);
    meta[name] = [out.width, out.height];
  }
  return meta;
}

// Funde el final de la imagen con su principio para que se repita sin costura.
function makeSeamless(img, k) {
  const w = img.width - k, out = Buffer.alloc(w * img.height * 4);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, a = (y * img.width + x) * 4;
      if (x < k) {
        // Mezcla con alpha premultiplicado para que el color de los píxeles transparentes no tiña.
        const b = (y * img.width + w + x) * 4, t = x / k;
        const wa = img.data[a + 3] * t, wb = img.data[b + 3] * (1 - t), alpha = wa + wb;
        for (let c = 0; c < 3; c++) out[o + c] = alpha ? Math.round((img.data[a + c] * wa + img.data[b + c] * wb) / alpha) : 0;
        out[o + 3] = Math.round(alpha);
      } else {
        img.data.copy(out, o, a, a + 4);
      }
    }
  }
  return { data: out, width: w, height: img.height };
}

// Fila del contorno negro de la superficie: la fila con más píxeles oscuros en la mitad superior.
function surfaceRow(img) {
  let best = 0, bestCount = -1;
  for (let y = 0; y < img.height / 2; y++) {
    let n = 0;
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      if (img.data[i + 3] > 200 && img.data[i] + img.data[i + 1] + img.data[i + 2] < 150) n++;
    }
    if (n > bestCount) { bestCount = n; best = y; }
  }
  return best;
}

async function ground(file) {
  const img = makeSeamless(chromaKey(await load(file)), 128);
  const surface = surfaceRow(img);
  const scale = GROUND_DEPTH / (img.height - surface);
  const out = await resized(img, scale);
  await raw(out).png().toFile(`${OUT}/ground.png`);
  return { width: out.width, height: out.height, surfaceY: Math.round(surface * scale) };
}

// Colinas del parallax: se recortan las filas vacías de arriba y se exportan ya al alto que tendrán en
// pantalla (`height`), para que Phaser no tenga que reducirlas (no usa mipmaps).
const HILLS = {
  hills_far: { file: 'distant_hills_seamless_2048x512.png', height: 260 },
  hills_near: { file: 'hills_near_2172x724.png', height: 190 },
};

async function hills(name, { file, height }) {
  const img = makeSeamless(chromaKey(await load(file)), 64);
  let top = 0;
  while (top < img.height && !rowHasPixels(img, top)) top++;
  const out = await resized(crop(img, 0, top, img.width, img.height - top), height / (img.height - top));
  await raw(out).png().toFile(`${OUT}/${name}.png`);
  return { width: out.width, height: out.height };
}

function rowHasPixels(img, y) {
  for (let x = 0; x < img.width; x++) if (img.data[(y * img.width + x) * 4 + 3] > 40) return true;
  return false;
}

async function sky(file) {
  const img = makeSeamless(await load(file), 160);
  await raw(img).png().toFile(`${OUT}/sky.png`);
  return { width: img.width, height: img.height };
}

const meta = {
  moni: await characterSheet('Moni_sprite_sheet_2048x1024.png', 'moni'),
  relampago: await characterSheet('Relampago_sprite_sheet_2048x1024.png', 'relampago'),
  obstacles: await obstacles('Obstaculos_sprite_sheet_1200x896_2.jpg'),
  ground: await ground('Ground_2064x512.jpg'),
  sky: await sky('Sky_1774x887.png'),
};
for (const [name, def] of Object.entries(HILLS)) meta[name] = await hills(name, def);

writeFileSync(META, `// Generado por tools/process-assets.mjs — no editar a mano.\nexport const ASSET_META = ${JSON.stringify(meta, null, 2)} as const;\n`);
console.log(JSON.stringify(meta, null, 2));
