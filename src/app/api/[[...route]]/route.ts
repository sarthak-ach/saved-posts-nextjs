import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { eq, and, sql, desc } from 'drizzle-orm';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { transitionBookmark } from '@/logic/bookmark';

type Variables = {
  user: {
    id: string;
    role: 'student' | 'moderator';
  };
};

const app = new Hono<{ Variables: Variables }>().basePath('/api');

// --- Authentication Middleware ---
app.use('*', async (c, next) => {
  const userId = c.req.header('x-user-id');
  const userRole = c.req.header('x-user-role');

  if (!userId || !userRole || (userRole !== 'student' && userRole !== 'moderator')) {
    return c.json({ error: 'Unauthenticated' }, 401);
  }

  c.set('user', {
    id: userId,
    role: userRole as 'student' | 'moderator',
  });

  await next();
});

// Helper to check if a student has access to a course
async function checkCourseAccess(userId: string, userRole: string, courseId: string): Promise<boolean> {
  if (userRole === 'moderator') {
    return true;
  }
  const enrollment = await db
    .select()
    .from(schema.enrollments)
    .where(
      and(
        eq(schema.enrollments.userId, userId),
        eq(schema.enrollments.courseId, courseId)
      )
    )
    .limit(1);

  return enrollment.length > 0;
}

// --- Endpoints ---
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used to export the Hono client type
const routes = app
  // 1. GET /api/courses
  // Returns all courses for a moderator, or only enrolled courses for a student.
  .get('/courses', async (c) => {
    const user = c.get('user');

    try {
      if (user.role === 'moderator') {
        const allCourses = await db.select().from(schema.courses);
        return c.json(allCourses);
      } else {
        const studentCourses = await db
          .select({
            id: schema.courses.id,
            name: schema.courses.name,
          })
          .from(schema.enrollments)
          .innerJoin(schema.courses, eq(schema.enrollments.courseId, schema.courses.id))
          .where(eq(schema.enrollments.userId, user.id));

        return c.json(studentCourses);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  })

  // 2. GET /api/posts
  // Fetches posts for a specific course, paginated, newest first.
  .get('/posts', async (c) => {
    const user = c.get('user');
    const courseId = c.req.query('courseId');
    const pageStr = c.req.query('page') || '1';
    const limitStr = c.req.query('limit') || '10';

    if (!courseId) {
      return c.json({ error: 'courseId query parameter is required' }, 400);
    }

    // Verify enrollment/moderator access
    const hasAccess = await checkCourseAccess(user.id, user.role, courseId);
    if (!hasAccess) {
      return c.json({ error: 'Forbidden: You are not enrolled in this course' }, 403);
    }

    const page = parseInt(pageStr, 10);
    const limit = parseInt(limitStr, 10);

    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      return c.json({ error: 'Invalid pagination parameters' }, 400);
    }

    const offset = (page - 1) * limit;

    try {
      const postsList = await db
        .select({
          id: schema.posts.id,
          courseId: schema.posts.courseId,
          authorId: schema.posts.authorId,
          title: schema.posts.title,
          content: schema.posts.content,
          status: schema.posts.status,
          createdAt: schema.posts.createdAt,
          savesCount: sql<number>`COALESCE((
            SELECT CAST(count(*) AS integer)
            FROM saved_posts
            WHERE saved_posts.post_id = posts.id
              AND saved_posts.status = 'active'
          ), 0)`,
          hasSaved: sql<boolean>`EXISTS (
            SELECT 1
            FROM saved_posts
            WHERE saved_posts.post_id = posts.id
              AND saved_posts.user_id = ${user.id}
              AND saved_posts.status = 'active'
          )`,
        })
        .from(schema.posts)
        .where(
          and(
            eq(schema.posts.courseId, courseId),
            eq(schema.posts.status, 'active')
          )
        )
        .orderBy(desc(schema.posts.createdAt))
        .limit(limit + 1)
        .offset(offset);

      return c.json({
        items: postsList.slice(0, limit),
        hasNextPage: postsList.length > limit,
      });
    } catch (error) {
      console.error('Error fetching posts:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  })

  // 3. POST /api/posts/:id/save
  // Bookmark a post. Idempotent, handles soft-delete reactivation.
  .post('/posts/:id/save', async (c) => {
    const user = c.get('user');
    const postId = c.req.param('id');

    try {
      // 1. Check if post exists and is active
      const postRecord = await db
        .select()
        .from(schema.posts)
        .where(and(eq(schema.posts.id, postId), eq(schema.posts.status, 'active')))
        .limit(1);

      if (postRecord.length === 0) {
        return c.json({ error: 'Post not found' }, 404);
      }

      const post = postRecord[0];

      // 2. Check authorization to see the course post
      const hasAccess = await checkCourseAccess(user.id, user.role, post.courseId);
      if (!hasAccess) {
        return c.json({ error: 'Forbidden: You are not enrolled in this course' }, 403);
      }

      // 3. Get current saved post record if any
      const existingSave = await db
        .select()
        .from(schema.savedPosts)
        .where(
          and(
            eq(schema.savedPosts.userId, user.id),
            eq(schema.savedPosts.postId, postId)
          )
        )
        .limit(1);

      const currentRecord = existingSave.length > 0 ? existingSave[0] : null;

      // 4. Calculate transitions using pure business logic
      const { shouldInsert, shouldUpdate } = transitionBookmark(
        currentRecord,
        'save'
      );

      if (shouldInsert) {
        await db.insert(schema.savedPosts).values({
          userId: user.id,
          postId: postId,
          status: 'active',
          savedAt: new Date(),
          updatedAt: new Date(),
        });
      } else if (shouldUpdate) {
        await db
          .update(schema.savedPosts)
          .set({
            status: 'active',
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.savedPosts.userId, user.id),
              eq(schema.savedPosts.postId, postId)
            )
          );
      }

      // Return the updated hydrated stats for this post
      const updatedStats = await db
        .select({
          savesCount: sql<number>`COALESCE((
            SELECT CAST(count(*) AS integer)
            FROM ${schema.savedPosts}
            WHERE ${schema.savedPosts.postId} = ${postId}
              AND ${schema.savedPosts.status} = 'active'
          ), 0)`,
          hasSaved: sql<boolean>`EXISTS (
            SELECT 1
            FROM ${schema.savedPosts}
            WHERE ${schema.savedPosts.postId} = ${postId}
              AND ${schema.savedPosts.userId} = ${user.id}
              AND ${schema.savedPosts.status} = 'active'
          )`,
        })
        .from(schema.posts)
        .where(eq(schema.posts.id, postId))
        .limit(1);

      return c.json({
        success: true,
        hasSaved: updatedStats[0]?.hasSaved || false,
        savesCount: updatedStats[0]?.savesCount || 0,
      });
    } catch (error) {
      console.error('Error saving post:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  })

  // 4. POST /api/posts/:id/unsave
  // Unbookmark a post. Idempotent, soft delete.
  .post('/posts/:id/unsave', async (c) => {
    const user = c.get('user');
    const postId = c.req.param('id');

    try {
      // 1. Check if post exists and is active
      const postRecord = await db
        .select()
        .from(schema.posts)
        .where(and(eq(schema.posts.id, postId), eq(schema.posts.status, 'active')))
        .limit(1);

      if (postRecord.length === 0) {
        return c.json({ error: 'Post not found' }, 404);
      }

      const post = postRecord[0];

      // 2. Check authorization
      const hasAccess = await checkCourseAccess(user.id, user.role, post.courseId);
      if (!hasAccess) {
        return c.json({ error: 'Forbidden: You are not enrolled in this course' }, 403);
      }

      // 3. Get existing save record
      const existingSave = await db
        .select()
        .from(schema.savedPosts)
        .where(
          and(
            eq(schema.savedPosts.userId, user.id),
            eq(schema.savedPosts.postId, postId)
          )
        )
        .limit(1);

      const currentRecord = existingSave.length > 0 ? existingSave[0] : null;

      const { shouldUpdate } = transitionBookmark(
        currentRecord,
        'unsave'
      );

      if (shouldUpdate) {
        await db
          .update(schema.savedPosts)
          .set({
            status: 'inactive',
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.savedPosts.userId, user.id),
              eq(schema.savedPosts.postId, postId)
            )
          );
      }

      // Return the updated hydrated stats for this post
      const updatedStats = await db
        .select({
          savesCount: sql<number>`COALESCE((
            SELECT CAST(count(*) AS integer)
            FROM ${schema.savedPosts}
            WHERE ${schema.savedPosts.postId} = ${postId}
              AND ${schema.savedPosts.status} = 'active'
          ), 0)`,
          hasSaved: sql<boolean>`EXISTS (
            SELECT 1
            FROM ${schema.savedPosts}
            WHERE ${schema.savedPosts.postId} = ${postId}
              AND ${schema.savedPosts.userId} = ${user.id}
              AND ${schema.savedPosts.status} = 'active'
          )`,
        })
        .from(schema.posts)
        .where(eq(schema.posts.id, postId))
        .limit(1);

      return c.json({
        success: true,
        hasSaved: updatedStats[0]?.hasSaved || false,
        savesCount: updatedStats[0]?.savesCount || 0,
      });
    } catch (error) {
      console.error('Error unsaving post:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  })

  // 5. GET /api/saved-posts
  // Fetches the requesting user's active saved posts, sorted by most-recently-saved first.
  .get('/saved-posts', async (c) => {
    const user = c.get('user');
    const pageStr = c.req.query('page') || '1';
    const limitStr = c.req.query('limit') || '10';

    const page = parseInt(pageStr, 10);
    const limit = parseInt(limitStr, 10);

    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      return c.json({ error: 'Invalid pagination parameters' }, 400);
    }

    const offset = (page - 1) * limit;

    try {
      const savedList = await db
        .select({
          id: schema.posts.id,
          courseId: schema.posts.courseId,
          authorId: schema.posts.authorId,
          title: schema.posts.title,
          content: schema.posts.content,
          status: schema.posts.status,
          createdAt: schema.posts.createdAt,
          hasSaved: sql<boolean>`true`, // By definition since it's the saved list
          savesCount: sql<number>`COALESCE((
            SELECT CAST(count(*) AS integer)
            FROM saved_posts
            WHERE saved_posts.post_id = posts.id
              AND saved_posts.status = 'active'
          ), 0)`,
        })
        .from(schema.savedPosts)
        .innerJoin(schema.posts, eq(schema.savedPosts.postId, schema.posts.id))
        .where(
          and(
            eq(schema.savedPosts.userId, user.id),
            eq(schema.savedPosts.status, 'active'),
            eq(schema.posts.status, 'active') // Only fetch active posts
          )
        )
        .orderBy(desc(schema.savedPosts.updatedAt))
        .limit(limit + 1)
        .offset(offset);

      return c.json({
        items: savedList.slice(0, limit),
        hasNextPage: savedList.length > limit,
      });
    } catch (error) {
      console.error('Error fetching saved posts:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  })

  // 6. DELETE /api/posts/:id
  // Moderator action to soft delete a post
  .delete('/posts/:id', async (c) => {
    const user = c.get('user');
    const postId = c.req.param('id');

    if (user.role !== 'moderator') {
      return c.json({ error: 'Forbidden: Only moderators can remove posts' }, 403);
    }

    try {
      const postRecord = await db
        .select()
        .from(schema.posts)
        .where(and(eq(schema.posts.id, postId), eq(schema.posts.status, 'active')))
        .limit(1);

      if (postRecord.length === 0) {
        return c.json({ error: 'Post not found' }, 404);
      }

      await db
        .update(schema.posts)
        .set({ status: 'deleted' })
        .where(eq(schema.posts.id, postId));

      return c.json({ success: true });
    } catch (error) {
      console.error('Error deleting post:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  });

export const GET = handle(app);
export const POST = handle(app);
export const DELETE = handle(app);

export type AppType = typeof routes;
