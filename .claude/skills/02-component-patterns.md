# Component Patterns — visualflow_frontend

## Standard Page Component (all 4 states)

```tsx
import { useQuery } from '@tanstack/react-query'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { ErrorState, EmptyState } from '@ui'
import { postService } from '@services/postService'
import type { Post } from '@types/post.types'

export default function Dashboard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['posts', 'dashboard'],
    queryFn: () => postService.getDashboardPosts(),
  })

  if (isLoading) return <DashboardSkeleton />

  if (isError) return (
    <ErrorState
      title="Could not load dashboard"
      message={error instanceof Error ? error.message : 'Something went wrong'}
      onRetry={() => window.location.reload()}
    />
  )

  if (!data || data.length === 0) return (
    <EmptyState
      title="No content yet"
      description="Your first posts will appear here"
      actionLabel="Generate content"
      onAction={() => {/* trigger generation */}}
    />
  )

  return (
    <PageWrapper title="Dashboard">
      {/* real content */}
    </PageWrapper>
  )
}
```

## Reusable Component Template

```tsx
import { cn } from '@utils/cn'

interface MyComponentProps {
  title: string
  variant?: 'default' | 'highlighted'
  className?: string
  children?: React.ReactNode
}

export function MyComponent({ 
  title, 
  variant = 'default',
  className,
  children 
}: MyComponentProps) {
  return (
    <div className={cn(
      'rounded-lg p-4',
      variant === 'highlighted' && 'bg-brand-50 border border-brand-200',
      variant === 'default' && 'bg-surface-0 border border-surface-200',
      className
    )}>
      <h3 className="font-display font-semibold text-base text-zinc-900">
        {title}
      </h3>
      {children}
    </div>
  )
}
```

## useMutation Pattern

```tsx
const { mutate, isPending } = useMutation({
  mutationFn: (data: CreatePostDto) => postService.create(data),
  onSuccess: () => {
    toast.success('Post created')
    queryClient.invalidateQueries({ queryKey: ['posts'] })
  },
  onError: (error) => {
    toast.error(error instanceof Error ? error.message : 'Failed to create post')
  },
})
```

## Zustand Store Access (selector pattern — avoid re-renders)

```tsx
// Good — only re-renders when shopDomain changes
const shopDomain = useShopStore(state => state.shopDomain)

// Bad — re-renders on any store change
const store = useShopStore()
```
