#!/bin/bash

echo "shared_preload_libraries = 'pg_cron'" >> /var/lib/postgresql/data/postgresql.conf

# Required to load pg_cron
pg_ctl restart

bash /db/scripts/init_db.sh
