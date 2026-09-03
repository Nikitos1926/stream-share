'use client';

import { Link } from 'lucide-react';
import { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from '../ui/Button';
import { Typography } from '../ui/Typography';

export function HeaderProfile({ name, image, email, role }: Session['user']) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <div className="relative flex">
        <div
          className="flex cursor-pointer items-center gap-2"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <Image
            src={image || '/default-avatar.png'}
            alt="User Avatar"
            width={32}
            height={32}
            priority
            className="size-8 rounded-full select-none"
          />
          <Typography className="select-none">{name}</Typography>
        </div>
        {isOpen && (
          <div className="absolute top-full left-1/2 mt-3.5 flex -translate-x-1/2 flex-col gap-2 rounded-sm bg-surface p-3 shadow-lg shadow-black">
            {role === 'guest' ? (
              <Button>
                <Link href="/login">Sign up</Link>
              </Button>
            ) : (
              <>
                <Typography tone="muted">{email}</Typography>
                <Button>Settings</Button>
                <Button onClick={() => signOut({ redirectTo: '/' })}>Log out</Button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
