# Quick Execution Guide - Cleanup with Safety Net

## IMMEDIATE SETUP (Run First)

```bash
# 1. Create baseline measurements
./create-baseline.sh

# 2. Create timestamped backup
BACKUP_DIR="cleanup-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
tar --exclude=node_modules --exclude=.git -czf "$BACKUP_DIR/full-project-backup.tar.gz" .

# 3. Backup critical files
cp package.json "$BACKUP_DIR/package.json.backup"
cp package-lock.json "$BACKUP_DIR/package-lock.json.backup"
cp baseline-*.txt "$BACKUP_DIR/"
npm list --depth=0 > "$BACKUP_DIR/npm-list-pre-cleanup.txt"

# 4. Create cleanup branch
git add .taskmaster/ memories.json
git commit -m "chore: save task state before cleanup"
git checkout -b "cleanup/comprehensive-optimization-$(date +%Y%m%d)"
git push -u origin "cleanup/comprehensive-optimization-$(date +%Y%m%d)"

echo "✅ Baseline recorded - see baseline-summary.txt"
echo "✅ Backup created in: $BACKUP_DIR"
echo "✅ Cleanup branch created and pushed"
```

## SAFE EXECUTION ORDER

### Phase 1: Build Artifacts (SAFEST)

```bash
echo "🧹 Phase 1: Build Artifacts"
mkdir -p cleanup-phase-1-backup

# Backup files being removed
cp tsconfig.tsbuildinfo cleanup-phase-1-backup/ 2>/dev/null || echo "No tsbuildinfo found"

# Remove build cache
rm -f tsconfig.tsbuildinfo

# Verify everything still works
./cleanup-verification.sh
```

### Phase 2: Unused Dependencies (VALIDATE EACH)

```bash
echo "🧹 Phase 2: Dependencies"
mkdir -p cleanup-phase-2-backup

# Test removing each dependency individually
# Only proceed if each verification passes

# Test @radix-ui/react-dialog
npm uninstall @radix-ui/react-dialog
./cleanup-verification.sh || { npm install @radix-ui/react-dialog; echo "❌ Keeping @radix-ui/react-dialog"; }

# Test @radix-ui/react-select
npm uninstall @radix-ui/react-select
./cleanup-verification.sh || { npm install @radix-ui/react-select; echo "❌ Keeping @radix-ui/react-select"; }

# Test class-variance-authority
npm uninstall class-variance-authority
./cleanup-verification.sh || { npm install class-variance-authority; echo "❌ Keeping class-variance-authority"; }
```

### Phase 3: Code Cleanup (HIGHEST RISK)

```bash
echo "🧹 Phase 3: Code Cleanup"
mkdir -p cleanup-phase-3-backup

# This phase requires manual code review and editing
# Use Claude Code or manual editing to remove:
# - Unused imports
# - Dead code
# - Legacy globalThis.calendars references

# After each file modification:
./cleanup-verification.sh
```

## EMERGENCY COMMANDS

### If Something Breaks:

```bash
# Quick rollback to last working state
git checkout main

# OR restore specific file
./selective-restore.sh cleanup-backup-YYYYMMDD-HHMMSS package.json

# OR full emergency rollback
./emergency-rollback.sh
```

### If Dependencies Break:

```bash
# Restore dependencies only
./dependency-rollback.sh cleanup-backup-YYYYMMDD-HHMMSS
```

## SUCCESS VALIDATION

After each phase:

```bash
# Run verification
./cleanup-verification.sh

# Check bundle size improvement
./bundle-analysis.sh

# Compare with pre-cleanup metrics
echo "=== BEFORE ==="
cat pre-cleanup-*.txt
echo "=== AFTER ==="
cat cleanup-metrics-after.txt
```

## FINAL STEPS (When All Phases Complete)

```bash
# Commit cleanup changes
git add .
git commit -m "chore: comprehensive cleanup - removed unused deps and build artifacts

- Removed unused dependencies: @radix-ui/react-dialog, class-variance-authority
- Cleaned up build artifacts: tsconfig.tsbuildinfo
- All tests pass, build successful
- Bundle size reduced by X MB"

# Create PR
gh pr create --title "Comprehensive Project Cleanup" --body "
## Summary
- Removed unused dependencies and build artifacts
- All tests passing, no functionality broken
- Bundle size optimized

## Changes
- Dependencies: Removed X unused packages
- Build artifacts: Cleaned up cache files
- Code: Removed unused imports and dead code

## Validation
- ✅ All tests pass
- ✅ Build successful
- ✅ API endpoints functional
- ✅ Bundle size reduced
"

echo "🎉 Cleanup complete and PR created!"
```

## ROLLBACK IF PRODUCTION ISSUES

```bash
# Immediate production rollback
git checkout main
npm install
npm run build
# Deploy main branch

# OR restore from backup
./emergency-rollback.sh
```

---

**🛡️ SAFETY FIRST**: Always run `./cleanup-verification.sh` after each change!
