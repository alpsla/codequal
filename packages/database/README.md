# CodeQual Database Package

This package provides database access for the CodeQual application.

## Setup

Before using this package, make sure to install the dependencies:

```bash
# From the root directory
npm install

# Or if using yarn
yarn install
```

If you're still seeing issues with the Supabase module, you can install it directly:

```bash
cd packages/database
npm install @supabase/supabase-js
```

## Environment Variables

The database module requires the following environment variables:

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

You can add these to a `.env` file in the root directory.

## Usage

```typescript
import { getSupabase } from '@codequal/database/supabase/client';

// Get Supabase client
const supabase = getSupabase();

// Use Supabase client
const { data, error } = await supabase
  .from('my_table')
  .select()
  .eq('column', 'value');
```

## Troubleshooting

If you encounter issues with dependencies:

1. Make sure all packages are installed (`npm install` or `yarn install` from root)
2. Check that `node_modules` exists in the root directory
3. Verify TypeScript configuration is correct
4. If needed, build the package with `npm run build` or `yarn build`
