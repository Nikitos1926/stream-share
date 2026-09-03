import { MediaControlsApi, useMediaControls } from '@/lib/hooks/useMediaControls';
import {
  VolumeX,
  Volume1,
  Volume2,
  PictureInPicture,
  PictureInPicture2,
  Expand,
  Shrink,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';

export function VideoControls(props: MediaControlsApi) {
  const { isFullscreen, isPiP, volume, setVolume, toggleFullscreen, toggleMute, togglePiP } = props;

  const renderVolumeIcon = () => {
    if (!volume) return <VolumeX />;
    if (volume < 50) return <Volume1 />;
    return <Volume2 />;
  };

  return (
    <div className="absolute inset-x-0 bottom-0 m-2 flex items-center justify-between">
      <div className="flex gap-2">
        <Button variant="icon" onClick={toggleMute}>
          {renderVolumeIcon()}
        </Button>
        <div className="flex w-37 items-center">
          <Slider value={volume} onChange={(v) => setVolume(v as number)} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="icon" onClick={togglePiP}>
          {!isPiP ? <PictureInPicture /> : <PictureInPicture2 />}
        </Button>
        <Button variant="icon" onClick={toggleFullscreen}>
          {!isFullscreen ? <Expand /> : <Shrink />}
        </Button>
      </div>
    </div>
  );
}
