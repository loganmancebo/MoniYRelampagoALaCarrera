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
src/scenes/background.ts    Cielo, colinas lejanas/cercanas y suelo en tileSprite con parallax (`PARALLAX`), estrellas y luna
                            del ciclo día/noche (`setNight`, `nightAmount`); TEXT_STYLE compartido.
src/scenes/fx.ts            Texturas provisionales (`fx_dust`, `fx_spark`, `fx_star`, `moon`) si no hay imagen cargada.
src/audio/sounds.ts         Definición de efectos (parámetros ZzFX), instrumentos y canciones en texto.
src/audio/render.ts         Sintetiza efectos y canciones a muestras de audio.
src/audio/index.ts          API de sonido: initAudio, playSfx, playMusic, setMusicRate, pause/resumeMusic, stopMusic, toggleMute.
src/ui/MuteButton.ts        Botón de silencio dibujado (arriba a la izquierda) + tecla M.
src/ui/PauseButton.ts       Botón de pausa dibujado (junto al de silencio).
src/ui/DashButton.ts        Botón del dash de Relámpago con indicador de recarga.
src/ui/GameOverPanel.ts     Panel de fin de partida: puntuación, récord y botones `btn_restart` / `btn_menu`.
src/ui/buttonTextures.ts    Texturas provisionales de `btn_restart` y `btn_menu` si no hay imagen cargada.
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
   el tamaño en pantalla se fija en `config.ts`. Los de `RECOLOR_GREEN` cambian su verde de tono para que no
   se confundan con las colinas (la seta sale con el sombrero rojo).
5. **Suelo y cielo**: fundido del final con el principio (alpha premultiplicado) para repetirse sin costura.
   El suelo se escala a 150 px de tierra bajo la superficie y se detecta `surfaceY` (fila del contorno negro).
6. **Colinas** (`HILLS` en el script): chroma key, fundido de bordes, se recortan las filas vacías de arriba y se
   exportan ya al alto que tienen en pantalla. Posición y velocidad de cada capa en `PARALLAX` (config.ts).

Archivos de entrada que espera (nombres exactos):
| Archivo | Formato |
|---|---|
| `Moni_sprite_sheet_2048x1024.png`, `Relampago_sprite_sheet_2048x1024.png` | Cuadrícula 4x2 |
| `Obstaculos_sprite_sheet_1200x896_2.jpg` | Cuadrícula 4x3 |
| `Ground_2064x512.jpg` | Tira horizontal, superficie recta |
| `Sky_1774x887.png` | Opaca, sin magenta |
| `Tree_887x1774.png` | Obstáculo suelto (`SINGLE_OBSTACLES`), se reduce a 600 px de alto |
| `distant_hills_seamless_2048x512.png`, `hills_near_2172x724.png` | Tiras horizontales repetibles con fondo magenta (`hills_far`, `hills_near`) |

**Orden de frames de los personajes** (`FRAME` en config.ts):
`0-3` carrera · `4` subiendo · `5` cayendo · `6` choque (ojos en X + estrellas) · `7` agachado.

**Orden de la hoja de obstáculos**:
fila 1 `mushroom, carrot, rock, fence` · fila 2 `rod, stump, puddle, stones` · fila 3 `cloud1, cloud2, bee1, bee2`.
`bee2` no se usa (no es consistente con `bee1`); la abeja se anima con tweens.
Los obstáculos de imagen suelta (`SINGLE_OBSTACLES` en el script) se reducen a ~2× su alto en pantalla:
Phaser no usa mipmaps y una reducción grande en el juego adelgaza y rompe la línea.

Al añadir arte nuevo: añadirlo al script, ejecutar `npm run assets` y revisar visualmente los PNG generados.

## Mecánicas actuales

- Resolución lógica 1280x720, `GROUND_Y = 620`, jugador fijo en x=220, escala de personaje 0.55 (~120 px).
- **Salto**: ESPACIO / ↑ / W / clic / toque en los 2/3 derechos. Salto variable (soltar corta la subida),
  *coyote time* 90 ms y *jump buffer* 130 ms.
- **Polvo al aterrizar** (`fx_dust`): emisor en `GameScene.createParticles`, valores en `FX` (config.ts).
  Para el arte definitivo basta `this.load.image('fx_dust', ...)` en PreloadScene (igual que con el sonido).
- **Salto doble (solo Moni)**: pulsar saltar otra vez en el aire, una vez por salto (`DOUBLE_JUMP` en config.ts).
  Si faltan menos de `jumpBufferMs` para aterrizar, la pulsación se guarda para el salto normal.
- **Agacharse**: ↓ / S / toque en el tercio izquierdo. En el aire acelera la caída.
- **Hitboxes** más pequeñas que el dibujo (55-82 % en el jugador, `hitbox` por obstáculo en config.ts).
- **Velocidad** 430 → 1100 px/s (+9 px/s²). Hueco entre obstáculos aleatorio entre 0,75 y 1,6 × velocidad.
- **Voladores** (nube, abeja) desde 250 puntos, a 3 alturas (`AIR_LEVELS`): 10 (saltar), 60 (agacharse), 150 (pasar por debajo).
  La de 60 está calculada para que de pie choques y agachado pases: si cambias tamaños de hitbox, revísala.
- **Árbol alto** (`tree`, desde 400 puntos, `tall: true`): hitbox de 266 px, más que el salto normal (~212 px)
  y menos que el doble (~380 px). Moni lo pasa con el salto doble y Relámpago con el dash; a Relámpago solo le
  sale si el dash estará cargado al llegar (`canSpawnTall`, `DASH.readyMarginMs`). Deja un hueco extra detrás
  (`extraGap`) para que Moni aterrice. Si cambias la física del salto o la hitbox, revisa estas alturas.
- **Patrones** (`PATTERNS` en config.ts): grupos de obstáculos con huecos fijos (pareja de bajos que se pasa de un
  salto, tocón + nube, valla + abeja…), cada uno desde su `minScore`. Al tocar obstáculo, sale un patrón con
  probabilidad `PATTERN_CHANCE`. Los huecos van de borde a borde en segundos de recorrido (× velocidad), así el
  ritmo no cambia con la velocidad. No usar obstáculos `tall` en patrones (no pasan por `canSpawnTall`).
- **Ciclo día/noche** (`DAY_NIGHT` en config.ts): cada 700 puntos cambia de día a noche o al revés, con un fundido de
  120 puntos. La noche tiñe cada capa del fondo y los obstáculos (más claros que el fondo para que se distingan) y
  saca estrellas y luna; el jugador no se tiñe (el dash usa su tinte). El marcador pasa a claro a mitad del fundido.
  Va por puntuación, así que se congela con la pausa y la cuenta atrás. Para el arte definitivo basta
  `this.load.image('moon', ...)` / `'fx_star'` en PreloadScene.
- **Puntuación**: 0,025 puntos por px recorrido; parpadeo cada 100; récord en `localStorage` (`moni.highscore`).
- **Cuenta atrás** (`COUNTDOWN` en config.ts): 3, 2, 1, «¡Ya!» al empezar, al reintentar y al volver de la pausa.
  Mientras dura, la física, la animación del jugador y las partículas están congeladas, `update` no hace nada
  y no se puede hacer dash; la recarga del dash se retrasa lo que dure. Suena `ui_select` en cada número y `ui_start` en el «¡Ya!».
  El jugador empieza con el cuerpo justo en el suelo y `blocked.down` a true: si no, el primer paso de física cuenta como aterrizaje.
- **Game over**: frame de choque, sacudida de cámara y panel (`GameOverPanel`) con la puntuación, el récord
  (etiqueta "¡Nuevo récord!" con chispas si se supera) y los botones "Otra vez" y "Menú". ESPACIO/↑ o tocar fuera
  de los botones reintenta, ESC vuelve al menú. Todo se activa tras `GAME_OVER.inputDelayMs` (config.ts).
  Para el arte definitivo de los botones basta `this.load.image('btn_restart', ...)` en PreloadScene.
  Al probarlo forzando `gameOver()` con una puntuación alta se guarda un récord falso: restaurar `moni.highscore`.
- **Silencio**: botón arriba a la izquierda o tecla M (menú, partida y pausa).
- **Pantalla completa** (`src/fullscreen.ts`, `src/ui/FullscreenButton.ts`): se activa sola con el primer toque
  (solo una vez por carga) e intenta bloquear en horizontal; botón de esquinas junto a los de silencio/pausa.
  Solo funciona dentro de un gesto (`touchend`/`pointerup`, no `pointerdown`). En iPhone no existe y el botón no se crea.
- **Pausa**: P / ESC o el botón junto al de silencio; también al perder el foco o cambiar de pestaña
  (eventos `blur`/`hidden` del juego). La partida se pausa con `scene.pause()` y se lanza `PauseScene`
  encima; al reanudar se reinician las teclas para que lo pulsado durante la pausa no cuente y hay cuenta atrás.
  Tras el choque, ESC vuelve al menú (no pausa).
- **Dash (solo Relámpago)**: → / D o el botón del rayo (abajo a la derecha, `src/ui/DashButton.ts`, que muestra
  la recarga) y suelta chispas (`fx_spark`). Durante el dash el mundo va más rápido y los obstáculos que toca quedan marcados como
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
