#!/bin/sh
set -e

echo "Waiting for MySQL to accept connections..."
until python -c "
import pymysql, os, sys
try:
    pymysql.connect(
        host=os.environ.get('MYSQL_HOST', 'mysql'),
        user=os.environ.get('MYSQL_USER', 'leave_user'),
        password=os.environ.get('MYSQL_PASSWORD', 'leave_pass'),
        connect_timeout=3,
    ).close()
except Exception:
    sys.exit(1)
"; do
  sleep 2
done
echo "MySQL is up."

echo "Running Alembic migrations..."
alembic upgrade head

echo "Running idempotent seed..."
python -m seed.seed

echo "Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
