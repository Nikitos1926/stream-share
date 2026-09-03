'use client';

import { Session } from 'next-auth';
import { useSession } from 'next-auth/react';
import { Link } from '../ui/Link';
import { Button } from '../ui/Button';
import { Typography } from '../ui/Typography';
import { HeaderProfile } from './HeaderProfile';
import { Logo } from './Logo';

export function Header(props: { user: Session['user'] | undefined }) {
  const session = useSession();
  const user = session.data?.user || props.user;

  return (
    <header className="flex h-(--header-h) w-full items-center border-b-2 border-b-line bg-canvas">
      <div className="container mx-auto flex h-full items-center justify-between">
        <Link href="/" variant="unstyled" className="flex items-center justify-around gap-2">
          <Logo className="h-8 w-8" />
          <Typography className="font-semibold select-none">stream-share</Typography>
        </Link>
        <div className="flex h-full items-center justify-around gap-6">
          {user ? (
            <>
              {user.role !== 'guest' && (
                <nav className="flex justify-around gap-2">
                  <Button>
                    <Link href="/broadcast" variant="unstyled">
                      Start stream
                    </Link>
                  </Button>
                </nav>
              )}
              <HeaderProfile {...user} />
            </>
          ) : (
            <Button>
              <Link href="/login">Log in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
