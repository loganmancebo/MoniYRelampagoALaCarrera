import Phaser from 'phaser';
import { GAME_OVER, HEIGHT, WIDTH } from '../config';
import { TEXT_STYLE } from '../scenes/background';

const INK = 0x3b2f2f;
const PAPER = 0xf7f0e4;
const MUSTARD = 0xe0b030;

interface Options {
  score: number;
  highScore: number; // récord anterior a esta partida
  isRecord: boolean;
  onRestart: () => void;
  onMenu: () => void;
}

// Panel de fin de partida: puntuación, récord y botones de reintentar y volver al menú.
export class GameOverPanel {
  constructor(scene: Phaser.Scene, opts: Options) {
    const panel = scene.add.container(WIDTH / 2, HEIGHT / 2 - 60).setDepth(30);
    panel.add(scene.add.rectangle(0, 0, 600, 470, PAPER, 0.96).setStrokeStyle(6, INK));
    panel.add(scene.add.text(0, -185, '¡Ay!', { ...TEXT_STYLE, fontSize: '60px' }).setOrigin(0.5));
    panel.add(scene.add.text(0, -112, String(Math.floor(opts.score)), { ...TEXT_STYLE, fontSize: '88px' }).setOrigin(0.5));
    panel.add(scene.add.text(0, -55, 'puntos', { ...TEXT_STYLE, fontSize: '24px', fontStyle: '500' }).setOrigin(0.5));

    if (opts.isRecord) {
      const badge = scene.add.container(0, 0);
      badge.add(scene.add.rectangle(0, 0, 300, 52, MUSTARD).setStrokeStyle(5, INK));
      badge.add(scene.add.text(0, 0, '¡Nuevo récord!', { ...TEXT_STYLE, fontSize: '30px' }).setOrigin(0.5));
      panel.add(badge);
      badge.setScale(0);
      scene.tweens.add({ targets: badge, scale: 1, delay: GAME_OVER.recordDelayMs, duration: 300, ease: 'Back.Out' });
      scene.tweens.add({ targets: badge, angle: { from: -3, to: 3 }, delay: GAME_OVER.recordDelayMs + 300, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      scene.time.delayedCall(GAME_OVER.recordDelayMs, () => {
        scene.add
          .particles(panel.x, panel.y, 'fx_spark', {
            emitting: false,
            lifespan: { min: 500, max: 800 },
            speed: { min: 180, max: 380 },
            gravityY: 500,
            rotate: { min: 0, max: 360 },
            scale: { start: 1.3, end: 0.4 },
            alpha: { start: 1, end: 0 },
          })
          .setDepth(31)
          .explode(GAME_OVER.recordSparks);
      });
    } else if (opts.highScore > 0) {
      panel.add(scene.add.text(0, 0, `Récord: ${Math.floor(opts.highScore)}`, { ...TEXT_STYLE, fontSize: '28px', color: '#8a6a1a' }).setOrigin(0.5));
    }

    // Los botones aparecen cuando ya se puede pulsar (tras la pequeña espera del game over).
    const buttons = [
      this.makeButton(scene, -95, 92, 'btn_restart', 'Otra vez', opts.onRestart),
      this.makeButton(scene, 95, 92, 'btn_menu', 'Menú', opts.onMenu),
    ];
    panel.add(buttons);
    panel.add(
      scene.add
        .text(0, 208, 'ESPACIO: otra vez  ·  ESC: menú', { ...TEXT_STYLE, fontSize: '18px', fontStyle: '500', color: '#7a6a5a' })
        .setOrigin(0.5),
    );
    for (const [i, b] of buttons.entries()) {
      b.setScale(0);
      scene.tweens.add({ targets: b, scale: 1, delay: GAME_OVER.inputDelayMs + i * 80, duration: 260, ease: 'Back.Out' });
    }

    panel.setScale(0.85).setAlpha(0);
    scene.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 220, ease: 'Back.Out' });
  }

  private makeButton(scene: Phaser.Scene, x: number, y: number, texture: string, label: string, onPress: () => void) {
    const button = scene.add.container(x, y);
    const img = scene.add.image(0, 0, texture).setDisplaySize(GAME_OVER.buttonSize, GAME_OVER.buttonSize);
    const text = scene.add.text(0, GAME_OVER.buttonSize / 2 + 18, label, { ...TEXT_STYLE, fontSize: '26px' }).setOrigin(0.5);
    button.add([img, text]);
    const radius = img.width / 2;
    // Pequeña espera para no pulsar sin querer al estar tocando para saltar.
    scene.time.delayedCall(GAME_OVER.inputDelayMs, () => {
      img
        .setInteractive(new Phaser.Geom.Circle(radius, img.height / 2, radius), Phaser.Geom.Circle.Contains)
        .on('pointerover', () => img.setDisplaySize(GAME_OVER.buttonSize * 1.08, GAME_OVER.buttonSize * 1.08))
        .on('pointerout', () => img.setDisplaySize(GAME_OVER.buttonSize, GAME_OVER.buttonSize))
        .on('pointerdown', onPress);
      if (img.input) img.input.cursor = 'pointer';
    });
    return button;
  }
}
