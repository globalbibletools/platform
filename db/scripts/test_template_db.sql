\i db/scripts/init_extensions.sql

DROP DATABASE IF EXISTS test_template;
CREATE DATABASE test_template;

\c test_template
\i db/scripts/schema.sql
