import Phaser from 'phaser';
import { CHAR_SCALE, CHARACTER_NAMES, CHARACTERS, CharacterKey, GROUND_Y, HEIGHT, WIDTH } from '../config';
import { playMusic, playSfx } from '../audio';
import { getHighScore, load, save } from '../storage';
import { MuteButton } from '../ui/MuteButton';
import { FullscreenButton } from '../ui/FullscreenButton';
import { Background, TEXT_STYLE } from './background';

export class MenuScene extends Phaser.Scene {
  private background!: Background;
  private selected = 0;
  private sprites: Phaser.GameObjects.Sprite[] = [];
  private labels: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('menu');
  }

  create() {
    this.background = new Background(this);
    this.sprites = [];
    this.labels = [];
    this.selected = Math.max(0, CHARACTERS.indexOf(load('moni.character') as CharacterKey));

    this.add
      .text(WIDTH / 2, 95, 'Moni & Relámpago', { ...TEXT_STYLE, fontSize: '84px', color: '#f7f0e4', stroke: '#3b2f2f', strokeThickness: 12 })
      .setOrigin(0.5);
    this.add
      .text(WIDTH / 2, 165, 'a la carrera', { ...TEXT_STYLE, fontSize: '52px', color: '#f7f0e4', stroke: '#3b2f2f', strokeThickness: 10 })
      .setOrigin(0.5);
    this.add.text(WIDTH / 2, 228, 'Elige personaje', { ...TEXT_STYLE, fontSize: '34px' }).setOrigin(0.5);

    CHARACTERS.forEach((c, i) => {
      const x = WIDTH / 2 + (i === 0 ? -200 : 200);
      const sprite = this.add.sprite(x, GROUND_Y, c, 0).setOrigin(0.5, 1).setDepth(6).setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', () => {
        this.select(i);
        this.startGame();
      });
      this.sprites.push(sprite);
      this.labels.push(
        this.add.text(x, GROUND_Y - 190, CHARACTER_NAMES[c], { ...TEXT_STYLE, fontSize: '36px', color: '#f7f0e4', stroke: '#3b2f2f', strokeThickness: 8 }).setOrigin(0.5),
      );
    });

    const best = getHighScore();
    this.add
      .text(WIDTH / 2, 280, `Toca un personaje o usa ← → y ESPACIO${best ? `   ·   Récord: ${best}` : ''}`, { ...TEXT_STYLE, fontSize: '24px', fontStyle: '500' })
      .setOrigin(0.5);

    // Créditos sobre la franja de tierra, bajo el suelo.
    this.add
      .text(WIDTH / 2, HEIGHT - 30, 'Un juego de Logan Mancebo y Jose Mancebo', { ...TEXT_STYLE, fontSize: '20px', fontStyle: '500', color: '#f7f0e4', stroke: '#3b2f2f', strokeThickness: 6 })
      .setOrigin(0.5)
      .setDepth(6);

    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT', () => this.select(0));
    kb.on('keydown-RIGHT', () => this.select(1));
    kb.on('keydown-SPACE', () => this.startGame());
    kb.on('keydown-ENTER', () => this.startGame());

    new MuteButton(this, 48, 48);
    new FullscreenButton(this, 120, 48);
    this.select(this.selected, true);
    playMusic(this, 'music_menu');
  }

  private select(i: number, silent = false) {
    if (!silent && i !== this.selected) playSfx(this, 'ui_select', 0);
    this.selected = i;
    this.sprites.forEach((s, j) => {
      const active = j === i;
      s.setScale(CHAR_SCALE * (active ? 1.25 : 0.95)).setAlpha(active ? 1 : 0.6);
      if (active) s.play(`${CHARACTERS[j]}-run`);
      else s.stop().setFrame(0);
      this.labels[j].setAlpha(active ? 1 : 0.6).setScale(active ? 1.1 : 0.9);
    });
  }

  private startGame() {
    const character = CHARACTERS[this.selected];
    save('moni.character', character);
    playSfx(this, 'ui_start', 0);
    this.scene.start('game', { character });
  }

  update(_time: number, delta: number) {
    this.background.scroll(delta * 0.12);
  }
}
