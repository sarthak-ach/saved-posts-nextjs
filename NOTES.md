# Take-Home Notes: Community Forum — Saved Posts

A complete full-stack discussion forum slice built with a Next.js App Router UI, Hono API Route Handlers, Neon / PostgreSQL integration via Drizzle ORM, and TanStack Query client state.

---

## 1. Key Design Decisions

### Schema Shape & History Preservation
* **Reactivation State Machine**: Inside `src/db/schema.ts`, the `saved_posts` table contains a `status` field (`'active' | 'inactive'`).
  * When a user un-saves a post, we do not delete the record; we update its status to `'inactive'` (soft-delete), preserving history.
  * When a user re-saves the post, we reactivate the existing record (upsert status back to `'active'`).
  * Unique DB constraint on `(user_id, post_id)` guarantees database integrity, preventing any duplicate bookmark entries.

### Separation of Concerns (Pure Logic)
* **Pure Business Logic**: All transition decisions (whether to insert, update, and how to adjust counts) are extracted into `transitionBookmark()` in `src/logic/bookmark.ts`.
* **Testing without Databases**: The transition logic is 100% pure and does not query databases directly. This allows us to run extremely fast unit tests in `src/tests/bookmark.test.ts` with zero db mocks.

### Efficient Hydrated Flags (savesCount & hasSaved)
* Instead of running $N+1$ queries for $N$ posts, the `/api/posts` and `/api/saved-posts` endpoints aggregate counts and verify if the user has bookmarked the post using conditional SQL subqueries in a single database roundtrip:
  ```sql
  SELECT
    posts.*,
    COALESCE((SELECT COUNT(*) FROM saved_posts WHERE post_id = posts.id AND status = 'active'), 0) AS savesCount,
    EXISTS(SELECT 1 FROM saved_posts WHERE post_id = posts.id AND user_id = :userId AND status = 'active') AS hasSaved
  FROM posts;
  ```

### Authentication & Authorization
* **Mock Authentication**: Stubbed via HTTP headers (`x-user-id` and `x-user-role`). The UI header includes select dropdowns to switch roles on the fly (Alice, Bob, Moderator Charlie).
* **Strict Authorization Rules**: 
  * `401 Unauthenticated`: Returned if `x-user-id` or `x-user-role` headers are missing.
  * `403 Forbidden`: Returned if a student tries to read posts/save a post in a course they are not enrolled in, or tries to read another user's bookmarks list (enforcing the `OWN` rule).
  * `404 Not Found`: Returned if a user attempts to bookmark/unsave a post that doesn't exist.

### Client State & Optimistic Updates
* **Immediate Feedback**: The bookmark action uses TanStack Query mutations with **optimistic updates** in `src/client/hooks.ts`. When a user bookmarks/un-bookmarks a post:
  1. The client cache immediately toggles the bookmark icon and increments/decrements the count.
  2. The server-side request is fired in the background.
  3. If the request fails, the cache rolls back to its exact previous state.

### Internationalization (i18n)
* Curated catalog for English (`en`) and Spanish (`es`) in `src/i18n/catalog.ts`.
* Pluralization is implemented cleanly using function-based catalog keys, avoiding hardcoded grammar:
  * `saves: (count) => count === 1 ? '1 save' : `${count} saves``

---

## 2. Trade-offs Made
* **Local Postgres Setup**: Since Docker is not running in some local environments, we added a `docker-compose.yml` for local Postgres, but kept tests mocked so they run instantly out of the box with zero external infrastructure required.
* **Pagination Method**: Used standard `limit`/`offset` pagination. For a very large production system with continuous feeds, cursor-based pagination (e.g. using `createdAt` cursor) would be preferred to avoid skipping posts if new items are inserted during scroll.

---

## 3. What I'd Do Next with Another Day
* **E2E Testing**: Add Playwright E2E browser tests to verify optimistic UI rendering, tab transitions, and role authorization.
* **Database Indexes**: Add indices to `saved_posts.updated_at` to speed up pagination sorts on recently saved posts.
* **React Suspense**: Implement skeletons using React Suspense and loading boundaries rather than local loading states.
