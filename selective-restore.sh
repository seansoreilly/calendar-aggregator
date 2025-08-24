#!/bin/bash
# selective-restore.sh

BACKUP_DIR="$1"
FILE_TO_RESTORE="$2"

if [ -z "$BACKUP_DIR" ] || [ -z "$FILE_TO_RESTORE" ]; then
  echo "Usage: ./selective-restore.sh <backup-dir> <file-path>"
  exit 1
fi

if [ -f "$BACKUP_DIR/$FILE_TO_RESTORE.backup" ]; then
  cp "$BACKUP_DIR/$FILE_TO_RESTORE.backup" "$FILE_TO_RESTORE"
  echo "✅ Restored $FILE_TO_RESTORE"
else
  echo "❌ Backup not found: $BACKUP_DIR/$FILE_TO_RESTORE.backup"
  exit 1
fi