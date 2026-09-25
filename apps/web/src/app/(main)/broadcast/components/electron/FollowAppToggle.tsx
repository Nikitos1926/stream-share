import { Button } from '@/app/components/ui/Button';
import { ArrowLeftRight } from 'lucide-react';

type FollowAppToggleProps = {
  enabled: boolean;
  /** True while a screen is captured; following only makes sense for windows. */
  disabled: boolean;
  onChange: (enabled: boolean) => void;
};

export function FollowAppToggle({ enabled, disabled, onChange }: FollowAppToggleProps) {
  const title = disabled
    ? 'Follow app: only for application windows'
    : 'Follow app: switch to windows the captured app opens. Fullscreen games should use Borderless mode.';

  return (
    <span title={title}>
      <Button
        variant={enabled && !disabled ? 'primary' : 'ghost'}
        size="md"
        disabled={disabled}
        onClick={() => onChange(!enabled)}
      >
        <ArrowLeftRight />
      </Button>
    </span>
  );
}
