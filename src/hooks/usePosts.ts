import { useQuery } from '@tanstack/react-query';
import { postService } from '../services/postService';
import type { Post } from '../types/post.types';

export function usePosts() {
  return useQuery<Post[], Error>({
    queryKey: ['posts'],
    queryFn: postService.getDashboardPosts,
  });
}

export function usePost(id: string) {
  return useQuery<Post, Error>({
    queryKey: ['post', id],
    queryFn: async () => {
      const response = await postService.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}
