let chain: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

export function runSourceSwitch(fn: () => Promise<void>): Promise<void> {
  const next = chain.catch(() => undefined).then(fn);
  chain = next.then(() => listeners.forEach((l) => l())).catch(() => undefined);
  return next;
}

export function onSourceSwitched(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
