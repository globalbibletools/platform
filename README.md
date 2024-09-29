This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Docker

Both the database and dev server can be run from a docker container using the command:
```bash
docker compose up
```

To reset the database and rebuild from scratch, run:
```bash
docker compose down
docker volume rm platform_db-data
```

## Database

### Set up database

Restore the database schema:
```bash
psql DATABASE_URL db/schema.sql
```

Restore the database seed data:
```bash
pg_restore -Fc --format=custom --dbname=DATABASE_URL db/data.dump
```

Export the latest database schema:
```bash
pg_dump --exclude-table _prisma_migrations DATABASE_URL > db/schema.sql
```

Export the latest database seed data:
```bash
pg_dump -Fc --data-only --exclude-table _prisma_migrations DATABASE_URL > db/data.dump
```

### Migrations

Migrations are stored in `db/migrations` in order. The files are named with a timestamp and a description.
We will run these manually in production as needed.

```bash
psql DATABASE_URL db/migrations/{migration}.sql
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
