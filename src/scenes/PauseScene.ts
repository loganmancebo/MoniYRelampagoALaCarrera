import Phaser from 'phaser';
import { stopMusic } from '../audio';
import { HEIGHT, WIDTH } from '../config';
import { MuteButton } from '../ui/MuteButton';
import { TEXT_STYLE } from './background';

const INK = 0x3b2f2f;
const PAPER = 0xf7f0e4;

// Se lanza encima de la partida (que queda pausada con scene.pause) y la reanuda al cerrarse.
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('pause');
  }

  create() {
    // Captura los toques para que no lleguen a la partida.
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.3).setOrigin(0).setInteractive();

    const panel = this.add.container(WIDTH / 2, HEIGHT / 2 - 40);
    panel.add(this.add.rectangle(0, 0, 520, 300, PAPER, 0.96).setStrokeStyle(6, INK));
    panel.add(this.add.text(0, -95, 'Pausa', { ...TEXT_STYLE, fontSize: '64px' }).setOrigin(0.5));
    panel.add(this.makeButton(-115, 15, 'Seguir', () => this.resumeGame()));
    panel.add(this.makeButton(115, 15, 'Menú', () => this.goToMenu()));
    panel.add(this.add.text(0, 100, 'P o ESC para seguir', { ...TEXT_STYLE, fontSize: '22px', fontStyle: '500' }).setOrigin(0.5));

    new MuteButton(this, 48, 48);

    const kb = this.input.keyboard!;
    kb.on('keydown-P', () => this.resumeGame());
    kb.on('keydown-ESC', () => this.resumeGame());
  }

  private makeButton(x: number, y: number, label: string, onPress: () => void) {
    const button = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 190, 70, 0xe0b030).setStrokeStyle(5, INK);
    button.add([bg, this.add.text(0, 0, label, { ...TEXT_STYLE, fontSize: '32px' }).setOrigin(0.5)]);
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => button.setScale(1.06))
      .on('pointerout', () => button.setScale(1))
      .on('pointerdown', onPress);
    return button;
  }

  private resumeGame() {
    this.scene.resume('game');
    this.scene.stop();
  }

  private goToMenu() {
    stopMusic();
    this.scene.stop('game');
    this.scene.start('menu');
  }
}
