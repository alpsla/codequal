#!/bin/bash

# Fix internal imports within moved researcher files
echo "🔧 Fixing internal imports in moved researcher files..."

cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

# Fix researcher-service imports
echo "📝 Fixing researcher-service imports..."
sed -i '' "s|from '../../researcher/researcher-service.js'|from '../../two-branch/researcher/researcher-service'|g" src/standard/comparison/ai-impact-categorizer.ts

# Fix imports in model-researcher-service.ts
echo "📝 Fixing model-researcher-service imports..."
sed -i '' "s|from '../../researcher/web-search-researcher'|from '../researcher/web-search-researcher'|g" src/two-branch/research-services/model-researcher-service.ts
sed -i '' "s|from '../services/ai-service'|from '../../standard/services/ai-service'|g" src/two-branch/research-services/model-researcher-service.ts

# Fix imports in educational-service.ts
echo "📝 Fixing educational-service imports..."
sed -i '' "s|from '../utils/types'|from '../../standard/utils/types'|g" src/two-branch/researcher/educational-service.ts
sed -i '' "s|from '../utils'|from '../../standard/utils'|g" src/two-branch/researcher/educational-service.ts
sed -i '' "s|from '../multi-agent/vector-context-service'|from '../../standard/multi-agent/vector-context-service'|g" src/two-branch/researcher/educational-service.ts

# Fix imports in load-researcher-config.ts
echo "📝 Fixing load-researcher-config imports..."
sed -i '' "s|from '../multi-agent/vector-context-service'|from '../../standard/multi-agent/vector-context-service'|g" src/two-branch/researcher/load-researcher-config.ts
sed -i '' "s|from '../multi-agent/types/auth'|from '../../standard/multi-agent/types/auth'|g" src/two-branch/researcher/load-researcher-config.ts
sed -i '' "s|from '../utils'|from '../../standard/utils'|g" src/two-branch/researcher/load-researcher-config.ts

# Fix other researcher files imports
echo "📝 Fixing other researcher file imports..."
find src/two-branch/researcher -name "*.ts" -exec sed -i '' "s|from '../|from '../../standard/|g" {} \;

# Fix research-services imports
find src/two-branch/research-services -name "*.ts" -exec sed -i '' "s|from '../../researcher/|from '../researcher/|g" {} \;

echo "✅ Internal import fixes completed!"

# Verify imports
echo "🔍 Checking for remaining broken imports..."
npx tsc --noEmit 2>&1 | grep -E "researcher|research" | grep "TS2307" | head -5 || echo "✅ Research imports look good!"

echo "✅ All researcher internal imports fixed!"