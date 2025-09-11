/**
 * V8 HTML Report Generator
 * Generates proper V8-compliant HTML reports using marked.js
 */

export class V8HtmlGenerator {
  /**
   * Generate V8-compliant HTML report with embedded markdown
   */
  static generateV8Html(markdownContent: string): string {
    // Escape the markdown content for JavaScript string
    const escapedContent = markdownContent
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\$/g, '\\$');

    return `<!DOCTYPE html>
<html>
<head>
  <title>CodeQual V8 Analysis Report</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    }
    h1 { color: #2d3748; border-bottom: 3px solid #667eea; padding-bottom: 10px; }
    h2 { color: #4a5568; margin-top: 40px; }
    h3 { color: #718096; }
    h4 { color: #a0aec0; }
    h5 { color: #cbd5e0; }
    code { background: #f7fafc; padding: 2px 6px; border-radius: 4px; color: #e53e3e; }
    pre { 
      background: #f8f9fa; 
      color: #2d3748;
      padding: 20px; 
      border-radius: 8px; 
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      margin: 20px 0;
    }
    /* Black background for problematic code */
    .problematic-code + pre, h5:contains("Problematic Code") + pre {
      background: #1a1b26 !important;
      color: #a9b1d6 !important;
    }
    /* Black background for recommended fix */
    .recommended-fix + pre, h5:contains("Recommended Fix") + pre {
      background: #1a1b26 !important;
      color: #7dcfff !important;
    }
    table { 
      border-collapse: collapse; 
      width: 100%; 
      margin: 20px 0;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    th, td { 
      border: 1px solid #e2e8f0; 
      padding: 12px; 
      text-align: left; 
    }
    th { 
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); 
      color: white;
      font-weight: 600;
    }
    tr:hover { background: #f7fafc; }
    a { 
      color: #667eea; 
      text-decoration: none;
      transition: color 0.2s;
    }
    a:hover { 
      color: #5a67d8;
      text-decoration: underline;
    }
    strong { 
      color: #2d3748;
      font-weight: 600;
    }
    em { 
      color: #4a5568;
      font-style: italic;
    }
    ul, ol { 
      margin-left: 20px;
      margin-bottom: 20px;
      line-height: 1.8;
    }
    li { 
      margin-bottom: 8px;
      color: #4a5568;
    }
    blockquote {
      border-left: 4px solid #667eea;
      margin: 20px 0;
      padding-left: 20px;
      color: #718096;
      font-style: italic;
    }
    hr {
      border: none;
      border-top: 2px solid #e2e8f0;
      margin: 40px 0;
    }
    /* Status badges */
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin: 0 4px;
    }
    /* Issue severity colors */
    .critical { color: #dc2626 !important; font-weight: bold; }
    .high { color: #ea580c !important; font-weight: bold; }
    .medium { color: #ca8a04 !important; font-weight: bold; }
    .low { color: #16a34a !important; font-weight: bold; }
    /* Decision badges */
    .approved { 
      background: #10b981; 
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: bold;
      display: inline-block;
    }
    .declined { 
      background: #ef4444; 
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: bold;
      display: inline-block;
    }
    /* Mermaid diagram styling */
    .mermaid {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }
    /* Executive summary box */
    #executive-summary {
      background: linear-gradient(135deg, #667eea22 0%, #764ba222 100%);
      border: 2px solid #667eea;
      border-radius: 12px;
      padding: 24px;
      margin: 20px 0;
    }
    /* Issue cards */
    .issue-card {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 16px;
      margin: 16px 0;
      border-radius: 8px;
    }
    .issue-critical { 
      border-left-color: #dc2626;
      background: #fef2f2;
    }
    .issue-high { 
      border-left-color: #ea580c;
      background: #fff7ed;
    }
    .issue-medium { 
      border-left-color: #ca8a04;
      background: #fefce8;
    }
    .issue-low { 
      border-left-color: #16a34a;
      background: #f0fdf4;
    }
    /* Metrics grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin: 20px 0;
    }
    .metric-card {
      background: #f7fafc;
      padding: 16px;
      border-radius: 8px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    .metric-value {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
    }
    .metric-label {
      font-size: 14px;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 4px;
    }
    /* Responsive design */
    @media (max-width: 768px) {
      .container { padding: 20px; }
      h1 { font-size: 24px; }
      h2 { font-size: 20px; }
      .metrics-grid { grid-template-columns: 1fr; }
    }
    /* Print styles */
    @media print {
      body { 
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container" id="content"></div>
  <script>
    // Initialize Mermaid
    mermaid.initialize({ 
      startOnLoad: false,
      theme: 'default',
      themeVariables: {
        primaryColor: '#667eea',
        primaryTextColor: '#fff',
        primaryBorderColor: '#764ba2',
        lineColor: '#5a67d8',
        secondaryColor: '#f7fafc',
        tertiaryColor: '#fff3cd'
      }
    });
    
    const markdownContent = "${escapedContent}";
    
    // Custom renderer for Mermaid blocks
    const renderer = new marked.Renderer();
    const originalCodeRenderer = renderer.code.bind(renderer);
    
    renderer.code = function(code, language) {
      if (language === 'mermaid') {
        return '<div class="mermaid">' + code + '</div>';
      }
      return originalCodeRenderer(code, language);
    };
    
    // Override heading renderer to add IDs for navigation
    renderer.heading = function(text, level) {
      const escapedText = text.toLowerCase().replace(/[^\\w]+/g, '-');
      return '<h' + level + ' id="' + escapedText + '">' + text + '</h' + level + '>';
    };
    
    // Override table renderer for better styling
    renderer.table = function(header, body) {
      return '<table class="data-table">\\n'
        + '<thead>\\n'
        + header
        + '</thead>\\n'
        + '<tbody>\\n'
        + body
        + '</tbody>\\n'
        + '</table>\\n';
    };
    
    marked.setOptions({ 
      renderer: renderer,
      highlight: function(code, lang) {
        // Basic syntax highlighting colors
        if (lang === 'javascript' || lang === 'typescript' || lang === 'js' || lang === 'ts') {
          return code
            .replace(/\\/\\/(.*)/g, '<span style="color:#6b7280">//$1</span>') // comments
            .replace(/'([^']*)'/g, '<span style="color:#059669">\\'$1\\'</span>') // strings
            .replace(/"([^"]*)"/g, '<span style="color:#059669">"$1"</span>') // strings
            .replace(/\\b(const|let|var|function|return|if|else|for|while)\\b/g, '<span style="color:#7c3aed">$1</span>') // keywords
            .replace(/\\b(\\d+)\\b/g, '<span style="color:#dc2626">$1</span>'); // numbers
        }
        return code;
      }
    });
    
    // Parse markdown and render
    document.getElementById('content').innerHTML = marked.parse(markdownContent);
    
    // Render Mermaid diagrams
    mermaid.init();
    
    // Add interactive features
    document.querySelectorAll('h2, h3, h4').forEach(heading => {
      heading.style.cursor = 'pointer';
      heading.onclick = function() {
        const next = this.nextElementSibling;
        if (next && next.style.display === 'none') {
          next.style.display = 'block';
        } else if (next) {
          // Don't hide by default
        }
      };
    });
    
    // Style issue blocks based on severity
    document.querySelectorAll('h5').forEach(h5 => {
      const text = h5.textContent;
      if (text.includes('[CRITICAL-') || text.includes('Critical')) {
        h5.classList.add('critical');
        h5.parentElement?.classList.add('issue-critical');
      } else if (text.includes('[HIGH-') || text.includes('High')) {
        h5.classList.add('high');
        h5.parentElement?.classList.add('issue-high');
      } else if (text.includes('[MEDIUM-') || text.includes('Medium')) {
        h5.classList.add('medium');
        h5.parentElement?.classList.add('issue-medium');
      } else if (text.includes('[LOW-') || text.includes('Low')) {
        h5.classList.add('low');
        h5.parentElement?.classList.add('issue-low');
      }
    });
    
    // Style decision badges
    const decisionText = document.body.innerHTML;
    if (decisionText.includes('APPROVE') && decisionText.includes('## ✅ PR Decision')) {
      document.querySelectorAll('h2').forEach(h2 => {
        if (h2.textContent.includes('PR Decision')) {
          h2.innerHTML = h2.innerHTML.replace('APPROVE', '<span class="approved">APPROVED</span>');
        }
      });
    } else if (decisionText.includes('DECLINE')) {
      document.querySelectorAll('h2').forEach(h2 => {
        if (h2.textContent.includes('PR Decision')) {
          h2.innerHTML = h2.innerHTML.replace('DECLINE', '<span class="declined">DECLINED</span>');
        }
      });
    }
    
    // Hide Alternative ASCII View section
    const headers = document.querySelectorAll('h3, strong');
    headers.forEach(h => {
      if (h.textContent && h.textContent.includes('Alternative ASCII View')) {
        h.style.display = 'none';
        let nextElement = h.nextElementSibling;
        while (nextElement && nextElement.tagName === 'PRE') {
          nextElement.style.display = 'none';
          nextElement = nextElement.nextElementSibling;
        }
      }
    });
  </script>
</body>
</html>`;
  }
}