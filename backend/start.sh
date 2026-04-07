#!/bin/sh
echo "Running database migrations..."
if node dist/db/migrate.js 2>&1; then
    echo "Migrations completed successfully"
else
    echo "WARNING: Migrations failed (will retry on next deploy)"
fi

echo "Starting server on port ${PORT:-3001}..."
exec node dist/index.js
