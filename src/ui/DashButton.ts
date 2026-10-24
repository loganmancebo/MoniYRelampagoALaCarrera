import Phaser from 'phaser';
import { TEXT_STYLE } from '../scenes/background';

const RADIUS = 42;
const INK = 0x3b2f2f;
const PAPER = 0xf7f0e4;
const BOLT = 0xe0b030;

// Botón del dash de Relámpago. El relleno amarillo muestra la recarga; lleno = listo.
export class DashButton {
  private gfx: Phaser.GameObjects.Graphics;
  private lastDrawn = -1;

  constructor(private scene: Phaser.Scene, x: number, y: number, onPress: () => void) {
    this.gfx = scene.add.graphics({ x, y }).setDepth(40);
    this.gfx
      .setInteractive(new Phaser.Geom.Circle(0, 0, RADIUS + 8), Phaser.Geom.Circle.Contains)
      .on('pointerdown', onPress);
    if (this.gfx.input) this.gfx.input.cursor = 'pointer';
    if (!scene.sys.game.device.input.touch) {
      scene.add
        .text(x, y - RADIUS - 8, '→ / D', { ...TEXT_STYLE, fontSize: '20px', fontStyle: '500' })
        .setOrigin(0.5, 1)
        .setDepth(40);
    }
    this.setCharge(1);
  }

  // charge: 0 = recién usado, 1 = listo.
  setCharge(charge: number) {
    const c = Phaser.Math.Clamp(charge, 0, 1);
    if (c === this.lastDrawn || (c < 1 && Math.abs(c - this.lastDrawn) < 0.01)) return;
    this.lastDrawn = c;

    const g = this.gfx.clear();
    g.fillStyle(PAPER, 0.92).fillCircle(0, 0, RADIUS);
    if (c > 0) {
      const start = -Math.PI / 2;
      g.fillStyle(BOLT, c === 1 ? 0.9 : 0.45);
      g.slice(0, 0, RADIUS, start, start + c * Math.PI * 2, false).fillPath();
    }
    g.lineStyle(4, INK).strokeCircle(0, 0, RADIUS);
    // Rayo
    const bolt = [
      [5, -26],
      [-13, 4],
      [-1, 4],
      [-6, 26],
      [14, -6],
      [2, -6],
      [9, -26],
    ].map(([x, y]) => new Phaser.Math.Vector2(x, y));
    g.fillStyle(c === 1 ? INK : 0x8a7f72).fillPoints(bolt, true);
  }

  pulse() {
    this.scene.tweens.add({ targets: this.gfx, scale: { from: 1.25, to: 1 }, duration: 220, ease: 'Back.Out' });
  }
}
