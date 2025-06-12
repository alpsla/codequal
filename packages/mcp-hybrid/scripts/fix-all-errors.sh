#!/bin/bash

# Fix all TypeScript errors in direct adapters
echo "🔧 Fixing all TypeScript errors..."

cd "$(dirname "$0")/.." || exit 1

# First, let's see what files have errors
echo "Files with errors:"
FILES=(
  "src/adapters/direct/bundlephobia-direct.ts"
  "src/adapters/direct/sonarjs-direct.ts"
  "src/adapters/direct/license-checker-direct.ts"
  "src/adapters/direct/npm-audit-direct.ts"
  "src/adapters/direct/jscpd-direct.ts"
  "src/adapters/direct/madge-direct.ts"
  "src/adapters/direct/dependency-cruiser-enhanced.ts"
  "src/adapters/direct/role-specific-cruisers.ts"
  "src/adapters/direct/shared-cache.ts"
)

# Fix 1: Update all imports from BaseDirectAdapter to DirectToolAdapter
echo "Fixing base class imports..."
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # Fix the import statement
    sed -i '' "s/import { BaseDirectAdapter }/import { DirectToolAdapter }/g" "$file"
    
    # Fix the class extension
    sed -i '' "s/extends BaseDirectAdapter/extends DirectToolAdapter/g" "$file"
    
    # Fix old interfaces
    sed -i '' "s/AnalysisResult/ToolResult/g" "$file"
    sed -i '' "s/Finding\[\]/ToolFinding[]/g" "$file"
    sed -i '' "s/: Finding/: ToolFinding/g" "$file"
    sed -i '' "s/<Finding>/<ToolFinding>/g" "$file"
    
    echo "Fixed: $file"
  fi
done

# Fix 2: Update the test file imports
echo "Fixing test imports..."
TEST_FILE="src/adapters/direct/__tests__/phase2-real-data.test.ts"
if [ -f "$TEST_FILE" ]; then
  sed -i '' "s/FileData/any/g" "$TEST_FILE"
  echo "Fixed: $TEST_FILE"
fi

# Fix 3: Update index.ts to use correct exports
echo "Fixing index.ts exports..."
cat > src/adapters/direct/index.ts << 'EOF'
/**
 * Index file for all direct tool adapters
 * Exports all available direct (non-MCP) tool implementations
 */

// Existing adapters
export { DirectToolAdapter } from './base-adapter';
export { PrettierDirectAdapter, DependencyCruiserDirectAdapter } from './base-adapter';
export { ESLintDirect } from './eslint-direct';
export { GrafanaDirectAdapter } from './grafana-adapter';

// Phase 2 adapters (Performance & Dependencies)
export { npmOutdatedDirectAdapter, NpmOutdatedDirectAdapter } from './npm-outdated-direct';
export { bundlephobiaDirectAdapter, BundlephobiaDirectAdapter } from './bundlephobia-direct';
export { sonarJSDirectAdapter, SonarJSDirectAdapter } from './sonarjs-direct';

// Export instances for convenience
export { npmOutdatedDirectAdapter } from './npm-outdated-direct';
export { bundlephobiaDirectAdapter } from './bundlephobia-direct';
export { sonarJSDirectAdapter } from './sonarjs-direct';

/**
 * Factory function to create all available direct adapters
 */
export function createAllDirectAdapters() {
  return [
    // Existing working adapters
    new ESLintDirect(),
    new PrettierDirectAdapter(),
    new DependencyCruiserDirectAdapter(),
    new GrafanaDirectAdapter(),
    
    // Phase 2 adapters
    npmOutdatedDirectAdapter,
    bundlephobiaDirectAdapter,
    sonarJSDirectAdapter,
  ];
}

/**
 * Get direct adapter by ID
 */
export function getDirectAdapterById(id: string) {
  const adapters = createAllDirectAdapters();
  return adapters.find(adapter => adapter.id === id);
}

/**
 * Get all direct adapters for a specific role
 */
export function getDirectAdaptersByRole(role: string) {
  const adapters = createAllDirectAdapters();
  return adapters.filter(adapter => {
    const metadata = adapter.getMetadata();
    return metadata.supportedRoles.includes(role as any);
  });
}
EOF

echo "✅ Fixes applied!"
echo ""
echo "Now try building again: npm run build"
