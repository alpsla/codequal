# 🔐 CRITICAL PROTECTED FILES - DO NOT DELETE

**Last Updated**: November 4, 2025
**Purpose**: Quick reference for files that must NEVER be deleted during cleanup

---

## ⚠️ ABSOLUTE NO-DELETE LIST

### 🔑 Authentication System
```
/packages/core/src/auth/system-auth.ts
/apps/api/src/middleware/trial-enforcement.ts
```

### 💳 Billing & Payments
```
/apps/api/src/routes/billing.ts
/apps/api/src/routes/stripe-webhooks.ts
/apps/api/src/services/stripe-integration.ts
/apps/api/src/__tests__/payment-flow.test.ts
/apps/api/src/__tests__/payment-flow-simple.test.ts
```

### 🔒 Security Infrastructure
```
/docs/security/comprehensive-security-vision.md
/packages/core/src/services/vector-db/authenticated-vector-service-fixed.ts
/packages/core/src/services/rag/authenticated-rag-service.ts
```

### 🎫 OAuth & Sessions
```
/docs/auth/ (entire directory - 11 files)
  - oauth-setup.md
  - oauth-setup-guide.md
  - gitlab-oauth-*.md (5 files)
```

---

## 🛡️ RULE

**ANY cleanup operation in these directories requires explicit user approval:**
- `/packages/core/src/auth/`
- `/apps/api/src/routes/` (contains billing)
- `/apps/api/src/services/` (contains stripe)
- `/apps/api/src/middleware/` (contains trial enforcement)
- `/docs/auth/`
- `/docs/security/`

---

## ✅ Quick Check Before Delete

```bash
# Before deleting a file, run:
FILE_TO_DELETE="path/to/file"

# Check if it's in protected list
grep -r "$(basename $FILE_TO_DELETE)" /Users/alpinro/Code\ Prjects/codequal/docs/CRITICAL_PROTECTED_FILES.md

# Check if it's imported anywhere
rg "$(basename $FILE_TO_DELETE | sed 's/\.[^.]*$//')" --type ts --type js

# If BOTH checks pass, it's likely safe to delete
```

---

**See PHASE_2_CLEANUP_ANALYSIS.md for complete cleanup strategy**
