# Describe Database Table

Show the structure and schema of a specific table.

## Usage

```
/db-describe users
/db-describe analysis_results
/db-describe auth.users
```

## Instructions

When this skill is invoked:

1. **Parse the table name**:
   - If includes dot (e.g., `auth.users`): split into schema.table
   - If no dot: assume `public` schema

2. **Execute schema query** using postgres MCP tool:
   ```sql
   SELECT
     column_name,
     data_type,
     is_nullable,
     column_default,
     character_maximum_length
   FROM information_schema.columns
   WHERE table_schema = 'SCHEMA' AND table_name = 'TABLE'
   ORDER BY ordinal_position;
   ```

3. **Also fetch constraints**:
   ```sql
   SELECT
     tc.constraint_name,
     tc.constraint_type,
     kcu.column_name
   FROM information_schema.table_constraints tc
   JOIN information_schema.key_column_usage kcu
     ON tc.constraint_name = kcu.constraint_name
   WHERE tc.table_schema = 'SCHEMA' AND tc.table_name = 'TABLE';
   ```

4. **Format output** showing:
   - Column details in a table
   - Primary keys, foreign keys, unique constraints
   - Indexes if available

## Arguments

$ARGUMENTS - Table name (required), optionally prefixed with schema (e.g., auth.users)
