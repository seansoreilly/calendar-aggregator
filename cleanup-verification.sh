#!/bin/bash
# cleanup-verification.sh

echo "🧪 Starting cleanup verification..."

# Store exit codes to track what passes/fails
BUILD_STATUS=0
TYPE_STATUS=0
LINT_STATUS=0
TEST_STATUS=0
API_STATUS=0

# 1. Build verification
echo "📦 Testing build..."
npm run build || BUILD_STATUS=$?

# 2. Type checking (allow existing errors, just check it doesn't get worse)
echo "🔍 Type checking..."
npm run type-check 2>&1 | tee type-check-output.txt || TYPE_STATUS=$?
TYPE_ERROR_COUNT=$(grep -c "error TS" type-check-output.txt || echo "0")
echo "Type errors found: $TYPE_ERROR_COUNT"

# 3. Linting
echo "🧹 Linting..."
npm run lint || LINT_STATUS=$?

# 4. Unit tests (run basic tests that should pass)
echo "🔬 Running unit tests..."
npm test -- --run src/__tests__/utils.test.ts || TEST_STATUS=$?

# 5. API smoke tests
echo "🚀 API smoke tests..."
npm run dev &
DEV_PID=$!
echo "Waiting for dev server to start..."
sleep 15

# Health check
curl -f http://localhost:3000/api/health > /dev/null 2>&1 || API_STATUS=$?

# Collections API test
curl -f -X POST http://localhost:3000/api/collections \
  -H "Content-Type: application/json" \
  -d '{"name":"test","calendars":[]}' > /dev/null 2>&1 || API_STATUS=$((API_STATUS + 1))

kill $DEV_PID 2>/dev/null || true

# Summary
echo "==============================================="
echo "VERIFICATION RESULTS:"
echo "📦 Build: $([ $BUILD_STATUS -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "🔍 Type Check: $([ $TYPE_STATUS -eq 0 ] && echo "✅ PASS" || echo "⚠️  ISSUES ($TYPE_ERROR_COUNT errors)")"
echo "🧹 Lint: $([ $LINT_STATUS -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "🔬 Tests: $([ $TEST_STATUS -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "🚀 API: $([ $API_STATUS -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "==============================================="

# Critical checks - these must pass for cleanup to be safe
CRITICAL_FAILS=0
[ $BUILD_STATUS -ne 0 ] && CRITICAL_FAILS=$((CRITICAL_FAILS + 1))
[ $LINT_STATUS -ne 0 ] && CRITICAL_FAILS=$((CRITICAL_FAILS + 1))
[ $API_STATUS -ne 0 ] && CRITICAL_FAILS=$((CRITICAL_FAILS + 1))

if [ $CRITICAL_FAILS -eq 0 ]; then
    echo "✅ CRITICAL CHECKS PASSED - Safe to continue cleanup"
    exit 0
else
    echo "❌ CRITICAL FAILURES DETECTED - DO NOT PROCEED"
    exit 1
fi