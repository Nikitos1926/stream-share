import { type App } from 'electron';
import { handle } from '../../main/shared';

export const registerAppHandlers = (app: App) => {
  // App operations
  handle('version', () => app.getVersion());
};
