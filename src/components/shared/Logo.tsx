import { cn } from '@utils/cn'

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  textColor?: 'light' | 'dark'
  className?: string
}

const sizeMap = {
  xs: 'w-5 h-5',
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-11 h-11',
  xl: 'w-16 h-16',
}

const textSizeMap = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-2xl',
}

export function Logo({
  size = 'md',
  showText = true,
  textColor = 'dark',
  className,
}: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5 flex-shrink-0', className)}>
      <img
        src="/logo.jpeg"
        alt="VisualFlow AI"
        className={cn(sizeMap[size], 'object-contain flex-shrink-0 rounded-lg')}
      />
      {showText && (
        <span
          className={cn(
            'font-display font-bold tracking-tight',
            textSizeMap[size],
            textColor === 'light' ? 'text-white' : 'text-zinc-900',
          )}
        >
          VisualFlow AI
        </span>
      )}
    </div>
  )
}
