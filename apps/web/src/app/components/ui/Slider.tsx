import { throttle } from '@/lib/utils/throttle.unil';
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type SliderMode = 'single' | 'range';

interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value?: number | Range;
  mode?: SliderMode;
  onChange: (value: number | Range) => void;
}

type DraggingThumb = 'single' | 'left' | 'right' | null;

export const Slider: FC<SliderProps> = ({
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  mode = 'single',
}) => {
  const [dragging, setDragging] = useState<DraggingThumb>(null);
  const [hovering, setHovering] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const prevValueRef = useRef<number>(null);

  const throttledOnChange = useMemo(() => throttle(onChange, 10, { leading: false }), [onChange]);

  const isRange = mode === 'range';
  const currentValue = useMemo(
    () => value ?? (isRange ? { min, max } : min),
    [isRange, max, min, value],
  );

  // Tooltip is visible while dragging, or while hovering the track.
  const showTooltips = dragging !== null || hovering;

  const getPercentage = useCallback(
    (val: number): number => {
      return ((val - min) / (max - min)) * 100;
    },
    [min, max],
  );

  const getValueFromPosition = useCallback(
    (clientX: number): number => {
      if (!sliderRef.current) return min;

      const rect = sliderRef.current.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const rawValue = min + percentage * (max - min);
      const steppedValue = Math.round(rawValue / step) * step;
      return Math.max(min, Math.min(max, steppedValue));
    },
    [min, max, step],
  );

  const handleMouseDown = (thumb: Exclude<DraggingThumb, null>) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(thumb);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragging === null) return;

      const newVal = getValueFromPosition(e.clientX);

      if (dragging === null || prevValueRef.current === newVal) return;
      prevValueRef.current = newVal;

      if (isRange && typeof currentValue === 'object') {
        const { min, max } = currentValue;
        if (dragging === 'left') {
          if (newVal <= max) {
            throttledOnChange({ min: newVal, max });
          } else {
            setDragging('right');
            onChange({ min: max, max });
          }
        } else if (dragging === 'right') {
          if (newVal >= min) {
            throttledOnChange({ min, max: newVal });
          } else {
            setDragging('left');
            onChange({ min, max: min });
          }
        }
      } else if (!isRange && typeof currentValue === 'number') {
        throttledOnChange(newVal);
      }
    },
    [dragging, currentValue, isRange, getValueFromPosition, throttledOnChange, onChange],
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    prevValueRef.current = null;
  }, []);

  useEffect(() => {
    if (dragging !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragging !== null || !onChange) return;

    const target = e.target as HTMLElement;
    if (target.hasAttribute('data-thumb')) return;

    const newVal = getValueFromPosition(e.clientX);
    prevValueRef.current = newVal;

    if (isRange && typeof currentValue === 'object') {
      const { min, max } = currentValue;
      const distToLeft = Math.abs(newVal - min);
      const distToRight = Math.abs(newVal - max);

      if (distToLeft < distToRight) {
        onChange({ min: Math.min(newVal, max), max });
        setDragging('left');
      } else {
        onChange({ min, max: Math.max(newVal, min) });
        setDragging('right');
      }
    } else if (!isRange) {
      onChange(newVal);
      setDragging('single');
    }
  };

  const renderTooltip = (val: number, active: boolean) => (
    <div
      role="tooltip"
      className={`bg--surface pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-sm border border-line px-1.5 py-0.5 font-mono text-[11px] text-accent tabular-nums transition-opacity duration-100 ${
        showTooltips ? 'opacity-100' : 'opacity-0'
      } ${active ? 'border-accent' : ''}`}
    >
      {val}
      <span className="absolute top-full left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-b border-line bg-surface" />
    </div>
  );

  const renderThumb = (thumb: Exclude<DraggingThumb, null>, val: number) => (
    <div
      data-thumb="true"
      className={`absolute top-1/2 z-10 h-3.5 w-2 -translate-y-1/2 cursor-grab rounded-xs border border-accent bg-canvas transition-colors active:cursor-grabbing ${
        dragging === thumb ? 'bg-accent' : ''
      }`}
      style={{ left: `calc(${getPercentage(val)}% - 4px)` }}
      onMouseDown={handleMouseDown(thumb)}
    >
      {renderTooltip(val, dragging === thumb)}
    </div>
  );

  const renderSingleSlider = () => {
    const val = typeof currentValue === 'number' ? currentValue : min;

    return (
      <>
        <div
          className="pointer-events-none absolute h-full rounded-full bg-accent"
          style={{ width: `${getPercentage(val)}%` }}
        />
        {renderThumb('single', val)}
      </>
    );
  };

  const renderRangeSlider = () => {
    const { min: left, max: right } =
      typeof currentValue === 'object' ? currentValue : { min, max };

    return (
      <>
        <div
          className="pointer-events-none absolute h-full rounded-full bg-accent"
          style={{
            left: `${getPercentage(left)}%`,
            width: `${getPercentage(right) - getPercentage(left)}%`,
          }}
        />
        {renderThumb('left', left)}
        {renderThumb('right', right)}
      </>
    );
  };

  return (
    <div className="w-full px-2 py-3">
      <div
        ref={sliderRef}
        className="relative h-1 cursor-pointer rounded-full bg-surface select-none"
        onMouseDown={handleTrackClick}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {isRange ? renderRangeSlider() : renderSingleSlider()}
      </div>
    </div>
  );
};

export interface Range {
  min: number;
  max: number;
}
