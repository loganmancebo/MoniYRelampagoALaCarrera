# Moni & Relámpago a la carrera — Endless runner para navegador

Juego tipo "dinosaurio de Chrome" con dos personajes propios: **Moni** (conejito morado, barriga rosa) y
**Relámpago** (bolita coral con gorro verde y un rayo amarillo). Se juega en el navegador, en escritorio y móvil.
Idioma del proyecto: **español** (textos del juego, comentarios, commits y conversación).

- Repositorio: https://github.com/loganmancebo/MoniYRelampagoALaCarrera
- Juego publicado (GitHub Pages): https://loganmancebo.github.io/MoniYRelampagoALaCarrera/
- Tareas pendientes y hoja de ruta: [docs/TAREAS.md](docs/TAREAS.md)
- Sistema de sonido (qué suena, cómo cambiarlo, cómo poner sonidos definitivos): [docs/SONIDO.md](docs/SONIDO.md)

## Stack y comandos

- **Phaser 3.90** (física Arcade) + **TypeScript** + **Vite 6**. Node 20.
- **zzfx 1.4** para los sonidos provisionales (se sintetizan al arrancar; no hay archivos de audio todavía).
- `npm run dev` — servidor de desarrollo en http://localhost:5173 (también `.claude/launch.json` → "game").
- `npm run build` — `tsc --noEmit` + build de producción en `dist/` (rutas relativas, `base: './'`, se puede servir desde cualquier carpeta).
- **Publicación**: `.github/workflows/deploy.yml` compila y publica en GitHub Pages en cada push a `main`.
- `npm run assets` — regenera las imágenes de `public/assets/` y `src/generated/assets.ts` a partir de las imágenes originales.
- No hay tests automáticos; la verificación se hace jugando (ver "Cómo probar").

## Estructura

```
*.png / *.jpg (raíz)        Imágenes originales generadas con IA (fondo magenta). Fuente de verdad del arte.
tools/process-assets.mjs    Pipeline de imágenes (usa sharp).
public/assets/              Imágenes procesadas que carga el juego (generadas, pero versionadas).
src/generated/assets.ts     ASSET_META: tamaños de frames, obstáculos, suelo y cielo (generado, no editar).
src/config.ts               TODAS las constantes de juego: física, velocidad, obstáculos, alturas.
src/main.ts                 Configuración de Phaser (1280x720, Scale.FIT), espera a la fuente Fredoka.
src/storage.ts              localStorage con try/catch (récord y último personaje).
src/scenes/PreloadScene.ts  Carga assets y crea animaciones (`moni-run`, `relampago-run`, `cloud`).
src/scenes/MenuScene.ts     Selección de personaje.
src/scenes/GameScene.ts     Partida: jugador, obstáculos, puntuación, game over.
src/scenes/PauseScene.ts    Panel de pausa que se lanza encima de la partida pausada.
src/scenes/background.ts    Cielo + suelo en tileSprite con parallax; TEXT_STYLE compartido.
src/audio/sounds.ts         Definición de efectos (parámetros ZzFX), instrumentos y canciones en texto.
src/audio/render.ts         Sintetiza efectos y canciones a muestras de audio.
src/audio/index.ts          API de sonido: initAudio, playSfx, playMusic, setMusicRate, pause/resumeMusic, stopMusic, toggleMute.
src/ui/MuteButton.ts        Botón de silencio dibujado (arriba a la izquierda) + tecla M.
src/ui/PauseButton.ts       Botón de pausa dibujado (junto al de silencio).
src/ui/DashButton.ts        Botón del dash de Relámpago con indicador de recarga.
src/types/zzfx.d.ts         Tipos mínimos de zzfx.
```

## Sonido (resumen; detalle en docs/SONIDO.md)

- Todo el audio pasa por el SoundManager de Phaser y se usa **por clave** (`playSfx(scene, 'hit')`).
- `initAudio()` (en `PreloadScene.create`) sintetiza con ZzFX cada sonido de `SFX`/`SONGS` **que no esté ya
  en `cache.audio`**. Por eso, para poner un sonido definitivo basta con `this.load.audio('<clave>', [...])`
  en `PreloadScene.preload()`: tiene prioridad sobre el provisional.
- Claves: `jump_moni`, `jump_relampago`, `doublejump`, `dash`, `recharge`, `land`, `duck`, `hit`, `gameover`, `record`, `milestone`,
  `ui_select`, `ui_start`, `music_menu`, `music_game`.
- Volúmenes y variación de tono en `AUDIO` (config.ts). Silencio guardado en `localStorage` (`moni.muted`).
- **No leer `scene.sound.mute`** para saber si está silenciado: Phaser lo calcula a partir del gain del nodo
  de audio, que no se actualiza hasta que el motor de audio procesa (y nunca si el contexto está suspendido).
  Usar `isMuted()` de `src/audio`, que guarda el estado propio.
- Los toques/clics sobre botones no cuentan como salto: los manejadores de `pointerdown` de la escena
  ignoran el evento si hay objetos interactivos debajo (`over.length`). Mantenerlo al añadir botones.

## Pipeline de imágenes (tools/process-assets.mjs)

Las imágenes de la IA vienen con **fondo magenta #FF00FF** (no verde: el gorro de Relámpago es verde).
El script:
1. **Chroma key**: `m = min(r,b) - g`; `m ≥ 170` transparente, `60 < m < 170` semitransparente y sin halo.
   Ojo: Moni es morado (m≈20-35), por eso los umbrales no pueden bajar mucho.
2. **Separa frames por cuadrícula** usando componentes conectados: cada mancha va a la casilla donde cae su
   centro (así no se cortan partes que sobresalen, como la borla del gorro). Motas de < 40 px se descartan.
3. **Personajes**: escala para que el frame de carrera mida 220 px, frames del mismo tamaño en una tira
   horizontal, centrados en X y **con los pies abajo** (2 px de margen).
4. **Obstáculos**: un PNG recortado por obstáculo (`obstacle_<nombre>.png`) a resolución original;
   el tamaño en pantalla se fija en `config.ts`.
5. **Suelo y cielo**: fundido del final con el principio (alpha premultiplicado) para repetirse sin costura.
   El suelo se escala a 150 px de tierra bajo la superficie y se detecta `surfaceY` (fila del contorno negro).

Archivos de entrada que espera (nombres exactos):
| Archivo | Formato |
|---|---|
| `Moni_sprite_sheet_2048x1024.png`, `Relampago_sprite_sheet_2048x1024.png` | Cuadrícula 4x2 |
| `Obstaculos_sprite_sheet_1200x896_2.jpg` | Cuadrícula 4x3 |
| `Ground_2064x512.jpg` | Tira horizontal, superficie recta |
| `Sky_1774x887.png` | Opaca, sin magenta |

**Orden de frames de los personajes** (`FRAME` en config.ts):
`0-3` carrera · `4` subiendo · `5` cayendo · `6` choque (ojos en X + estrellas) · `7` agachado.

**Orden de la hoja de obstáculos**:
fila 1 `mushroom, carrot, rock, fence` · fila 2 `rod, stump, puddle, stones` · fila 3 `cloud1, cloud2, bee1, bee2`.
`bee2` no se usa (no es consistente con `bee1`); la abeja se anima con tweens.

Al añadir arte nuevo: añadirlo al script, ejecutar `npm run assets` y revisar visualmente los PNG generados.

## Mecánicas actuales

- Resolución lógica 1280x720, `GROUND_Y = 620`, jugador fijo en x=220, escala de personaje 0.55 (~120 px).
- **Salto**: ESPACIO / ↑ / W / clic / toque en los 2/3 derechos. Salto variable (soltar corta la subida),
  *coyote time* 90 ms y *jump buffer* 130 ms.
- **Salto doble (solo Moni)**: pulsar saltar otra vez en el aire, una vez por salto (`DOUBLE_JUMP` en config.ts).
  Si faltan menos de `jumpBufferMs` para aterrizar, la pulsación se guarda para el salto normal.
- **Agacharse**: ↓ / S / toque en el tercio izquierdo. En el aire acelera la caída.
- **Hitboxes** más pequeñas que el dibujo (55-82 % en el jugador, `hitbox` por obstáculo en config.ts).
- **Velocidad** 430 → 1100 px/s (+9 px/s²). Hueco entre obstáculos aleatorio entre 0,75 y 1,6 × velocidad.
- **Voladores** (nube, abeja) desde 250 puntos, a 3 alturas (`AIR_LEVELS`): 10 (saltar), 60 (agacharse), 150 (pasar por debajo).
  La de 60 está calculada para que de pie choques y agachado pases: si cambias tamaños de hitbox, revísala.
- **Puntuación**: 0,025 puntos por px recorrido; parpadeo cada 100; récord en `localStorage` (`moni.highscore`).
- **Game over**: frame de choque, sacudida de cámara, panel "¡Ay!"; ESPACIO/toque reintenta, ESC vuelve al menú.
- **Silencio**: botón arriba a la izquierda o tecla M (menú, partida y pausa).
- **Pantalla completa** (`src/fullscreen.ts`, `src/ui/FullscreenButton.ts`): se activa sola con el primer toque
  (solo una vez por carga) e intenta bloquear en horizontal; botón de esquinas junto a los de silencio/pausa.
  Solo funciona dentro de un gesto (`touchend`/`pointerup`, no `pointerdown`). En iPhone no existe y el botón no se crea.
- **Pausa**: P / ESC o el botón junto al de silencio; también al perder el foco o cambiar de pestaña
  (eventos `blur`/`hidden` del juego). La partida se pausa con `scene.pause()` y se lanza `PauseScene`
  encima; al reanudar se reinician las teclas para que lo pulsado durante la pausa no cuente.
  Tras el choque, ESC vuelve al menú (no pausa).
- **Dash (solo Relámpago)**: → / D o el botón del rayo (abajo a la derecha, `src/ui/DashButton.ts`, que muestra
  la recarga). Durante el dash el mundo va más rápido y los obstáculos que toca quedan marcados como
  `dashed` (ya no matan aunque siga encima al terminar). Valores en `DASH` (config.ts).

## Dirección de arte (para generar imágenes nuevas)

- Dibujo a mano, **línea negra gruesa**, colores apagados, textura de papel, formas redondeadas y tiernas.
- **Personajes**: perfil mirando a la DERECHA. Hojas 2048x1024, cuadrícula 4x2 de 512x512, pies en la misma línea.
- **Obstáculos y escenario**: nunca morado ni rosa (son los colores de los personajes). Usar verdes, marrones,
  grises, azul pizarra, naranja y amarillo mostaza. Enemigos simpáticos, nunca de miedo.
- Nubes de fondo: muy pálidas, sin cara y con contorno fino gris (las nubes oscuras con cara son enemigos).
- Ambientación: **prado en día de tormenta**.
- Pedir siempre "flat solid magenta #FF00FF background, no shadow, no ground, no text". Si el arte es rosa y
  se parece al magenta, usar cian #00FFFF (y adaptar el chroma key).
- Paleta de referencia: Moni #8E6E8E / #D9A0A0 · Relámpago #D9827A, gorro #5E7560, borde y borla del gorro #C5C99A, rayo #E0B030, pies #A0443A.

## Cómo probar

- `http://localhost:5173/?debug` muestra las hitboxes de Arcade.
- En desarrollo, `window.game` expone la instancia de Phaser: se puede inspeccionar la escena
  (`game.scene.getScene('game')`), forzar estados o simular teclas con `KeyboardEvent` en `window`.
- Si el usuario está jugando en el panel del navegador, sus pulsaciones reales afectan a las pruebas
  (p. ej. ESPACIO en el menú empieza partida). Ojo: las pestañas en segundo plano **congelan el juego**
  (no hay requestAnimationFrame), así que solo sirven para inspeccionar datos (cache, buffers), no para jugar.
- El sonido no se puede verificar automáticamente: comprobar que los buffers existen y no están vacíos
  (`game.cache.audio.get(clave)`) y registrar qué claves suenan envolviendo `game.sound.play`.
- Comprobar siempre `npx tsc --noEmit` y `npm run build` antes de dar algo por terminado.

## Convenciones

- Constantes de juego en `src/config.ts`, nunca números mágicos en las escenas.
- Comentarios breves en español, solo donde explican el porqué.
- Commits en español, con mensaje descriptivo.
- El equipo es Windows: Git avisa de LF→CRLF; es normal.
