// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Class<T, Arguments extends unknown[] = any[]> = {
  prototype: Pick<T, keyof T>;
  new (...arguments_: Arguments): T;
};
