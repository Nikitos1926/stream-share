import { MediaControlsApi } from '@/lib/hooks/useMediaControls';
import {
  VolumeX,
  Volume1,
  Volume2,
  PictureInPicture,
  PictureInPicture2,
  Expand,
  Shrink,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

const HIDE_DELAY_MS = 2500;

interface VideoControlsProps extends MediaControlsApi {
  containerRef: RefObject<HTMLDivElement | null>;
}

export function VideoControls(props: VideoControlsProps) {
  const {
    isFullscreen,
    isPiP,
    volume,
    setVolume,
    toggleFullscreen,
    toggleMute,
    togglePiP,
    containerRef,
  } = props;
  const [isVisible, setIsVisible] = useState(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoveringRef = useRef(false);

  const scheduleHide = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      if (isHoveringRef.current) return;
      setIsVisible(false);
    }, HIDE_DELAY_MS);
  }, []);

  const showControls = useCallback(() => {
    setIsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    scheduleHide();

    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousemove', showControls);
    container.addEventListener('touchstart', showControls);

    return () => {
      container.removeEventListener('mousemove', showControls);
      container.removeEventListener('touchstart', showControls);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [scheduleHide, showControls, containerRef]);

  const handleControlsMouseEnter = () => {
    isHoveringRef.current = true;
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setIsVisible(true);
  };

  const handleControlsMouseLeave = () => {
    isHoveringRef.current = false;
    scheduleHide();
  };

  const renderVolumeIcon = () => {
    if (!volume) return <VolumeX />;
    if (volume < 50) return <Volume1 />;
    return <Volume2 />;
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyM':
          toggleMute();
          break;

        case 'KeyF':
          toggleFullscreen();
          break;

        case 'KeyP':
          togglePiP();
          break;
      }
      showControls();
    };
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [toggleFullscreen, toggleMute, togglePiP, showControls]);

  return (
    <div
      onMouseEnter={handleControlsMouseEnter}
      onMouseLeave={handleControlsMouseLeave}
      className={`absolute inset-x-0 bottom-0 flex items-end justify-between bg-linear-to-t from-black/70 to-transparent p-2 pt-8 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div className="flex gap-2">
        <Button variant="unstyled" onClick={toggleMute}>
          {renderVolumeIcon()}
        </Button>
        <div className="flex w-37 items-center">
          <Slider value={volume} onChange={(v) => setVolume(v as number)} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="unstyled" onClick={togglePiP}>
          {!isPiP ? <PictureInPicture /> : <PictureInPicture2 />}
        </Button>
        <Button variant="unstyled" onClick={toggleFullscreen}>
          {!isFullscreen ? <Expand /> : <Shrink />}
        </Button>
      </div>
    </div>
  );
}
