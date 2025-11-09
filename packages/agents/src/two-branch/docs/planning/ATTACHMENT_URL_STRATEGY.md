# Attachment URL Strategy for Production

**Date**: November 8, 2025  
**Priority**: HIGH  
**Context**: Session 19 discovery - attachment links are relative paths

---

## 🐛 Current Problem

### In Reports:
```markdown
**Auto-fix**: ✅ [Available](attachments/group-sql-injection-high-semgrep-fix.json)
```

### Issues:
1. **Relative path** - Only works if files are in same directory as report
2. **Local testing** - Works when you download attachments locally
3. **CI/CD** - Links will be broken in GitHub PR comments
4. **API** - Links won't work in API responses
5. **Web** - Links won't work in web dashboard

---

## 🎯 Production Requirements

### Where Reports Will Be Used:

1. **GitHub PR Comments**
   - Markdown report posted as comment
   - Attachments need accessible URLs
   - Users click links to download fixes

2. **Web Dashboard**
   - Reports displayed in browser
   - Attachments need HTTP URLs
   - Users click to download

3. **API Responses**
   - JSON with report + attachment URLs
   - Clients download attachments separately
   - URLs must be absolute

4. **CI/CD Pipeline**
   - Report in build logs
   - Attachments stored as artifacts
   - URLs point to artifact storage

---

## ✅ Solution Options

### Option A: Supabase Storage (RECOMMENDED)

**Upload attachments to Supabase Storage during report generation**

```typescript
// After generating IDE fix files
for (const fixFile of ideFixFiles) {
  const { data, error } = await supabase.storage
    .from('v9-attachments')
    .upload(`${analysisId}/${fixFile.filename}`, 
      JSON.stringify(fixFile.content));
  
  if (!error) {
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('v9-attachments')
      .getPublicUrl(`${analysisId}/${fixFile.filename}`);
    
    fixFile.url = urlData.publicUrl;
  }
}
```

**Then in report**:
```markdown
**Auto-fix**: ✅ [Download](https://ftjhmbbcuqjqmmbaymqb.supabase.co/storage/v1/object/public/v9-attachments/analysis-123/group-1-fix.json)
```

**Pros**:
- ✅ Works everywhere (GitHub, Web, API)
- ✅ Simple implementation
- ✅ Automatic CDN distribution
- ✅ Can set TTL (e.g., 30 days)

**Cons**:
- Storage costs (minimal - ~1 MB per analysis)
- Need to clean up old files

---

### Option 2: GitHub Gists

**Create private gist with attachments**

```typescript
const gist = await octokit.gists.create({
  files: {
    'manifest.json': { content: JSON.stringify(manifest) },
    'group-1-fix.json': { content: JSON.stringify(fix1) },
    // ... all attachments
  },
  public: false,
  description: `CodeQual V9 Analysis - PR #${prNumber}`
});

const baseUrl = gist.data.files['manifest.json'].raw_url.replace('/manifest.json', '');
```

**Pros**:
- ✅ Free
- ✅ GitHub native
- ✅ Works in PR comments

**Cons**:
- Only works for GitHub (not Bitbucket, GitLab)
- Rate limits
- Gists are permanent (cleanup harder)

---

### Option 3: S3/CloudFlare R2

**Upload to object storage**

```typescript
await s3.putObject({
  Bucket: 'codequal-attachments',
  Key: `${analysisId}/group-1-fix.json`,
  Body: JSON.stringify(fixFile),
  ContentType: 'application/json',
  Expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
});

const url = `https://attachments.codequal.com/${analysisId}/group-1-fix.json`;
```

**Pros**:
- ✅ Custom domain
- ✅ Cheap storage
- ✅ High performance

**Cons**:
- Additional infrastructure
- More complex setup

---

### Option 4: Inline Attachments (Base64)

**Embed small files directly in report/manifest**

```json
{
  "filename": "group-1-fix.json",
  "url": null,
  "content_embedded": true,
  "data": "eyJmaXhQYXR0ZXJuIjp7Li4ufX0="  // Base64 encoded
}
```

**Pros**:
- ✅ No external storage needed
- ✅ Works offline
- ✅ Single file distribution

**Cons**:
- Report becomes huge (1 MB+ per analysis)
- Doesn't work for GitHub comments (size limits)
- Harder to parse

---

## 🎯 Recommended Approach

### Phase 1: Supabase Storage (Immediate)

1. Upload attachments to Supabase during report generation
2. Replace relative paths with public URLs
3. Set 30-day TTL for automatic cleanup

### Phase 2: Hybrid (When Web/API Ready)

1. **For GitHub PR comments**: Supabase URLs
2. **For Web Dashboard**: Server-side access to Supabase (no public URLs needed)
3. **For API**: Return URLs in response, clients download separately
4. **For CI/CD**: Option to save as build artifacts + Supabase URLs

---

## 📋 Implementation Plan

### Step 1: Update V9GroupedReportFormatter

```typescript
async generateGroupedReport(...): Promise<GroupedReportOutput> {
  // ... existing code ...
  
  // Upload attachments to Supabase
  if (ideFixFiles.length > 0) {
    const analysisId = `${metadata.repository}-pr${metadata.prNumber}-${Date.now()}`;
    
    for (const fixFile of ideFixFiles) {
      try {
        // Upload to Supabase Storage
        const { data, error } = await this.supabase.storage
          .from('v9-attachments')
          .upload(
            `${analysisId}/${fixFile.filename}`,
            JSON.stringify(fixFile.content),
            { contentType: 'application/json' }
          );
        
        if (!error) {
          // Get public URL
          const { data: urlData } = this.supabase.storage
            .from('v9-attachments')
            .getPublicUrl(`${analysisId}/${fixFile.filename}`);
          
          // Update URL in manifest
          fixFile.publicUrl = urlData.publicUrl;
        }
      } catch (uploadError) {
        console.warn(`Failed to upload ${fixFile.filename}:`, uploadError);
        // Fallback to relative path
      }
    }
  }
  
  // Update links in markdown to use public URLs
  markdown = markdown.replace(
    /attachments\/(group-[^)]+\.json)/g,
    (match, filename) => {
      const file = ideFixFiles.find(f => f.filename === filename);
      return file?.publicUrl || match;  // Use public URL or fallback to relative
    }
  );
}
```

### Step 2: Create Supabase Bucket

```sql
-- Create bucket for V9 attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('v9-attachments', 'v9-attachments', true);

-- Set lifecycle policy (auto-delete after 30 days)
UPDATE storage.buckets
SET file_size_limit = 10485760,  -- 10 MB max per file
    allowed_mime_types = ARRAY['application/json']
WHERE id = 'v9-attachments';
```

### Step 3: Update Manifest Generation

```typescript
// In manifest entries
{
  "filename": "group-sql-injection-fix.json",
  "url": "https://ftjhmbbcuqjqmmbaymqb.supabase.co/storage/v1/object/public/v9-attachments/analysis-123/group-sql-injection-fix.json",
  "fallback_path": "attachments/group-sql-injection-fix.json",  // For local testing
  "size_bytes": 2048,
  "expires_at": "2025-12-08T00:00:00Z"
}
```

---

## Issue 2: Still 1,051 NEW Issues (Categorization Bug)

This is the critical two-branch tool inconsistency bug we discovered. The fix (Dependency-Check timeout 300s) was applied, but the current reports were generated BEFORE the fix.

**What you're seeing**: Reports from test run at 18:16 (before timeout fix)  
**What we need**: Re-run canonical test to verify fix

---

## 📋 Next Steps

### Immediate (Next Session):

1. **Create Supabase bucket** for v9-attachments
2. **Implement URL generation** in v9-grouped-report-formatter.ts
3. **Re-run canonical test** with Dependency-Check timeout fix
4. **Verify categorization** (should be < 10% NEW)
5. **Download reports with working attachment URLs**

### Testing URL Strategy:

```bash
# After implementing Supabase URLs
npx ts-node tests/integration/test-v9-lite-e2e.ts

# Check report for URLs like:
# https://...supabase.co/storage/.../group-1-fix.json
# Instead of: attachments/group-1-fix.json
```

---

*Production-ready attachment distribution requires cloud storage URLs, not relative paths.*

