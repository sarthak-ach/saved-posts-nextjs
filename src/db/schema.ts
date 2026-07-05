import { pgTable, text, timestamp, serial, primaryKey, unique } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').$type<'student' | 'moderator'>().notNull(),
});

export const courses = pgTable('courses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
});

export const enrollments = pgTable('enrollments', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.userId, table.courseId] })
]);

export const posts = pgTable('posts', {
  id: text('id').primaryKey(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  status: text('status').$type<'active' | 'deleted'>().default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const savedPosts = pgTable('saved_posts', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  status: text('status').$type<'active' | 'inactive'>().default('active').notNull(),
  savedAt: timestamp('saved_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  unique('user_post_unique').on(table.userId, table.postId)
]);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type SavedPost = typeof savedPosts.$inferSelect;
export type NewSavedPost = typeof savedPosts.$inferInsert;
