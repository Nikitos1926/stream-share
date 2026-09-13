'use client';

import { getLatestRelease } from '@/app/api/github/getLatestRelease';
import { Button } from '@/app/components/ui/Button';
import { Typography } from '@/app/components/ui/Typography';
import { getOperatingSystem, Os } from '@/lib/utils/os.util';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export function DownloadButton() {
  const [downloadUrl, setDownloadUrl] = useState<string | undefined>();
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
  useEffect(() => {
    (async () => {
      const urlByOs = await getLatestRelease('Nikitos1926', 'stream-share');
      setDownloadUrl(urlByOs[os]);
    })();
  }, [os]);
  if (!osLogoPath) return;

  return (
    <Button
      variant="primary"
      size="lg"
      className="flex items-center gap-3"
      onClick={() => window.open(downloadUrl, '_blank')}
    >
      <Typography>Download for</Typography>
      <Image src={osLogoPath} alt={os} height={20} width={20} />
    </Button>
  );
}
