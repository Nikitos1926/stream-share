declare module 'electron-native-screenshare' {
  /**
   * Audio stream metadata delivered alongside every buffer in the startCapture callback.
   */
  export interface AudioMetadata {
    /** Sample rate, e.g. 48000 */
    sampleRate: number;
    /** Number of channels, e.g. 2 (stereo) */
    channels: number;
    /** Bits per sample, e.g. 32 */
    bitsPerSample: number;
    /** true = IEEE float, false = integer PCM */
    isFloat: boolean;
  }

  /**
   * Callback invoked for every captured audio frame.
   * data — Buffer containing raw PCM samples (see AudioMetadata.isFloat for the format).
   */
  export type AudioDataCallback = (data: Buffer, meta: AudioMetadata) => void;

  /**
   * Starts audio capture with process-level isolation.
   *
   * @param processId      target process ID. Defaults to process.pid
   * @param isIncludeMode  true = capture only the target process,
   *                       false = capture everything except the target process
   * @param onData         called for every received audio buffer
   * @returns true if capture started successfully
   * @throws Error if the native module is unavailable or initialization fails
   */
  export function startCapture(
    processId?: number,
    isIncludeMode?: boolean,
    onData?: AudioDataCallback,
  ): boolean;

  /**
   * Stops the active capture session.
   * Safe to call even if nothing is currently capturing.
   */
  export function stopCapture(): boolean;

  /**
   * Resolves a native window handle to its owning process ID
   * (e.g. from Electron's desktopCapturer).
   *
   * Windows — HWND (auto-resolves UWP ApplicationFrameWindow → child process)
   * macOS   — CGWindowID
   * Linux   — X11 Window ID
   *
   * @returns process ID, or 0 if not found
   */
  export function getPidFromWindowHandle(windowHandle: number): number;

  /**
   * Returns true if the native module loaded successfully on the current platform.
   */
  export function isAvailable(): boolean;

  /**
   * Returns the current platform.
   */
  export function getPlatform(): 'win32' | 'darwin' | 'linux';

  /**
   * Returns the native module's load error message,
   * or null if it loaded successfully.
   */
  export function getLoadError(): string | null;
}
