import type { BrowserWindow } from 'electron';
import { handle } from '../../main/shared';
import { cancelGoogleSignIn, startGoogleSignIn } from '../../main/googleAuth';

export const registerAuthHandlers = (window: BrowserWindow) => {
  handle('auth:signInWithGoogle', () => startGoogleSignIn(window));
  handle('auth:cancelSignIn', () => cancelGoogleSignIn());
};
