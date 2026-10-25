import Phaser from 'phaser';

const INK = 0x3b2f2f;
const SIZE = 112;
const R = 50;

// Texturas provisionales de los botones redondos del game over. Como con las partículas, si ya hay una
// imagen cargada con la misma clave (`this.load.image('btn_restart', ...)` en PreloadScene) se usa esa.
export function createButtonTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({}, false);
  const c = SIZE / 2;

  if (!scene.textures.exists('btn_restart')) {
    g.clear();
    circle(g, 0xe0b030);
    // Flecha circular: arco de ~300° con la punta arriba a la derecha.
    const r = 22;
    const end = Phaser.Math.DegToRad(-60);
    g.lineStyle(9, INK).beginPath().arc(c, c, r, Phaser.Math.DegToRad(-30), end + Math.PI * 2 - 0.35).strokePath();
    const tipX = c + Math.cos(end) * r;
    const tipY = c + Math.sin(end) * r;
    g.fillStyle(INK).fillTriangle(tipX - 13, tipY - 9, tipX + 11, tipY - 12, tipX + 2, tipY + 12);
    g.generateTexture('btn_restart', SIZE, SIZE);
  }

  if (!scene.textures.exists('btn_menu')) {
    g.clear();
    circle(g, 0xa8bf9a);
    // Casita: tejado, paredes y puerta.
    g.fillStyle(INK).fillTriangle(c - 30, c - 2, c + 30, c - 2, c, c - 28);
    g.fillRoundedRect(c - 20, c - 6, 40, 32, 3);
    g.fillStyle(0xa8bf9a).fillRoundedRect(c - 7, c + 8, 14, 18, { tl: 6, tr: 6, bl: 0, br: 0 });
    g.generateTexture('btn_menu', SIZE, SIZE);
  }

  g.destroy();
}

function circle(g: Phaser.GameObjects.Graphics, fill: number) {
  g.fillStyle(fill).fillCircle(SIZE / 2, SIZE / 2, R);
  g.lineStyle(6, INK).strokeCircle(SIZE / 2, SIZE / 2, R);
}
