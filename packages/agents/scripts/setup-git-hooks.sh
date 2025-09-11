#!/bin/bash

# Setup Git Hooks for Framework Duplication Prevention
# This script installs Git hooks that prevent committing duplicate framework components

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GIT_HOOKS_DIR="$PROJECT_ROOT/.git/hooks"
SCRIPTS_DIR="$(dirname "$0")"

echo "🛡️  Setting up Framework Protection Git Hooks"
echo "📁 Project root: $PROJECT_ROOT"
echo "🪝 Git hooks directory: $GIT_HOOKS_DIR"

# Ensure git hooks directory exists
if [ ! -d "$GIT_HOOKS_DIR" ]; then
    echo "❌ Error: Git hooks directory not found. Is this a Git repository?"
    exit 1
fi

# Create pre-commit hook
echo "📝 Creating pre-commit hook..."
cat > "$GIT_HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash

# Pre-commit Hook - Framework Duplication Prevention
# This hook validates that no duplicate framework components are being committed

set -e

PROJECT_ROOT="$(git rev-parse --show-toplevel)"
PACKAGES_DIR="$PROJECT_ROOT/packages/agents"

echo "🛡️  Framework Duplication Check - Pre-commit"

# Check if framework configuration exists
if [ ! -f "$PACKAGES_DIR/.codequal-config.yaml" ]; then
    echo "❌ CRITICAL: Framework registry (.codequal-config.yaml) not found!"
    echo "   Duplication prevention disabled - commit blocked"
    exit 1
fi

if [ ! -f "$PACKAGES_DIR/.codequal-manifest.json" ]; then
    echo "❌ CRITICAL: Component manifest (.codequal-manifest.json) not found!"
    echo "   Duplication detection disabled - commit blocked"
    exit 1
fi

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=A)

if [ -z "$STAGED_FILES" ]; then
    echo "✅ No new files staged - validation passed"
    exit 0
fi

echo "🔍 Checking staged files for framework violations..."

# Check for forbidden file patterns
FORBIDDEN_PATTERNS=(
    "*-analyzer-v[0-8].ts"
    "*-framework-v[0-8].ts"
    "analyzer-*.ts"
    "framework-*.ts"
    "v10-*.ts"
    "new-analyzer*.ts"
    "improved-*.ts"
    "enhanced-analyzer*.ts"
    "better-*.ts"
)

VIOLATIONS_FOUND=0

while IFS= read -r file; do
    if [ -z "$file" ]; then
        continue
    fi
    
    filename=$(basename "$file")
    
    # Check against forbidden patterns
    for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
        if [[ "$filename" == $pattern ]]; then
            echo "❌ BLOCKED: Forbidden file pattern - $file"
            echo "   Pattern: $pattern"
            echo "   Use existing V9 framework components only"
            VIOLATIONS_FOUND=1
        fi
    done
    
    # Specific checks for analyzer files
    if [[ "$filename" == *"analyzer"* && "$filename" == *.ts ]]; then
        if [[ "$file" != *"src/two-branch/analyzers/"* ]]; then
            echo "❌ BLOCKED: Analyzer outside authorized location - $file"
            echo "   Analyzers must be in src/two-branch/analyzers/ only"
            VIOLATIONS_FOUND=1
        fi
        
        # Check V9 naming convention
        if [[ "$filename" == v* && "$filename" != v9-* ]]; then
            echo "❌ BLOCKED: Invalid analyzer version - $file"
            echo "   Only V9 analyzer naming allowed (v9-{language}-analyzer.ts)"
            VIOLATIONS_FOUND=1
        fi
    fi
    
    # Check for framework duplicates
    if [[ "$filename" == *"framework"* && "$filename" == *.ts ]]; then
        if [[ "$file" != *"src/two-branch/analyzers/"* ]]; then
            echo "❌ BLOCKED: Framework file outside authorized location - $file"
            echo "   Framework files must be in src/two-branch/analyzers/ only"
            VIOLATIONS_FOUND=1
        fi
        
        if [[ "$filename" != "v9-analyzer-framework.ts" ]]; then
            echo "❌ BLOCKED: Duplicate framework file - $file"
            echo "   Framework already exists: use v9-analyzer-framework.ts"
            VIOLATIONS_FOUND=1
        fi
    fi
    
    # Check for test file duplicates
    if [[ "$filename" == test-v* && "$filename" != test-v9-* ]]; then
        echo "❌ BLOCKED: Invalid test file version - $file"
        echo "   Only V9 test files allowed (test-v9-{description}.ts)"
        VIOLATIONS_FOUND=1
    fi
    
    # Check for deprecated directory structures
    if [[ "$file" == *"/analyzers/"* && "$file" != *"two-branch/analyzers/"* ]]; then
        echo "❌ BLOCKED: Deprecated analyzer location - $file"
        echo "   All analyzers must be in src/two-branch/analyzers/"
        VIOLATIONS_FOUND=1
    fi
    
done <<< "$STAGED_FILES"

# Run TypeScript validation if available
if command -v npx >/dev/null 2>&1; then
    echo "🔍 Running framework validation..."
    cd "$PACKAGES_DIR"
    
    if npx ts-node src/session-validator.ts >/dev/null 2>&1; then
        echo "✅ Framework validation passed"
    else
        echo "❌ Framework validation failed"
        echo "   Run: cd packages/agents && npx ts-node src/session-validator.ts"
        VIOLATIONS_FOUND=1
    fi
fi

if [ $VIOLATIONS_FOUND -eq 1 ]; then
    echo ""
    echo "🚫 COMMIT BLOCKED - Framework duplication detected"
    echo ""
    echo "📖 To resolve:"
    echo "   1. Remove the blocked files listed above"
    echo "   2. Use existing V9 framework components"
    echo "   3. Check V9_FRAMEWORK_ESTABLISHED.md for guidance"
    echo "   4. Run: cd packages/agents && npx ts-node src/session-validator.ts"
    echo ""
    exit 1
fi

echo "✅ Framework duplication check passed"
exit 0
EOF

# Make pre-commit hook executable
chmod +x "$GIT_HOOKS_DIR/pre-commit"
echo "✅ Pre-commit hook installed"

# Create prepare-commit-msg hook
echo "📝 Creating prepare-commit-msg hook..."
cat > "$GIT_HOOKS_DIR/prepare-commit-msg" << 'EOF'
#!/bin/bash

# Prepare-commit-msg Hook - Add framework validation info to commit messages
# This hook adds validation information to commit messages

COMMIT_MSG_FILE="$1"
COMMIT_SOURCE="$2"

# Only modify messages for regular commits (not merges, amends, etc.)
if [ "$COMMIT_SOURCE" = "message" ] || [ "$COMMIT_SOURCE" = "template" ] || [ -z "$COMMIT_SOURCE" ]; then
    
    # Check if any V9 framework files are being committed
    STAGED_V9_FILES=$(git diff --cached --name-only | grep -E "(v9-.*\.ts|test-v9-.*\.ts)" || true)
    
    if [ -n "$STAGED_V9_FILES" ]; then
        echo "" >> "$COMMIT_MSG_FILE"
        echo "Framework: V9 Two-Branch Analyzer" >> "$COMMIT_MSG_FILE"
        echo "Validation: Pre-commit checks passed" >> "$COMMIT_MSG_FILE"
        echo "" >> "$COMMIT_MSG_FILE"
        echo "Modified V9 components:" >> "$COMMIT_MSG_FILE"
        while IFS= read -r file; do
            if [ -n "$file" ]; then
                echo "  - $(basename "$file")" >> "$COMMIT_MSG_FILE"
            fi
        done <<< "$STAGED_V9_FILES"
    fi
fi
EOF

chmod +x "$GIT_HOOKS_DIR/prepare-commit-msg"
echo "✅ Prepare-commit-msg hook installed"

# Create post-commit hook
echo "📝 Creating post-commit hook..."
cat > "$GIT_HOOKS_DIR/post-commit" << 'EOF'
#!/bin/bash

# Post-commit Hook - Log framework modifications
# This hook logs when framework components are modified

PROJECT_ROOT="$(git rev-parse --show-toplevel)"
LOG_FILE="$PROJECT_ROOT/packages/agents/.framework-activity.log"

# Get the commit hash and message
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)

# Check if any V9 framework files were committed
V9_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD | grep -E "(v9-.*\.ts|test-v9-.*\.ts|\.codequal-.*)" || true)

if [ -n "$V9_FILES" ]; then
    echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") - COMMIT: $COMMIT_HASH" >> "$LOG_FILE"
    echo "Message: $(echo "$COMMIT_MSG" | head -n 1)" >> "$LOG_FILE"
    echo "V9 Framework files modified:" >> "$LOG_FILE"
    while IFS= read -r file; do
        if [ -n "$file" ]; then
            echo "  - $file" >> "$LOG_FILE"
        fi
    done <<< "$V9_FILES"
    echo "---" >> "$LOG_FILE"
    
    echo "📋 Framework activity logged to .framework-activity.log"
fi
EOF

chmod +x "$GIT_HOOKS_DIR/post-commit"
echo "✅ Post-commit hook installed"

# Create commit-msg hook for additional validation
echo "📝 Creating commit-msg hook..."
cat > "$GIT_HOOKS_DIR/commit-msg" << 'EOF'
#!/bin/bash

# Commit-msg Hook - Validate commit messages for framework changes
# This hook ensures proper documentation of framework modifications

COMMIT_MSG_FILE="$1"
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Check if V9 framework files are being committed
V9_FILES=$(git diff --cached --name-only | grep -E "(v9-.*\.ts|test-v9-.*\.ts|\.codequal-.*)" || true)

if [ -n "$V9_FILES" ]; then
    # Ensure commit message mentions framework when modifying V9 files
    if ! echo "$COMMIT_MSG" | grep -i -E "(v9|framework|analyzer)" >/dev/null; then
        echo "❌ Commit message must mention 'V9', 'framework', or 'analyzer' when modifying V9 components"
        echo ""
        echo "Modified V9 files:"
        while IFS= read -r file; do
            if [ -n "$file" ]; then
                echo "  - $(basename "$file")"
            fi
        done <<< "$V9_FILES"
        echo ""
        echo "Please update your commit message to reflect framework changes."
        exit 1
    fi
    
    # Warn if no reference to specific V9 component
    echo "✅ V9 framework modification detected in commit message"
fi

exit 0
EOF

chmod +x "$GIT_HOOKS_DIR/commit-msg"
echo "✅ Commit-msg hook installed"

echo ""
echo "🎉 Git hooks successfully installed!"
echo ""
echo "📋 Installed hooks:"
echo "   • pre-commit: Blocks duplicate framework components"
echo "   • prepare-commit-msg: Adds validation info to commit messages"
echo "   • post-commit: Logs framework activity"
echo "   • commit-msg: Validates commit messages for framework changes"
echo ""
echo "🛡️  Framework protection is now active for all commits"
echo ""
echo "🧪 Test the installation:"
echo "   1. Try creating a forbidden file (e.g., 'v8-test-analyzer.ts')"
echo "   2. Stage it: git add v8-test-analyzer.ts"
echo "   3. Try to commit: git commit -m 'test'"
echo "   4. The commit should be blocked"
echo ""
EOF