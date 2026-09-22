import * as RadixAvatar from '@radix-ui/react-avatar'
import { cn } from '@utils/cn'

export interface AvatarProps {
  src?: string
  alt?: string
  fallback: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function Avatar({ src, alt, fallback, size = 'md', className }: AvatarProps) {
  return (
    <RadixAvatar.Root
      className={cn('relative inline-flex rounded-full shrink-0', sizeClasses[size], className)}
    >
      <RadixAvatar.Image
        src={src}
        alt={alt}
        className="h-full w-full rounded-full object-cover"
      />
      <RadixAvatar.Fallback
        delayMs={300}
        className="flex h-full w-full items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold"
      >
        {getInitials(fallback)}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  )
}

