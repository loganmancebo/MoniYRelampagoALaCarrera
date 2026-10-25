# Tareas pendientes — Moni & Relámpago a la carrera

Estado a 24/10/2026. Marca `[x]` al terminar cada tarea.

## ✅ Hecho (Fase 0 y Fase 1: prototipo jugable)

- [x] Proyecto Vite + TypeScript + Phaser, repositorio git
- [x] Arte del bloque 1: spritesheets de Moni y Relámpago, 12 obstáculos, suelo y cielo
- [x] Pipeline de imágenes (`npm run assets`)
- [x] Menú de selección de personaje
- [x] Salto variable con *coyote time* y *jump buffer*, agacharse, caída rápida
- [x] 8 obstáculos de suelo + 2 voladores (nube animada, abeja) a 3 alturas
- [x] Velocidad progresiva, puntuación, récord en localStorage
- [x] Game over con reintento y vuelta al menú
- [x] Modo `?debug` con hitboxes
- [x] Repositorio conectado a GitHub

## 🔊 Sonido (detalle en [SONIDO.md](SONIDO.md))

**Hecho: sonido provisional con ZzFX**
- [x] Sistema de audio por claves sobre el SoundManager de Phaser (`src/audio/`)
- [x] Efectos: salto distinto por personaje, aterrizar, agacharse, choque, game over, récord, cada 100 puntos, menú
- [x] Música provisional del menú y de la partida, en bucle; la de la partida acelera con la velocidad
- [x] Variación de tono en los efectos repetidos
- [x] Botón de silencio + tecla M, guardado en localStorage

**Pendiente**
- [ ] Escuchar y ajustar volúmenes jugando (`AUDIO` en config.ts y volumen de cada efecto en `SFX`)
- [ ] Decidir la fuente de los sonidos definitivos (IA, librerías CC0 o mantener ZzFX)
- [ ] Sonidos definitivos: efectos (WAV → OGG + MP3) en `public/audio/` y cargarlos en `PreloadScene`
- [ ] Música definitiva del menú y de la partida (60-90 s en bucle)
- [ ] Opcional: script `npm run audio` con ffmpeg (convertir, recortar silencios, normalizar)
- [ ] Opcional: avisos sonoros de peligro (`thunder` al aparecer la nube, `buzz` de la abeja)
- [x] Sonido provisional del salto doble (`doublejump`)
- [x] Sonidos provisionales del dash (`dash`) y de la recarga (`recharge`)
- [ ] Probar en iPhone: interruptor de silencio físico y desbloqueo del audio al primer toque
- [ ] Opcional: volúmenes separados de música y efectos en un menú de opciones

## Fase 2 · Personalidad de cada personaje

- [x] **Moni: salto doble**, pulsando saltar otra vez en el aire (`DOUBLE_JUMP` en config.ts, sonido `doublejump`).
      Efecto provisional: estirón del sprite y anillo de aire bajo los pies. Si se pulsa justo antes de
      aterrizar, cuenta como salto normal (jump buffer) y no gasta el doble.
- [x] **Árbol alto** (`tree`) para que el salto doble sea necesario: Moni lo pasa con el doble salto y
      Relámpago con el dash (solo le sale con el dash cargado). Desde 400 puntos.
- [ ] Moni: usar el arte `moni_doublejump` (3 frames, giro con las orejas como hélice) cuando exista.
- [x] **Relámpago: dash eléctrico** con → / D o el botón del rayo (abajo a la derecha, que también muestra
      la recarga). Durante 0,38 s el mundo va 2,2× más rápido y atraviesa lo que toque; recarga de 5 s
      (`DASH` en config.ts, sonidos `dash` y `recharge`). Efecto provisional: tinte amarillo y estelas.
- [ ] Relámpago: usar el arte `relampago_dash` (3 frames) cuando exista.
- [ ] Valorar activar el dash deslizando el dedo (ahora el toque salta al apoyar el dedo, antes de saber
      si es un deslizamiento; por eso de momento hay botón).
- [ ] Decidir si la nube de tormenta "recarga" a Relámpago al atravesarla con el dash.
- [ ] Equilibrar: ¿un personaje es claramente mejor? Ajustar la recarga y la altura del salto doble.
- [ ] Mostrar en el menú una línea con la habilidad de cada personaje.

## Fase 3 · Mundo y dificultad

- [x] **Patrones de obstáculos**: combinaciones desde 300 puntos (pareja de bajos de un salto, dos y tres bajos
      seguidos, tocón + nube, valla + abeja, nube + roca, abejas a dos alturas), en `PATTERNS` (config.ts).
- [ ] Ajustar jugando la frecuencia de los patrones (`PATTERN_CHANCE`) y sus huecos.
- [x] **Parallax** con colinas lejanas y cercanas (arte del bloque 2: `hills_far`, `hills_near`).
- [x] ~~Nubes de fondo sueltas que se muevan a distinta velocidad (`clouds.png`).~~ Descartada: se quedan
      las nubes que ya trae `sky.png`.
- [x] **Ciclo día/noche** cada 700 puntos: tinte por capa, estrellas y luna (`DAY_NIGHT` en config.ts).
      Arte nocturno opcional: `fx_star` y `moon` definitivos (ahora se dibujan en `src/scenes/fx.ts`).
- [ ] Obstáculos móviles para más adelante: **caracol** que avanza hacia el jugador, **erizo** rodando.
- [ ] Revisar la curva de dificultad jugando de verdad: velocidad máxima, aceleración y huecos.
- [ ] Rayos coleccionables (`collectible_bolt`) que den puntos extra.

## Fase 4 · Pulido y sensación de juego

- [x] **Sonido** provisional (ver sección Sonido arriba)
- [x] Botón de silencio (guardado en localStorage)
- [x] **Pausa**: tecla P / Esc y botón en pantalla (junto al de silencio). Se pausa también al perder el foco
      o cambiar de pestaña. Panel con "Seguir" y "Menú"; la música se pausa y se reanuda.
- [x] Cuenta atrás corta (3, 2, 1, «¡Ya!») al reanudar tras la pausa.
- [x] Partículas: polvo al aterrizar (`fx_dust`), chispas en el dash (`fx_spark`). Texturas provisionales
      dibujadas en `src/scenes/fx.ts` hasta tener el arte.
- [ ] *Squash & stretch* del personaje al saltar y aterrizar.
- [x] Pequeña cuenta atrás o "¡Ya!" al empezar la partida (también al reintentar).
- [ ] Animación de agachado con 2 frames (ahora es un frame fijo).
- [x] Pantalla de game over más bonita: botones dibujados (`btn_restart`, `btn_menu`) y récord destacado.
      Texturas provisionales en `src/ui/buttonTextures.ts` hasta tener el arte.
- [ ] Logo dibujado para el menú (`logo.png`) en lugar del texto.

## Fase 5 · Móvil y publicación

- [ ] Probar en móvil real: controles táctiles, rendimiento a 60 fps y orientación horizontal.
- [ ] Mensaje "gira el móvil" en vertical, o adaptar el juego a vertical.
- [ ] Mostrar las zonas táctiles (agacharse / saltar) en la primera partida.
- [ ] Incluir la fuente Fredoka en el proyecto (ahora viene de Google Fonts y sin conexión se usa otra).
- [ ] **PWA**: manifest, icono (`icon_512.png`) y service worker para jugar sin conexión.
- [x] Publicar en GitHub Pages con GitHub Actions (`.github/workflows/deploy.yml`):
      https://loganmancebo.github.io/MoniYRelampagoALaCarrera/
- [ ] Opcional: publicar también en itch.io.
- [ ] Título, descripción e imagen para compartir en redes (Open Graph).

## Arte pendiente (por bloques)

**Bloque 2: juego completo**
- [ ] `moni_duck` / `relampago_duck` (2 frames), si se quiere animar el agachado
- [ ] `moni_idle` / `relampago_idle` (2 frames) para el menú
- [ ] `moni_doublejump` (3 frames) y `relampago_dash` (3 frames)
- [x] `hills_far.png`, `hills_near.png` (tileables)
- [x] ~~`clouds.png`~~ (descartada, se usan las nubes de `sky.png`)
- [ ] `collectible_bolt.png` (4 frames)
- [ ] Opcional: repetir la abeja con 2 frames consistentes (ahora se usa solo `bee1` con tweens)

**Bloque 3: interfaz**
- [ ] `logo.png`, botones (`btn_play`, `btn_restart`, `btn_pause`, `btn_sound_on`, `btn_sound_off`)
- [ ] `fx_dust`, `fx_spark` (3 frames cada uno)
- [ ] `icon_512.png`
- [ ] Opcional: versiones nocturnas del cielo y las colinas

## Problemas conocidos y deuda técnica

- [ ] El segundo frame de la abeja (`bee2`) es distinto del primero y no se usa.
- [ ] Moni mira hacia el jugador en lugar de estar de perfil estricto (aceptado; revisar si se regenera).
- [ ] La escala de Moni varía un poco entre frames (los saltos son algo más grandes).
- [ ] Hitboxes ajustadas a ojo: revisarlas con `?debug` tras jugar varias partidas.
- [ ] Phaser ocupa ~340 KB comprimido. Aceptable; si hiciera falta, valorar Phaser 4 o una carga diferida.

## Ideas para más adelante

- Desbloqueables: gorros o colores alternativos con los rayos recogidos
- Logros (100 saltos, 1000 puntos sin agacharse…)
- Ranking online (Supabase o Firebase)
- Modo para dos jugadores en el mismo teclado: Moni contra Relámpago
