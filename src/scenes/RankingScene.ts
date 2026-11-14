import Phaser from 'phaser';
import { playMusic, playSfx } from '../audio';
import { CHAR_SCALE, CHARACTER_NAMES, CHARACTERS, WIDTH } from '../config';
import { cachedTop, fetchTop, lastInitials } from '../ranking';
import { Period, RANKING, TopTable } from '../shared/ranking';
import { FullscreenButton } from '../ui/FullscreenButton';
import { MuteButton } from '../ui/MuteButton';
import { Background, TEXT_STYLE } from './background';

const INK = 0x3b2f2f;
const PAPER = 0xf7f0e4;
const MUSTARD = 0xe0b030;
const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Esta semana' },
  { key: 'all', label: 'Siempre' },
];
const COLUMN_X = [-225, 225];
const ROW_Y0 = -88;
const ROW_H = 33;

// Ranking online: top 10 de cada personaje, de la semana o de siempre.
export class RankingScene extends Phaser.Scene {
  private background!: Background;
  private period: Period = 'week';
  private tabs: { bg: Phaser.GameObjects.Rectangle; key: Period }[] = [];
  private rows!: Phaser.GameObjects.Container;
  private message!: Phaser.GameObjects.Text;
  private request = 0; // para descartar respuestas que llegan tarde al cambiar de pestaña

  constructor() {
    super('ranking');
  }

  create() {
    this.background = new Background(this);
    this.tabs = [];
    const panel = this.add.container(WIDTH / 2, 330).setDepth(20);
    panel.add(this.add.rectangle(0, 0, 940, 600, PAPER, 0.96).setStrokeStyle(6, INK));
    panel.add(this.add.text(0, -255, 'Ranking', { ...TEXT_STYLE, fontSize: '58px' }).setOrigin(0.5));

    PERIODS.forEach(({ key, label }, i) => {
      const x = (i - 0.5) * 240;
      const bg = this.add.rectangle(x, -190, 220, 54, PAPER).setStrokeStyle(5, INK);
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.showPeriod(key));
      this.tabs.push({ bg, key });
      panel.add([bg, this.add.text(x, -190, label, { ...TEXT_STYLE, fontSize: '28px' }).setOrigin(0.5)]);
    });

    CHARACTERS.forEach((c, i) => {
      const x = COLUMN_X[i];
      panel.add(this.add.sprite(x - 110, -122, c, 0).setScale(CHAR_SCALE * 0.4).setOrigin(0.5, 0.75));
      panel.add(this.add.text(x - 70, -135, CHARACTER_NAMES[c], { ...TEXT_STYLE, fontSize: '34px' }).setOrigin(0, 0.5));
    });
    panel.add(this.add.rectangle(0, 60, 4, 320, INK, 0.25));

    this.rows = this.add.container(0, 0);
    this.message = this.add.text(0, 50, '', { ...TEXT_STYLE, fontSize: '30px', fontStyle: '500', color: '#7a6a5a' }).setOrigin(0.5);
    panel.add([this.rows, this.message]);

    const back = this.add.container(0, 255);
    const backBg = this.add.rectangle(0, 0, 200, 60, MUSTARD).setStrokeStyle(5, INK);
    back.add([backBg, this.add.text(0, 0, 'Volver', { ...TEXT_STYLE, fontSize: '30px' }).setOrigin(0.5)]);
    backBg
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => back.setScale(1.06))
      .on('pointerout', () => back.setScale(1))
      .on('pointerdown', () => this.goBack());
    panel.add(back);

    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT', () => this.showPeriod('week'));
    kb.on('keydown-RIGHT', () => this.showPeriod('all'));
    kb.on('keydown-TAB', (e: KeyboardEvent) => {
      e.preventDefault();
      this.showPeriod(this.period === 'week' ? 'all' : 'week');
    });
    for (const key of ['ESC', 'ENTER', 'SPACE', 'BACKSPACE']) kb.on(`keydown-${key}`, () => this.goBack());

    new MuteButton(this, 48, 48);
    new FullscreenButton(this, 120, 48);
    playMusic(this, 'music_menu');
    this.period = 'week';
    this.showPeriod('week', true);
  }

  private showPeriod(period: Period, force = false) {
    if (period === this.period && !force) return;
    if (!force) playSfx(this, 'ui_select', 0);
    this.period = period;
    for (const t of this.tabs) t.bg.setFillStyle(t.key === period ? MUSTARD : PAPER);

    // Se enseña al momento lo que haya guardado y se actualiza cuando llegue la respuesta.
    const cached = cachedTop(period);
    if (cached) this.renderTop(cached);
    else this.showMessage('Cargando…');
    const id = ++this.request;
    fetchTop(period).then((top) => {
      if (id !== this.request || !this.scene.isActive()) return;
      if (top) this.renderTop(top);
      else this.showMessage('No se puede conectar con el ranking');
    });
  }

  private showMessage(text: string) {
    this.rows.removeAll(true);
    this.message.setText(text);
  }

  private renderTop(top: TopTable) {
    this.rows.removeAll(true);
    this.message.setText('');
    const mine = lastInitials();
    CHARACTERS.forEach((c, i) => {
      const x = COLUMN_X[i];
      const entries = top[c] ?? [];
      if (!entries.length) {
        this.rows.add(this.add.text(x, 30, '¡Nadie todavía!\nSé el primero', { ...TEXT_STYLE, fontSize: '26px', fontStyle: '500', color: '#7a6a5a', align: 'center' }).setOrigin(0.5));
        return;
      }
      for (let r = 0; r < RANKING.topSize; r++) {
        const e = entries[r];
        const y = ROW_Y0 + r * ROW_H;
        if (e && e.name === mine) this.rows.add(this.add.rectangle(x, y, 400, ROW_H - 4, MUSTARD, 0.45));
        const style = { ...TEXT_STYLE, fontSize: '28px', color: e ? '#3b2f2f' : '#b8ab9a' };
        this.rows.add(this.add.text(x - 180, y, `${r + 1}.`, style).setOrigin(0, 0.5));
        this.rows.add(this.add.text(x - 120, y, e ? e.name : '---', style).setOrigin(0, 0.5));
        this.rows.add(this.add.text(x + 180, y, e ? String(e.score) : '', style).setOrigin(1, 0.5));
      }
    });
  }

  private goBack() {
    playSfx(this, 'ui_select', 0);
    this.scene.start('menu');
  }

  update(_time: number, delta: number) {
    this.background.scroll(delta * 0.12);
  }
}
