import Phaser from 'phaser';
import { fullscreenAvailable, isFullscreen, toggleFullscreen } from '../fullscreen';

const RADIUS = 28;
const INK = 0x3b2f2f;
const PAPER = 0xf7f0e4;

// Botón redondo de pantalla completa (esquinas hacia fuera = entrar, hacia dentro = salir).
// No se crea si el navegador no la admite (p. ej. Safari en iPhone).
export class FullscreenButton {
  private gfx?: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    if (!fullscreenAvailable()) return;
    this.gfx = scene.add.graphics({ x, y }).setDepth(40);
    this.gfx
      .setInteractive(new Phaser.Geom.Circle(0, 0, RADIUS + 6), Phaser.Geom.Circle.Contains)
      // En pointerup y no en pointerdown: en táctil el navegador solo la permite al levantar el dedo.
      .on('pointerup', () => toggleFullscreen());
    if (this.gfx.input) this.gfx.input.cursor = 'pointer';

    const redraw = () => this.draw();
    document.addEventListener('fullscreenchange', redraw);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => document.removeEventListener('fullscreenchange', redraw));
    this.draw();
  }

  private draw() {
    const g = this.gfx!.clear();
    g.fillStyle(PAPER, 0.92).fillCircle(0, 0, RADIUS);
    g.lineStyle(4, INK).strokeCircle(0, 0, RADIUS);
    g.lineStyle(4, INK);
    // Cuatro esquinas; en pantalla completa apuntan hacia dentro.
    const a = 12;
    const l = 7;
    const d = isFullscreen() ? -1 : 1;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = sx * a;
      const cy = sy * a;
      g.lineBetween(cx, cy, cx - sx * l * d, cy).lineBetween(cx, cy, cx, cy - sy * l * d);
    }
  }
}
