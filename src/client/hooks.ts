import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from './api-client';
import { queryKeys } from './query-keys';
import { useMockAuth } from './auth-context';

export type PostSummary = {
  id: string;
  courseId: string;
  authorId: string;
  title: string;
  content: string;
  status: string;
  createdAt?: string | Date;
  savesCount: number;
  hasSaved: boolean;
};

export type PaginatedPosts = {
  items: PostSummary[];
  hasNextPage: boolean;
};

function updatePostData(
  oldData: unknown,
  updater: (post: PostSummary) => PostSummary | null
) {
  const updateList = (posts: PostSummary[]) => posts.map(updater).filter(Boolean) as PostSummary[];

  if (Array.isArray(oldData)) {
    return updateList(oldData as PostSummary[]);
  }

  if (oldData && typeof oldData === 'object' && 'items' in oldData) {
    const page = oldData as PaginatedPosts;
    return {
      ...page,
      items: updateList(page.items),
    };
  }

  return oldData;
}

export function useCourses() {
  const { currentUser } = useMockAuth();
  return useQuery({
    queryKey: queryKeys.courses(currentUser.id),
    queryFn: async () => {
      const res = await client.api.courses.$get({}, {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
      });
      if (!res.ok) {
        const errorData = await res.json() as { error?: string };
        throw new Error(errorData.error || 'Failed to fetch courses');
      }
      return res.json();
    },
  });
}

export function useFeed(courseId: string, page: number = 1, limit: number = 10) {
  const { currentUser } = useMockAuth();
  return useQuery({
    queryKey: queryKeys.feed(currentUser.id, courseId, page),
    queryFn: async () => {
      const res = await client.api.posts.$get({
        query: { courseId, page: String(page), limit: String(limit) }
      }, {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
      });
      if (!res.ok) {
        const errorData = await res.json() as { error?: string };
        throw new Error(errorData.error || 'Failed to fetch posts');
      }
      return res.json();
    },
    enabled: !!courseId,
  });
}

export function useSavedList(page: number = 1, limit: number = 10) {
  const { currentUser } = useMockAuth();
  return useQuery({
    queryKey: queryKeys.savedList(currentUser.id, page),
    queryFn: async () => {
      const res = await client.api['saved-posts'].$get({
        query: { page: String(page), limit: String(limit) }
      }, {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
      });
      if (!res.ok) {
        const errorData = await res.json() as { error?: string };
        throw new Error(errorData.error || 'Failed to fetch saved posts');
      }
      return res.json();
    },
  });
}

export function useSavePostMutation() {
  const queryClient = useQueryClient();
  const { currentUser } = useMockAuth();

  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await client.api.posts[':id'].save.$post({
        param: { id: postId }
      }, {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
      });
      if (!res.ok) {
        const errorData = await res.json() as { error?: string };
        throw new Error(errorData.error || 'Failed to save post');
      }
      return res.json();
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });

      const previousQueries = queryClient.getQueriesData({ queryKey: ['posts'] });

      queryClient.setQueriesData(
        { queryKey: ['posts'] },
        (oldData) => updatePostData(oldData, (post) => {
          if (post.id !== postId || post.hasSaved) return post;
          return {
            ...post,
            hasSaved: true,
            savesCount: post.savesCount + 1,
          };
        })
      );

      return { previousQueries };
    },
    onError: (err, postId, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, value]) => {
          queryClient.setQueryData(key, value);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function useUnsavePostMutation() {
  const queryClient = useQueryClient();
  const { currentUser } = useMockAuth();

  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await client.api.posts[':id'].unsave.$post({
        param: { id: postId }
      }, {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
      });
      if (!res.ok) {
        const errorData = await res.json() as { error?: string };
        throw new Error(errorData.error || 'Failed to unsave post');
      }
      return res.json();
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });

      const previousQueries = queryClient.getQueriesData({ queryKey: ['posts'] });

      queryClient.setQueriesData(
        { queryKey: ['posts'] },
        (oldData) => updatePostData(oldData, (post) => {
          if (post.id !== postId || !post.hasSaved) return post;
          return {
            ...post,
            hasSaved: false,
            savesCount: Math.max(0, post.savesCount - 1),
          };
        })
      );

      return { previousQueries };
    },
    onError: (err, postId, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, value]) => {
          queryClient.setQueryData(key, value);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function useDeletePostMutation() {
  const queryClient = useQueryClient();
  const { currentUser } = useMockAuth();

  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await client.api.posts[':id'].$delete({
        param: { id: postId }
      }, {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
      });
      if (!res.ok) {
        const errorData = await res.json() as { error?: string };
        throw new Error(errorData.error || 'Failed to delete post');
      }
      return res.json();
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });

      const previousQueries = queryClient.getQueriesData({ queryKey: ['posts'] });

      queryClient.setQueriesData(
        { queryKey: ['posts'] },
        (oldData) => updatePostData(oldData, (post) => post.id === postId ? null : post)
      );

      return { previousQueries };
    },
    onError: (err, postId, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, value]) => {
          queryClient.setQueryData(key, value);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}