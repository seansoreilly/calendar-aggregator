#!/bin/bash
# create-baseline.sh - Establish baseline metrics before cleanup

echo "📊 Creating baseline measurements..."

# 1. Type check baseline
echo "🔍 Recording TypeScript baseline..."
npm run type-check 2>&1 | tee baseline-type-check.txt || true
BASELINE_TYPE_ERRORS=$(grep -c "error TS" baseline-type-check.txt || echo "0")
echo "Baseline TypeScript errors: $BASELINE_TYPE_ERRORS" | tee baseline-summary.txt

# 2. Build metrics
echo "📦 Recording build metrics..."
npm run build 2>&1 | grep -E "(completed in|size)" >> baseline-summary.txt || true

# 3. Size metrics
echo "📏 Recording size metrics..."
du -sh .next/ >> baseline-summary.txt 2>/dev/null || echo "No .next directory" >> baseline-summary.txt
du -sh node_modules/ >> baseline-summary.txt
npm list --depth=0 | wc -l | xargs echo "Dependencies count:" >> baseline-summary.txt

# 4. Dependency list
echo "📋 Recording dependency list..."
npm list --depth=0 > baseline-dependencies.txt

echo "✅ Baseline established. Summary:"
cat baseline-summary.txt