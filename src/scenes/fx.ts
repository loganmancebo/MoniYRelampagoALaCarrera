import Phaser from 'phaser';

const INK = 0x3b2f2f;
const DUST = 0xd9c9a8;
const SPARK = 0xe0b030;

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
    // Estrella de 4 puntas.
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? 13 : 4.5;
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      points.push(new Phaser.Math.Vector2(16 + Math.cos(a) * r, 16 + Math.sin(a) * r));
    }
    g.clear();
    g.fillStyle(SPARK).fillPoints(points, true);
    g.lineStyle(2.5, INK).strokePoints(points, true);
    g.generateTexture('fx_spark', 32, 32);
  }

  g.destroy();
}
