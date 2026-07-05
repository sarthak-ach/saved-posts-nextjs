# Next.js Community Forum — Saved Posts

A complete full-stack discussion forum slice built with a Next.js App Router UI, Hono API Route Handlers, Neon / PostgreSQL integration via Drizzle ORM, and TanStack Query client state.

---

## Tech Stack

- **Language**: TypeScript (strict mode)
- **UI Framework**: React 19 & Next.js (App Router)
- **Styling**: Vanilla CSS (premium custom glassmorphic theme)
- **API Engine**: Hono (nested route handler under Next.js API routes)
- **Database**: PostgreSQL (Neon Serverless / Local Docker Compose)
- **ORM & Migrations**: Drizzle ORM & Drizzle Kit
- **Client State / Cache**: TanStack React Query v5 (supporting optimistic UI updates)
- **Validation**: Zod
- **Testing Suite**: Vitest (pure unit logic & Hono API integration test mocks)

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Database
Create a `.env.local` or `.env` file at the root of the project with your PostgreSQL connection string:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/saved_posts"
```

To run a local PostgreSQL instance using Docker:
```bash
# Start Postgres container in the background
docker compose up -d
```

### 3. Initialize Schema & Seed Data
Push the Drizzle schema to the database and run the mock seeder ( Alice, Bob, Moderator Charlie):
```bash
# Push schema migrations
npm run db:push

# Seed initial courses, users, enrollments, and posts
npm run db:seed
```

### 4. Run the Application
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Tests

Run the test suite (unit tests for bookmark state machine logic, and API route integration tests with mock database environments):
```bash
# Run tests once
npm run test

# Run tests in watch mode
npm run test:watch
```
