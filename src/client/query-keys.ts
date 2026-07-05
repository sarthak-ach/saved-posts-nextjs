export const queryKeys = {
  courses: (userId: string) => ['courses', { userId }] as const,
  feed: (userId: string, courseId: string, page: number) => ['posts', 'feed', { userId, courseId, page }] as const,
  savedList: (userId: string, page: number) => ['posts', 'saved', { userId, page }] as const,
};
