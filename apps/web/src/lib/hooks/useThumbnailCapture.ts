import { uploadThumbnail } from '@/app/api/streams/client';
import { RefObject, useCallback, useRef } from 'react';

export function useThumbnailCapture(videoRef: RefObject<HTMLVideoElement | null>) {
  const intervalIdRef = useRef<NodeJS.Timeout>(null);

  return useCallback(
    (streamId: string | undefined, intervalMs = 5 * 60 * 1000) => {
      if (!streamId) return null;
      const video = videoRef.current;
      if (!video) return null;
      const createThumbnail = async () => {
        if (video.videoWidth === 0) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')!.drawImage(video, 0, 0);

        canvas.toBlob(
          async (blob) => {
            if (!blob) return;
            await uploadThumbnail(streamId, blob);
          },
          'image/jpeg',
          0.7,
        );
      };

      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      const intervalId = setInterval(createThumbnail, intervalMs);
      createThumbnail();
      return () => {
        clearInterval(intervalId);
      };
    },
    [videoRef],
  );
}
