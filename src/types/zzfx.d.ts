// Tipos mínimos de la librería zzfx (no trae los suyos). Solo lo que usamos.
declare module 'zzfx' {
  export const ZZFX: {
    sampleRate: number;
    buildSamples(...params: (number | undefined)[]): Float32Array;
    getNote(semitoneOffset?: number, rootNoteFrequency?: number): number;
  };
}
