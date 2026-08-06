export {};

declare global {
  interface CaptureController {
    setFocusBehavior(focusBehavior: 'focus-captured-surface' | 'no-focus-change'): void;
  }

  var CaptureController: {
    prototype: CaptureController;
    new (): CaptureController;
  };

  interface DisplayMediaStreamOptions {
    controller?: CaptureController;
  }
}
