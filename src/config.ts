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

// Capas del fondo: fracción de la velocidad del suelo a la que se mueve cada una (lo lejano, más lento)
// y fila de pantalla donde queda la parte de abajo de cada colina (la tapa el suelo).
export const PARALLAX = {
  sky: 0.08,
  hillsFar: 0.2,
  hillsNear: 0.45,
  hillsFarBottom: 640,
  hillsNearBottom: 690,
};

// Ciclo día/noche por puntuación: cada `everyPoints` cambia de día a noche o al revés, con un fundido.
// La noche se hace tiñendo cada capa (multiplica el color); el jugador no se tiñe para que se vea bien.
export const DAY_NIGHT = {
  everyPoints: 700,
  transitionPoints: 120,
  tint: {
    sky: 0x48558a,
    hillsFar: 0x5a6694,
    hillsNear: 0x6b76a2,
    ground: 0x7a82aa,
    obstacles: 0xa4a9c8, // más claros que el fondo para que se distingan
  },
  scoreColor: { day: 0x3b2f2f, night: 0xf7f0e4 },
  stars: 36, // en la franja de cielo sobre las colinas
  starsBottom: 380,
  moon: { x: 930, y: 150, radius: 42, rise: 40 }, // `rise`: px que sube al hacerse de noche
};

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

// Habilidad de Relámpago: dash eléctrico que atraviesa los obstáculos que toque mientras dura.
export const DASH = {
  durationMs: 380,
  speedMultiplier: 2.2, // el mundo va más rápido durante el dash (a 430 px/s recorre ~360 px)
  forwardPx: 50, // el personaje se adelanta un poco y vuelve a su sitio
  cooldownMs: 5000, // recarga, contada desde que termina el dash
  tint: 0xffe680,
  trailEveryMs: 40, // estelas (provisional hasta tener el arte `relampago_dash`)
  // Los obstáculos `tall` solo salen si el dash estará cargado este tiempo antes de llegar al jugador.
  readyMarginMs: 400,
};

// Partículas (texturas provisionales en scenes/fx.ts hasta tener el arte `fx_dust` y `fx_spark`).
export const FX = {
  dustCount: 10, // motas de polvo al aterrizar
  dustDrift: 0.5, // el polvo se queda atrás a esta fracción de la velocidad del mundo
  sparkEveryMs: 22, // una chispa cada tantos ms durante el dash
};

// Cuenta atrás al empezar la partida y al volver de la pausa: el mundo se congela hasta el "¡Ya!".
export const COUNTDOWN = {
  from: 3,
  stepMs: 450, // tiempo de cada número
  goMs: 550, // el "¡Ya!" se desvanece mientras ya se juega
};

export const GAME_OVER = {
  inputDelayMs: 450, // espera antes de aceptar reintentar, para no reiniciar sin querer al estar saltando
  recordDelayMs: 350, // la etiqueta de récord sale con el sonido `record`
  recordSparks: 18,
  buttonSize: 96,
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
  minScore?: number; // no sale hasta esta puntuación
  // Más alto que el salto normal: Moni lo pasa con el salto doble y Relámpago con el dash.
  tall?: boolean;
  extraGap?: number; // hueco extra hasta el siguiente obstáculo, en segundos de recorrido (× velocidad)
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
  // Hitbox de 266 px: el salto normal llega a ~212 px y el doble a ~380 px.
  { key: 'tree', height: 280, hitbox: [0.55, 0.95], tall: true, minScore: 400, extraGap: 0.5, weight: 2 },
  { key: 'cloud1', height: 92, hitbox: [0.7, 0.55], air: true, anim: 'cloud', weight: 2 },
  { key: 'bee1', height: 68, hitbox: [0.6, 0.6], air: true, weight: 2 },
];

// Altura (sobre el suelo) de la base de los obstáculos voladores.
export const AIR_LEVELS = [
  10, // bajo: hay que saltar
  60, // medio: hay que agacharse
  150, // alto: se puede pasar por debajo
];
