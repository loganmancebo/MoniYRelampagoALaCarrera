import Phaser from 'phaser';
import { CHARACTERS, FRAME, HEIGHT, WIDTH } from '../config';
import { ASSET_META } from '../generated/assets';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload() {
    const bar = this.add.rectangle(WIDTH / 2 - 200, HEIGHT / 2, 0, 16, 0x5e7560).setOrigin(0, 0.5);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, 404, 20).setStrokeStyle(2, 0x3b2f2f);
    this.load.on('progress', (p: number) => (bar.width = 400 * p));

    this.load.image('sky', 'assets/sky.png');
    this.load.image('ground', 'assets/ground.png');
    for (const c of CHARACTERS) {
      const { frameWidth, frameHeight } = ASSET_META[c];
      this.load.spritesheet(c, `assets/${c}.png`, { frameWidth, frameHeight });
    }
    for (const key of Object.keys(ASSET_META.obstacles)) {
      this.load.image(`obstacle_${key}`, `assets/obstacle_${key}.png`);
    }
  }

  create() {
    for (const c of CHARACTERS) {
      this.anims.create({
        key: `${c}-run`,
        frames: this.anims.generateFrameNumbers(c, { frames: [...FRAME.run] }),
        frameRate: 12,
        repeat: -1,
      });
    }
    this.anims.create({
      key: 'cloud',
      frames: [{ key: 'obstacle_cloud1' }, { key: 'obstacle_cloud2' }],
      frameRate: 3,
      repeat: -1,
    });
    this.scene.start('menu');
  }
}
