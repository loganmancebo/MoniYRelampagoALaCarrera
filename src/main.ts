import Phaser from 'phaser';
import { HEIGHT, WIDTH } from './config';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { PauseScene } from './scenes/PauseScene';
import { autoFullscreenOnFirstTouch } from './fullscreen';

async function start() {
  // Espera a la fuente de Google para que los textos no salgan con la fuente por defecto.
  await Promise.race([
    document.fonts.load('700 48px Fredoka'),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => undefined);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: '#ede3d3',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: {
      default: 'arcade',
      arcade: { debug: new URLSearchParams(location.search).has('debug') },
    },
    input: { activePointers: 3 },
    scene: [PreloadScene, MenuScene, GameScene, PauseScene],
  });
  autoFullscreenOnFirstTouch();
  if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
}

start();
