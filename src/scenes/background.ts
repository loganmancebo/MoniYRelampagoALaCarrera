import Phaser from 'phaser';
import { DAY_NIGHT, GROUND_Y, HEIGHT, PARALLAX, WIDTH } from '../config';
import { ASSET_META } from '../generated/assets';

const WHITE = 0xffffff;

// Mezcla dos colores 0xRRGGBB canal a canal (t = 0 → a, t = 1 → b).
export function lerpColor(a: number, b: number, t: number) {
  const ch = (shift: number) => {
    const ca = (a >> shift) & 0xff;
    const cb = (b >> shift) & 0xff;
    return Math.round(ca + (cb - ca) * t) << shift;
  };
  return ch(16) | ch(8) | ch(0);
}

// Cuánto es de noche (0 = día, 1 = noche) para una puntuación: día, noche, día… cada `everyPoints`,
// con un fundido al principio de cada tramo.
export function nightAmount(score: number) {
  const phase = Math.floor(score / DAY_NIGHT.everyPoints);
  if (phase === 0) return 0;
  const target = phase % 2;
  const t = Math.min(1, (score - phase * DAY_NIGHT.everyPoints) / DAY_NIGHT.transitionPoints);
  return Phaser.Math.Linear(1 - target, target, Phaser.Math.Easing.Sine.InOut(t));
}

interface Star {
  img: Phaser.GameObjects.Image;
  x: number;
  twinkle: number; // fase del parpadeo
}

export class Background {
  private sky: Phaser.GameObjects.TileSprite;
  private hillsFar: Phaser.GameObjects.TileSprite;
  private hillsNear: Phaser.GameObjects.TileSprite;
  private ground: Phaser.GameObjects.TileSprite;
  private moon: Phaser.GameObjects.Image;
  private stars: Star[] = [];
  private starsOffset = 0;
  private night = -1;

  constructor(scene: Phaser.Scene) {
    this.sky = scene.add
      .tileSprite(0, 0, WIDTH, HEIGHT, 'sky')
      .setOrigin(0)
      .setTileScale(HEIGHT / ASSET_META.sky.height);
    // Estrellas y luna van entre el cielo y las colinas; de día son invisibles.
    for (let i = 0; i < DAY_NIGHT.stars; i++) {
      const img = scene.add
        .image(0, Phaser.Math.Between(20, DAY_NIGHT.starsBottom), 'fx_star')
        .setScale(Phaser.Math.FloatBetween(0.5, 1.1))
        .setAngle(Phaser.Math.Between(0, 45));
      this.stars.push({ img, x: Math.random() * WIDTH, twinkle: Math.random() * Math.PI * 2 });
    }
    this.moon = scene.add.image(DAY_NIGHT.moon.x, DAY_NIGHT.moon.y, 'moon');
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
    this.setNight(0);
  }

  scroll(dx: number) {
    this.sky.tilePositionX += dx * PARALLAX.sky;
    this.hillsFar.tilePositionX += dx * PARALLAX.hillsFar;
    this.hillsNear.tilePositionX += dx * PARALLAX.hillsNear;
    this.ground.tilePositionX += dx;
    this.starsOffset += dx * PARALLAX.sky;
  }

  // Tiñe las capas y muestra estrellas y luna según lo de noche que sea (0-1).
  setNight(amount: number, time = 0) {
    if (amount !== this.night) {
      this.night = amount;
      const t = DAY_NIGHT.tint;
      this.sky.setTint(lerpColor(WHITE, t.sky, amount));
      this.hillsFar.setTint(lerpColor(WHITE, t.hillsFar, amount));
      this.hillsNear.setTint(lerpColor(WHITE, t.hillsNear, amount));
      this.ground.setTint(lerpColor(WHITE, t.ground, amount));
      this.moon
        .setAlpha(amount)
        .setY(DAY_NIGHT.moon.y + DAY_NIGHT.moon.rise * (1 - amount))
        .setVisible(amount > 0);
    }
    for (const s of this.stars) {
      s.img.setVisible(amount > 0);
      if (amount <= 0) continue;
      s.img.x = Phaser.Math.Wrap(s.x - this.starsOffset, -12, WIDTH + 12);
      s.img.setAlpha(amount * (0.65 + 0.35 * Math.sin(time / 400 + s.twinkle)));
    }
  }
}

export const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Fredoka, "Trebuchet MS", sans-serif',
  fontStyle: '700',
  color: '#3b2f2f',
};
