// Pantalla completa en el móvil: sin ella, las barras del navegador se comen buena parte de la altura
// en horizontal y el juego se ve pequeño. El navegador solo deja activarla dentro de un gesto del usuario
// (en táctil, al levantar el dedo), así que se pide en `touchend` y en el `pointerup` del botón.

export function fullscreenAvailable(): boolean {
  return document.fullscreenEnabled === true;
}

export function isFullscreen(): boolean {
  return document.fullscreenElement != null;
}

export function enterFullscreen() {
  if (!fullscreenAvailable() || isFullscreen()) return;
  document.documentElement
    .requestFullscreen({ navigationUI: 'hide' })
    // Bloquear en horizontal solo funciona en pantalla completa y no en todos los navegadores.
    .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape'))
    .catch(() => undefined);
}

export function toggleFullscreen() {
  if (isFullscreen()) document.exitFullscreen().catch(() => undefined);
  else enterFullscreen();
}

// El primer toque de la página entra en pantalla completa. Solo una vez: si el jugador la quita,
// no se le vuelve a imponer (tiene el botón para volver).
export function autoFullscreenOnFirstTouch() {
  if (!fullscreenAvailable()) return;
  window.addEventListener('touchend', () => enterFullscreen(), { once: true, passive: true });
}
