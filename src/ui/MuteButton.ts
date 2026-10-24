import Phaser from 'phaser';
import { isMuted, toggleMute } from '../audio';

const RADIUS = 28;
const INK = 0x3b2f2f;
const PAPER = 0xf7f0e4;

// Botón redondo con un altavoz dibujado (ondas = sonido, X = silencio). También responde a la tecla M.
export class MuteButton {
  private gfx: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene, x: number, y: number) {
    this.gfx = scene.add.graphics({ x, y }).setDepth(40);
    this.gfx
      .setInteractive(new Phaser.Geom.Circle(0, 0, RADIUS + 6), Phaser.Geom.Circle.Contains)
      .on('pointerdown', () => this.toggle());
    if (this.gfx.input) this.gfx.input.cursor = 'pointer';
    scene.input.keyboard?.on('keydown-M', () => this.toggle());
    this.draw();
  }

  private toggle() {
    toggleMute(this.scene);
    this.draw();
    // Pequeño "pulsado" para que se note que ha respondido.
    this.scene.tweens.add({ targets: this.gfx, scale: { from: 0.85, to: 1 }, duration: 120, ease: 'Back.Out' });
  }

  private draw() {
    const g = this.gfx.clear();
    g.fillStyle(PAPER, 0.92).fillCircle(0, 0, RADIUS);
    g.lineStyle(4, INK).strokeCircle(0, 0, RADIUS);
    // Altavoz
    g.fillStyle(INK).fillPoints(
      [
        new Phaser.Math.Vector2(-14, -6),
        new Phaser.Math.Vector2(-7, -6),
        new Phaser.Math.Vector2(1, -13),
        new Phaser.Math.Vector2(1, 13),
        new Phaser.Math.Vector2(-7, 6),
        new Phaser.Math.Vector2(-14, 6),
      ],
      true,
    );
    g.lineStyle(3, INK);
    if (isMuted()) {
      g.lineBetween(6, -7, 16, 7).lineBetween(16, -7, 6, 7);
    } else {
      g.beginPath().arc(2, 0, 8, -0.8, 0.8).strokePath();
      g.beginPath().arc(2, 0, 14, -0.8, 0.8).strokePath();
    }
  }
}
