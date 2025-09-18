#!/bin/bash

# Fix imports in moved scheduler files
echo "🔧 Fixing scheduler imports after move to two-branch..."

cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

# Fix imports in run-scheduler.ts
echo "📝 Fixing run-scheduler.ts imports..."
sed -i '' "s|from '../../infrastructure/|from '../../standard/infrastructure/|g" src/two-branch/scheduler/run-scheduler.ts
sed -i '' "s|from '../../two-branch/researcher/|from '../researcher/|g" src/two-branch/scheduler/run-scheduler.ts
sed -i '' "s|from '../services/model-selection-service'|from '../../standard/services/model-selection-service'|g" src/two-branch/scheduler/run-scheduler.ts
sed -i '' "s|from '../services/scheduler-service'|from './scheduler-service'|g" src/two-branch/scheduler/run-scheduler.ts
sed -i '' "s|from '../../multi-agent/|from '../../standard/multi-agent/|g" src/two-branch/scheduler/run-scheduler.ts

# Fix imports in scheduler-service.ts
echo "📝 Fixing scheduler-service.ts imports..."
sed -i '' "s|from './model-selection-service'|from '../../standard/services/model-selection-service'|g" src/two-branch/scheduler/scheduler-service.ts

# Fix imports in enhanced-scheduler-service.ts
echo "📝 Fixing enhanced-scheduler-service.ts imports..."
sed -i '' "s|from '../|from '../../standard/|g" src/two-branch/scheduler/enhanced-scheduler-service.ts
sed -i '' "s|from './|from '../../standard/services/|g" src/two-branch/scheduler/enhanced-scheduler-service.ts

# Fix imports in model-update-scheduler.ts
echo "📝 Fixing model-update-scheduler.ts imports..."
sed -i '' "s|from './model-researcher-service'|from '../research-services/model-researcher-service'|g" src/two-branch/scheduler/model-update-scheduler.ts
sed -i '' "s|from '../|from '../../standard/|g" src/two-branch/scheduler/model-update-scheduler.ts

echo "✅ Scheduler import fixes completed!"