import Phaser from 'phaser';
import { GROUND_Y, HEIGHT, PARALLAX, WIDTH } from '../config';
import { ASSET_META } from '../generated/assets';

export class Background {
  private sky: Phaser.GameObjects.TileSprite;
  private hillsFar: Phaser.GameObjects.TileSprite;
  private hillsNear: Phaser.GameObjects.TileSprite;
  private ground: Phaser.GameObjects.TileSprite;

  constructor(scene: Phaser.Scene) {
    this.sky = scene.add
      .tileSprite(0, 0, WIDTH, HEIGHT, 'sky')
      .setOrigin(0)
      .setTileScale(HEIGHT / ASSET_META.sky.height);
    this.hillsFar = scene.add
      .tileSprite(0, PARALLAX.hillsFarBottom, WIDTH, ASSET_META.hills_far.height, 'hills_far')
      .setOrigin(0, 1);
    this.hillsNear = scene.add
      .tileSprite(0, PARALLAX.hillsNearBottom, WIDTH, ASSET_META.hills_near.height, 'hills_near')
      .setOrigin(0, 1);
    this.ground = scene.add
      .tileSprite(0, GROUND_Y - ASSET_META.ground.surfaceY, WIDTH, ASSET_META.ground.height, 'ground')
      .setOrigin(0)
      .setDepth(5);
  }

  scroll(dx: number) {
    this.sky.tilePositionX += dx * PARALLAX.sky;
    this.hillsFar.tilePositionX += dx * PARALLAX.hillsFar;
    this.hillsNear.tilePositionX += dx * PARALLAX.hillsNear;
    this.ground.tilePositionX += dx;
  }
}

export const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Fredoka, "Trebuchet MS", sans-serif',
  fontStyle: '700',
  color: '#3b2f2f',
};
