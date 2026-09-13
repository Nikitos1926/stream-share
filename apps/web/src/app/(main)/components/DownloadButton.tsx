'use client';

import { Button } from '@/app/components/ui/Button';
import { Typography } from '@/app/components/ui/Typography';
import { getOperatingSystem, Os } from '@/lib/utils/os.util';
import Image from 'next/image';

export function DownloadButton() {
  const os = getOperatingSystem();

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
  if (!osLogoPath) return;

  return (
    <Button variant="primary" size="lg" className="flex items-center gap-3">
      <Typography>Download for</Typography>
      <Image src={osLogoPath} alt={os} height={20} width={20} />
    </Button>
  );
}
