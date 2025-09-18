#!/bin/bash

# Fix imports in all TypeScript files to use local utilities instead of @codequal/core

echo "🔧 Fixing imports from @codequal/core to local utilities..."

# Replace logger imports
find src -name "*.ts" -type f -exec sed -i '' \
  -e "s|from '@codequal/core/utils'|from '../utils'|g" \
  -e "s|from '@codequal/core'|from '../utils'|g" \
  {} \;

# Fix relative paths for logger imports based on depth
find src/researcher -name "*.ts" -type f -exec sed -i '' \
  -e "s|from '@codequal/core/utils'|from '../utils'|g" \
  -e "s|from '@codequal/core/types'|from '../utils/types'|g" \
  {} \;

find src/services -name "*.ts" -type f -exec sed -i '' \
  -e "s|from '@codequal/core/utils'|from '../utils'|g" \
  -e "s|from '@codequal/core'|from '../utils'|g" \
  {} \;

find src/standard -name "*.ts" -type f -exec sed -i '' \
  -e "s|from '@codequal/core/utils'|from '../../utils'|g" \
  -e "s|from '@codequal/core/types'|from '../../utils/types'|g" \
  -e "s|from '@codequal/core'|from '../../utils'|g" \
  {} \;

# Fix agent registry imports
find src -name "*.ts" -type f -exec sed -i '' \
  -e "s|from '@codequal/core/config/agent-registry'|from '../config/agent-registry'|g" \
  {} \;

# Fix model version sync imports
find src -name "*.ts" -type f -exec sed -i '' \
  -e "s|from '@codequal/core/services/model-selection/ModelVersionSync'|from '../utils/model-types'|g" \
  {} \;

# Fix database imports
find src -name "*.ts" -type f -exec sed -i '' \
  -e "s|from '@codequal/database/models/skill'|from '../types/skill-types'|g" \
  -e "s|from '@codequal/database/supabase/client'|from '../infrastructure/supabase/client'|g" \
  {} \;

echo "✅ Import fixes completed"
echo "📊 Summary of changes:"
grep -r "@codequal/core" src --include="*.ts" | wc -l | xargs echo "  Remaining @codequal/core imports:"
grep -r "@codequal/database" src --include="*.ts" | wc -l | xargs echo "  Remaining @codequal/database imports:"