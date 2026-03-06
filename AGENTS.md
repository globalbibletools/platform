# AGENTS.md — Global Bible Tools Platform

Developer and agentic-coding reference for the Next.js 15 monolith at this repository root.

---

## Project Overview

**Global Bible Tools** is a Next.js 15 (App Router) full-stack application for collaborative Bible translation. It uses:

- **React 19**, **TypeScript 5** (strict mode)
- **PostgreSQL** via **Kysely** (type-safe query builder) and `pg`
- **Tailwind CSS 4**, **Headless UI**, **Font Awesome** icons
- **next-intl** for i18n (English + Arabic)
- **Zod** for schema validation
- **Vitest** for testing
- **Pino** for structured logging

---

## Commands

### Lint, Format, and Type-Check

```bash
docker compose exec server npm run lint              # ESLint via next lint
docker compose exec server npm run format            # Prettier --write on all files
docker compose exec server npm run check-types       # tsc --noEmit (type-check only, no emit)
```

### Testing

```bash
docker compose exec server npm run test              # Vitest in watch mode
docker compose exec server npm run test:run          # Vitest single pass (used in CI)

# Run a single test file
docker compose exec server npx vitest run src/modules/translation/actions/updateGloss.test.ts

# Run all tests under a module directory
docker compose exec server npx vitest run src/modules/translation

# Run tests matching a name pattern
docker compose exec server npx vitest run -t "creates a phrase"

# Run with verbose reporter
docker compose exec server npx vitest run --reporter=verbose src/modules/translation/model/Phrase.unit.ts
```

---

## Architecture

The codebase follows **Domain-Driven Design** layering inside `src/modules/`. Each of the 10 modules (`access`, `bible-core`, `dashboard`, `export`, `languages`, `reporting`, `snapshots`, `study`, `translation`, `users`) is structured as:

```
src/modules/<module>/
  actions/        # Next.js Server Actions ("use server") — boundary layer
  use-cases/      # Business logic / application layer
  data-access/    # Repositories — DB reads, domain model mapping
  read-models/    # Query-side read models (Kysely query builders)
  model/          # Domain model classes with domain events
  db/
    schema.ts     # Kysely table interfaces (Generated/Selectable/Insertable)
    migrations/   # SQL migration files
  ui/             # React components specific to this module
  jobs/           # Background job handlers
  test-utils/     # Factories and DB helpers for tests
  __mocks__/      # Vitest module mocks
  index.ts        # Public barrel export
  types.ts        # Shared enums and types within the module
```

**Data flow:** `UI / Server Component` → `Action` → `Use Case` → `Repository / Domain Model`

- Business logic lives in **use cases**.
- DB mapping lives in **repositories**.
- Domain events are emitted by **model classes**.
- Server actions catch errors and call Next.js primitives (`notFound()`, `redirect()`).

Shared cross-cutting code lives in `src/shared/` (errors, feature-flags, i18n, jobs, ulid).

Path aliases: `@/*` → `src/*`, `@/tests/*` → `tests/*`.

---

## Code Style

### Formatting (Prettier)

- **Double quotes**, **semicolons on**, **2-space indent**, **trailing commas (all)**, **80-char print width**.
- `experimentalTernaries: true` — use the "curious ternary" style:
  ```ts
  const result = condition ? consequentValue : alternateValue;
  ```
- Run `npm run format` before committing, or rely on the Husky pre-commit hook (lint-staged runs Prettier on staged files automatically).

### TypeScript

- **`strict: true`** is enabled. No implicit `any`, strict null checks apply everywhere.
- `@typescript-eslint/no-explicit-any` is **turned off** — explicit `any` is acceptable where practical (e.g., server action signatures, query helpers).
- Prefer **`interface`** over `type` for object shapes. Use `type` for unions, intersections, and computed types.
- Use `as const` objects + a type alias (`type Foo = (typeof FooMap)[keyof typeof FooMap]`) for string-valued enumerations used as discriminated unions.
- Use Kysely's `Generated<T>`, `Selectable<T>`, `Insertable<T>` helpers for DB schema types.
- Use `readonly` on class fields and array return types where mutation is unintended.
- `noImplicitOverride: true` is on — always add the `override` keyword when overriding a base class member.

### Naming Conventions

| Kind                        | Convention                                                 | Example                                 |
| --------------------------- | ---------------------------------------------------------- | --------------------------------------- |
| React component files       | `PascalCase.tsx`                                           | `TranslateWord.tsx`                     |
| Other TypeScript files      | `camelCase.ts` or `kebab-case.ts`                          | `updateGloss.ts`, `form-parser.ts`      |
| Test / unit files           | `<name>.test.ts` / `<name>.unit.ts`                        | `updateGloss.test.ts`, `Phrase.unit.ts` |
| Classes                     | `PascalCase`                                               | `Phrase`, `Policy`                      |
| Interfaces                  | `PascalCase`                                               | `UpdateGlossUseCaseRequest`             |
| React components            | `PascalCase` (default export)                              | `TranslateWord`                         |
| Use-case functions          | `camelCase` + `UseCase` suffix                             | `updateGlossUseCase`                    |
| Server action functions     | `camelCase` + `Action` suffix                              | `updateGlossAction`                     |
| DB table interfaces         | `PascalCase` + `Table` suffix                              | `GlossTable`                            |
| Test factory helpers        | `camelCase` + `Factory` suffix                             | `phraseFactory`                         |
| General variables/functions | `camelCase`                                                | `phraseRepository`                      |
| Module-level constants      | `camelCase` (or `UPPER_SNAKE_CASE` for env-derived values) | `EXPIRES_IN`                            |

### Imports

- Use `@/` alias for all imports from `src/`. Use `@/tests/` for test utilities.
- Use relative imports for files internal to a module.
- Group order (no enforced sort, but follow this in practice):
  1. External packages
  2. `@/` path aliases (internal modules)
  3. Relative imports
- Named imports are preferred. Default imports are used for React components and domain model classes.
- Use `export type` for type-only re-exports in barrel files.

### Error Handling

- Custom error classes extend `Error` and carry typed metadata:
  ```ts
  export class NotFoundError extends Error {
    constructor(readonly resource: string) {
      super();
    }
  }
  ```
- **In server actions:** catch `NotFoundError` → call `notFound()`; re-throw unknown errors.
- **Form validation:** use Zod's `.safeParse()`. On failure, log and return early — do not throw.
  ```ts
  const parsed = requestSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    logger.error("request parse error");
    return;
  }
  ```
- **Authorization:** use the `Policy` class; call `notFound()` when unauthorized (security by obscurity — never reveal resource existence to unauthorized users).
- Use cases throw typed errors; actions are responsible for mapping them to Next.js responses.

---

## Testing

### Test Types

| File suffix    | Type        | Description                                                    |
| -------------- | ----------- | -------------------------------------------------------------- |
| `*.unit.ts(x)` | Unit        | Pure functions and domain models — no DB, no external services |
| `*.test.ts(x)` | Integration | Server actions, repositories, use cases — real PostgreSQL      |

### Integration Test Structure

```ts
import "@/tests/vitest/mocks/nextjs";           // Mock Next.js APIs
import { initializeDatabase } from "@/tests/vitest/dbUtils";
import { test, expect } from "vitest";
import { languageFactory } from "@/modules/languages/test-utils/languageFactory";
import { logIn } from "@/tests/vitest/login";

initializeDatabase();  // Drops and recreates DB before each test

test("does something", async () => {
  const { language, members } = await languageFactory.build();
  await logIn(members[0].user_id);

  const formData = new FormData();
  formData.set("field", "value");

  await expect(someAction(formData)).resolves.toEqual(...);
});
```

### Unit Test Structure

```ts
import { describe, test, expect, vi } from "vitest";

vi.mock("@/modules/languages"); // Auto-reset between tests (mockReset: true)

describe("feature", () => {
  test("does something", () => {
    // Arrange, Act, Assert
  });
});
```

### Test Infrastructure

- `tests/vitest/dbSetup.ts` — global setup; runs once to create the PostgreSQL template DB.
- `tests/vitest/dbUtils.ts` — `initializeDatabase()` — provides per-test DB isolation using a fresh copy of the template.
- `tests/vitest/mocks/nextjs.ts` — mocks `next-intl/server`, `next/cache`, and `next/headers`.
- `tests/vitest/matchers.ts` — custom matchers: `toBeUlid()`, `toBeNow()`, `toBeNextjsNotFound()`, `toBeNextjsRedirect(path)`, `toBeDaysIntoFuture(n)`, `toBeToken()`.
- `tests/vitest/login.ts` — `logIn(userId)` helper to set a session cookie.
- `mockReset: true` is set globally — all `vi.fn()` mocks reset automatically between tests.

### Testing Practices

- Use factories to create data in integration tests, and dbUtils to fetch data for assertions.
- Try to assert on the entire object state instead of using arrayContaining or objectContaining
- Test cases are based on a set of inputs and can have multiple assertions for all expected results. Avoid creating separate test cases with the same inputs to isolate assertions.

---

## Additional Notes

- **Next.js directives:** place `"use client"` or `"use server"` at the very top of the file (before imports).
- **`React.cache`** is used for server-side request deduplication (e.g., `fetchSession`).
- **SWR** is used for client-side cache invalidation via `useSWRConfig().mutate`, not for primary data fetching.
- **`forwardRef`** is used on reusable UI components; always set `displayName` on the resulting component.
- **i18n:** use `useTranslations(namespace)` in client components and `getTranslations(namespace)` in server components and actions.
- **Logging:** import from `@/logging` (Pino-based); this import is auto-mocked in all test files.
- **ULIDs** are used as primary keys — generate with the `ulid()` helper from `@/shared/ulid`.
- **Background jobs** live in `src/shared/jobs/` and module `jobs/` directories; the worker entrypoint is `src/shared/jobs/bin/worker.ts`.
