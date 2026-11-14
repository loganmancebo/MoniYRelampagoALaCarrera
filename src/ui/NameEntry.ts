import Phaser from 'phaser';
import { playSfx } from '../audio';
import { TEXT_STYLE } from '../scenes/background';
import { isValidName, RANKING } from '../shared/ranking';

const INK = 0x3b2f2f;
const PAPER = 0xf7f0e4;
const MUSTARD = 0xe0b030;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SLOT_X = [-170, -80, 10];

// Mientras se escriben las iniciales, las teclas de atajo (p. ej. M de silencio) no deben responder.
export const TYPING_KEY = 'typingName';

interface Options {
  initial: string;
  onSave: (name: string) => void;
  onSkip: () => void;
}

// Selector de 3 letras estilo recreativa: flechas ▲▼ en cada letra (táctil), o teclado:
// escribir letras, ↑↓ cambia, ← → mueve, ENTER guarda, ESC no guarda.
export class NameEntry {
  readonly container: Phaser.GameObjects.Container;
  private letters: number[];
  private cursor = 0;
  private slots: { box: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text }[] = [];
  private label: Phaser.GameObjects.Text;
  private active = true;

  constructor(private scene: Phaser.Scene, x: number, y: number, private opts: Options) {
    const initial = isValidName(opts.initial) ? opts.initial : 'AAA';
    this.letters = [...initial].map((ch) => ALPHABET.indexOf(ch));
    this.container = scene.add.container(x, y);

    this.label = scene.add.text(0, -84, '¡Entras en el top 10! Tus iniciales:', { ...TEXT_STYLE, fontSize: '26px' }).setOrigin(0.5);
    this.container.add(this.label);

    for (let i = 0; i < RANKING.nameLength; i++) {
      const sx = SLOT_X[i];
      const box = scene.add.rectangle(sx, 18, 76, 84, PAPER).setStrokeStyle(5, INK);
      const text = scene.add.text(sx, 20, '', { ...TEXT_STYLE, fontSize: '60px' }).setOrigin(0.5);
      box.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.select(i));
      this.slots.push({ box, text });
      this.container.add([box, text, ...this.arrow(sx, -46, -1, i), ...this.arrow(sx, 82, 1, i)]);
    }

    this.container.add(this.button(190, -6, 170, 64, 'Guardar', MUSTARD, '30px', () => this.save()));
    this.container.add(this.button(190, 58, 150, 44, 'Ahora no', PAPER, '22px', () => this.skip()));

    scene.registry.set(TYPING_KEY, true);
    scene.input.keyboard?.on('keydown', this.onKey, this);
    this.container.once(Phaser.GameObjects.Events.DESTROY, () => this.stop());
    this.redraw();
  }

  // Flecha que sube (dir = -1, va arriba) o baja la letra de la casilla `slot`.
  private arrow(x: number, y: number, dir: number, slot: number) {
    const w = 34;
    const h = 24;
    const tri = dir < 0 ? this.scene.add.triangle(x, y, 0, h, w, h, w / 2, 0, INK) : this.scene.add.triangle(x, y, 0, 0, w, 0, w / 2, h, INK);
    // Zona de toque más grande que el dibujo.
    const zone = this.scene.add.zone(x, y, 76, 46).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      this.select(slot);
      this.change(dir === -1 ? 1 : -1);
    });
    return [zone, tri];
  }

  private button(x: number, y: number, w: number, h: number, label: string, fill: number, size: string, onPress: () => void) {
    const button = this.scene.add.container(x, y);
    const bg = this.scene.add.rectangle(0, 0, w, h, fill).setStrokeStyle(5, INK);
    button.add([bg, this.scene.add.text(0, 0, label, { ...TEXT_STYLE, fontSize: size }).setOrigin(0.5)]);
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => button.setScale(1.06))
      .on('pointerout', () => button.setScale(1))
      .on('pointerdown', onPress);
    return button;
  }

  private onKey(e: KeyboardEvent) {
    if (!this.active) return;
    const key = e.key.toUpperCase();
    if (key.length === 1 && ALPHABET.includes(key)) {
      this.letters[this.cursor] = ALPHABET.indexOf(key);
      this.select(Math.min(this.cursor + 1, RANKING.nameLength - 1));
    } else if (e.key === 'ArrowUp') this.change(1);
    else if (e.key === 'ArrowDown') this.change(-1);
    else if (e.key === 'ArrowLeft' || e.key === 'Backspace') this.select(Math.max(0, this.cursor - 1));
    else if (e.key === 'ArrowRight') this.select(Math.min(RANKING.nameLength - 1, this.cursor + 1));
    else if (e.key === 'Enter') this.save();
    else if (e.key === 'Escape') this.skip();
    else return;
    this.redraw();
  }

  private select(i: number) {
    if (!this.active) return;
    this.cursor = i;
    this.redraw();
  }

  private change(step: number) {
    if (!this.active) return;
    this.letters[this.cursor] = (this.letters[this.cursor] + step + ALPHABET.length) % ALPHABET.length;
    playSfx(this.scene, 'ui_select', 0);
    this.redraw();
  }

  private redraw() {
    this.slots.forEach(({ box, text }, i) => {
      text.setText(ALPHABET[this.letters[i]]);
      box.setFillStyle(i === this.cursor && this.active ? MUSTARD : PAPER);
    });
  }

  private save() {
    if (!this.active) return;
    const name = this.letters.map((l) => ALPHABET[l]).join('');
    if (!isValidName(name)) {
      this.label.setText('Esas letras no valen, prueba otras');
      this.scene.tweens.add({ targets: this.container, x: this.container.x + 8, duration: 50, yoyo: true, repeat: 3 });
      return;
    }
    playSfx(this.scene, 'ui_start', 0);
    this.label.setText('Guardando…');
    this.stop();
    this.redraw();
    this.opts.onSave(name);
  }

  private skip() {
    if (!this.active) return;
    this.stop();
    this.opts.onSkip();
  }

  private stop() {
    if (!this.active) return;
    this.active = false;
    this.scene.input.keyboard?.off('keydown', this.onKey, this);
    this.scene.registry.set(TYPING_KEY, false);
  }
}
