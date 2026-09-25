import { Button } from '@/app/components/ui/Button';
import { Tooltip } from '@/app/components/ui/Tooltip';
import { ArrowLeftRight } from 'lucide-react';

type FollowAppToggleProps = {
  enabled: boolean;
  disabled: boolean;
  onChange: (enabled: boolean) => void;
};

export function FollowAppToggle({ enabled, disabled, onChange }: FollowAppToggleProps) {
  const content = disabled
    ? 'Follow app: only for application windows'
    : 'Follow app: switch to windows the captured app opens. Fullscreen games should use Borderless mode.';

  return (
    <Tooltip content={content}>
      <Button
        variant={enabled && !disabled ? 'primary' : 'ghost'}
        size="md"
        disabled={disabled}
        onClick={() => onChange(!enabled)}
      >
        <ArrowLeftRight />
      </Button>
    </Tooltip>
  );
}
