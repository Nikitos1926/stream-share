import { useEffect, useState } from 'react';

export function useIsWindowFocused() {
  const [isFocused, setIsFocused] = useState<boolean>(document ? document.hasFocus() : false);

  useEffect(() => {
    const handleWindowFocus = () => setIsFocused(true);
    const handleWindowBlur = () => setIsFocused(false);

    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  return isFocused;
}
