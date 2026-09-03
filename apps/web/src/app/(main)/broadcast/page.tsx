'use client';

import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Typography } from '@/app/components/ui/Typography';
import { StreamControlsSkeleton } from '@/app/components/video/StreamControlsSkeleton';
import { StreamQuality, StreamStatus, useStreamer } from '@/lib/hooks/useStreamer';
import { Lock, LockOpen, Monitor, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

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
    setIsPrivate,
    toggleMute,
    changeQuality,
    pickSource,
    changeSource,
    broadcast,
    stopBroadcast,
    reconnect,
  } = useStreamer();
  const isLive = status === StreamStatus.Live;

  const constructInviteLink = () => {
    return currentStream && isLive
      ? `${window.location.host}/${currentStream.id}/watch`
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

  return (
    <div className="container flex flex-col gap-4 py-4 landscape:h-[calc(100dvh-var(--header-h))]">
      <div className="flex min-h-45 min-w-0 flex-1 flex-col items-center justify-center rounded-md border-2 border-line bg-surface">
        <div className="relative aspect-video max-h-full max-w-full portrait:h-auto portrait:w-full landscape:h-full landscape:w-auto">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full rounded-md bg-black object-contain"
          />
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
                {!isLive ? (
                  <Button className="w-full md:w-auto" onClick={pickSource}>
                    <Monitor />
                    Pick source
                  </Button>
                ) : (
                  <Button className="w-full md:w-auto" variant="secondary" onClick={changeSource}>
                    Change source
                  </Button>
                )}

                <div className="flex flex-col gap-1.5">
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
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <label
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
                  </label>
                  <label title={isLive ? 'Restart stream to change privacy settings' : ''}>
                    <Button
                      variant={isPrivate ? 'primary' : 'ghost'}
                      size="md"
                      disabled={isLive}
                      onClick={() => setIsPrivate(!isPrivate)}
                    >
                      {isPrivate ? <Lock /> : <LockOpen />}
                    </Button>
                  </label>
                </div>
              </div>

              {!isLive ? (
                <Button
                  className="w-full md:w-auto"
                  variant="destructive"
                  appearance="solid"
                  disabled={status !== StreamStatus.Preview}
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
            <div className="flex items-center gap-2 border-t border-line pt-3">
              <Typography size="xs" tone="muted" className="whitespace-nowrap">
                Stream link
              </Typography>
              <Input value={constructInviteLink()} readOnly />
              <Input />
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
