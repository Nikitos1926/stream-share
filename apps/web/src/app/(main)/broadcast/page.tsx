'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/Button';
import { Typography } from '@/app/components/ui/Typography';
import { StreamQuality, StreamStatus, useStreamer } from '@/lib/hooks/useStreamer';

const qualities = Object.values(StreamQuality);

export default function Broadcast() {
  const {
    videoRef,
    status,
    quality,
    changeQuality,
    pickSource,
    changeSource,
    broadcast,
    stopBroadcast,
    activeStream,
    reconnect,
  } = useStreamer();

  // TODO: заменить на isPrivate/setIsPrivate из useStreamer, когда хук будет расширен
  const [isPrivate, setIsPrivate] = useState(false);
  const isLive = status === StreamStatus.Live;

  return (
    <div className="container flex flex-col gap-4 py-4 landscape:h-[calc(100dvh-var(--header-h))]">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center rounded-md border-2 border-line bg-surface">
        <div className="relative aspect-video max-h-full max-w-full portrait:h-auto portrait:w-full landscape:h-full landscape:w-auto">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full bg-black object-contain"
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
        {activeStream ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Typography>You have an unfinished stream</Typography>
            <Button appearance="solid" onClick={reconnect}>
              Reconnect
            </Button>
          </div>
        ) : (
          <>
            <Typography
              className="border-b-2 border-line pb-3 font-semibold tracking-wide uppercase"
              size="sm"
            >
              Control
            </Typography>

            <div className="flex flex-col gap-1.5">
              <Typography size="sm" className="text-stroke-muted">
                Source
              </Typography>
              {!isLive ? (
                <Button onClick={pickSource}>Pick source</Button>
              ) : (
                <Button variant="secondary" onClick={changeSource}>
                  Change source
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Typography size="sm" className="text-stroke-muted">
                Quality
              </Typography>
              <div className="flex flex-wrap gap-1.5">
                {qualities.map((q) => (
                  <Button
                    key={q}
                    variant={quality === q ? 'primary' : 'ghost'}
                    onClick={() => changeQuality(q)}
                  >
                    {q === StreamQuality.Source ? q : `${q}p`}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Typography size="sm" className="text-stroke-muted">
                Visibility
              </Typography>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant={!isPrivate ? 'primary' : 'ghost'}
                  onClick={() => setIsPrivate(false)}
                >
                  Public
                </Button>
                <Button
                  variant={isPrivate ? 'primary' : 'ghost'}
                  onClick={() => setIsPrivate(true)}
                >
                  Private
                </Button>
              </div>
              <Typography size="sm" className="text-stroke-muted">
                {isPrivate
                  ? 'Only people with the link can watch'
                  : 'Anyone can find and watch this stream'}
              </Typography>
            </div>

            <div className="pt-1">
              {!isLive ? (
                <Button
                  className="w-full"
                  disabled={status !== StreamStatus.Preview}
                  onClick={() => broadcast()}
                >
                  Start stream
                </Button>
              ) : (
                <Button className="w-full" variant="destructive" onClick={stopBroadcast}>
                  Stop stream
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
