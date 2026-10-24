import { ZZFX } from 'zzfx';
import { INSTRUMENTS, InstrumentKey, Song, ZzfxParams } from './sounds';

const SEMITONES: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };

// 'C#4' -> Hz (La4 = 440).
function noteToFrequency(note: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(note);
  if (!m) throw new Error(`Nota no válida: ${note}`);
  const semitone = SEMITONES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return ZZFX.getNote(semitone);
}

export function renderSfx(params: ZzfxParams): Float32Array {
  // Sin aleatoriedad al generar: la variación se aplica al reproducir (detune).
  const p = [...params];
  p[1] = 0;
  return ZZFX.buildSamples(...p);
}

// Mezcla todas las notas de la canción en un solo buffer de muestras.
export function renderSong(song: Song): Float32Array {
  const stepSamples = Math.round((ZZFX.sampleRate * 60) / song.bpm / song.stepsPerBeat);
  const tracks = Object.entries(song.tracks) as [InstrumentKey, string][];
  const steps = Math.max(...tracks.map(([, t]) => tokens(t).length));
  const loopLength = steps * stepSamples;
  const notes: { at: number; samples: Float32Array }[] = [];
  const cache = new Map<string, Float32Array>();

  for (const [instrument, track] of tracks) {
    const base = INSTRUMENTS[instrument];
    const pitched = base[2] === 0; // frecuencia 0 en el instrumento = la pone cada nota
    tokens(track).forEach((token, step) => {
      if (token === '.') return;
      const id = `${instrument}:${pitched ? token : ''}`;
      let samples = cache.get(id);
      if (!samples) {
        const p = [...base];
        if (pitched) p[2] = noteToFrequency(token);
        samples = ZZFX.buildSamples(...p);
        cache.set(id, samples);
      }
      notes.push({ at: step * stepSamples, samples });
    });
  }

  const length = song.loop ? loopLength : Math.max(...notes.map((n) => n.at + n.samples.length));
  const out = new Float32Array(length);
  for (const { at, samples } of notes) {
    for (let i = 0; i < samples.length; i++) {
      const j = at + i;
      if (j < length) out[j] += samples[i];
      else if (song.loop) out[j % length] += samples[i];
    }
  }
  // Evita saturar si muchas notas coinciden.
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  if (peak > 0.95) for (let i = 0; i < out.length; i++) out[i] *= 0.95 / peak;
  return out;
}

function tokens(track: string): string[] {
  return track.split(/[\s|]+/).filter(Boolean);
}
