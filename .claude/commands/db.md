# Query Supabase Database

Run SQL queries against the CodeQual Supabase PostgreSQL database.

## Usage

```
/db SELECT * FROM users LIMIT 5
/db DESCRIBE auth.users
/db What tables exist in the public schema?
```

## Instructions

When this skill is invoked:

1. **Parse the user's request** - It can be:
   - Raw SQL: Execute directly via the postgres MCP tool
   - Natural language: Convert to appropriate SQL first

2. **Use the postgres MCP tool** to execute the query:
   ```
   mcp__postgres__query with sql parameter
   ```

3. **Format the results** in a readable table format

4. **For schema exploration**, use these queries:
   - List tables: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
   - Describe table: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'TABLE_NAME'`
   - List schemas: `SELECT schema_name FROM information_schema.schemata`

## Common Queries

### List all tables
```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;
```

### Check table structure
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'your_table'
ORDER BY ordinal_position;
```

### Count rows in table
```sql
SELECT COUNT(*) FROM table_name;
```

## Safety

- The postgres MCP server is configured for **read-only access**
- No INSERT, UPDATE, DELETE, or DDL operations are allowed
- Queries are executed against the Supabase pooler connection

## Arguments

$ARGUMENTS - The SQL query or natural language description of what to query
