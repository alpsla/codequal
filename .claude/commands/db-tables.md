# List Database Tables

Quickly list all tables in the Supabase database.

## Usage

```
/db-tables
/db-tables public
/db-tables auth
```

## Instructions

When this skill is invoked:

1. **Determine the schema** to query:
   - If no argument: show tables from `public` schema
   - If argument provided: show tables from that schema

2. **Execute the query** using postgres MCP tool:
   ```sql
   SELECT table_name,
          (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as column_count
   FROM information_schema.tables t
   WHERE table_schema = 'SCHEMA_NAME'
   ORDER BY table_name;
   ```

3. **Format output** as a clean table showing:
   - Table name
   - Number of columns
   - Brief description if available from comments

## Arguments

$ARGUMENTS - Optional schema name (default: public)
