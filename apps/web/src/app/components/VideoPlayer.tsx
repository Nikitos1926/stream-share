import { forwardRef, RefObject, useRef } from 'react';
import { VideoControls } from './VideoControls';
import { useMediaControls } from '@/lib/hooks/useMediaControls';

export const VideoPlayer = forwardRef<HTMLVideoElement>(function (_, videoRef) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaControls = useMediaControls(videoRef as RefObject<HTMLVideoElement>, containerRef);
  return (
    <div ref={containerRef} className="relative h-full w-full">
      <video
        ref={videoRef}
        autoPlay={true}
        playsInline
        className="h-full w-full bg-black object-contain"
      />
      <VideoControls {...mediaControls} />
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';
