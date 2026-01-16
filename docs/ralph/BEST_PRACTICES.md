# Ralph Best Practices

## Story Design

### The Golden Rule

> **Each story must be completable in ONE context window (~10 minutes)**

If you can't describe it in 2-3 sentences, it's too big.

### Good Story Examples

```markdown
✅ Add priority column to tasks table with default 'medium'
✅ Create PriorityBadge component with color variants
✅ Add priority dropdown to task edit modal
✅ Add priority filter to task list header
```

### Bad Story Examples

```markdown
❌ Implement task priority system (too vague, too large)
❌ Build the dashboard (way too large)
❌ Fix all the bugs (undefined scope)
```

### Story Ordering

Always order by dependency:

```
1. Database/Schema changes
2. Backend/API logic
3. UI components
4. Integration/wiring
5. Polish/edge cases
```

---

## Writing Acceptance Criteria

### Make Them Verifiable

```markdown
✅ Good (verifiable):
- [ ] Add `status` column with enum ('pending', 'active', 'done')
- [ ] Filter dropdown shows "All", "Pending", "Active", "Done"
- [ ] Clicking save persists to database

❌ Bad (vague):
- [ ] Works correctly
- [ ] Good user experience
- [ ] Handles edge cases
```

### Always Include

```markdown
- [ ] Typecheck passes
- [ ] [UI stories] Verify changes work in browser
```

---

## Progress File Usage

### Seed with Context

Before running, add known patterns to progress.txt:

```markdown
## Learnings
- This project uses TailwindCSS for styling
- API routes are in src/app/api/
- Use Prisma for database operations
- Components go in src/components/
```

### Review Between Runs

After failures, check progress.txt and add clarifications:

```markdown
## Learnings
- ThemeContext must wrap _app.tsx, not individual pages
- Use 'use client' directive for components with useState
```

---

## Handling Multiple Features

### Sequential (Safest)

Complete one feature before starting another:

```bash
/rex Add authentication    # Wait for completion
/rex Add user profiles     # Start next
```

### Parallel (Advanced)

Use separate directories or branches:

```bash
# Terminal 1
git checkout -b feature/auth
/rex Add authentication

# Terminal 2
git checkout -b feature/profiles
/rex Add user profiles
```

### Merging Parallel Work

```bash
git checkout main
git merge feature/auth
git merge feature/profiles  # Resolve conflicts if any
```

---

## Recovery Strategies

### When a Story Fails 3+ Times

1. **Read the errors** in progress.txt
2. **Split the story** into smaller pieces
3. **Add context** to Learnings section
4. **Consider manual fix** for the blocking issue

### When to Intervene Manually

- External API integration issues
- Complex merge conflicts
- Environment-specific problems
- Authentication/secrets setup

### After Manual Fix

```bash
# Update tasks.json to mark fixed story complete
# Add learnings to progress.txt
# Resume loop
~/.claude/scripts/claude-ralph.sh 10
```

---

## Optimizing for Success

### Before Starting

1. **Clear working directory** - No uncommitted changes
2. **Fresh branch** - Start from clean main/master
3. **Seed progress.txt** - Add project-specific context

### During Execution

1. **Monitor occasionally** - `tail -f ralph-output.log`
2. **Don't interrupt** - Let iterations complete
3. **Check after 3 failures** - Story may need splitting

### After Completion

1. **Review commits** - `git log --oneline`
2. **Test manually** - Verify in browser/app
3. **Clean up** - Archive tasks.json if keeping history

---

## Anti-Patterns to Avoid

### Don't

```markdown
❌ Start without answering clarifying questions properly
❌ Make stories that depend on unimplemented stories
❌ Skip the typecheck criterion
❌ Interrupt mid-iteration
❌ Run multiple loops on same tasks.json
```

### Do

```markdown
✅ Answer questions with specific choices (1A, 2B, 3C)
✅ Order stories by dependency
✅ Include typecheck in every story
✅ Let iterations complete before checking
✅ Use separate branches for parallel features
```

---

## Project-Specific Tips

### For React/Next.js Projects

Add to Learnings:
```
- Use 'use client' for interactive components
- Server components can't use hooks
- API routes in app/api/ directory
```

### For TypeScript Projects

Add to Learnings:
```
- Run npx tsc --noEmit to typecheck
- Import types from @types packages
- Use strict mode settings
```

### For Monorepos

Add to Learnings:
```
- Use turbo run build --filter=@scope/package
- Dependencies between packages matter
- Run from package directory for local scripts
```
