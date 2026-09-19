'use client';

import { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Typography } from '../ui/Typography';
import { DownloadButton } from '@/app/(main)/components/DownloadButton';
import { Os } from '@/lib/utils/os.util';
import { Link } from '../ui/Link';

export function HeaderProfile({ name, image, email, role, os }: Session['user'] & { os: Os }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <div className="relative flex">
        <div
          className="flex cursor-pointer items-center gap-2"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <Avatar src={image} name={name} size={32} />
          <Typography className="select-none">{name}</Typography>
        </div>
        {isOpen && (
          <div className="absolute top-full right-0 z-10 mt-3.5 flex flex-col gap-2 rounded-sm bg-surface p-3 shadow-lg shadow-black">
            {role === 'guest' ? (
              <Button>
                <Link href="/login">Sign up</Link>
              </Button>
            ) : (
              <>
                <Typography tone="muted">{email}</Typography>
                <DownloadButton imageHeight={16} imageWidth={16} os={os} />
                <Button onClick={() => signOut({ redirectTo: '/' })}>Log out</Button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
