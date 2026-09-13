import { cn } from '@/lib/utils/cn.util';
import { Slot } from '@radix-ui/react-slot';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';

interface ModalProps {
  isOpen?: boolean;
  className?: string;
  contentClassName?: string;
  title: string | React.ReactNode;
  footer?: React.ReactNode;
  trigger?: React.ReactNode;
  children: React.ReactNode;
  onOpenChange?: (value: boolean) => void;
}

export const Modal: React.FC<ModalProps> = (props) => {
  const {
    isOpen: isOpenProp,
    className,
    contentClassName,
    title,
    footer,
    trigger,
    children,
    onOpenChange,
  } = props;

  const [isOpenState, setIsOpenState] = useState<boolean>(!!isOpenProp);
  const isControlledRef = useRef<boolean>(isOpenProp !== undefined);
  const modalRef = useRef<HTMLDivElement>(null);
  const isOpen = useMemo(
    () => (isOpenProp !== undefined ? isOpenProp : isOpenState),
    [isOpenProp, isOpenState],
  );

  const handleClose = useCallback(() => {
    onOpenChange?.(false);
    if (!isControlledRef.current) setIsOpenState(false);
  }, [onOpenChange]);

  const handleOpen = useCallback(() => {
    onOpenChange?.(true);
    if (!isControlledRef.current) setIsOpenState(true);
  }, [onOpenChange]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [handleClose, isOpen]);

  return (
    <>
      <Slot onClick={handleOpen}>{trigger}</Slot>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 animate-[fadeIn_120ms_ease-out] bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          <div
            ref={modalRef}
            className={cn(
              'relative flex max-h-[90vh] min-h-96 w-full max-w-[90vw] flex-col gap-6 overflow-y-auto rounded-lg bg-surface shadow-2xl',
              'animate-[scaleIn_180ms_cubic-bezier(0.16,1,0.3,1)]',
              className,
            )}
            role="dialog"
            aria-modal="true"
          >
            <header className="grid grid-cols-[1fr_auto_1fr] items-center px-6 pt-6">
              <div />
              {typeof title === 'string' ? <Typography>{title}</Typography> : title}
              <Button onClick={handleClose} aria-label="Close modal" className="justify-self-end">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </header>

            <div className={cn('size-full px-6', !footer && 'pb-6', contentClassName)}>
              {children}
            </div>
            {footer && <div className="sticky bottom-0 bg-surface p-3 px-6">{footer}</div>}
          </div>
        </div>
      )}
    </>
  );
};
