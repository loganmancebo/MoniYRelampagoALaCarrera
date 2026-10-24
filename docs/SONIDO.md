# Sonido — Moni & Relámpago a la carrera

Estado actual: **todos los sonidos son provisionales**, generados por código con
[ZzFX](https://killedbyapixel.github.io/ZzFX/) (librería `zzfx`, MIT). No hay ningún archivo de audio:
efectos y música se sintetizan al arrancar el juego (tarda unos milisegundos) y se registran en Phaser
como si fueran archivos cargados. Cuando haya sonidos definitivos se sustituyen **uno a uno sin tocar
el código del juego** (ver "Sustituir un sonido por un archivo").

## Qué suena y cuándo

| Clave | Cuándo suena | Dónde se dispara |
|---|---|---|
| `jump_moni` | Moni salta ("boing" que sube) | `GameScene.updatePlayer` |
| `doublejump` | Moni hace el salto doble ("boing" más agudo con subida) | `GameScene.doubleJump` |
| `dash` | Relámpago hace el dash ("zas" eléctrico que baja) | `GameScene.tryDash` |
| `recharge` | El dash vuelve a estar listo | `GameScene.updateDash` |
| `jump_relampago` | Relámpago salta ("bzzt" eléctrico) | `GameScene.updatePlayer` |
| `land` | Al tocar el suelo tras un salto | `GameScene.updatePlayer` |
| `duck` | Al empezar a agacharse en el suelo | `GameScene.setDucking` |
| `hit` | Choque con un obstáculo | `GameScene.gameOver` |
| `gameover` | 0,35 s después del choque, si no hay récord ("wah wah") | `GameScene.gameOver` |
| `record` | 0,35 s después del choque, si hay récord (fanfarria) | `GameScene.gameOver` |
| `milestone` | Cada 100 puntos ("pling") | `GameScene.update` |
| `ui_select` | Cambiar de personaje con ← → en el menú | `MenuScene.select` |
| `ui_start` | Empezar la partida | `MenuScene.startGame` |
| `music_menu` | Música del menú, en bucle (~23 s, 84 BPM, campanita) | `MenuScene.create` |
| `music_game` | Música de la partida, en bucle (~16 s, 120 BPM) | `GameScene.create` |

Comportamiento:
- **Variación de tono**: los efectos frecuentes (saltar, aterrizar, agacharse) cambian ligeramente de tono
  en cada reproducción (±80 cents, `AUDIO.detune`) para que no cansen. Los que son "melodía" van sin variación.
- **Música adaptativa**: `music_game` se acelera hasta un 8 % a velocidad máxima (`AUDIO.musicMaxRateBoost`).
  Al chocar se corta y suena `hit` + `gameover`/`record`. Al reintentar vuelve a empezar.
- **Silencio**: botón redondo arriba a la izquierda (menú y partida) o tecla **M**. Se guarda en
  `localStorage` (`moni.muted`). Pulsar el botón no hace saltar al personaje.
- **Desbloqueo**: los navegadores no dejan sonar nada hasta la primera interacción (tecla, clic o toque).
  Phaser lo gestiona solo: la música del menú empieza al primer toque.
- **Cambio de pestaña**: Phaser pausa el juego y el sonido automáticamente.

## Archivos

```
src/audio/sounds.ts   Definición de TODOS los sonidos: parámetros ZzFX de los efectos, instrumentos y
                      canciones (en notación de texto). Es el único archivo que hay que tocar para cambiar
                      cómo suena algo.
src/audio/render.ts   Convierte parámetros ZzFX y canciones en muestras de audio (mezcla nota a nota).
src/audio/index.ts    API del juego: initAudio, playSfx, playMusic, setMusicRate, stopMusic, toggleMute.
src/ui/MuteButton.ts  Botón de silencio dibujado + tecla M.
src/config.ts         AUDIO: volúmenes de efectos y música, variación de tono, aceleración de la música.
src/types/zzfx.d.ts   Tipos mínimos de la librería zzfx.
```

API (todo por clave, venga de ZzFX o de un archivo):

```ts
playSfx(scene, 'hit');             // con variación de tono por defecto
playSfx(scene, 'milestone', 0);    // sin variación
playMusic(scene, 'music_game');    // para la música anterior y empieza esta en bucle
setMusicRate(1.05);
stopMusic();
toggleMute(scene);
isMuted();                         // usar esto, no scene.sound.mute (ver nota)
```

> **Nota:** `scene.sound.mute` de Phaser lee el volumen real del nodo de audio, que tarda unos milisegundos
> en actualizarse (y no se actualiza si el audio está suspendido, por ejemplo con la ventana sin foco).
> Leerlo justo después de cambiarlo devuelve el valor antiguo: el icono quedaba al revés y el botón parecía
> no responder. Por eso el estado del silencio se guarda en `src/audio/index.ts` y se consulta con `isMuted()`.

## Cambiar un efecto provisional

1. Abrir el diseñador de ZzFX: https://killedbyapixel.github.io/ZzFX/
2. Pegar el array del efecto que está en `SFX` (`src/audio/sounds.ts`) en el cuadro de código del diseñador,
   escucharlo y ajustarlo con los controles.
3. Copiar el array resultante y pegarlo en `SFX`.

Orden de los parámetros de ZzFX (los que faltan al final valen su valor por defecto):

```
volume, randomness, frequency, attack, sustain, release, shape, shapeCurve, slide, deltaSlide,
pitchJump, pitchJumpTime, repeatTime, noise, modulation, bitCrush, delay, sustainVolume, decay,
tremolo, filter
```
- `shape`: 0 seno, 1 triángulo, 2 sierra, 3 tan, 4 ruido, 5 cuadrada.
- `filter`: negativo = paso bajo (suaviza), positivo = paso alto.
- El parámetro `randomness` se ignora al generar: la variación se aplica con `detune` al reproducir.

## Cambiar la música provisional

Las canciones están en `SONGS` (`src/audio/sounds.ts`). Cada canción tiene `bpm`, `stepsPerBeat`
(2 = corcheas), `loop` y una pista de texto por instrumento:

```ts
lead: 'E5 . G5 . A5 . G5 E5 | C5 . E5 . A4 . C5 .',
kick: 'x . . . x . . . | x . . . x . . .',
```

- Cada palabra es un paso: una nota (`C4`, `F#4`, `Bb3`) o `.` para silencio. `|` solo sirve para leerlo.
- En percusión (`kick`, `snare`, `hat`) cualquier símbolo que no sea `.` es un golpe.
- Los instrumentos están en `INSTRUMENTS`: son sonidos ZzFX con frecuencia 0 (la pone cada nota).
- Si `loop` es `true`, las colas de las últimas notas suenan al principio, así el bucle no se corta.
- El volumen se normaliza automáticamente para no saturar.

## Sustituir un sonido por un archivo (sonidos definitivos)

`initAudio` solo genera con ZzFX los sonidos **que no estén ya cargados**, así que basta con cargar un
archivo con la misma clave:

1. Copiar el archivo a `public/audio/`, idealmente en dos formatos: `hit.ogg` y `hit.mp3`.
2. En `PreloadScene.preload()` añadir:
   ```ts
   this.load.audio('hit', ['audio/hit.ogg', 'audio/hit.mp3']);
   ```
3. Listo: el juego usará el archivo y ZzFX dejará de generar ese sonido. Cuando todos sean archivos se
   puede borrar su entrada de `SFX`/`SONGS`.

Especificaciones recomendadas para los archivos definitivos:

| | Efectos | Música |
|---|---|---|
| Formato de entrega | WAV 44,1 kHz | WAV 44,1 kHz |
| Formato en el juego | OGG + MP3 | OGG + MP3 (128-160 kbps) |
| Canales | Mono | Estéreo |
| Duración | < 1 s (jingles < 2 s) | 60-90 s, bucle sin corte |
| Silencio | Ninguno al principio | Que el final enlace con el principio |
| Volumen | Pico a −1 dB | ~−16 LUFS, pico a −1 dB |
| Peso total objetivo | < 300 KB todos | < 2 MB cada pista |

Estilo: **suave, tierno, "cartoon", acogedor**; nada agresivo ni estridente. Debe encajar con el dibujo a mano.
Fuentes posibles: librerías CC0 (Kenney.nl, Freesound con filtro CC0, OpenGameArt) o generación con IA
(ElevenLabs Sound Effects para efectos; Suno/Udio para música, revisando la licencia de uso).

## Probar el sonido

- El sonido no se puede comprobar de forma automática: hay que escucharlo jugando.
- En desarrollo, `window.game.cache.audio.get('hit')` devuelve el buffer generado (duración, muestras).
- Para ver qué suena se puede envolver `game.sound.play` desde la consola y registrar las claves.
- Las pestañas del navegador en segundo plano congelan el juego: probar en la pestaña visible.

## Pendiente

Ver la sección de sonido en [TAREAS.md](TAREAS.md).
