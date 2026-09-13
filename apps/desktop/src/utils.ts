import { nativeImage, NativeImage, nativeTheme } from 'electron';
import path from 'path';

export function resolveIcon(name: string): NativeImage {
  if (process.platform === 'darwin') {
    const icon = nativeImage.createFromPath(path.join(__dirname, `assets/${name}-mac.png`));
    icon.setTemplateImage(true);
    return icon;
  }

  const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  const ext = process.platform === 'win32' ? 'ico' : 'png';
  return nativeImage.createFromPath(path.join(__dirname, `assets/${name}-${theme}.${ext}`));
}
