'use client';

import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Typography } from '@/app/components/ui/Typography';
import { StreamControlsSkeleton } from '@/app/components/video/StreamControlsSkeleton';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { useIsWindowFocused } from '@/lib/hooks/useIsWindowFocused';
import {
  STREAM_FPS_OPTIONS,
  StreamQuality,
  StreamStatus,
  useStreamer,
} from '@/lib/hooks/useStreamer';
import { Lock, LockOpen, Monitor, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MediaSourcePicker } from './components/electron/MediaSourcePicker';
import { FollowAppToggle } from './components/electron/FollowAppToggle';
import { useSourceFollower } from '@/lib/hooks/useSourceFollower';
import { isFpsAllowed } from '@/lib/media/encoding';

const qualities = Object.values(StreamQuality);

export default function Broadcast() {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const {
    videoRef,
    isPrivate,
    isMuted,
    isMuteToggleEnabled,
    hasActiveStream,
    isCheckingActiveStream,
    currentStream,
    status,
    quality,
    fps,
    sourceHeight,
    setIsPrivate,
    toggleMute,
    changeQuality,
    changeFps,
    selectSource,
    changeSource,
    broadcast,
    stopBroadcast,
    reconnect,
  } = useStreamer();
  const [isScreenSource, setIsScreenSource] = useState(false);
  const follow = useSourceFollower({ status, changeSource, stopBroadcast });
  const isLive = status === StreamStatus.Live;
  const isPreview = status === StreamStatus.Preview;
  const isDesktop = useIsDesktop();
  const isWindowFocused = useIsWindowFocused();
  const isPreviewPaused = !isWindowFocused && (isPreview || isLive);

  useEffect(() => {
    if (!videoRef.current || !(isPreview || isLive)) return;

    const video = videoRef.current;

    if (isWindowFocused) {
      if (video.paused) video.play();
    } else if (video.played) video.pause();
  }, [isLive, isPreview, isWindowFocused, videoRef]);

  const constructInviteLink = () => {
    return currentStream && isLive
      ? `${window.location.origin}/${currentStream.id}/watch`
      : 'Stream is not live yet';
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!', {
        id: 'clipboard',
      });
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.success(`Failed to copy: ${err}`, {
        id: 'clipboard',
      });
    }
  };

  const renderPickSourceButton = () => {
    if (isDesktop)
      return (
        <MediaSourcePicker
          status={status}
          selectSource={selectSource}
          onSourcePicked={(source) => setIsScreenSource(source.isScreen)}
        />
      );

    return (
      <Button
        className="w-full md:w-auto"
        variant={isLive || isPreview ? 'secondary' : 'primary'}
        onClick={selectSource}
      >
        <Monitor />
        <Typography>{isLive || isPreview ? 'Change source' : 'Pick source'}</Typography>
      </Button>
    );
  };

  return (
    <div className="container flex flex-col gap-4 py-4 landscape:md:h-[calc(100dvh-var(--header-h))]">
      <div className="flex min-h-45 min-w-0 flex-1 flex-col items-center justify-center rounded-md border-2 border-line bg-surface">
        <div className="relative aspect-video h-auto max-h-full w-full max-w-full landscape:md:h-full landscape:md:w-auto">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full rounded-md bg-black object-contain"
          />
          {isPreviewPaused && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md">
              <Typography className="rounded-md bg-canvas px-4 py-2">
                Stream is still going, but preview is paused
              </Typography>
            </div>
          )}
          <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-sm border-2 border-line bg-surface px-2 py-1">
            <span className={`h-2 w-2 rounded-full ${isLive ? 'bg-red-500' : 'bg-stroke-muted'}`} />
            <Typography size="sm" className="tracking-wide uppercase">
              {status}
            </Typography>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-md border-2 border-line bg-surface p-4">
        {isCheckingActiveStream ? (
          <StreamControlsSkeleton />
        ) : hasActiveStream ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Typography>You have an unfinished stream</Typography>
            <Button appearance="solid" onClick={reconnect}>
              Reconnect
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <div className="flex flex-col items-center gap-4 md:flex-row">
                {renderPickSourceButton()}
                <fieldset className="rounded-lg border border-line px-2.5 pb-2.5 md:-mt-3.25">
                  <legend className="mx-auto px-2">
                    <Typography tone="muted" size="sm">
                      Quality
                    </Typography>
                  </legend>
                  <div className="flex flex-wrap gap-1.5">
                    {qualities.map((q) => (
                      <Button
                        key={q}
                        size="sm"
                        variant={quality === q ? 'primary' : 'ghost'}
                        onClick={() => changeQuality(q)}
                      >
                        {q === StreamQuality.Source ? q : `${q}p`}
                      </Button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="rounded-lg border border-line px-2.5 pb-2.5 md:-mt-3.25">
                  <legend className="mx-auto px-2">
                    <Typography tone="muted" size="sm" className="whitespace-nowrap">
                      Frame rate
                    </Typography>
                  </legend>
                  <div className="flex flex-wrap gap-1.5">
                    {STREAM_FPS_OPTIONS.map((f) => {
                      const isDisabled = !isFpsAllowed(f, quality, sourceHeight);

                      return (
                        <Button
                          key={f}
                          size="sm"
                          variant={fps === f ? 'primary' : 'ghost'}
                          disabled={isDisabled}
                          title={isDisabled ? 'Not available for resolutions above 2K' : ''}
                          onClick={() => changeFps(f)}
                        >
                          {f}
                        </Button>
                      );
                    })}
                  </div>
                </fieldset>
                <div className="flex flex-wrap gap-1.5">
                  <span
                    title={
                      isMuteToggleEnabled
                        ? ''
                        : 'Audio is disabled. Enable audio when picking source.'
                    }
                  >
                    <Button
                      variant={!isMuteToggleEnabled || isMuted ? 'ghost' : 'primary'}
                      disabled={!isMuteToggleEnabled}
                      onClick={toggleMute}
                    >
                      {!isMuteToggleEnabled || isMuted ? <VolumeX /> : <Volume2 />}
                    </Button>
                  </span>
                  <span title={isLive ? 'Restart stream to change privacy settings' : ''}>
                    <Button
                      variant={isPrivate ? 'primary' : 'ghost'}
                      size="md"
                      disabled={isLive}
                      onClick={() => setIsPrivate(!isPrivate)}
                    >
                      {isPrivate ? <Lock /> : <LockOpen />}
                    </Button>
                  </span>
                  {isDesktop && (
                    <FollowAppToggle
                      enabled={follow.enabled}
                      disabled={isScreenSource}
                      onChange={(enabled) => void follow.setEnabled(enabled)}
                    />
                  )}
                </div>
              </div>

              {!isLive ? (
                <Button
                  className="w-full md:w-auto"
                  variant="destructive"
                  appearance="solid"
                  disabled={!isPreview}
                  onClick={() => broadcast()}
                >
                  Start stream
                </Button>
              ) : (
                <Button className="w-full md:w-auto" variant="destructive" onClick={stopBroadcast}>
                  Stop stream
                </Button>
              )}
            </div>
            {isDesktop && follow.following && follow.activeName && (
              <Typography size="sm" tone="muted">
                Following: {follow.activeName}
              </Typography>
            )}
            <div className="flex items-center gap-2 border-t border-line pt-3">
              <Typography size="xs" tone="muted" className="whitespace-nowrap">
                Stream link
              </Typography>
              <Input value={constructInviteLink()} readOnly />
              <Button
                size="sm"
                disabled={!isLive}
                onClick={() => handleCopy(constructInviteLink())}
              >
                {isCopied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
