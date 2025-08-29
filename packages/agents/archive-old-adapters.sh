#!/bin/bash

echo "🗂️  Archiving Old Custom MCP Adapters"
echo "===================================="
echo ""

# Create archive directory with timestamp
ARCHIVE_DIR="/Users/alpinro/Code\ Prjects/codequal/packages/mcp-hybrid/archived-adapters-$(date +%Y%m%d)"
mkdir -p "$ARCHIVE_DIR"

# List of old adapters to archive (not remove completely, for safety)
OLD_ADAPTERS=(
  "bundlephobia-direct.ts"
  "dependency-cruiser-direct.ts"
  "dependency-cruiser-fixed.ts"
  "eslint-direct.ts"
  "grafana-adapter.ts"
  "license-checker-direct.ts"
  "madge-direct.ts"
  "npm-audit-direct.ts"
  "npm-outdated-direct.ts"
  "prettier-direct.ts"
  "sonarjs-direct.ts"
)

echo "📦 Archiving the following old adapters:"
for adapter in "${OLD_ADAPTERS[@]}"; do
  echo "   - $adapter"
done
echo ""

# Archive each adapter
SOURCE_DIR="/Users/alpinro/Code Prjects/codequal/packages/mcp-hybrid/src/adapters/direct"
for adapter in "${OLD_ADAPTERS[@]}"; do
  if [ -f "$SOURCE_DIR/$adapter" ]; then
    cp "$SOURCE_DIR/$adapter" "$ARCHIVE_DIR/"
    echo "✅ Archived: $adapter"
  else
    echo "⚠️  Not found: $adapter"
  fi
done

echo ""
echo "📝 Creating archive README..."
cat > "$ARCHIVE_DIR/README.md" << EOF
# Archived Custom MCP Adapters
## Date: $(date +"%Y-%m-%d")

These custom adapters have been archived and replaced with secure, official MCP tools:

### Replacements:
- **eslint-direct.ts** → @eslint/mcp (official)
- **madge-direct.ts** → FileScopeMCP
- **dependency-cruiser-direct.ts** → FileScopeMCP
- **npm-audit-direct.ts** → npm-audit-mcp wrapper
- **sonarjs-direct.ts** → @eslint/mcp
- **prettier-direct.ts** → @eslint/mcp
- **bundlephobia-direct.ts** → BrowserTools MCP
- **license-checker-direct.ts** → DevSecOps-MCP
- **grafana-adapter.ts** → K6 MCP (for performance monitoring)

### Why Archived?
- Security vulnerabilities in custom implementations (43% of MCP servers vulnerable)
- Official tools are better maintained and FREE
- Reduced maintenance burden
- Better security with containerization

### Recovery
If needed, these files can be restored from this archive directory.
EOF

echo "✅ Archive README created"
echo ""
echo "🎯 Archive completed at: $ARCHIVE_DIR"
echo ""
echo "⚠️  NOTE: Original files NOT deleted (safety measure)"
echo "   To remove originals after verifying archive:"
echo "   rm $SOURCE_DIR/{bundlephobia,dependency-cruiser,eslint,madge,npm-audit,npm-outdated,prettier,sonarjs}*.ts"