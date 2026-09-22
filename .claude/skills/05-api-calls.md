# API Integration Patterns — visualflow_frontend

## api.ts — How It Works

Axios instance with automatic Shopify session token attachment.
Token getter registered by AppBridgeProvider at startup.
Every request gets a FRESH token (they expire in 60s).

## Service File Template

```ts
// src/services/postService.ts
import { api } from './api'
import type { Post, CreatePostDto } from '@types/post.types'
import type { PaginatedResponse } from '@types/api.types'

export const postService = {
  getAll: (params?: { page?: number; status?: string }) =>
    api.get<PaginatedResponse<Post>>('/api/posts', { params }),

  getById: (id: string) =>
    api.get<Post>(`/api/posts/${id}`),

  create: (data: CreatePostDto) =>
    api.post<Post>('/api/posts', data),

  approve: (id: string) =>
    api.patch<Post>(`/api/posts/${id}/approve`),

  skip: (id: string) =>
    api.patch<Post>(`/api/posts/${id}/skip`),

  delete: (id: string) =>
    api.delete<void>(`/api/posts/${id}`),
}
```

## Query Key Convention

```ts
// Always use arrays. Include filters.
['posts']                              // all posts
['posts', { status: 'pending' }]      // filtered
['posts', postId]                     // single item
['products', { page: 1, limit: 20 }] // paginated
['shop', 'status']                    // shop status
```

## Paginated Query

```tsx
const [page, setPage] = useState(1)

const { data, isLoading } = useQuery({
  queryKey: ['posts', { page, status }],
  queryFn: () => postService.getAll({ page, status }),
  placeholderData: keepPreviousData, // keeps old data while loading next page
})
```

## Optimistic Update (for approve/skip)

```tsx
const queryClient = useQueryClient()

const { mutate: approve } = useMutation({
  mutationFn: (id: string) => postService.approve(id),
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ['posts'] })
    const prev = queryClient.getQueryData(['posts'])
    // optimistically update
    queryClient.setQueryData(['posts'], (old: Post[]) =>
      old.map(p => p.id === id ? { ...p, status: 'approved' } : p)
    )
    return { prev }
  },
  onError: (_err, _id, ctx) => {
    queryClient.setQueryData(['posts'], ctx?.prev)
    toast.error('Failed to approve')
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] })
  },
})
```
