/**
 * Source switches tear down and restart desktop audio, so two overlapping
 * `changeSource()` calls corrupt each other. Every automatic switch goes
 * through this queue; a request made while one runs waits for it.
 */
let chain: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

export function runSourceSwitch(fn: () => Promise<void>): Promise<void> {
  const next = chain.catch(() => undefined).then(fn);
  chain = next.then(() => listeners.forEach((l) => l())).catch(() => undefined);
  return next;
}

/** Called after every successful switch, whichever path requested it. Returns the unsubscribe. */
export function onSourceSwitched(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
