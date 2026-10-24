import { ASSET_META } from './generated/assets';

export const WIDTH = 1280;
export const HEIGHT = 720;
export const GROUND_Y = 620; // línea por la que corren los personajes

export const CHARACTERS = ['moni', 'relampago'] as const;
export type CharacterKey = (typeof CHARACTERS)[number];

export const CHARACTER_NAMES: Record<CharacterKey, string> = {
  moni: 'Moni',
  relampago: 'Relámpago',
};

// Frames de cada spritesheet de personaje (mismo orden que la hoja original).
export const FRAME = { run: [0, 1, 2, 3], jump: 4, fall: 5, hit: 6, duck: 7 } as const;

export const CHAR_SCALE = 0.55; // el frame de carrera mide ~220 px -> ~120 px en pantalla

export const PHYSICS = {
  gravity: 2600,
  fastFallGravity: 4200, // gravedad extra al pulsar abajo en el aire
  jumpVelocity: 1050,
  jumpCutVelocity: 420, // al soltar el salto antes de tiempo
  coyoteMs: 90,
  jumpBufferMs: 130,
};

// Habilidad de Moni: un segundo salto en el aire, algo más flojo que el primero.
// Altura del salto ≈ v² / (2 · gravedad): 1050 → ~210 px; con el doble, hasta ~380 px.
export const DOUBLE_JUMP = {
  velocity: 950,
  stretchMs: 110, // estirón del sprite (provisional hasta tener el arte `moni_doublejump`)
};

export const SPEED = {
  start: 430,
  max: 1100,
  accel: 9, // px/s por segundo
};

export const AUDIO = {
  sfxVolume: 0.5,
  musicVolume: 0.3,
  detune: 80, // variación aleatoria de tono (cents) en cada efecto
  musicMaxRateBoost: 0.08, // la música va hasta un 8 % más rápida a velocidad máxima
};

export const SCORE_PER_PX = 0.025;
export const AIR_OBSTACLES_FROM_SCORE = 250;

export type ObstacleKey = keyof typeof ASSET_META.obstacles;

export interface ObstacleDef {
  key: ObstacleKey;
  height: number; // alto en pantalla (px)
  hitbox: [number, number]; // fracción del ancho y alto del dibujo que cuenta como choque
  air?: boolean;
  anim?: string;
  sink?: number; // px que se hunde en la tierra (la hitbox no se mueve, sigue sobre el suelo)
  weight: number;
}

export const OBSTACLES: ObstacleDef[] = [
  { key: 'mushroom', height: 78, hitbox: [0.7, 0.85], weight: 3 },
  { key: 'carrot', height: 84, hitbox: [0.55, 0.8], weight: 3 },
  { key: 'rock', height: 62, hitbox: [0.8, 0.8], weight: 3 },
  { key: 'fence', height: 66, hitbox: [0.85, 0.75], weight: 2 },
  { key: 'rod', height: 135, hitbox: [0.45, 0.92], weight: 2 },
  { key: 'stump', height: 96, hitbox: [0.65, 0.85], sink: 16, weight: 2 },
  { key: 'puddle', height: 52, hitbox: [0.7, 0.4], sink: 14, weight: 2 },
  { key: 'stones', height: 48, hitbox: [0.85, 0.8], weight: 2 },
  { key: 'cloud1', height: 92, hitbox: [0.7, 0.55], air: true, anim: 'cloud', weight: 2 },
  { key: 'bee1', height: 68, hitbox: [0.6, 0.6], air: true, weight: 2 },
];

// Altura (sobre el suelo) de la base de los obstáculos voladores.
export const AIR_LEVELS = [
  10, // bajo: hay que saltar
  60, // medio: hay que agacharse
  150, // alto: se puede pasar por debajo
];
