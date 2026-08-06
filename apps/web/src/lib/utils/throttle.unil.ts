import {
  debounce,
  DebouncedFunction,
  DebounceOptions,
  FUNC_ERROR_TEXT,
  Procedure,
} from './debounce.util';

export function throttle<T extends Procedure>(
  func: T,
  wait: number,
  options?: DebounceOptions,
): DebouncedFunction<T> {
  let leading = true;
  let trailing = true;

  if (typeof func !== 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  if (typeof options === 'object' && options !== null) {
    leading = 'leading' in options ? !!options.leading : leading;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }
  return debounce(func, wait, {
    leading,
    maxWait: wait,
    trailing,
  });
}
