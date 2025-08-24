# Comprehensive Backup and Rollback Strategy

## Calendar Aggregator Cleanup Process

### 1. BACKUP STRATEGY

#### Pre-Cleanup Backup Creation

```bash
# Create timestamped backup directory
BACKUP_DIR="cleanup-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 1. Full project backup (excluding node_modules)
tar --exclude=node_modules --exclude=.git -czf "$BACKUP_DIR/full-project-backup.tar.gz" .

# 2. Git state backup
git stash push -u -m "pre-cleanup-stash-$(date +%Y%m%d-%H%M%S)"
git log --oneline -10 > "$BACKUP_DIR/git-log-pre-cleanup.txt"
git status --porcelain > "$BACKUP_DIR/git-status-pre-cleanup.txt"

# 3. Package state backup
cp package.json "$BACKUP_DIR/package.json.backup"
cp package-lock.json "$BACKUP_DIR/package-lock.json.backup"
npm list --depth=0 > "$BACKUP_DIR/npm-list-pre-cleanup.txt"

# 4. Critical file inventory
find src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" > "$BACKUP_DIR/source-files-inventory.txt"
find . -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.md" | grep -v node_modules > "$BACKUP_DIR/config-files-inventory.txt"
```

#### Cleanup Branch Creation

```bash
# Create dedicated cleanup branch
git checkout -b cleanup/comprehensive-optimization-$(date +%Y%m%d)
git add .taskmaster/ memories.json
git commit -m "chore: save current task state before cleanup"

# Push branch for remote backup
git push -u origin cleanup/comprehensive-optimization-$(date +%Y%m%d)
```

### 2. INCREMENTAL CLEANUP PLAN

#### Phase 1: File Artifacts & Build Cleanup (SAFEST)

**Target Files:**

- `tsconfig.tsbuildinfo` (TypeScript build cache)
- Duplicate schema files (`schema.sql`, `schema-public.sql`, `schema-enhanced.sql`)
- Legacy migration files if not needed
- Unused favicon sizes in public/

**Commands:**

```bash
# Backup specific files
mkdir -p cleanup-phase-1-backup
cp tsconfig.tsbuildinfo cleanup-phase-1-backup/ 2>/dev/null || true
cp schema*.sql cleanup-phase-1-backup/ 2>/dev/null || true

# Remove build artifacts
rm -f tsconfig.tsbuildinfo
# Handle schema consolidation (manually review first)
```

**Validation:**

```bash
npm run type-check  # Ensure TypeScript still works
npm run build      # Verify build process
```

#### Phase 2: Unused Dependencies (MODERATE RISK)

**Target Dependencies:**

- `@radix-ui/react-dialog` (if unused)
- `@radix-ui/react-select` (if unused)
- `@radix-ui/react-slot` (if unused)
- `class-variance-authority` (if unused)

**Commands:**

```bash
# Create dependency backup
npm list --depth=0 > cleanup-phase-2-backup/npm-before.txt

# Remove unused dependencies (one by one with validation)
npm uninstall @radix-ui/react-dialog
npm run type-check && npm run build  # Validate after each removal
```

**Validation After Each Removal:**

```bash
npm run type-check
npm run build
npm run lint
npm test
```

#### Phase 3: Dead Code Removal (HIGHEST RISK)

**Target Code:**

- Legacy API routes using `globalThis.calendars`
- Unused import statements
- Dead functions and variables
- Legacy components

**Commands:**

```bash
# Create code backup
mkdir -p cleanup-phase-3-backup
# Copy files before modification
```

**Validation:**

```bash
npm run type-check
npm run build
npm run lint
npm test
npm run dev & sleep 5 && curl http://localhost:3000/api/health && kill $!
```

### 3. VERIFICATION SCRIPTS

#### Post-Cleanup Test Script

```bash
#!/bin/bash
# cleanup-verification.sh

set -e
echo "🧪 Starting cleanup verification..."

# 1. Build verification
echo "📦 Testing build..."
npm run build || { echo "❌ Build failed"; exit 1; }

# 2. Type checking
echo "🔍 Type checking..."
npm run type-check || { echo "❌ Type check failed"; exit 1; }

# 3. Linting
echo "🧹 Linting..."
npm run lint || { echo "❌ Lint failed"; exit 1; }

# 4. Unit tests
echo "🔬 Running unit tests..."
npm test || { echo "❌ Tests failed"; exit 1; }

# 5. API smoke tests
echo "🚀 API smoke tests..."
npm run dev &
DEV_PID=$!
sleep 10

# Health check
curl -f http://localhost:3000/api/health || { echo "❌ Health check failed"; kill $DEV_PID; exit 1; }

# Collections API test
curl -f -X POST http://localhost:3000/api/collections \
  -H "Content-Type: application/json" \
  -d '{"name":"test","calendars":[]}' || { echo "❌ Collections API failed"; kill $DEV_PID; exit 1; }

kill $DEV_PID
echo "✅ All verification tests passed!"
```

#### Bundle Analysis Script

```bash
#!/bin/bash
# bundle-analysis.sh

echo "📊 Bundle analysis..."
npm run build
npx @next/bundle-analyzer --help || npm install -g @next/bundle-analyzer
ANALYZE=true npm run build

# File size comparison
echo "📏 File size comparison..."
du -sh .next/ > cleanup-metrics-after.txt
echo "Build size recorded in cleanup-metrics-after.txt"
```

### 4. ROLLBACK PROCEDURES

#### Emergency Rollback (Full Restoration)

```bash
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
```

#### Selective File Restoration

```bash
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
```

#### Dependency Rollback

```bash
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
```

### 5. SUCCESS METRICS

#### Performance Benchmarks

```bash
# Pre-cleanup measurements
npm run build 2>&1 | grep -E "(completed in|size)"
du -sh .next/ > pre-cleanup-bundle-size.txt
du -sh node_modules/ > pre-cleanup-node-modules-size.txt
npm list --depth=0 | wc -l > pre-cleanup-dependency-count.txt
```

#### Post-Cleanup Success Criteria

- ✅ Build time reduction (measured)
- ✅ Bundle size reduction (measured)
- ✅ Dependency count reduction (measured)
- ✅ All tests pass (100%)
- ✅ All API endpoints functional
- ✅ No TypeScript errors
- ✅ No ESLint errors
- ✅ Dev server starts successfully
- ✅ Production build completes
- ✅ Core calendar aggregation works

#### User Acceptance Testing

```bash
# Manual verification checklist:
# 1. Navigate to homepage - renders correctly
# 2. Create new collection - form works
# 3. Add calendar URL - validation works
# 4. Generate calendar feed - iCal output valid
# 5. Access API endpoints - all return expected data
```

### 6. EXECUTION COMMANDS

#### Setup Phase

```bash
# Make all scripts executable
chmod +x cleanup-verification.sh
chmod +x emergency-rollback.sh
chmod +x selective-restore.sh
chmod +x dependency-rollback.sh
chmod +x bundle-analysis.sh

# Create initial backup
BACKUP_DIR="cleanup-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
tar --exclude=node_modules --exclude=.git -czf "$BACKUP_DIR/full-project-backup.tar.gz" .

# Create cleanup branch
git checkout -b "cleanup/comprehensive-optimization-$(date +%Y%m%d)"
```

#### Execute Cleanup (Phase by Phase)

```bash
# Phase 1: File artifacts
echo "Starting Phase 1: File Artifacts"
mkdir -p cleanup-phase-1-backup
# [Execute Phase 1 commands]
./cleanup-verification.sh

# Phase 2: Dependencies
echo "Starting Phase 2: Dependencies"
mkdir -p cleanup-phase-2-backup
# [Execute Phase 2 commands]
./cleanup-verification.sh

# Phase 3: Dead code
echo "Starting Phase 3: Dead Code"
mkdir -p cleanup-phase-3-backup
# [Execute Phase 3 commands]
./cleanup-verification.sh
```

#### Final Validation

```bash
# Complete verification suite
./cleanup-verification.sh
./bundle-analysis.sh

# Compare metrics
echo "=== CLEANUP RESULTS ==="
echo "Before:"
cat pre-cleanup-*.txt
echo "After:"
du -sh .next/
npm list --depth=0 | wc -l
```

### 7. DEPLOYMENT ROLLBACK

If cleanup breaks production:

```bash
# Quick production rollback
git checkout main
npm install
npm run build
# Deploy main branch

# OR restore from specific commit
git checkout <last-working-commit-hash>
npm install
npm run build
# Deploy
```

---

**⚠️ SAFETY REMINDERS:**

- Never skip verification steps
- Always test each phase before proceeding
- Keep backups until production deployment succeeds
- Document any issues encountered for future reference
- Have emergency rollback ready at all times
