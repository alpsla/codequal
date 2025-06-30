# Multi-Language API Support

CodeQual API supports 10 languages to serve our global developer community. All API responses, error messages, and documentation can be returned in the user's preferred language.

## Supported Languages

| Code | Language | Native Name | Script |
|------|----------|-------------|--------|
| `en` | English | English | Latin |
| `es` | Spanish | Español | Latin |
| `zh` | Mandarin | 中文 | Chinese |
| `hi` | Hindi | हिन्दी | Devanagari |
| `pt` | Portuguese | Português | Latin |
| `ja` | Japanese | 日本語 | Japanese |
| `de` | German | Deutsch | Latin |
| `ru` | Russian | Русский | Cyrillic |
| `fr` | French | Français | Latin |
| `ko` | Korean | 한국어 | Korean |

## How to Use

### 1. Query Parameter (Recommended)

Add `?lang=xx` to any API endpoint:

```bash
curl https://api.codequal.com/v1/analyze-pr?lang=es \
  -H "X-API-Key: ck_your_key" \
  -d '{"repositoryUrl": "...", "prNumber": 123}'
```

### 2. HTTP Headers

Use standard HTTP headers:

```bash
# Using X-Language header (highest priority)
curl https://api.codequal.com/v1/analyze-pr \
  -H "X-API-Key: ck_your_key" \
  -H "X-Language: ja"

# Using Accept-Language header (standard)
curl https://api.codequal.com/v1/analyze-pr \
  -H "X-API-Key: ck_your_key" \
  -H "Accept-Language: fr-FR,fr;q=0.9"
```

### 3. Priority Order

The API determines language in this order:
1. Query parameter (`?lang=xx`)
2. `X-Language` header
3. `Accept-Language` header
4. Default to English (`en`)

## Response Examples

### English (Default)
```json
{
  "analysisId": "analysis_123",
  "status": "queued",
  "estimatedTime": 600,
  "message": "Analysis started"
}
```

### Spanish
```json
{
  "analysisId": "analysis_123",
  "status": "en cola",
  "estimatedTime": 600,
  "message": "Análisis iniciado"
}
```

### Chinese
```json
{
  "analysisId": "analysis_123",
  "status": "排队中",
  "estimatedTime": 600,
  "message": "分析已开始"
}
```

### Japanese
```json
{
  "analysisId": "analysis_123",
  "status": "待機中",
  "estimatedTime": 600,
  "message": "分析を開始しました"
}
```

## Error Messages

Error messages are automatically translated:

### English
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 1000,
    "remaining": 0,
    "reset": 1640995200
  }
}
```

### German
```json
{
  "error": "Ratenlimit überschritten",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 1000,
    "remaining": 0,
    "reset": 1640995200
  }
}
```

## Translation Endpoints

### Get Supported Languages
```bash
GET /v1/languages
```

Response:
```json
{
  "languages": [
    {
      "code": "en",
      "name": "English",
      "nativeName": "English",
      "rtl": false
    },
    {
      "code": "es",
      "name": "Spanish",
      "nativeName": "Español",
      "rtl": false
    }
    // ... more languages
  ],
  "default": "en",
  "total": 10
}
```

### Translate Text
```bash
POST /v1/languages/translate
```

Request:
```json
{
  "text": "Your code quality score is 85/100",
  "targetLanguage": "pt",
  "context": "api"
}
```

Response:
```json
{
  "translation": "Sua pontuação de qualidade de código é 85/100",
  "sourceLanguage": "en",
  "targetLanguage": "pt"
}
```

### Detect Language
```bash
POST /v1/languages/detect
```

Request:
```json
{
  "text": "이 코드는 개선이 필요합니다"
}
```

Response:
```json
{
  "detectedLanguage": "ko",
  "confidence": 0.95,
  "languageName": "Korean"
}
```

## SDK Support

All official SDKs include language support:

### TypeScript/JavaScript
```typescript
const client = new CodeQualClient({
  apiKey: 'ck_your_key',
  language: 'es' // Spanish
});

// Or per-request
const result = await client.analyzePR(url, prNumber, {
  language: 'zh'
});
```

### Python
```python
client = CodeQualClient(
    api_key='ck_your_key',
    language='fr'  # French
)

# Or per-request
result = client.analyze_pr(
    repo_url, 
    pr_number,
    language='de'
)
```

## Best Practices

1. **Browser Applications**: Detect user language from browser
```javascript
const userLang = navigator.language.split('-')[0];
```

2. **Server Applications**: Use Accept-Language header
```javascript
app.use((req, res, next) => {
  const lang = req.acceptsLanguages(['en', 'es', 'zh', ...]);
  req.language = lang || 'en';
  next();
});
```

3. **Mobile Apps**: Use device locale
```swift
// iOS
let languageCode = Locale.current.languageCode ?? "en"

// Android
val languageCode = Locale.getDefault().language
```

4. **CLI Tools**: Add language flag
```bash
codequal analyze --lang ja https://github.com/...
```

## Performance

- Common phrases are pre-translated and cached
- First request in a new language may be ~100ms slower
- Subsequent requests use cached translations
- Cache is refreshed every 24 hours

## Limitations

1. **Technical Terms**: Some technical terms remain in English
2. **Code Examples**: Code snippets are not translated
3. **URLs**: API endpoints remain in English
4. **IDs**: Resource IDs (analysis IDs, etc.) are not translated

## Feedback

Help us improve translations:
- Report issues: api-translations@codequal.com
- Suggest improvements via GitHub issues
- Join our translation community

## Coming Soon

- Arabic support (RTL)
- Indonesian support
- Turkish support
- Custom terminology dictionaries
- Regional dialect options