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
        'flex flex-col min-h-full p-2 bg-[#30302E] transition-all duration-300 justify-between',
        isOpen ? 'w-64' : 'w-9',
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between mb-4 h-7">
          <div
            className={cn(
              'text-lg font-bold transition-[width] overflow-hidden duration-150 delay-150',
              isOpen ? 'w-full' : 'w-0 pointer-events-none ',
            )}
          >
            StreamShare
          </div>
          <button className="cursor-pointer relative" onClick={() => setIsOpen(!isOpen)}>
            <span
              className={cn(
                'transition-opacity duration-0 delay-200 ',
                !isOpen ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0',
              )}
            >
              ☰
            </span>
            <span
              className={cn(
                'transition-opacity duration-0 delay-200 absolute top-0 right-0 z-10',
                isOpen ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0',
              )}
            >
              ✕
            </span>
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {sidebarOptions.map((option) => (
            <div key={option.name}>
              <Link className="flex items-center gap-2 h-5" href={option.href}>
                <Image src={option.icon} alt={option.name} width={16} height={16} />
                <div
                  className={cn(
                    'text-sm transition-[width] duration-150 delay-150 overflow-hidden whitespace-nowrap',
                    isOpen ? 'w-full' : 'w-0 pointer-events-none',
                  )}
                >
                  {option.name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 p-3 rounded-lg bg-[#262624]">
        <Image
          src={session?.user?.image || '/default-avatar.png'}
          alt="User Avatar"
          width={24}
          height={24}
          className="rounded-full"
        />
        <div
          className={cn(
            'transition-[width] duration-150 delay-150 overflow-hidden whitespace-nowrap',
            isOpen ? 'w-full' : 'w-0',
          )}
        >
          {session?.user?.name}
        </div>
      </div>
    </nav>
  );
}
