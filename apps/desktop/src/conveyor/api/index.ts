import { electronAPI } from '@electron-toolkit/preload';
import { AppApi } from './app.api';
import { AuthApi } from './auth.api';
import { WindowApi } from './window.api';
import { StreamApi } from './stream.api';

export const conveyor = {
  app: new AppApi(electronAPI),
  auth: new AuthApi(electronAPI),
  window: new WindowApi(electronAPI),
  stream: new StreamApi(electronAPI),
};

export type ConveyorApi = typeof conveyor;
