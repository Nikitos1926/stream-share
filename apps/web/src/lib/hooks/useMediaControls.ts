/* eslint-disable react-hooks/exhaustive-deps */
import { RefObject, useCallback, useEffect, useState } from 'react';
import screenfull from 'screenfull';

export function useMediaControls(
  videoRef: RefObject<HTMLVideoElement | null>,
  containerRef: RefObject<HTMLElement | null>,
): MediaControlsApi {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPiP, setIsPiP] = useState<boolean>(false);
  const [volumeState, setVolumeState] = useState<number>(100);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVolumeChange = (event: Event) => {
      const { volume, muted } = event.currentTarget as HTMLVideoElement;
      setVolumeState(muted ? 0 : Math.round(volume * 100));
    };

    video.addEventListener('volumechange', handleVolumeChange);
    return () => video.removeEventListener('volumechange', handleVolumeChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnter = () => setIsPiP(true);
    const handleLeave = () => setIsPiP(false);

    video.addEventListener('enterpictureinpicture', handleEnter);
    video.addEventListener('leavepictureinpicture', handleLeave);
    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnter);
      video.removeEventListener('leavepictureinpicture', handleLeave);
    };
  }, []);

  useEffect(() => {
    if (!screenfull.isEnabled) return;
    const handleChange = () => setIsFullscreen(screenfull.isFullscreen);
    screenfull.on('change', handleChange);
    return () => screenfull.off('change', handleChange);
  }, []);

  const setVolume = useCallback((v: number) => {
    if (!videoRef.current) return;
    const volume = Math.max(0, Math.min(100, v));
    if (videoRef.current.muted && !volume) videoRef.current.muted = !videoRef.current.muted;
    videoRef.current.volume = volume / 100;
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!videoRef.current) return;
    screenfull.toggle(containerRef.current);
  }, []);

  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return;
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      await videoRef.current.requestPictureInPicture();
    }
  }, []);

  return {
    toggleMute,
    volume: volumeState,
    setVolume,
    isFullscreen,
    toggleFullscreen,
    isPiP,
    togglePiP,
  };
}

export type MediaControlsApi = {
  toggleMute: () => void;
  volume: number;
  setVolume: (v: number) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  isPiP: boolean;
  togglePiP: () => void;
};
