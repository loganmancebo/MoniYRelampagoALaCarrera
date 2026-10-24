// Sonidos PROVISIONALES generados con ZzFX (https://killedbyapixel.github.io/ZzFX/).
// Cada efecto es una lista de parámetros de ZzFX: se puede pegar en el diseñador web para escucharlo
// y ajustarlo, y copiar de vuelta el array. Para sustituir un sonido por un archivo definitivo,
// ver docs/SONIDO.md: basta con cargar un archivo con la misma clave.
//
// Orden de parámetros de ZzFX:
// [volume, randomness, frequency, attack, sustain, release, shape, shapeCurve, slide, deltaSlide,
//  pitchJump, pitchJumpTime, repeatTime, noise, modulation, bitCrush, delay, sustainVolume, decay,
//  tremolo, filter]
// shape: 0 seno, 1 triángulo, 2 sierra, 3 tan, 4 ruido, 5 cuadrada. filter < 0 = paso bajo.

export type ZzfxParams = (number | undefined)[];

export const SFX = {
  jump_moni: [0.8, 0.05, 380, 0.01, 0.05, 0.15, 0, 1, 4],
  jump_relampago: [0.5, 0.05, 520, 0.005, 0.04, 0.12, 2, 1, 6, 0, 0, 0, 0, 0.3, 0, 0, 0, 1, 0, 0, -2500],
  land: [0.5, 0.05, 120, 0, 0.01, 0.07, 0, 1, -1],
  duck: [0.25, 0.1, 900, 0.02, 0.03, 0.08, 4, 1, -4, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, -3000],
  hit: [0.9, 0.05, 220, 0, 0.05, 0.25, 1, 1, -2, 0, 0, 0, 0, 0.2],
  milestone: [0.5, 0, 1300, 0, 0.05, 0.3, 0, 1, 0, 0, 600, 0.06],
  ui_select: [0.4, 0, 700, 0, 0.02, 0.06, 1],
  ui_start: [0.5, 0, 500, 0, 0.08, 0.15, 1, 1, 0, 0, 300, 0.05],
} satisfies Record<string, ZzfxParams>;

export type SfxKey = keyof typeof SFX | 'gameover' | 'record';

// ---------------------------------------------------------------------------------------------
// Música y melodías cortas: se "renderizan" nota a nota con instrumentos ZzFX (frecuencia = nota).

export const INSTRUMENTS = {
  lead: [0.35, 0, 0, 0.005, 0, 0.3, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.3, 0.08], // marimba suave
  bell: [0.3, 0, 0, 0.005, 0, 0.6, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.1], // campanita (menú)
  bass: [0.55, 0, 0, 0.01, 0.12, 0.15, 1], // bajo triangular
  kick: [0.7, 0, 150, 0, 0.02, 0.12, 0, 1, -1],
  snare: [0.18, 0, 300, 0, 0.01, 0.1, 4, 1, -0.5, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, -4000],
  hat: [0.06, 0, 4000, 0, 0, 0.03, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 3000],
} satisfies Record<string, ZzfxParams>;

export type InstrumentKey = keyof typeof INSTRUMENTS;

export interface Song {
  bpm: number;
  stepsPerBeat: number; // 2 = corcheas
  loop: boolean; // si es true, las colas de las notas finales suenan al principio (bucle sin corte)
  // Una pista por instrumento: notas separadas por espacios, '.' = silencio, '|' solo para leerlo.
  // Para percusión cualquier símbolo distinto de '.' es un golpe (la frecuencia sale del instrumento).
  tracks: Partial<Record<InstrumentKey, string>>;
}

const CHORDS_BASS = 'C3 . . . C3 . . . | A2 . . . A2 . . . | F2 . . . F2 . . . | G2 . . . G2 . . .';

export const SONGS = {
  // Partida: alegre, 120 BPM, I-vi-IV-V en Do mayor pentatónica. 8 compases (~16 s).
  music_game: {
    bpm: 120,
    stepsPerBeat: 2,
    loop: true,
    tracks: {
      lead:
        'E5 . G5 . A5 . G5 E5 | C5 . E5 . A4 . C5 . | A4 . C5 . D5 C5 A4 . | G4 . D5 . E5 D5 . . |' +
        'E5 . G5 . C6 . A5 G5 | E5 . . G5 A5 . E5 . | D5 C5 A4 . C5 . D5 . | E5 . D5 . G4 . . .',
      bass: `${CHORDS_BASS} | ${CHORDS_BASS}`,
      kick: Array(8).fill('x . . . x . . .').join(' | '),
      snare: Array(8).fill('. . x . . . x .').join(' | '),
      hat: Array(8).fill('. x . x . x . x').join(' | '),
    },
  },
  // Menú: tranquila, arpegios de campanita a 84 BPM (~23 s).
  music_menu: {
    bpm: 84,
    stepsPerBeat: 2,
    loop: true,
    tracks: {
      bell:
        'C4 E4 G4 E4 C5 G4 E4 G4 | A3 C4 E4 C4 A4 E4 C4 E4 | F3 A3 C4 A3 F4 C4 A3 C4 | G3 B3 D4 B3 G4 D4 B3 D4 |' +
        'C4 E4 G4 E4 C5 G4 E4 G4 | A3 C4 E4 C4 A4 E4 C4 E4 | F3 A3 C4 A3 F4 C4 A3 C4 | G3 B3 D4 G4 . . . .',
      bass:
        'C3 . . . . . . . | A2 . . . . . . . | F2 . . . . . . . | G2 . . . . . . . |' +
        'C3 . . . . . . . | A2 . . . . . . . | F2 . . . . . . . | G2 . . . . . . .',
    },
  },
  // Game over: "wah wah" descendente.
  gameover: {
    bpm: 150,
    stepsPerBeat: 2,
    loop: false,
    tracks: { lead: 'G4 . F#4 . F4 . E4 . . .', bass: 'C3 . . . . . . . . .' },
  },
  // Nuevo récord: fanfarria ascendente.
  record: {
    bpm: 160,
    stepsPerBeat: 2,
    loop: false,
    tracks: { lead: 'C5 E5 G5 C6 . G5 C6 . . .', bass: 'C3 . . . . . C3 . . .' },
  },
} satisfies Record<string, Song>;

export type MusicKey = 'music_game' | 'music_menu';
