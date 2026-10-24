import Phaser from 'phaser';
import { GROUND_Y, HEIGHT, WIDTH } from '../config';
import { ASSET_META } from '../generated/assets';

const SKY_PARALLAX = 0.08;

export class Background {
  private sky: Phaser.GameObjects.TileSprite;
  private ground: Phaser.GameObjects.TileSprite;

  constructor(scene: Phaser.Scene) {
    this.sky = scene.add
      .tileSprite(0, 0, WIDTH, HEIGHT, 'sky')
      .setOrigin(0)
      .setTileScale(HEIGHT / ASSET_META.sky.height);
    this.ground = scene.add
      .tileSprite(0, GROUND_Y - ASSET_META.ground.surfaceY, WIDTH, ASSET_META.ground.height, 'ground')
      .setOrigin(0)
      .setDepth(5);
  }

  scroll(dx: number) {
    this.sky.tilePositionX += dx * SKY_PARALLAX;
    this.ground.tilePositionX += dx;
  }
}

export const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Fredoka, "Trebuchet MS", sans-serif',
  fontStyle: '700',
  color: '#3b2f2f',
};
