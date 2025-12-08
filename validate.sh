#!/bin/bash

echo "🔍 Validating OneClick Cookies Extension..."
echo ""

# Check if required files exist
echo "📁 Checking required files..."
required_files=(
  "manifest.json"
  "background/service-worker.js"
  "content/detector.js"
  "content/content-script.js"
  "popup/popup.html"
  "popup/popup.css"
  "popup/popup.js"
  "rules/consent-patterns.json"
  "assets/icons/icon16.png"
  "assets/icons/icon32.png"
  "assets/icons/icon48.png"
  "assets/icons/icon128.png"
)

missing_files=0
for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file (MISSING)"
    missing_files=$((missing_files + 1))
  fi
done

echo ""
echo "🔬 Validating JSON files..."

# Validate JSON files
if python3 -m json.tool manifest.json > /dev/null 2>&1; then
  echo "  ✓ manifest.json is valid"
else
  echo "  ✗ manifest.json is invalid"
  exit 1
fi

if python3 -m json.tool rules/consent-patterns.json > /dev/null 2>&1; then
  echo "  ✓ consent-patterns.json is valid"
else
  echo "  ✗ consent-patterns.json is invalid"
  exit 1
fi

echo ""
echo "🔧 Checking JavaScript syntax..."

# Check JavaScript files
js_files=(
  "background/service-worker.js"
  "content/detector.js"
  "content/content-script.js"
  "popup/popup.js"
)

js_errors=0
for file in "${js_files[@]}"; do
  if node --check "$file" 2>/dev/null; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file has syntax errors"
    js_errors=$((js_errors + 1))
  fi
done

echo ""
echo "📊 Summary:"
echo "  Files checked: ${#required_files[@]}"
echo "  Missing files: $missing_files"
echo "  JavaScript errors: $js_errors"

if [ $missing_files -eq 0 ] && [ $js_errors -eq 0 ]; then
  echo ""
  echo "✅ Extension is ready to load!"
  echo ""
  echo "Next steps:"
  echo "1. Open chrome://extensions/ (or edge://extensions/)"
  echo "2. Enable 'Developer mode'"
  echo "3. Click 'Load unpacked'"
  echo "4. Select this directory"
  exit 0
else
  echo ""
  echo "❌ Extension has errors that need to be fixed"
  exit 1
fi
