'use client';

import { getLatestRelease } from '@/app/api/github/getLatestRelease';
import { Button, ButtonProps } from '@/app/components/ui/Button';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { cn } from '@/lib/utils/cn.util';
import { Os } from '@/lib/utils/os.util';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type DownloadButtonProps = ButtonProps & {
  os: Os;
  imageWidth?: number;
  imageHeight?: number;
};

export function DownloadButton({
  className,
  os,
  imageWidth = 20,
  imageHeight = 20,
  ...props
}: DownloadButtonProps) {
  const [downloadUrl, setDownloadUrl] = useState<string | undefined>();
  const isDesktop = useIsDesktop();

  const getOsLogoPath = () => {
    switch (os) {
      case Os.Windows:
        return '/windows-logo.svg';
      case Os.Mac:
        return '/apple-logo.svg';
      case Os.Linux:
        return '/linux-logo.svg';
    }
  };

  const osLogoPath = getOsLogoPath();

  useEffect(() => {
    (async () => {
      const urlByOs = await getLatestRelease('Nikitos1926', 'stream-share');
      setDownloadUrl(urlByOs[os]);
    })();
  }, [os]);

  if (!osLogoPath || isDesktop) return;
  return (
    <Button
      className={cn('flex items-center gap-3', className)}
      onClick={() => window.open(downloadUrl, '_blank')}
      {...props}
    >
      Download for
      <Image src={osLogoPath} alt={os} height={imageHeight} width={imageWidth} />
    </Button>
  );
}
