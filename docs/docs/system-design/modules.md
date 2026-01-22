---
description: We use modules to organize vertical slices of the system.
---

# Modules

We use modules as a way of organizing code.
They represent a vertical slice of related concepts in the system.
This makes it easier to make changes because the files you'll need to touch are typically close to each other.

## Principles

- **Module write ownership.** Modules own their data schemas and write access patterns.
  Other modules should not write to database tables that are owned by other modules.
  Instead they should invoke functions from the module that owns the table.
- **Cross-module read tolerance.** Modules can query data owned by other modules.
  This improves read latency without having to build isolated read models owned by individual modules.
  The tradeoff is increased coupling between modules.
- **Cohesion.** Code in a module changes together because it is highly [cohesive](https://tidyfirst.substack.com/p/coupling-and-cohesion).
  This includes the database migrations, user interface, and documentation.
  Putting all of this in the same place makes it easier to find and change everything that is related.

## Organization

Modules are generally organized by kind. The following are several types of things that belong in modules.

:::note[Work in Progress]
Getting all of our modules into this shape is a work in progress.
:::

- **`db`** - Database schema and migrations for tables owned by the module.
- **`model`** - The data models owned by the module.
  - For simple models, can be a set of Typescript types representing the data table.
  - For complex models, can be a full domain model aggregate.
- **`data-access`** - Functions and objects for reading and writing the write model.
  These are typically used in use cases and not directly in the user interface.
  - For simple models, can be a set of functions to read/write data to a table.
  - For complex models, uses the repository pattern to read and write the domain model.
- **`read-models`** - Functions for querying data owned by this module including supporting data from other modules.
  These typically power the user interface, and should not be used in `use-cases`
- **`use-cases`** - Functions for any kind of change to make to the data owned by the module.
- **`ui`** - React components and Next.js pages for rendering the user interface.
  Next.js pages and layouts are imported into the Next.js app folder structure for routing.
- **`actions`** - Next.js server actions for handling data changes from the user interface.
  These are invoked by views in the user interface.
- **`route-handlers`** - Functions for handling traditional API calls.
  These are imported into the Next.js app folder structure for routing.
- **`docs`** - Documentation for systems in this module.
- **`index.ts`** - Contains all functions and types importable by other modules.
  This helps us keep track of the coupling with other modules.
