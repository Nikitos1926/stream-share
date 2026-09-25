import { Button } from '@/app/components/ui/Button';
import { Typography } from '@/app/components/ui/Typography';
import { ArrowLeftRight } from 'lucide-react';

type FollowAppToggleProps = {
  enabled: boolean;
  /** True while a screen is captured; following only makes sense for windows. */
  disabled: boolean;
  onChange: (enabled: boolean) => void;
};

export function FollowAppToggle({ enabled, disabled, onChange }: FollowAppToggleProps) {
  const title = disabled
    ? 'Only for application windows'
    : 'Follow the captured app into windows it opens. Fullscreen games should use Borderless mode.';

  return (
    <span title={title}>
      <Button
        variant={enabled && !disabled ? 'primary' : 'ghost'}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
      >
        <ArrowLeftRight />
        <Typography>Follow app</Typography>
      </Button>
    </span>
  );
}
