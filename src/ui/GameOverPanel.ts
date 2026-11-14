import Phaser from 'phaser';
import { GAME_OVER, HEIGHT, WIDTH } from '../config';
import { lastInitials, qualifies, rankingEnabled, saveInitials, SubmitResult, submitScore } from '../ranking';
import { TEXT_STYLE } from '../scenes/background';
import { RANKING, ScoreEntry } from '../shared/ranking';
import { NameEntry } from './NameEntry';

const INK = 0x3b2f2f;
const PAPER = 0xf7f0e4;
const MUSTARD = 0xe0b030;
const MIDDLE_Y = 95; // centro de la zona de abajo: iniciales o botones

// Lo que hace falta para entrar en el ranking; null si no hay conexión.
export interface RankingInfo {
  runId: string | null;
  top: ScoreEntry[] | null; // top semanal del personaje
}

interface Options {
  score: number;
  highScore: number; // récord anterior a esta partida
  isRecord: boolean;
  ranking: Promise<RankingInfo>;
  onRestart: () => void;
  onMenu: () => void;
  onActionsReady: () => void; // ya se puede reintentar o salir con el teclado
}

// Panel de fin de partida: puntuación, récord, iniciales para el ranking y botones de reintentar y menú.
export class GameOverPanel {
  private panel: Phaser.GameObjects.Container;
  private status: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private readonly score: number;

  constructor(private scene: Phaser.Scene, private opts: Options) {
    this.score = Math.floor(opts.score);
    const panel = (this.panel = scene.add.container(WIDTH / 2, HEIGHT / 2 - 30).setDepth(30));
    panel.add(scene.add.rectangle(0, 0, 640, 540, PAPER, 0.96).setStrokeStyle(6, INK));
    panel.add(scene.add.text(0, -215, '¡Ay!', { ...TEXT_STYLE, fontSize: '60px' }).setOrigin(0.5));
    panel.add(scene.add.text(0, -142, String(this.score), { ...TEXT_STYLE, fontSize: '88px' }).setOrigin(0.5));
    panel.add(scene.add.text(0, -85, 'puntos', { ...TEXT_STYLE, fontSize: '24px', fontStyle: '500' }).setOrigin(0.5));

    if (opts.isRecord) this.addRecordBadge(-32);
    else if (opts.highScore > 0) {
      panel.add(scene.add.text(0, -32, `Récord: ${Math.floor(opts.highScore)}`, { ...TEXT_STYLE, fontSize: '28px', color: '#8a6a1a' }).setOrigin(0.5));
    }

    this.status = scene.add.text(0, 22, '', { ...TEXT_STYLE, fontSize: '24px', fontStyle: '500', color: '#7a6a5a' }).setOrigin(0.5);
    this.hint = scene.add.text(0, 238, '', { ...TEXT_STYLE, fontSize: '18px', fontStyle: '500', color: '#7a6a5a' }).setOrigin(0.5);
    panel.add([this.status, this.hint]);

    panel.setScale(0.85).setAlpha(0);
    scene.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 220, ease: 'Back.Out' });

    // Normalmente el ranking ya está descargado (se pide al empezar); si tarda, no se espera mucho.
    const timeout = new Promise<RankingInfo>((resolve) => setTimeout(() => resolve({ runId: null, top: null }), GAME_OVER.rankingWaitMs));
    Promise.race([opts.ranking, timeout]).then((info) => {
      if (this.panel.scene) this.showRanking(info);
    });
  }

  private showRanking({ runId, top }: RankingInfo) {
    if (runId && top && qualifies(top, this.score)) {
      this.askName(runId);
      return;
    }
    if (top && top.length >= RANKING.topSize && this.score >= RANKING.minScore) {
      this.status.setText(`Top 10 de la semana desde ${top[top.length - 1].score + 1} puntos`);
    } else if (rankingEnabled && !top) {
      this.status.setText('Ranking sin conexión');
    }
    this.showButtons(GAME_OVER.inputDelayMs);
  }

  private askName(runId: string) {
    this.hint.setText('Escribe o usa ↑ ↓ ← →   ·   ENTER: guardar');
    const entry = new NameEntry(this.scene, 0, MIDDLE_Y, {
      initial: lastInitials(),
      onSave: (name) => {
        saveInitials(name);
        submitScore(runId, name, this.score).then((result) => {
          if (!this.panel.scene) return;
          entry.container.destroy();
          this.status.setText(this.resultText(result)).setColor(result ? '#8a6a1a' : '#7a6a5a');
          this.showButtons(0);
        });
      },
      onSkip: () => {
        entry.container.destroy();
        this.showButtons(0);
      },
    });
    this.panel.add(entry.container);
    entry.container.setAlpha(0);
    this.scene.tweens.add({ targets: entry.container, alpha: 1, duration: 200 });
  }

  private resultText(result: SubmitResult | null) {
    if (!result) return 'No se ha podido guardar en el ranking';
    if (result.rankAll <= RANKING.topSize) return `¡Puesto ${result.rankWeek}º de la semana y ${result.rankAll}º de siempre!`;
    return `¡Puesto ${result.rankWeek}º de la semana!`;
  }

  // Los botones aparecen cuando ya se puede pulsar (tras la pequeña espera del game over).
  private showButtons(delay: number) {
    this.hint.setText('ESPACIO: otra vez  ·  ESC: menú');
    const buttons = [
      this.makeButton(-95, MIDDLE_Y + 10, 'btn_restart', 'Otra vez', this.opts.onRestart, delay),
      this.makeButton(95, MIDDLE_Y + 10, 'btn_menu', 'Menú', this.opts.onMenu, delay),
    ];
    this.panel.add(buttons);
    for (const [i, b] of buttons.entries()) {
      b.setScale(0);
      this.scene.tweens.add({ targets: b, scale: 1, delay: delay + i * 80, duration: 260, ease: 'Back.Out' });
    }
    // Las teclas, un poco después: la que cerró las iniciales (p. ej. ESC) no debe contar también aquí.
    this.scene.time.delayedCall(Math.max(delay, GAME_OVER.afterNameDelayMs), this.opts.onActionsReady);
  }

  private addRecordBadge(y: number) {
    const scene = this.scene;
    const badge = scene.add.container(0, y);
    badge.add(scene.add.rectangle(0, 0, 300, 52, MUSTARD).setStrokeStyle(5, INK));
    badge.add(scene.add.text(0, 0, '¡Nuevo récord!', { ...TEXT_STYLE, fontSize: '30px' }).setOrigin(0.5));
    this.panel.add(badge);
    badge.setScale(0);
    scene.tweens.add({ targets: badge, scale: 1, delay: GAME_OVER.recordDelayMs, duration: 300, ease: 'Back.Out' });
    scene.tweens.add({ targets: badge, angle: { from: -3, to: 3 }, delay: GAME_OVER.recordDelayMs + 300, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    scene.time.delayedCall(GAME_OVER.recordDelayMs, () => {
      scene.add
        .particles(this.panel.x, this.panel.y + y, 'fx_spark', {
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
  }

  private makeButton(x: number, y: number, texture: string, label: string, onPress: () => void, delay: number) {
    const scene = this.scene;
    const button = scene.add.container(x, y);
    const img = scene.add.image(0, 0, texture).setDisplaySize(GAME_OVER.buttonSize, GAME_OVER.buttonSize);
    const text = scene.add.text(0, GAME_OVER.buttonSize / 2 + 18, label, { ...TEXT_STYLE, fontSize: '26px' }).setOrigin(0.5);
    button.add([img, text]);
    const radius = img.width / 2;
    // Pequeña espera para no pulsar sin querer al estar tocando para saltar.
    scene.time.delayedCall(delay, () => {
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
