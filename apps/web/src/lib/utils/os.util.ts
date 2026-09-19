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
