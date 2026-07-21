'use client';
import { useSidebar } from '@/app/context/SidebarContext';
import { cn } from '@/lib/utils/cn.util';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';

export function Sidebar() {
  const { data: session } = useSession();
  const { isOpen, setIsOpen } = useSidebar();
  const sidebarOptions = [
    {
      name: 'dashboard',
      icon: '/google.svg',
      href: '/',
    },
    {
      name: 'GoLive',
      icon: '/google.svg',
      href: '/library',
    },
    {
      name: 'Viewers',
      icon: '/google.svg',
      href: '/settings',
    },
    {
      name: 'Analytics',
      icon: '/google.svg',
      href: '/settings',
    },
    {
      name: 'Settings',
      icon: '/google.svg',
      href: '/settings',
    },
  ];
  return (
    <nav
      className={cn(
        'flex min-h-full flex-col justify-between bg-[#30302E] p-2 transition-all duration-300',
        isOpen ? 'w-64' : 'w-9',
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="mb-4 flex h-7 items-center justify-between">
          <div
            className={cn(
              'overflow-hidden text-lg font-bold transition-[width] delay-150 duration-150',
              isOpen ? 'w-full' : 'pointer-events-none w-0',
            )}
          >
            StreamShare
          </div>
          <button className="relative cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
            <span
              className={cn(
                'transition-opacity delay-200 duration-0',
                !isOpen ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0',
              )}
            >
              ☰
            </span>
            <span
              className={cn(
                'absolute top-0 right-0 z-10 transition-opacity delay-200 duration-0',
                isOpen ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0',
              )}
            >
              ✕
            </span>
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {sidebarOptions.map((option) => (
            <div key={option.name}>
              <Link className="flex h-5 items-center gap-2" href={option.href}>
                <Image src={option.icon} alt={option.name} width={16} height={16} />
                <div
                  className={cn(
                    'overflow-hidden text-sm whitespace-nowrap transition-[width] delay-150 duration-150',
                    isOpen ? 'w-full' : 'pointer-events-none w-0',
                  )}
                >
                  {option.name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-[#262624] p-3">
        <Image
          src={session?.user?.image || '/default-avatar.png'}
          alt="User Avatar"
          width={24}
          height={24}
          className="rounded-full"
        />
        <div
          className={cn(
            'overflow-hidden whitespace-nowrap transition-[width] delay-150 duration-150',
            isOpen ? 'w-full' : 'w-0',
          )}
        >
          {session?.user?.name}
        </div>
      </div>
    </nav>
  );
}
