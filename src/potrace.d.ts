// potrace ships no types. Only what the pipeline calls is declared.
declare module 'potrace' {
  export function trace(
    image: Buffer,
    options: { threshold: number; turdSize: number; optTolerance: number; alphaMax: number },
    callback: (error: Error | null, svg: string) => void
  ): void;
}
