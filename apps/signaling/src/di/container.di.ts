import { Class } from '../types/utils';

export class Container {
  private readonly instances = new Map<Class<unknown>, unknown>();

  register<T>(token: Class<T>, instance: T): void {
    this.instances.set(token, instance);
  }

  resolve<T>(token: Class<T>): T {
    const instance = this.instances.get(token);
    if (!instance) {
      throw new Error(`No provider found for "${token}"`);
    }
    return instance as T;
  }
}
