/**
 * Messages exchanged between the main process and the audio capture utility
 * process over process.parentPort.
 */

/** Main -> worker. Carries one MessagePort in `ports[0]` for the renderer. */
export type AudioWorkerInit = { type: 'init'; processId?: number };

/** Worker -> main. Sent exactly once, after init, before any audio flows. */
export type AudioWorkerStatus = { type: 'ready' } | { type: 'error'; error: string };
