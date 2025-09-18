#!/bin/bash

# Fix Research Imports after moving to two-branch
echo "🔧 Fixing imports after moving research files to two-branch..."

cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

# Fix imports in standard directory files
echo "📝 Updating imports in standard directory..."

# Update factory.ts and factory.d.ts
sed -i '' "s|from '../../researcher/researcher-agent'|from '../../two-branch/researcher/researcher-agent'|g" src/standard/infrastructure/factory.ts
sed -i '' "s|from '../../researcher/researcher-agent'|from '../../two-branch/researcher/researcher-agent'|g" src/standard/infrastructure/factory.d.ts

# Update orchestrator files
sed -i '' "s|from '../../researcher/researcher-agent'|from '../../two-branch/researcher/researcher-agent'|g" src/standard/orchestrator/comparison-orchestrator.ts
sed -i '' "s|from '../../researcher/researcher-agent'|from '../../two-branch/researcher/researcher-agent'|g" src/standard/orchestrator/comparison-orchestrator.d.ts

# Update scripts
sed -i '' "s|from '../../researcher/researcher-agent'|from '../../two-branch/researcher/researcher-agent'|g" src/standard/scripts/run-scheduler.ts

# Update model-researcher imports
sed -i '' "s|from '../services/model-researcher'|from '../../two-branch/research-services/model-researcher'|g" src/standard/scripts/update-with-real-models.ts
sed -i '' "s|from './services/model-researcher-service'|from '../two-branch/research-services/model-researcher-service'|g" src/standard/index.ts
sed -i '' "s|from './services/model-researcher-service'|from '../two-branch/research-services/model-researcher-service'|g" src/standard/index.d.ts
sed -i '' "s|from '../services/model-researcher-service'|from '../../two-branch/research-services/model-researcher-service'|g" src/standard/comparison/report-generator-v8-final.ts
sed -i '' "s|from '../services/model-researcher-service'|from '../../two-branch/research-services/model-researcher-service'|g" src/standard/orchestrator/model-config-resolver.ts
sed -i '' "s|from '../../researcher/researcher-agent'|from '../../two-branch/researcher/researcher-agent'|g" src/standard/services/model-selection-service.ts

# Fix imports in two-branch directory
echo "📝 Updating imports within two-branch..."

# Update trigger-model-research.ts
sed -i '' "s|from '../services/model-researcher-service'|from '../research-services/model-researcher-service'|g" src/two-branch/scripts/trigger-model-research.ts

# Update test file
sed -i '' "s|from '../../standard/services/model-researcher-service'|from '../research-services/model-researcher-service'|g" src/two-branch/__tests__/transition-points.test.ts

# Fix types/research imports
echo "📝 Updating research type imports..."
find src -name "*.ts" -exec grep -l "from.*types/research" {} \; | while read file; do
  sed -i '' "s|from '.*types/research'|from '../../two-branch/types/research'|g" "$file"
done

echo "✅ Import fixes completed!"

# Verify no broken imports remain
echo "🔍 Checking for any remaining broken imports..."
rg "from ['\"]\.\./researcher/|from ['\"]\.\.\/\.\.\/researcher/|from ['\"]\./services/model-researcher" src/ --type ts || echo "✅ No broken imports found"

echo "✅ All research files moved to two-branch successfully!"