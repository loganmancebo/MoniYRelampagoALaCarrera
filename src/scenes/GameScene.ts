import Phaser from 'phaser';
import { playMusic, playSfx, setMusicRate, stopMusic } from '../audio';
import {
  AIR_LEVELS,
  AIR_OBSTACLES_FROM_SCORE,
  AUDIO,
  CHAR_SCALE,
  CharacterKey,
  FRAME,
  GROUND_Y,
  HEIGHT,
  OBSTACLES,
  ObstacleDef,
  PHYSICS,
  SCORE_PER_PX,
  SPEED,
  WIDTH,
} from '../config';
import { ASSET_META } from '../generated/assets';
import { getHighScore, setHighScore } from '../storage';
import { MuteButton } from '../ui/MuteButton';
import { Background, TEXT_STYLE } from './background';

type Body = Phaser.Physics.Arcade.Body;
type Keys = Record<'space' | 'up' | 'w' | 'down' | 's', Phaser.Input.Keyboard.Key>;

const PLAYER_X = 220;

export class GameScene extends Phaser.Scene {
  private character!: CharacterKey;
  private background!: Background;
  private player!: Phaser.Physics.Arcade.Sprite;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private scoreText!: Phaser.GameObjects.Text;

  private speed = SPEED.start;
  private score = 0;
  private highScore = 0;
  private nextMilestone = 100;
  private distanceToSpawn = 0;
  private dead = false;
  private ducking = false;
  private wasOnGround = true;
  private lastGroundTime = 0;
  private lastJumpPress = -Infinity;

  private keys!: Keys;
  private touchJump = false;
  private touchDuck = false;

  constructor() {
    super('game');
  }

  init(data: { character?: CharacterKey }) {
    this.character = data.character ?? 'moni';
    this.speed = SPEED.start;
    this.score = 0;
    this.highScore = getHighScore();
    this.nextMilestone = 100;
    this.distanceToSpawn = 600;
    this.dead = false;
    this.ducking = false;
    this.wasOnGround = true;
    this.lastJumpPress = -Infinity;
    this.touchJump = this.touchDuck = false;
  }

  create() {
    this.background = new Background(this);
    this.physics.resume();
    this.physics.world.gravity.y = PHYSICS.gravity;

    const floor = this.add.zone(WIDTH / 2, GROUND_Y + 50, WIDTH * 2, 100);
    this.physics.add.existing(floor, true);

    this.player = this.physics.add.sprite(PLAYER_X, GROUND_Y, this.character, 0).setOrigin(0.5, 1).setScale(CHAR_SCALE).setDepth(10);
    this.player.play(`${this.character}-run`);
    this.setPlayerHitbox(false);
    this.physics.add.collider(this.player, floor);

    this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });
    this.physics.add.overlap(this.player, this.obstacles, () => this.gameOver());

    this.scoreText = this.add
      .text(WIDTH - 32, 28, '', { ...TEXT_STYLE, fontSize: '34px' })
      .setOrigin(1, 0)
      .setDepth(20);
    this.updateScoreText();

    new MuteButton(this, 48, 48);
    this.setupInput();
    playMusic(this, 'music_game');
  }

  private setupInput() {
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({ space: 'SPACE', up: 'UP', w: 'W', down: 'DOWN', s: 'S' }) as Keys;
    for (const k of [this.keys.space, this.keys.up, this.keys.w]) {
      k.on('down', () => (this.lastJumpPress = this.time.now));
    }
    // Táctil: tercio izquierdo agacharse, resto saltar. Con ratón, clic = saltar.
    // Los toques sobre botones (p. ej. silencio) no cuentan.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.dead || over.length) return;
      if (p.wasTouch && p.x < WIDTH * 0.33) {
        this.touchDuck = true;
      } else {
        this.touchJump = true;
        this.lastJumpPress = this.time.now;
      }
    });
    this.input.on('pointerup', () => {
      if (!this.input.pointer1.isDown && !this.input.pointer2.isDown && !this.input.mousePointer.isDown) {
        this.touchJump = this.touchDuck = false;
      }
    });
  }

  // Hitbox algo más pequeña que el dibujo para que los choques se sientan justos.
  private setPlayerHitbox(ducking: boolean) {
    const meta = ASSET_META[this.character];
    const body = this.player.body as Body;
    const [w, h] = ducking ? meta.sizes[FRAME.duck] : meta.sizes[FRAME.run[0]];
    const bw = w * (ducking ? 0.6 : 0.55);
    const bh = h * (ducking ? 0.75 : 0.82);
    body.setSize(bw, bh, false);
    body.setOffset((meta.frameWidth - bw) / 2, meta.frameHeight - 2 - bh);
  }

  update(time: number, delta: number) {
    if (this.dead) return;
    const dt = Math.min(delta, 50) / 1000;

    this.speed = Math.min(SPEED.max, this.speed + SPEED.accel * dt);
    const dx = this.speed * dt;
    this.background.scroll(dx);
    setMusicRate(1 + ((this.speed - SPEED.start) / (SPEED.max - SPEED.start)) * AUDIO.musicMaxRateBoost);

    this.updatePlayer(time);
    this.updateObstacles(dx);

    this.score += dx * SCORE_PER_PX;
    if (this.score >= this.nextMilestone) {
      this.nextMilestone += 100;
      playSfx(this, 'milestone', 0);
      this.tweens.add({ targets: this.scoreText, alpha: 0.2, duration: 120, yoyo: true, repeat: 2 });
    }
    this.updateScoreText();
  }

  private updatePlayer(time: number) {
    const body = this.player.body as Body;
    const onGround = body.blocked.down;
    const jumpHeld = this.keys.space.isDown || this.keys.up.isDown || this.keys.w.isDown || this.touchJump;
    const duckHeld = this.keys.down.isDown || this.keys.s.isDown || this.touchDuck;

    if (onGround) this.lastGroundTime = time;
    if (onGround && !this.wasOnGround) playSfx(this, 'land');
    this.wasOnGround = onGround;

    // Salto con "coyote time" y "jump buffer": perdona pulsar un poco antes o después.
    const canJump = time - this.lastGroundTime <= PHYSICS.coyoteMs && body.velocity.y >= 0;
    if (time - this.lastJumpPress <= PHYSICS.jumpBufferMs && canJump) {
      body.setVelocityY(-PHYSICS.jumpVelocity);
      this.lastJumpPress = -Infinity;
      this.lastGroundTime = -Infinity;
      this.setDucking(false);
      playSfx(this, `jump_${this.character}`);
    }
    if (!jumpHeld && body.velocity.y < -PHYSICS.jumpCutVelocity) {
      body.setVelocityY(-PHYSICS.jumpCutVelocity);
    }

    body.setGravityY(!onGround && duckHeld ? PHYSICS.fastFallGravity - PHYSICS.gravity : 0);
    this.setDucking(onGround && duckHeld);

    if (!onGround) {
      this.player.anims.stop();
      this.player.setFrame(body.velocity.y < 0 ? FRAME.jump : FRAME.fall);
    } else if (this.ducking) {
      this.player.anims.stop();
      this.player.setFrame(FRAME.duck);
    } else {
      if (!this.player.anims.isPlaying) this.player.play(`${this.character}-run`);
      this.player.anims.timeScale = this.speed / SPEED.start;
    }
  }

  private setDucking(ducking: boolean) {
    if (ducking === this.ducking) return;
    this.ducking = ducking;
    this.setPlayerHitbox(ducking);
    if (ducking) playSfx(this, 'duck');
  }

  private updateObstacles(dx: number) {
    for (const o of this.obstacles.getChildren() as Phaser.Physics.Arcade.Image[]) {
      o.setVelocityX(-this.speed);
      if (o.x < -200) o.destroy();
    }
    this.distanceToSpawn -= dx;
    if (this.distanceToSpawn <= 0) this.spawnObstacle();
  }

  private spawnObstacle() {
    const allowAir = this.score >= AIR_OBSTACLES_FROM_SCORE;
    const pool = OBSTACLES.filter((d) => allowAir || !d.air);
    const def = this.weightedPick(pool);

    const [tw, th] = ASSET_META.obstacles[def.key];
    const scale = def.height / th;
    const y = def.air ? GROUND_Y - Phaser.Utils.Array.GetRandom(AIR_LEVELS) : GROUND_Y + 4;
    const o = this.obstacles.create(WIDTH + 150, y, `obstacle_${def.key}`) as Phaser.Physics.Arcade.Sprite;
    o.setOrigin(0.5, 1).setScale(scale).setDepth(def.air ? 12 : 8);

    const body = o.body as Body;
    const bw = tw * def.hitbox[0];
    const bh = th * def.hitbox[1];
    body.setSize(bw, bh, false);
    body.setOffset((tw - bw) / 2, def.air ? (th - bh) / 2 : th - bh);

    this.decorate(o, def);

    // Hueco hasta el siguiente: crece con la velocidad para que siempre dé tiempo a reaccionar.
    const gap = Phaser.Math.Between(this.speed * 0.75, this.speed * 1.6);
    this.distanceToSpawn = gap + tw * scale;
  }

  private decorate(o: Phaser.Physics.Arcade.Sprite, def: ObstacleDef) {
    if (def.anim) o.play(def.anim);
    if (def.key === 'bee1') {
      // Sin segundo frame fiable: la abeja "aletea" con un balanceo y un leve estirón.
      this.tweens.add({ targets: o, scaleY: o.scaleY * 0.9, duration: 90, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: o, angle: { from: -6, to: 6 }, duration: 300, yoyo: true, repeat: -1 });
    }
  }

  private weightedPick(pool: ObstacleDef[]): ObstacleDef {
    let r = Math.random() * pool.reduce((s, d) => s + d.weight, 0);
    for (const d of pool) {
      r -= d.weight;
      if (r <= 0) return d;
    }
    return pool[pool.length - 1];
  }

  private updateScoreText() {
    const pad = (n: number) => String(Math.floor(n)).padStart(5, '0');
    this.scoreText.setText(`${this.highScore ? `HI ${pad(this.highScore)}   ` : ''}${pad(this.score)}`);
  }

  private gameOver() {
    if (this.dead) return;
    this.dead = true;
    this.physics.pause();
    this.tweens.killAll();
    this.player.anims.stop();
    this.player.setFrame(FRAME.hit);
    this.cameras.main.shake(180, 0.008);

    const isRecord = this.score > this.highScore;
    if (isRecord) setHighScore(this.score);

    stopMusic();
    playSfx(this, 'hit', 0);
    this.time.delayedCall(350, () => playSfx(this, isRecord ? 'record' : 'gameover', 0));

    const panel = this.add.container(WIDTH / 2, HEIGHT / 2 - 90).setDepth(30);
    panel.add(this.add.rectangle(0, 0, 560, 250, 0xf7f0e4, 0.94).setStrokeStyle(6, 0x3b2f2f));
    panel.add(this.add.text(0, -75, '¡Ay!', { ...TEXT_STYLE, fontSize: '64px' }).setOrigin(0.5));
    panel.add(
      this.add
        .text(0, -5, isRecord ? `¡Nuevo récord! ${Math.floor(this.score)}` : `Puntos: ${Math.floor(this.score)}`, { ...TEXT_STYLE, fontSize: '34px', color: isRecord ? '#b8860b' : '#3b2f2f' })
        .setOrigin(0.5),
    );
    panel.add(
      this.add
        .text(0, 70, 'ESPACIO o toca para reintentar\nESC para cambiar de personaje', { ...TEXT_STYLE, fontSize: '22px', fontStyle: '500', align: 'center' })
        .setOrigin(0.5),
    );

    // Pequeña espera para no reiniciar sin querer al estar pulsando saltar.
    this.time.delayedCall(450, () => {
      const restart = () => this.scene.restart({ character: this.character });
      this.input.keyboard!.once('keydown-SPACE', restart);
      this.input.keyboard!.once('keydown-UP', restart);
      this.input.keyboard!.once('keydown-ESC', () => this.scene.start('menu'));
      this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (!over.length) restart();
      });
    });
  }
}
