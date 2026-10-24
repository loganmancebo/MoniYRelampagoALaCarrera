import Phaser from 'phaser';
import { ZZFX } from 'zzfx';
import { AUDIO } from '../config';
import { load, save } from '../storage';
import { renderSfx, renderSong } from './render';
import { MusicKey, SFX, SfxKey, SONGS } from './sounds';

// Capa fina sobre el SoundManager de Phaser. Todos los sonidos se reproducen por su clave,
// así que da igual si vienen de ZzFX o de un archivo cargado con this.load.audio().

let music: Phaser.Sound.WebAudioSound | null = null;
let musicKey: MusicKey | null = null;
// Estado propio del silencio: `sound.mute` de Phaser lee el gain del nodo de audio, que no se actualiza
// hasta que el motor de audio procesa (y nunca si el contexto está suspendido), así que no es fiable
// para leerlo justo después de cambiarlo.
let muted = false;

// Genera con ZzFX los sonidos que no se hayan cargado ya desde archivo y aplica el silencio guardado.
export function initAudio(scene: Phaser.Scene) {
  muted = load('moni.muted') === '1';
  scene.sound.mute = muted;
  if (!(scene.sound instanceof Phaser.Sound.WebAudioSoundManager)) return;
  const context = scene.sound.context;
  const add = (key: string, samples: Float32Array) => {
    if (scene.cache.audio.exists(key)) return; // un archivo definitivo tiene prioridad
    const buffer = context.createBuffer(1, samples.length, ZZFX.sampleRate);
    buffer.getChannelData(0).set(samples);
    scene.cache.audio.add(key, buffer);
  };
  for (const [key, params] of Object.entries(SFX)) add(key, renderSfx(params));
  for (const [key, song] of Object.entries(SONGS)) add(key, renderSong(song));
}

// detune: variación aleatoria de tono en cents (±), para que los sonidos repetidos no cansen.
export function playSfx(scene: Phaser.Scene, key: SfxKey, detune = AUDIO.detune) {
  if (!scene.cache.audio.exists(key)) return;
  scene.sound.play(key, { volume: AUDIO.sfxVolume, detune: Phaser.Math.Between(-detune, detune) });
}

export function playMusic(scene: Phaser.Scene, key: MusicKey) {
  if (musicKey === key && music?.isPlaying) return;
  stopMusic();
  if (!scene.cache.audio.exists(key)) return;
  music = scene.sound.add(key, { loop: true, volume: AUDIO.musicVolume }) as Phaser.Sound.WebAudioSound;
  musicKey = key;
  music.play();
}

export function setMusicRate(rate: number) {
  music?.setRate(rate);
}

export function stopMusic() {
  music?.stop();
  music?.destroy();
  music = null;
  musicKey = null;
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(scene: Phaser.Scene): boolean {
  muted = !muted;
  scene.sound.mute = muted;
  save('moni.muted', muted ? '1' : '0');
  return muted;
}
