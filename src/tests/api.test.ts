import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@neondatabase/serverless', () => {
  return {
    neon: () => {
      return () => [];
    },
  };
});

const { mockChain, mockData, dbMock } = vi.hoisted(() => {
  const data = { value: [] as unknown[] };
  const chain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => {
      if (resolve) {
        resolve(data.value);
      }
    }),
  };

  const db = {
    select: vi.fn().mockReturnValue(chain),
    insert: vi.fn().mockReturnValue(chain),
    update: vi.fn().mockReturnValue(chain),
    delete: vi.fn().mockReturnValue(chain),
  };

  return { mockChain: chain, mockData: data, dbMock: db };
});

vi.mock('@/db', () => {
  return {
    db: dbMock,
  };
});

import { DELETE, GET, POST } from '../app/api/[[...route]]/route';

describe('Hono API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData.value = [];
    mockChain.then.mockImplementation((resolve) => {
      if (resolve) {
        resolve(mockData.value);
      }
    });
  });

  function queueDbResults(results: unknown[][]) {
    let callCount = 0;
    mockChain.then.mockImplementation((resolve) => {
      const result = results[callCount] ?? [];
      callCount += 1;
      if (resolve) {
        resolve(result);
      }
    });
  }

  async function makeRequest(
    path: string,
    method: 'GET' | 'POST' | 'DELETE',
    headers: Record<string, string> = {}
  ) {
    const req = new Request(`http://localhost${path}`, {
      method,
      headers: new Headers(headers),
    });

    if (method === 'GET') return GET(req);
    if (method === 'POST') return POST(req);
    return DELETE(req);
  }

  const aliceHeaders = {
    'x-user-id': 'alice',
    'x-user-role': 'student',
  };

  const moderatorHeaders = {
    'x-user-id': 'charlie',
    'x-user-role': 'moderator',
  };

  it('should return 401 Unauthenticated when auth headers are missing', async () => {
    const res = await makeRequest('/api/courses', 'GET');

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: 'Unauthenticated' });
  });

  it('should return 403 Forbidden when student is not enrolled in the course', async () => {
    mockData.value = [];

    const res = await makeRequest('/api/posts?courseId=course-2', 'GET', aliceHeaders);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Forbidden');
  });

  it('should return 404 Not Found when post does not exist', async () => {
    queueDbResults([[]]);

    const res = await makeRequest('/api/posts/post-999/save', 'POST', aliceHeaders);

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: 'Post not found' });
  });

  it('should return a paginated posts envelope for an enrolled course', async () => {
    const mockPosts = [
      {
        id: 'post-1',
        title: 'Title 1',
        content: 'Content 1',
        courseId: 'course-1',
        authorId: 'charlie',
        status: 'active',
        savesCount: 0,
        hasSaved: false,
      },
      {
        id: 'post-2',
        title: 'Title 2',
        content: 'Content 2',
        courseId: 'course-1',
        authorId: 'charlie',
        status: 'active',
        savesCount: 4,
        hasSaved: true,
      },
    ];
    queueDbResults([[{ userId: 'alice', courseId: 'course-1' }], mockPosts]);

    const res = await makeRequest('/api/posts?courseId=course-1&page=1&limit=1', 'GET', aliceHeaders);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      items: [mockPosts[0]],
      hasNextPage: true,
    });
  });

  it('should return the saved list for the authenticated user only', async () => {
    const mockSavedPosts = [
      {
        id: 'post-1',
        title: 'Saved 1',
        content: 'Content 1',
        courseId: 'course-1',
        authorId: 'charlie',
        status: 'active',
        savesCount: 1,
        hasSaved: true,
      },
      {
        id: 'post-2',
        title: 'Saved 2',
        content: 'Content 2',
        courseId: 'course-1',
        authorId: 'charlie',
        status: 'active',
        savesCount: 2,
        hasSaved: true,
      },
    ];
    queueDbResults([mockSavedPosts]);

    const res = await makeRequest('/api/saved-posts?page=1&limit=1&userId=bob', 'GET', aliceHeaders);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      items: [mockSavedPosts[0]],
      hasNextPage: true,
    });
  });

  it('should no-op when saving an already active bookmark', async () => {
    queueDbResults([
      [{ id: 'post-1', courseId: 'course-1', status: 'active' }],
      [{ userId: 'alice', courseId: 'course-1' }],
      [{ userId: 'alice', postId: 'post-1', status: 'active' }],
      [{ savesCount: 1, hasSaved: true }],
    ]);

    const res = await makeRequest('/api/posts/post-1/save', 'POST', aliceHeaders);

    expect(res.status).toBe(200);
    expect(dbMock.insert).not.toHaveBeenCalled();
    expect(dbMock.update).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toEqual({
      success: true,
      hasSaved: true,
      savesCount: 1,
    });
  });

  it('should reactivate an inactive saved record instead of inserting a duplicate', async () => {
    queueDbResults([
      [{ id: 'post-1', courseId: 'course-1', status: 'active' }],
      [{ userId: 'alice', courseId: 'course-1' }],
      [{ userId: 'alice', postId: 'post-1', status: 'inactive' }],
      [],
      [{ savesCount: 1, hasSaved: true }],
    ]);

    const res = await makeRequest('/api/posts/post-1/save', 'POST', aliceHeaders);

    expect(res.status).toBe(200);
    expect(dbMock.insert).not.toHaveBeenCalled();
    expect(dbMock.update).toHaveBeenCalledTimes(1);
    expect(mockChain.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
    await expect(res.json()).resolves.toEqual({
      success: true,
      hasSaved: true,
      savesCount: 1,
    });
  });

  it('should soft-delete an active saved record when unsaving', async () => {
    queueDbResults([
      [{ id: 'post-1', courseId: 'course-1', status: 'active' }],
      [{ userId: 'alice', courseId: 'course-1' }],
      [{ userId: 'alice', postId: 'post-1', status: 'active' }],
      [],
      [{ savesCount: 0, hasSaved: false }],
    ]);

    const res = await makeRequest('/api/posts/post-1/unsave', 'POST', aliceHeaders);

    expect(res.status).toBe(200);
    expect(dbMock.update).toHaveBeenCalledTimes(1);
    expect(mockChain.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'inactive' }));
    await expect(res.json()).resolves.toEqual({
      success: true,
      hasSaved: false,
      savesCount: 0,
    });
  });

  it('should forbid non-moderators from deleting posts', async () => {
    const res = await makeRequest('/api/posts/post-1', 'DELETE', aliceHeaders);

    expect(res.status).toBe(403);
    expect(dbMock.update).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.error).toContain('Only moderators');
  });

  it('should allow moderators to soft-delete posts', async () => {
    queueDbResults([
      [{ id: 'post-1', courseId: 'course-1', status: 'active' }],
      [],
    ]);

    const res = await makeRequest('/api/posts/post-1', 'DELETE', moderatorHeaders);

    expect(res.status).toBe(200);
    expect(dbMock.update).toHaveBeenCalledTimes(1);
    expect(mockChain.set).toHaveBeenCalledWith({ status: 'deleted' });
    await expect(res.json()).resolves.toEqual({ success: true });
  });
});