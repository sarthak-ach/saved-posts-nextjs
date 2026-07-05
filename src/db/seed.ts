import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL is not set.');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle({ client: sql, schema });

async function seed() {
  console.log('Clearing existing data...');
  await db.delete(schema.savedPosts);
  await db.delete(schema.posts);
  await db.delete(schema.enrollments);
  await db.delete(schema.courses);
  await db.delete(schema.users);

  console.log('Inserting courses...');
  await db.insert(schema.courses).values([
    { id: 'course-1', name: 'Advanced Next.js (Course 1)' },
    { id: 'course-2', name: 'TypeScript Deep Dive (Course 2)' },
    { id: 'course-3', name: 'Database Systems & SQL (Course 3)' },
    { id: 'course-4', name: 'Web Security & Auth (Course 4)' },
  ]);

  console.log('Inserting users...');
  await db.insert(schema.users).values([
    { id: 'alice', name: 'Alice (Student A - Course 1 & 3)', role: 'student' },
    { id: 'bob', name: 'Bob (Student B - Course 1, 2 & 4)', role: 'student' },
    { id: 'charlie', name: 'Charlie (Moderator)', role: 'moderator' },
  ]);

  console.log('Inserting enrollments...');
  await db.insert(schema.enrollments).values([
    { userId: 'alice', courseId: 'course-1' },
    { userId: 'alice', courseId: 'course-3' },
    { userId: 'bob', courseId: 'course-1' },
    { userId: 'bob', courseId: 'course-2' },
    { userId: 'bob', courseId: 'course-4' },
  ]);

  console.log('Inserting posts...');
  await db.insert(schema.posts).values([
    {
      id: 'post-1',
      courseId: 'course-1',
      authorId: 'charlie',
      title: 'Mastering Next.js Server Components',
      content: 'Server Components are a new paradigm in Next.js. They render on the server, reducing bundle sizes and improving loading speed.',
      status: 'active',
      createdAt: new Date(Date.now() - 7 * 3600000), // 7 hours ago
    },
    {
      id: 'post-2',
      courseId: 'course-1',
      authorId: 'charlie',
      title: 'React 19 Server Actions: The Definitive Guide',
      content: 'Server Actions allow you to run server-side code without creating manual API routes. They integrate perfectly with form submissions.',
      status: 'active',
      createdAt: new Date(Date.now() - 6 * 3600000), // 6 hours ago
    },
    {
      id: 'post-3',
      courseId: 'course-2',
      authorId: 'charlie',
      title: 'Understanding TypeScript Utility Types',
      content: 'TypeScript provides several utility types like Pick, Omit, Partial, and Required to facilitate common type transformations.',
      status: 'active',
      createdAt: new Date(Date.now() - 5 * 3600000), // 5 hours ago
    },
    {
      id: 'post-4',
      courseId: 'course-2',
      authorId: 'charlie',
      title: 'TypeScript Strict Mode Best Practices',
      content: 'Enabling strict mode in tsconfig.json helps catch bugs early by enforcing strict null checks and implicit any types.',
      status: 'active',
      createdAt: new Date(Date.now() - 4 * 3600000), // 4 hours ago
    },
    {
      id: 'post-5',
      courseId: 'course-1',
      authorId: 'charlie',
      title: 'Tailwind CSS v4.0 New Features',
      content: 'Tailwind v4.0 includes a brand new high-performance compiler engine, first-class CSS configurations, and native cascade layers support.',
      status: 'active',
      createdAt: new Date(Date.now() - 3 * 3600000), // 3 hours ago
    },
    {
      id: 'post-6',
      courseId: 'course-1',
      authorId: 'charlie',
      title: 'Effective Caching Strategies in Next.js',
      content: 'Next.js provides multiple layers of caching: Request Memoization, Data Cache, Full Route Cache, and Router Cache. Learn how to configure tags and revalidations.',
      status: 'active',
      createdAt: new Date(Date.now() - 2 * 3600000), // 2 hours ago
    },
    {
      id: 'post-7',
      courseId: 'course-1',
      authorId: 'charlie',
      title: 'Understanding React 19 Use Hook',
      content: 'The new use() hook lets you read promises and context in render. It is the only React hook that can be called conditionally or inside loops.',
      status: 'active',
      createdAt: new Date(Date.now() - 1 * 3600000), // 1 hour ago
    },
    {
      id: 'post-8',
      courseId: 'course-2',
      authorId: 'charlie',
      title: 'Advanced TypeScript Mapped Types',
      content: 'Mapped types allow you to create new types based on existing ones by iterating through keys. Combined with template literal types, they are extremely powerful.',
      status: 'active',
      createdAt: new Date(Date.now() - 3 * 3600000), // 3 hours ago
    },
    {
      id: 'post-9',
      courseId: 'course-2',
      authorId: 'charlie',
      title: 'TypeScript Type Guards and Assertions',
      content: 'Type guards allow you to narrow down the type of an object within a conditional block using operators like typeof, instanceof, or custom type predicates.',
      status: 'active',
      createdAt: new Date(Date.now() - 2 * 3600000), // 2 hours ago
    },
    {
      id: 'post-10',
      courseId: 'course-2',
      authorId: 'charlie',
      title: 'Configuring TS Path Aliases in Monorepos',
      content: 'Clean up deep relative imports like ../../../utils by configuring custom path mapping aliases inside your tsconfig.json and bundler configs.',
      status: 'active',
      createdAt: new Date(Date.now() - 1 * 3600000), // 1 hour ago
    },
    {
      id: 'post-11',
      courseId: 'course-1',
      authorId: 'charlie',
      title: 'Next.js Turbopack Speed Benchmarks',
      content: 'Turbopack is a high-performance incremental bundler written in Rust. In larger projects, it starts up to 10x faster than Webpack and handles hot module replacement instantly.',
      status: 'active',
      createdAt: new Date(Date.now() - 8 * 3600000), // 8 hours ago
    },
    {
      id: 'post-12',
      courseId: 'course-1',
      authorId: 'charlie',
      title: 'Debugging Next.js Edge Runtime Errors',
      content: 'The Edge Runtime has access to subset of Node.js APIs. Common pitfalls include using libraries that depend on fs or net modules. Learn how to debug compatibility locally.',
      status: 'active',
      createdAt: new Date(Date.now() - 9 * 3600000), // 9 hours ago
    },
    {
      id: 'post-13',
      courseId: 'course-1',
      authorId: 'charlie',
      title: 'React 19 Server Components vs Client Components',
      content: 'Understand when to add use client at the top of your files. Use client is only needed when using hooks, browser-specific APIs, or event listeners.',
      status: 'active',
      createdAt: new Date(Date.now() - 10 * 3600000), // 10 hours ago
    },
    {
      id: 'post-14',
      courseId: 'course-1',
      authorId: 'charlie',
      title: 'Optimizing Fonts and Images in Next.js',
      content: 'Next.js automatically optimizes images and loads Google fonts locally. Using next/image prevents layout shifts by requiring width and height attributes or fill layout.',
      status: 'active',
      createdAt: new Date(Date.now() - 11 * 3600000), // 11 hours ago
    },
    {
      id: 'post-15',
      courseId: 'course-1',
      authorId: 'charlie',
      title: 'Building Accessible UIs in Course Platforms',
      content: 'Always provide alt text for imagery, ensure correct heading hierarchies, and use semantic HTML buttons and anchors so screen readers can navigate effectively.',
      status: 'active',
      createdAt: new Date(Date.now() - 12 * 3600000), // 12 hours ago
    },
    {
      id: 'post-16',
      courseId: 'course-2',
      authorId: 'charlie',
      title: 'TypeScript 5.x Const Type Parameters',
      content: 'By adding const to a generic type parameter, TypeScript will infer the most specific readonly literal types for object arguments without requiring as const cast.',
      status: 'active',
      createdAt: new Date(Date.now() - 4 * 3600000), // 4 hours ago
    },
    {
      id: 'post-17',
      courseId: 'course-2',
      authorId: 'charlie',
      title: 'Writing Custom ESLint Rules for TypeScript',
      content: 'Leverage AST (Abstract Syntax Tree) parsing using TypeScript ESLint to forbid specific naming conventions or import structures, standardizing your codebase patterns.',
      status: 'active',
      createdAt: new Date(Date.now() - 5 * 3600000), // 5 hours ago
    },
    {
      id: 'post-18',
      courseId: 'course-2',
      authorId: 'charlie',
      title: 'Type-safe Event Handlers in React & TS',
      content: 'Strictly type event handlers like React.ChangeEvent<HTMLSelectElement> or React.FormEvent<HTMLFormElement> to get autocomplete and prevent handler bugs.',
      status: 'active',
      createdAt: new Date(Date.now() - 6 * 3600000), // 6 hours ago
    },
    {
      id: 'post-19',
      courseId: 'course-2',
      authorId: 'charlie',
      title: 'Understanding TypeScript Stage 3 Decorators',
      content: 'ECMAScript stage 3 decorators are natively supported in TypeScript 5.0. They are a clean syntax to wrap, modify, or inspect classes, methods, and accessors.',
      status: 'active',
      createdAt: new Date(Date.now() - 7 * 3600000), // 7 hours ago
    },
    {
      id: 'post-20',
      courseId: 'course-2',
      authorId: 'charlie',
      title: 'TypeScript Compiler Performance Tuning',
      content: 'Improve tsc performance in large projects by enabling skipLibCheck, using incremental compilation, and isolating module exports configurations.',
      status: 'active',
      createdAt: new Date(Date.now() - 8 * 3600000), // 8 hours ago
    },
    {
      id: 'post-21',
      courseId: 'course-3',
      authorId: 'charlie',
      title: 'SQL Joins and Indexes Explained',
      content: 'Learn how to optimize database read query performance using B-Tree indices and understanding query plans of inner, left, and full joins.',
      status: 'active',
      createdAt: new Date(Date.now() - 2 * 3600000), // 2 hours ago
    },
    {
      id: 'post-22',
      courseId: 'course-3',
      authorId: 'charlie',
      title: 'Designing Database Normalization Forms',
      content: 'Deep dive into 1NF, 2NF, 3NF, and BCNF normalization concepts to design schemas that preserve transaction integrity and reduce duplicate row entries.',
      status: 'active',
      createdAt: new Date(Date.now() - 1 * 3600000), // 1 hour ago
    },
    {
      id: 'post-23',
      courseId: 'course-4',
      authorId: 'charlie',
      title: 'Understanding JWT and Session Tokens',
      content: 'Compare stateless JWT tokens with stateful session databases for user authentication. Learn their benefits and trade-offs in web services.',
      status: 'active',
      createdAt: new Date(Date.now() - 2 * 3600000), // 2 hours ago
    },
    {
      id: 'post-24',
      courseId: 'course-4',
      authorId: 'charlie',
      title: 'Preventing CSRF and XSS Vulnerabilities',
      content: 'Secure your web app by setting SameSite cookie options, using Content Security Policy (CSP) headers, and encoding untrusted inputs before injection.',
      status: 'active',
      createdAt: new Date(Date.now() - 1 * 3600000), // 1 hour ago
    },
  ]);

  console.log('Seeding completed successfully!');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
