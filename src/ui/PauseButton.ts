import Phaser from 'phaser';

const RADIUS = 28;
const INK = 0x3b2f2f;
const PAPER = 0xf7f0e4;

// Botón redondo con el símbolo de pausa (dos barras), con el mismo estilo que el de silencio.
export class PauseButton {
  constructor(scene: Phaser.Scene, x: number, y: number, onPress: () => void) {
    const g = scene.add.graphics({ x, y }).setDepth(40);
    g.fillStyle(PAPER, 0.92).fillCircle(0, 0, RADIUS);
    g.lineStyle(4, INK).strokeCircle(0, 0, RADIUS);
    g.fillStyle(INK).fillRoundedRect(-11, -12, 8, 24, 2).fillRoundedRect(3, -12, 8, 24, 2);
    g.setInteractive(new Phaser.Geom.Circle(0, 0, RADIUS + 6), Phaser.Geom.Circle.Contains).on('pointerdown', onPress);
    if (g.input) g.input.cursor = 'pointer';
  }
}
