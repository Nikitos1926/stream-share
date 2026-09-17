import { ConveyorApi } from '../../preload/shared';

export class AuthApi extends ConveyorApi {
  signInWithGoogle = () => this.invoke('auth:signInWithGoogle');
  cancelSignIn = () => this.invoke('auth:cancelSignIn');
}
