# Tareas pendientes — Moni & Relámpago

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

## 🔜 Siguiente: subir a GitHub

- [ ] Conectar el remoto y hacer el primer push
      (`git branch -M main`, `git remote add origin …`, `git push -u origin main`)

## Fase 2 · Personalidad de cada personaje

- [ ] **Moni: salto doble**, pulsando saltar otra vez en el aire. Usar el frame de salto o, mejor, un frame
      de giro con las orejas como hélice (arte del bloque 2: `moni_doublejump`, 3 frames).
- [ ] **Relámpago: dash eléctrico**, una tecla (p. ej. → o D) o deslizar el dedo. Atraviesa un obstáculo
      y luego se recarga en unos 5 s. Mostrar la recarga en la interfaz. Arte: `relampago_dash`, 3 frames.
- [ ] Decidir si la nube de tormenta "recarga" a Relámpago al atravesarla con el dash.
- [ ] Equilibrar: ¿un personaje es claramente mejor? Ajustar la recarga y la altura del salto doble.
- [ ] Mostrar en el menú una línea con la habilidad de cada personaje.

## Fase 3 · Mundo y dificultad

- [ ] **Patrones de obstáculos**: combinaciones a partir de X puntos (dos obstáculos bajos seguidos,
      tocón + nube, valla + abeja…), definidos en `config.ts`.
- [ ] **Parallax** con colinas lejanas y cercanas (arte del bloque 2: `hills_far`, `hills_near`).
- [ ] Nubes de fondo sueltas que se muevan a distinta velocidad (`clouds.png`).
- [ ] **Ciclo día/noche** cada ~700 puntos (tintado de cámara o arte nocturno opcional).
- [ ] Obstáculos móviles para más adelante: **caracol** que avanza hacia el jugador, **erizo** rodando.
- [ ] Revisar la curva de dificultad jugando de verdad: velocidad máxima, aceleración y huecos.
- [ ] Rayos coleccionables (`collectible_bolt`) que den puntos extra.

## Fase 4 · Pulido y sensación de juego

- [ ] **Sonido**: salto, aterrizaje, choque, cada 100 puntos, dash y salto doble. Música en bucle.
- [ ] Botón de silencio (guardar la preferencia en localStorage).
- [ ] **Pausa**: tecla P / Esc y botón en pantalla. Pausar también al perder el foco.
- [ ] Partículas: polvo al aterrizar (`fx_dust`), chispas en el dash (`fx_spark`).
- [ ] *Squash & stretch* del personaje al saltar y aterrizar.
- [ ] Pequeña cuenta atrás o "¡Ya!" al empezar la partida.
- [ ] Animación de agachado con 2 frames (ahora es un frame fijo).
- [ ] Pantalla de game over más bonita: botones dibujados (`btn_restart`, `btn_menu`) y récord destacado.
- [ ] Logo dibujado para el menú (`logo.png`) en lugar del texto.

## Fase 5 · Móvil y publicación

- [ ] Probar en móvil real: controles táctiles, rendimiento a 60 fps y orientación horizontal.
- [ ] Mensaje "gira el móvil" en vertical, o adaptar el juego a vertical.
- [ ] Mostrar las zonas táctiles (agacharse / saltar) en la primera partida.
- [ ] Incluir la fuente Fredoka en el proyecto (ahora viene de Google Fonts y sin conexión se usa otra).
- [ ] **PWA**: manifest, icono (`icon_512.png`) y service worker para jugar sin conexión.
- [ ] Publicar en GitHub Pages (con GitHub Actions) o itch.io.
- [ ] Título, descripción e imagen para compartir en redes (Open Graph).

## Arte pendiente (por bloques)

**Bloque 2: juego completo**
- [ ] `moni_duck` / `relampago_duck` (2 frames), si se quiere animar el agachado
- [ ] `moni_idle` / `relampago_idle` (2 frames) para el menú
- [ ] `moni_doublejump` (3 frames) y `relampago_dash` (3 frames)
- [ ] `hills_far.png`, `hills_near.png` (tileables), `clouds.png`
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
