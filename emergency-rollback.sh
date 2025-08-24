#!/bin/bash
# emergency-rollback.sh

set -e
echo "🚨 Emergency rollback initiated..."

# 1. Stop any running processes
pkill -f "next" || true

# 2. Restore from git
git checkout main
git branch -D cleanup/comprehensive-optimization-* || true

# 3. Restore from backup
LATEST_BACKUP=$(ls -t cleanup-backup-* | head -1)
echo "Restoring from $LATEST_BACKUP"

# 4. Restore package files
cp "$LATEST_BACKUP/package.json.backup" package.json
cp "$LATEST_BACKUP/package-lock.json.backup" package-lock.json

# 5. Reinstall dependencies
rm -rf node_modules
npm install

# 6. Verify restoration
npm run type-check
npm run build

echo "✅ Emergency rollback completed"