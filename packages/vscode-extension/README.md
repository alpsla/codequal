# CodeQual Auto-Fix VSCode Extension

AI-powered code quality fixes with comprehensive SARIF and LSP integration for VSCode and Cursor.

## Features

- 🔍 **SARIF & LSP Support**: Load industry-standard SARIF reports and LSP code actions
- 💡 **Inline Diagnostics**: See issues as squiggly lines directly in your editor
- 🌳 **Issue Tree View**: Browse all issues organized by file in the sidebar
- 📊 **Status Bar**: Quick overview of issue count and severity
- ⚡ **Quick Fixes**: Apply fixes with lightbulb menu (Cmd+. or Ctrl+.)
- 🎯 **Batch Operations**: Fix all issues or filter by severity level
- 🌐 **URL Loading**: Load reports from URLs including Supabase storage
- 🔒 **Safe**: Review before applying any changes

## Installation

### From Source

1. Clone the repository:
   ```bash
   cd packages/vscode-extension
   npm install
   npm run compile
   ```

2. Open in VSCode:
   ```bash
   code .
   ```

3. Press `F5` to launch Extension Development Host

### From VSIX (Coming Soon)

```bash
code --install-extension codequal-autofix-0.1.0.vsix
```

## Usage

### 1. Load Data Files

**Load SARIF Report:**
- Command: `CodeQual: Load SARIF File`
- Or: `CodeQual: Load SARIF from URL`

**Load LSP Actions:**
- Command: `CodeQual: Load LSP File`
- Or: `CodeQual: Load LSP from URL`

**Auto-load on Startup:**
```json
{
  "codequal.sarifFilePath": "/path/to/report.sarif",
  "codequal.lspFilePath": "/path/to/actions.json",
  "codequal.autoLoadSARIF": true,
  "codequal.autoLoadLSP": true
}
```

### 2. View Issues

**Inline Diagnostics:**
Issues appear as squiggly lines in your code:
- 🔴 Red: Errors (critical/high severity)
- 🟡 Yellow: Warnings (medium severity)
- 🔵 Blue: Information (low severity)
- 💡 Gray: Hints

**Sidebar Tree View:**
1. Click the CodeQual icon in the Activity Bar
2. Browse issues organized by file
3. Click any issue to navigate to its location

**Status Bar:**
- Shows total issue count
- Color-coded by highest severity
- Click to see detailed statistics

### 3. Apply Fixes

**Individual Fix:**
1. Place cursor on an issue (squiggly line)
2. Click the lightbulb 💡 or press `Cmd+.` (Mac) / `Ctrl+.` (Windows)
3. Select the fix from the Quick Fix menu
4. Fix is applied automatically

**Fix Current File:**
- Command: `CodeQual: Apply Fixes for Current File`
- Fixes all issues in the active editor

**Batch Fixes by Severity:**
- `CodeQual: Apply All Fixes` - Apply all available fixes
- `CodeQual: Apply Critical Severity Fixes` - Errors only
- `CodeQual: Apply High Severity Fixes` - Warnings only
- `CodeQual: Apply Medium Severity Fixes` - Information only
- `CodeQual: Apply Low Severity Fixes` - Hints only

### 4. Loading from URLs

**Supabase Storage:**
```
codequal.loadSarifFromURL
URL: https://your-project.supabase.co/storage/v1/object/public/reports/report.sarif
```

**Any HTTPS URL:**
```
codequal.loadLSPFromURL
URL: https://example.com/path/to/actions.json
```

## Extension Architecture

### Components

1. **types/index.ts**: Complete TypeScript definitions for SARIF 2.1.0 and LSP protocols
2. **store/codequal-store.ts**: Central data store managing issues and statistics
3. **loaders/url-loader.ts**: Loads data from files and URLs with validation
4. **providers/sarif-diagnostic-provider.ts**: Converts SARIF to VSCode diagnostics
5. **providers/lsp-code-action-provider.ts**: Provides Quick Fix actions from LSP data
6. **views/issue-tree-provider.ts**: Sidebar tree view for browsing issues
7. **views/status-bar-manager.ts**: Status bar item with statistics
8. **extension.ts**: Main entry point orchestrating all components

### Data Flow

```
SARIF/LSP Files → URLLoader → CodeQualStore → Providers → VSCode UI
                                     ↓
                              Statistics
                              Issue Map
                              Event Bus
```

## Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `codequal.lspFilePath` | string | `""` | Path to LSP actions JSON file |
| `codequal.sarifFilePath` | string | `""` | Path to SARIF report file |
| `codequal.autoLoadLSP` | boolean | `false` | Auto-load LSP file on workspace open |
| `codequal.autoLoadSARIF` | boolean | `false` | Auto-load SARIF file on workspace open |
| `codequal.showDiagnostics` | boolean | `true` | Show diagnostics (squiggly lines) |
| `codequal.supabaseUrl` | string | `""` | Supabase project URL |
| `codequal.supabaseAnonKey` | string | `""` | Supabase anonymous key |

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `CodeQual: Load SARIF File` | - | Load SARIF report from file |
| `CodeQual: Load SARIF from URL` | - | Load SARIF report from URL |
| `CodeQual: Load LSP File` | - | Load LSP actions from file |
| `CodeQual: Load LSP from URL` | - | Load LSP actions from URL |
| `CodeQual: Apply All Fixes` | - | Apply all available fixes |
| `CodeQual: Apply Fixes for Current File` | - | Fix all issues in active file |
| `CodeQual: Apply Critical Severity Fixes` | - | Apply error-level fixes only |
| `CodeQual: Apply High Severity Fixes` | - | Apply warning-level fixes only |
| `CodeQual: Apply Medium Severity Fixes` | - | Apply info-level fixes only |
| `CodeQual: Apply Low Severity Fixes` | - | Apply hint-level fixes only |
| `CodeQual: Clear All Diagnostics` | - | Clear all CodeQual diagnostics |
| `CodeQual: Refresh Data` | - | Reload data from configured files |
| `CodeQual: Show Statistics` | - | Display issue statistics |

## SARIF Support

The extension fully supports SARIF 2.1.0 specification:

- ✅ Multiple runs
- ✅ Tool metadata
- ✅ Rule descriptions
- ✅ Physical locations with regions
- ✅ Severity levels (error, warning, note, none)
- ✅ Fix suggestions with text edits
- ✅ Related locations
- ✅ Code flows
- ✅ Suppressions

## LSP Support

Supports Language Server Protocol code actions:

- ✅ Diagnostics with ranges
- ✅ Text edits
- ✅ Workspace edits
- ✅ Document changes
- ✅ Severity mapping (1=Error, 2=Warning, 3=Info, 4=Hint)
- ✅ Code action kinds (QuickFix, Refactor)

## Troubleshooting

### No diagnostics showing
- Check that `codequal.showDiagnostics` is `true`
- Verify data is loaded (check status bar)
- Ensure file paths in SARIF/LSP match your workspace

### Fixes not applying
- Verify files exist in your workspace
- Check Developer Tools console for errors (`Help > Toggle Developer Tools`)
- Ensure you have write permissions

### URL loading fails
- Check network connectivity
- Verify URL is publicly accessible
- For Supabase, ensure bucket is public or configure authentication

### Path mapping issues
- SARIF/LSP files should use absolute paths or proper relative paths
- Extension normalizes `file://` URIs automatically
- Windows paths are supported

## Development

### Prerequisites
- Node.js 20.0.0 or higher
- VSCode 1.85.0 or higher
- TypeScript 5.2.0 or higher

### Build
```bash
npm install
npm run compile
```

### Watch Mode
```bash
npm run watch
```

### Package VSIX
```bash
npm run package
```

### Testing
```bash
npm run pretest
```

### Debug
1. Open extension folder in VSCode
2. Press `F5` to launch Extension Development Host
3. Use Debug Console to see logs

## API Usage

### Programmatic Data Loading

```typescript
import * as vscode from 'vscode';

// Load SARIF
await vscode.commands.executeCommand('codequal.loadSarifFromURL',
  'https://example.com/report.sarif');

// Load LSP
await vscode.commands.executeCommand('codequal.loadLSPFile');

// Apply fixes
await vscode.commands.executeCommand('codequal.applyAllFixes');
```

### Extension Storage

The extension maintains state in:
- `CodeQualStore`: In-memory store for issues and statistics
- VSCode DiagnosticCollection: For displaying squiggly lines
- Tree data provider: For sidebar view updates

## Requirements

- VSCode 1.85.0 or higher
- Node.js 20.0.0 or higher (for fetch API support)

## Known Limitations

- Large SARIF files (>10MB) may take time to load
- Batch fixes are applied sequentially, not in parallel
- Tree view refreshes on every store change (may impact performance with 1000+ issues)

## Roadmap

- [ ] Incremental SARIF loading for large files
- [ ] Filter issues by type/category
- [ ] Export filtered issues to CSV
- [ ] Integration with Git to show only issues in changed lines
- [ ] Custom severity color configuration
- [ ] Issue grouping by severity in tree view
- [ ] Keyboard shortcuts for common operations

## Release Notes

### 0.1.0 (Initial Release)

- ✅ Complete SARIF 2.1.0 support
- ✅ Full LSP CodeAction support
- ✅ Inline diagnostics with squiggly lines
- ✅ Issue tree view in sidebar
- ✅ Status bar with statistics
- ✅ Quick Fix menu integration
- ✅ Batch fix operations by severity
- ✅ URL loading (including Supabase)
- ✅ Path normalization (Windows + Unix)
- ✅ Type-safe throughout with TypeScript

## Contributing

Contributions are welcome! Please see the main repository for guidelines.

## License

MIT

## Support

For issues and feature requests:
- GitHub: https://github.com/alpsla/codequal/issues
- Docs: https://codequal.dev/docs

## Credits

Built with ❤️ by the CodeQual team.

Powered by:
- SARIF 2.1.0 specification
- Language Server Protocol
- VSCode Extension API
