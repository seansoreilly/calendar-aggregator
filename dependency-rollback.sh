#!/bin/bash
# dependency-rollback.sh

BACKUP_DIR="$1"
if [ -z "$BACKUP_DIR" ]; then
  echo "Usage: ./dependency-rollback.sh <backup-dir>"
  exit 1
fi

echo "🔄 Rolling back dependencies..."
cp "$BACKUP_DIR/package.json.backup" package.json
cp "$BACKUP_DIR/package-lock.json.backup" package-lock.json
rm -rf node_modules
npm install
echo "✅ Dependencies restored"