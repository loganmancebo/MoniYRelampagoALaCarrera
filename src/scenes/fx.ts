import Phaser from 'phaser';
import { DAY_NIGHT } from '../config';

const INK = 0x3b2f2f;
const DUST = 0xd9c9a8;
const SPARK = 0xe0b030;
const STAR = 0xf3e7b8;
const MOON = 0xf2ead0;
const MOON_SHADE = 0xd8cfb0;

// Estrella de 4 puntas centrada en (c, c).
function starPoints(c: number, outer: number, inner: number) {
  const points: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    points.push(new Phaser.Math.Vector2(c + Math.cos(a) * r, c + Math.sin(a) * r));
  }
  return points;
}

// Texturas provisionales de partículas, dibujadas al arrancar. Como con el sonido, si ya hay una imagen
// cargada con la misma clave (`this.load.image('fx_dust', ...)` en PreloadScene) se usa esa.
export function createFxTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({}, false);

  if (!scene.textures.exists('fx_dust')) {
    g.clear();
    g.fillStyle(DUST).fillCircle(16, 16, 12);
    g.lineStyle(3, 0x6b5a48).strokeCircle(16, 16, 12);
    g.generateTexture('fx_dust', 32, 32);
  }

  if (!scene.textures.exists('fx_spark')) {
    const points = starPoints(16, 13, 4.5);
    g.clear();
    g.fillStyle(SPARK).fillPoints(points, true);
    g.lineStyle(2.5, INK).strokePoints(points, true);
    g.generateTexture('fx_spark', 32, 32);
  }

  // Estrellas y luna del ciclo día/noche (provisionales hasta tener el arte `fx_star` y `moon`).
  if (!scene.textures.exists('fx_star')) {
    g.clear();
    g.fillStyle(STAR).fillPoints(starPoints(12, 10, 3.5), true);
    g.lineStyle(2, INK, 0.6).strokePoints(starPoints(12, 10, 3.5), true);
    g.generateTexture('fx_star', 24, 24);
  }

  if (!scene.textures.exists('moon')) {
    const r = DAY_NIGHT.moon.radius;
    const c = r + 4;
    g.clear();
    g.fillStyle(MOON).fillCircle(c, c, r);
    g.fillStyle(MOON_SHADE).fillCircle(c - r * 0.3, c - r * 0.25, r * 0.2);
    g.fillCircle(c + r * 0.35, c + r * 0.2, r * 0.14);
    g.fillCircle(c - r * 0.05, c + r * 0.5, r * 0.1);
    g.lineStyle(4, INK).strokeCircle(c, c, r);
    g.generateTexture('moon', c * 2, c * 2);
  }

  g.destroy();
}
