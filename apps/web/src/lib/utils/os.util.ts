/**
 * Sniffs the OS out of a user-agent string.
 *
 * Takes the string as an argument rather than reading `navigator` itself: the
 * result decides what is rendered, so it has to be available during *server*
 * rendering too. Reading `navigator.userAgent` inside a component gave the
 * server `Node.js/24` (Os.Unknown → no button) and the browser the real OS
 * (→ a button), which is a hydration mismatch. On the server the same string
 * comes from the request's `user-agent` header — see `os.server.ts`.
 */
export function getOperatingSystem(userAgent: string): Os {
  if (/Windows/i.test(userAgent)) return Os.Windows;
  if (/Android/i.test(userAgent)) return Os.Android;
  if (/iPhone|iPad|iPod/i.test(userAgent)) return Os.I;
  if (/Mac OS X/i.test(userAgent)) return Os.Mac;
  if (/Linux/i.test(userAgent)) return Os.Linux;

  return Os.Unknown;
}

export enum Os {
  Windows = 'windows',
  Mac = 'macos',
  Linux = 'linux',
  Android = 'android',
  I = 'ios',
  Unknown = 'unknown',
}
