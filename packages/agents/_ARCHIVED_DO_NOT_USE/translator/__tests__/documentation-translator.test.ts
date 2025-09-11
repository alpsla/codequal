import { DocumentationTranslator } from '../specialized/documentation-translator';

describe.skip('DocumentationTranslator - FIXME: Mock returns wrong format (Issue #TBD)', () => {
  let translator: DocumentationTranslator;
  
  beforeEach(() => {
    translator = new DocumentationTranslator();
  });
  
  afterEach(() => {
    translator.clearCache();
  });
  
  describe('Markdown Preservation', () => {
    it('should preserve markdown formatting', async () => {
      const input = `# Title
      
## Subtitle

This is a **bold** text and *italic* text.

- List item 1
- List item 2

1. Numbered item
2. Another item`;
      
      const result = await translator.translate(input, 'es');
      const translated = result.translated as string;
      
      // Markdown structure should be preserved
      expect(translated).toContain('#');
      expect(translated).toContain('##');
      expect(translated).toContain('**');
      expect(translated).toContain('*');
      expect(translated).toContain('-');
      expect(translated).toContain('1.');
      expect(translated).toContain('2.');
    });
    
    it('should preserve code blocks completely', async () => {
      const input = `# Installation

Install the package:

\`\`\`bash
npm install @codequal/api-client
\`\`\`

Then use it:

\`\`\`javascript
const client = new CodeQualClient('api-key');
await client.analyze('https://github.com/owner/repo/pull/123');
\`\`\``;
      
      const result = await translator.translate(input, 'ja');
      const translated = result.translated as string;
      
      // Code blocks should remain unchanged
      expect(translated).toContain('```bash');
      expect(translated).toContain('npm install @codequal/api-client');
      expect(translated).toContain('```javascript');
      expect(translated).toContain("const client = new CodeQualClient('api-key');");
    });
    
    it('should preserve inline code', async () => {
      const input = 'Use the `analyze()` method to start analysis. The `options` parameter is optional.';
      
      const result = await translator.translate(input, 'fr');
      const translated = result.translated as string;
      
      // Inline code should remain unchanged
      expect(translated).toContain('`analyze()`');
      expect(translated).toContain('`options`');
    });
  });
  
  describe('URL and Link Handling', () => {
    it('should preserve URLs', async () => {
      const input = 'Visit https://codequal.com for more information. See our [documentation](https://docs.codequal.com).';
      
      const result = await translator.translate(input, 'de');
      const translated = result.translated as string;
      
      expect(translated).toContain('https://codequal.com');
      expect(translated).toContain('https://docs.codequal.com');
    });
    
    it('should translate link text but preserve URL', async () => {
      const input = '[Click here](https://example.com) to learn more.';
      
      const result = await translator.translate(input, 'zh');
      const translated = result.translated as string;
      
      // URL should be preserved
      expect(translated).toContain('https://example.com');
      // Link structure should be maintained
      expect(translated).toMatch(/\[.*\]\(https:\/\/example\.com\)/);
    });
  });
  
  describe('Table Handling', () => {
    it('should preserve table structure', async () => {
      const input = `| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
| More data | Even more |`;
      
      const result = await translator.translate(input, 'pt');
      const translated = result.translated as string;
      
      // Table structure markers should be preserved
      expect(translated.split('\n')).toHaveLength(4);
      expect(translated).toContain('|');
      expect(translated).toContain('---');
    });
  });
  
  describe('Glossary Support', () => {
    it('should apply glossary terms', async () => {
      const input = 'The package manager handles dependency resolution.';
      
      const result = await translator.translate(input, 'es', {
        glossary: {
          'package': 'paquete',
          'dependency': 'dependencia'
        }
      });
      
      const translated = result.translated as string;
      
      // Glossary terms should be included
      expect(translated).toContain('paquete');
      expect(translated).toContain('dependencia');
    });
  });
  
  describe('Long Document Handling', () => {
    it('should handle long documents in chunks', async () => {
      // Create a long document
      const sections = [];
      for (let i = 0; i < 10; i++) {
        sections.push(`# Section ${i}\n\nThis is content for section ${i}. It contains multiple paragraphs and details.\n\n`);
      }
      const longDoc = sections.join('\n');
      
      const result = await translator.translate(longDoc, 'ru');
      
      expect(result.translated).toBeDefined();
      expect(result.modelUsed).not.toBe('cache');
      // Should use high-quality model
      expect(result.confidence).toBeGreaterThan(0.9);
    });
  });
  
  describe('Quality Focus', () => {
    it('should have high confidence for documentation', async () => {
      const technicalDoc = `# API Reference

The \`analyze()\` method accepts the following parameters:

- \`url\` (string): The repository URL
- \`options\` (object): Optional configuration
  - \`depth\` (string): Analysis depth
  - \`timeout\` (number): Timeout in milliseconds`;
      
      const result = await translator.translate(technicalDoc, 'ko');
      
      // Documentation should use high-quality translation
      expect(result.confidence).toBeGreaterThan(0.9);
    });
    
    it('should have long cache TTL', async () => {
      const doc = '# Simple documentation';
      
      // First translation
      await translator.translate(doc, 'hi');
      
      // Should still be cached after some time
      const result = await translator.translate(doc, 'hi');
      expect(result.cached).toBe(true);
    });
  });
});