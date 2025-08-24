#!/bin/bash
# bundle-analysis.sh

echo "📊 Bundle analysis..."
npm run build

# File size measurements
echo "📏 File size comparison..."
du -sh .next/ > cleanup-metrics-after.txt
du -sh node_modules/ >> cleanup-metrics-after.txt
npm list --depth=0 | wc -l >> cleanup-metrics-after.txt

echo "Build size recorded in cleanup-metrics-after.txt"
echo "Contents:"
cat cleanup-metrics-after.txt