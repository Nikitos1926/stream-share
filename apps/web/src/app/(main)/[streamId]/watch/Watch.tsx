'use client';

import { getUser } from '@/app/api/users';
import { StreamEnded } from '@/app/components/video/StreamEnded';
import { Button } from '@/app/components/ui/Button';
import { SkeletonBlock } from '@/app/components/common/SkeletonBlock';
import { VideoPlayer } from '@/app/components/video/VideoPlayer';
import { StreamStatus } from '@/lib/hooks/useStreamer';
import { useViewer } from '@/lib/hooks/useViewer';
import { Play } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

const guestUserIdKey = 'guestUserId';
const newGuestIdStub = 'newGuestIdStub';

export function Watch() {
  const { streamId } = useParams<{ streamId: string }>();
  const { videoRef, status, isPlayVisible, playVideo, watch } = useViewer();
  const isVerificationStartedRef = useRef<boolean>(false);
  const session = useSession();
  const sessionUser = session.data?.user;
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (session.status === 'loading') return;
    if (isVerificationStartedRef.current) return;
    isVerificationStartedRef.current = true;
    (async () => {
      const userId = sessionUser?.id || localStorage.getItem(guestUserIdKey);
      if (userId) {
        const { data: user } = await getUser(userId);
        if (sessionUser && user) {
          if (user.role === 'guest') localStorage.setItem(guestUserIdKey, sessionUser.id);
          return setVerifiedUserId(user.id);
        }
        if (!user) localStorage.removeItem(guestUserIdKey);
      }
      const existingGuestId = localStorage.getItem(guestUserIdKey);
      const response = await signIn('guest', { redirect: false, userId: existingGuestId || '' });
      if (!response.ok) return toast.error('Failed to create guest session');
      setVerifiedUserId(existingGuestId || newGuestIdStub);
    })();
  }, [session, sessionUser]);

  useEffect(() => {
    if (verifiedUserId !== newGuestIdStub || !sessionUser) return;
    localStorage.setItem(guestUserIdKey, sessionUser.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVerifiedUserId(sessionUser.id);
  }, [sessionUser, verifiedUserId]);

  useEffect(() => {
    if (status) return;
    if (!verifiedUserId || !sessionUser || verifiedUserId !== sessionUser.id) return;
    watch(streamId);
  }, [sessionUser, status, streamId, verifiedUserId, watch]);

  if (!status) {
    <div className="container h-[calc(100dvh-var(--header-h)-var(--footer-h)-var(--footer-gap))] py-4">
      <SkeletonBlock className="h-full" />
    </div>;
  }

  if (status === StreamStatus.Ended) {
    return <StreamEnded />;
  }

  return (
    <div className="container flex min-h-93.25 flex-col gap-2 py-4 landscape:h-[calc(100dvh-var(--header-h))]">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center rounded-md border-2 border-line bg-surface">
        <div className="relative aspect-video max-h-full max-w-full portrait:h-auto portrait:w-full landscape:h-full landscape:w-auto">
          <VideoPlayer ref={videoRef} />
          {isPlayVisible && (
            <Button
              onClick={playVideo}
              variant="unstyled"
              className="absolute inset-0 flex h-auto items-center justify-center"
            >
              <Play className="h-12 w-12" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
