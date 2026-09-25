import { Modal } from '@/app/components/common/Modal';
import { Button } from '@/app/components/ui/Button';
import { Typography } from '@/app/components/ui/Typography';
import { StreamStatus } from '@/lib/hooks/useStreamer';
import { Monitor, AppWindow } from 'lucide-react';
import { useState } from 'react';
import { SourceGrid } from './SourceGrid';
import { useDesktopMediaSources } from '@/lib/hooks/useDesktopMediaSources';
import toast from 'react-hot-toast';
import { Source } from '@/lib/types';

type MediaSourcePickerProps = {
  status: StreamStatus | null;
  selectSource: () => void;
  /** Fired after main accepted the pick, with the full source (used for the follow toggle). */
  onSourcePicked?: (source: Source) => void;
};

export function MediaSourcePicker({
  status,
  selectSource,
  onSourcePicked,
}: MediaSourcePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'apps' | 'screens'>('apps');
  const { sources, isLoading, error, fetchSources, reset } = useDesktopMediaSources();

  const isLive = status === StreamStatus.Live;
  const isPreview = status === StreamStatus.Preview;

  const handleOpen = () => {
    setIsOpen(true);
    fetchSources();
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) reset();
  };

  const handleSelectSourceClick = async (sourceId: string) => {
    try {
      await window.conveyor?.stream.pickSource(sourceId);
      const picked = sources?.find((s) => s.id === sourceId);
      if (picked) onSourcePicked?.(picked);
      selectSource();
      setIsOpen(false);
      reset();
    } catch (e) {
      console.log(e);
      toast.error('Cannot select this source. Try again');
    }
  };

  const modalTitle = (
    <div className="grid grid-cols-2 items-center gap-4">
      <Button
        variant={activeTab === 'apps' ? 'primary' : 'ghost'}
        onClick={() => setActiveTab('apps')}
      >
        <AppWindow />
        <Typography>Applications</Typography>
      </Button>
      <Button
        variant={activeTab === 'screens' ? 'primary' : 'ghost'}
        onClick={() => setActiveTab('screens')}
      >
        <Monitor />
        <Typography>Entire Screen</Typography>
      </Button>
    </div>
  );

  return (
    <>
      <Button
        className="w-full md:w-auto"
        variant={isLive || isPreview ? 'primary' : 'secondary'}
        onClick={handleOpen}
      >
        <Monitor />
        <Typography>{isLive || isPreview ? 'Change source' : 'Pick source'}</Typography>
      </Button>
      <Modal
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        title={modalTitle}
        className="max-w-[60vw] min-w-160"
      >
        {error && <Typography className="text-danger">Failed to load sources</Typography>}
        <SourceGrid
          sources={sources}
          isLoading={isLoading}
          activeTab={activeTab}
          onSelect={handleSelectSourceClick}
        />
      </Modal>
    </>
  );
}
