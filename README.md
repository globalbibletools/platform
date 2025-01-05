# Global Bible Tools

## Vision

Our goal is to build biblical Hebrew and Greek study tools for the global church. Read more at [globalbibletools.com](https://globalbibletools.com)

## Roadmap

### Current Work

#### Reader's Bible
The first step is to build a platform where volunteers can translate each word of the Bible into the languages of the world.
The result will power a public facing digital Reader's Bible to augment [Hebrew](https://www.youtube.com/@AlephwithBeth) and [Greek](https://www.youtube.com/@AlphawithAngela) video lessons.
This work is in progress and more details can be found in the [GitHub project](https://github.com/orgs/globalbibletools/projects/1/views/1).

### Future Work

#### Study App
Once we have a Reader's Bible in a few languages, we want to make it available through a native app for both Android and iPhone.
As we are able to translate additional resources, we will make them available in the app as well.

#### Additional Resources
We intend to build similar interfaces to translate the following resources for the study app:
* **Lexicons**: Users will be able to learn, in their own language, the breadth of meaning for a Hebrew or Greek word.
* **Grammars**: Users will be able to learn, in their own language, the grammatical structure of Hebrew and Greek in their language.
* **Textual Criticism Notes**: Users will be able to learn, in their own language, about the variants in the manuscript evidence for the Hebrew and Greek scriptures.

## Contributing

We are excited to add new contributors! If you are interested, 
please review our [contributing guidelines](https://github.com/globalbibletools/platform/blob/main/.github/CONTRIBUTING.md) to get started.
and fill out [this form](https://enormous-square-660.notion.site/1468e90207d68038b9e5f22949d40b87?pvs=105).

## Docker

Both the database and dev server can be run from a docker container using the command:
```bash
docker compose up
```

If you have added new node_modules, you need to run:
```bash
docker compose up --build
```

To reset the database and rebuild from scratch, run:
```bash
docker compose down
docker volume rm platform_db-data
docker compose up
```

To get a shell in a container run:
```bash
docker exec -it [platform-db-1|platform-server-1] [bash|sh]
```

## Database

If you are using docker, then you shouldn't need to set up the database.
It will be set up for you when you start the docker image.

### Set up database

When running database commands from the db container, use `/db/` instead of `packages/db/` because the db package is mounted at the root of the container.

Restore the database schema:
```bash
psql DATABASE_URL packages/db/scripts/schema.sql
```

Restore the database seed data and rebuild materialized views:
```bash
pg_restore -Fc --format=custom --dbname=DATABASE_URL packages/db/scripts/data.dump
psql --dbname=DATABASE_URL -f packages/db/scripts/refresh_views.sql
```

Export the latest database schema:
```bash
pg_dump --no-owner --schema-only DATABASE_URL > packages/db/scripts/schema.sql
```

Export the latest database seed data:
```bash
pg_dump -Fc --data-only DATABASE_URL > packages/db/scripts/data.dump
```

### Migrations

Migrations are stored in `db/migrations` in order. The files are named with a timestamp and a description.
We will run these manually in production as needed.

```bash
psql DATABASE_URL -f packages/db/migrations/{migration}.sql
```
