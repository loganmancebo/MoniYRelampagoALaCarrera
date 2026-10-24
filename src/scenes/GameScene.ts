import Phaser from 'phaser';
import { pauseMusic, playMusic, playSfx, resumeMusic, setMusicRate, stopMusic } from '../audio';
import {
  AIR_LEVELS,
  AIR_OBSTACLES_FROM_SCORE,
  AUDIO,
  CHAR_SCALE,
  CharacterKey,
  DASH,
  DOUBLE_JUMP,
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
import { DashButton } from '../ui/DashButton';
import { MuteButton } from '../ui/MuteButton';
import { PauseButton } from '../ui/PauseButton';
import { FullscreenButton } from '../ui/FullscreenButton';
import { Background, TEXT_STYLE } from './background';

type Body = Phaser.Physics.Arcade.Body;
type Keys = Record<'space' | 'up' | 'w' | 'down' | 's' | 'right' | 'd', Phaser.Input.Keyboard.Key>;

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
  private canDoubleJump = false;
  private dashUntil = 0;
  private dashReadyAt = 0;
  private dashReadyNotified = true;
  private dashButton?: DashButton;
  private muteButton!: MuteButton;

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
    this.canDoubleJump = false;
    this.dashUntil = this.dashReadyAt = 0;
    this.dashReadyNotified = true;
    this.dashButton = undefined;
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
    // Lo que toca durante el dash queda "atravesado" y ya no cuenta, aunque siga encima al terminar.
    this.physics.add.overlap(this.player, this.obstacles, () => this.gameOver(), (_p, o) => {
      const obstacle = o as Phaser.GameObjects.GameObject;
      if (this.isDashing()) obstacle.setData('dashed', true);
      return !obstacle.getData('dashed');
    });

    this.scoreText = this.add
      .text(WIDTH - 32, 28, '', { ...TEXT_STYLE, fontSize: '34px' })
      .setOrigin(1, 0)
      .setDepth(20);
    this.updateScoreText();

    this.muteButton = new MuteButton(this, 48, 48);
    new PauseButton(this, 120, 48, () => this.pauseGame());
    new FullscreenButton(this, 192, 48);
    if (this.character === 'relampago') this.dashButton = new DashButton(this, WIDTH - 70, HEIGHT - 66, () => this.tryDash());
    this.setupInput();
    playMusic(this, 'music_game');

    // Pausa automática al perder el foco o cambiar de pestaña.
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.pauseGame, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.pauseGame, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
      this.game.events.off(Phaser.Core.Events.BLUR, this.pauseGame, this);
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.pauseGame, this);
    });
  }

  private pauseGame() {
    if (this.dead || !this.scene.isActive()) return;
    this.scene.pause();
    this.scene.launch('pause');
    pauseMusic();
  }

  private onResume() {
    // Lo que se pulsó o soltó durante la pausa no debe contar al volver.
    this.input.keyboard!.resetKeys();
    this.touchJump = this.touchDuck = false;
    this.lastJumpPress = -Infinity;
    this.muteButton.refresh();
    resumeMusic();
  }

  private setupInput() {
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({ space: 'SPACE', up: 'UP', w: 'W', down: 'DOWN', s: 'S', right: 'RIGHT', d: 'D' }) as Keys;
    for (const k of [this.keys.space, this.keys.up, this.keys.w]) {
      k.on('down', () => (this.lastJumpPress = this.time.now));
    }
    for (const k of [this.keys.right, this.keys.d]) k.on('down', () => this.tryDash());
    kb.on('keydown-P', () => this.pauseGame());
    kb.on('keydown-ESC', () => this.pauseGame()); // tras el choque, ESC vuelve al menú (ver gameOver)
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
    const dx = this.worldSpeed() * dt;
    this.background.scroll(dx);
    setMusicRate(1 + ((this.speed - SPEED.start) / (SPEED.max - SPEED.start)) * AUDIO.musicMaxRateBoost);

    this.updatePlayer(time);
    this.updateDash(time);
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

    if (onGround) {
      this.lastGroundTime = time;
      this.canDoubleJump = this.character === 'moni';
    }
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
    } else if (this.lastJumpPress > this.lastGroundTime && this.canDoubleJump && !this.aboutToLand(body)) {
      this.doubleJump(body);
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

  // Si está a punto de tocar el suelo, la pulsación se guarda para el salto normal (jump buffer)
  // en lugar de gastar el salto doble.
  private aboutToLand(body: Body) {
    // Tiempo hasta el suelo resolviendo d = v·t + g·t²/2.
    const g = this.physics.world.gravity.y + body.gravity.y;
    const v = body.velocity.y;
    const d = Math.max(0, GROUND_Y - body.bottom);
    const t = (-v + Math.sqrt(v * v + 2 * g * d)) / g;
    return t * 1000 <= PHYSICS.jumpBufferMs;
  }

  private doubleJump(body: Body) {
    body.setVelocityY(-DOUBLE_JUMP.velocity);
    this.canDoubleJump = false;
    this.lastJumpPress = -Infinity;
    playSfx(this, 'doublejump');

    // Provisional hasta tener el arte `moni_doublejump`: estirón del sprite y un anillo de aire bajo los pies.
    this.tweens.add({
      targets: this.player,
      scaleX: CHAR_SCALE * 0.88,
      scaleY: CHAR_SCALE * 1.1,
      duration: DOUBLE_JUMP.stretchMs,
      yoyo: true,
      onComplete: () => this.player.setScale(CHAR_SCALE),
    });
    const puff = this.add.ellipse(this.player.x, this.player.y, 50, 14).setStrokeStyle(4, 0xf7f0e4).setDepth(9);
    this.tweens.add({ targets: puff, scaleX: 2.2, scaleY: 1.6, alpha: 0, duration: 280, onComplete: () => puff.destroy() });
  }

  private isDashing() {
    return this.time.now < this.dashUntil;
  }

  private worldSpeed() {
    return this.speed * (this.isDashing() ? DASH.speedMultiplier : 1);
  }

  private tryDash() {
    const now = this.time.now;
    if (this.character !== 'relampago' || this.dead || now < this.dashReadyAt) return;
    this.dashUntil = now + DASH.durationMs;
    this.dashReadyAt = this.dashUntil + DASH.cooldownMs;
    this.dashReadyNotified = false;
    playSfx(this, 'dash');

    // Provisional hasta tener el arte `relampago_dash`: tinte, adelantarse un poco y estelas.
    this.player.setTint(DASH.tint);
    this.tweens.add({ targets: this.player, x: PLAYER_X + DASH.forwardPx, duration: DASH.durationMs / 2, yoyo: true, ease: 'Sine.Out' });
    this.time.addEvent({
      delay: DASH.trailEveryMs,
      repeat: Math.floor(DASH.durationMs / DASH.trailEveryMs) - 1,
      callback: () => this.addDashTrail(),
    });
  }

  private addDashTrail() {
    if (this.dead) return;
    const p = this.player;
    const ghost = this.add
      .image(p.x, p.y, p.texture.key, p.frame.name)
      .setOrigin(0.5, 1)
      .setScale(p.scaleX, p.scaleY)
      .setTint(DASH.tint)
      .setAlpha(0.5)
      .setDepth(p.depth - 1);
    this.tweens.add({ targets: ghost, x: ghost.x - 70, alpha: 0, duration: 220, onComplete: () => ghost.destroy() });
  }

  private updateDash(time: number) {
    if (!this.dashButton) return;
    if (!this.isDashing() && this.player.isTinted) this.player.clearTint();
    const cooldownStart = this.dashReadyAt - DASH.cooldownMs;
    this.dashButton.setCharge(this.isDashing() ? 0 : (time - cooldownStart) / DASH.cooldownMs);
    if (!this.dashReadyNotified && time >= this.dashReadyAt) {
      this.dashReadyNotified = true;
      playSfx(this, 'recharge', 0);
      this.dashButton.pulse();
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
      o.setVelocityX(-this.worldSpeed());
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
    const sink = def.sink ?? 0;
    const y = def.air ? GROUND_Y - Phaser.Utils.Array.GetRandom(AIR_LEVELS) : GROUND_Y + 4 + sink;
    const o = this.obstacles.create(WIDTH + 150, y, `obstacle_${def.key}`) as Phaser.Physics.Arcade.Sprite;
    o.setOrigin(0.5, 1).setScale(scale).setDepth(def.air ? 12 : 8);

    const body = o.body as Body;
    const bw = tw * def.hitbox[0];
    const bh = th * def.hitbox[1];
    body.setSize(bw, bh, false);
    body.setOffset((tw - bw) / 2, def.air ? (th - bh) / 2 : th - bh - sink / scale);

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
    this.player.setScale(CHAR_SCALE).clearTint();
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
