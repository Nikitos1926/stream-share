/// <reference types="electron-vite/node" />

/**
 * Replaced with a string literal at build time by the `define` block in
 * electron.vite.config.ts, which validates it through @stream-share/env first.
 */
declare const __WEB_URL__: string;

declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.web' {
  const content: string;
  export default content;
}
