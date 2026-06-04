import { cn } from '../../lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withWordmark?: boolean;
  className?: string;
  variant?: 'default' | 'light' | 'dark';
}

const SIZE_MAP: Record<NonNullable<LogoProps['size']>, { mark: string; text: string; gap: string }> = {
  sm: { mark: 'w-6 h-6', text: 'text-sm', gap: 'gap-2' },
  md: { mark: 'w-8 h-8', text: 'text-base', gap: 'gap-2.5' },
  lg: { mark: 'w-11 h-11', text: 'text-lg', gap: 'gap-3' },
  xl: { mark: 'w-16 h-16', text: 'text-2xl', gap: 'gap-3.5' },
};

export function Logo({ size = 'md', withWordmark = true, className, variant = 'default' }: LogoProps) {
  const s = SIZE_MAP[size];
  const wordmarkColor =
    variant === 'light' ? 'text-white'
      : variant === 'dark' ? 'text-ink'
      : 'text-ink';

  return (
    <div className={cn('flex items-center', s.gap, className)}>
      <div className={cn('relative shrink-0', s.mark)}>
        <img
          src="/viu-logo.png"
          alt="VIU Print"
          className={cn('w-full h-full object-contain', size === 'sm' && 'rounded-md', size !== 'sm' && 'rounded-lg')}
        />
      </div>
      {withWordmark && (
        <div className={cn('font-bold tracking-tight leading-none', wordmarkColor, s.text)}>
          VIU<span className="text-viu-600">.</span>
        </div>
      )}
    </div>
  );
}
