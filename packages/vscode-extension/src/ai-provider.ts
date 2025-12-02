import * as vscode from 'vscode';

/**
 * AI Provider Integration for CodeQual Auto-Fix
 * 
 * Integrates with available AI providers in the IDE:
 * - Cursor (Claude Sonnet)
 * - GitHub Copilot (GPT-4)
 * - Windsurf (Multiple models)
 * - Continue.dev
 */

export interface AIProvider {
    name: string;
    id: string;
    available: boolean;
    sendMessage: (prompt: string) => Promise<string>;
}

export class AIProviderManager {
    private providers: AIProvider[] = [];

    async detectProviders(): Promise<AIProvider[]> {
        this.providers = [];

        // Check for Cursor AI
        if (await this.isCursorAvailable()) {
            this.providers.push({
                name: 'Cursor AI (Claude Sonnet)',
                id: 'cursor',
                available: true,
                sendMessage: this.sendToCursor.bind(this)
            });
        }

        // Check for GitHub Copilot
        if (await this.isCopilotAvailable()) {
            this.providers.push({
                name: 'GitHub Copilot (GPT-4)',
                id: 'copilot',
                available: true,
                sendMessage: this.sendToCopilot.bind(this)
            });
        }

        // Check for Windsurf
        if (await this.isWindsurfAvailable()) {
            this.providers.push({
                name: 'Windsurf AI',
                id: 'windsurf',
                available: true,
                sendMessage: this.sendToWindsurf.bind(this)
            });
        }

        // Check for Continue.dev
        if (await this.isContinueAvailable()) {
            this.providers.push({
                name: 'Continue.dev',
                id: 'continue',
                available: true,
                sendMessage: this.sendToContinue.bind(this)
            });
        }

        return this.providers;
    }

    async selectProvider(): Promise<AIProvider | undefined> {
        const providers = await this.detectProviders();

        if (providers.length === 0) {
            vscode.window.showErrorMessage(
                'No AI providers detected. Please install Cursor, GitHub Copilot, or Windsurf.'
            );
            return undefined;
        }

        if (providers.length === 1) {
            return providers[0];
        }

        const selected = await vscode.window.showQuickPick(
            providers.map(p => ({
                label: p.name,
                description: p.id,
                provider: p
            })),
            {
                placeHolder: 'Select AI provider to use for auto-fixing'
            }
        );

        return selected?.provider;
    }

    // Provider detection methods
    private async isCursorAvailable(): Promise<boolean> {
        try {
            // Check if Cursor-specific commands are available
            const commands = await vscode.commands.getCommands();
            return commands.some(cmd => cmd.includes('cursor') || cmd.includes('composer'));
        } catch {
            return false;
        }
    }

    private async isCopilotAvailable(): Promise<boolean> {
        try {
            const extension = vscode.extensions.getExtension('github.copilot');
            return extension !== undefined && extension.isActive;
        } catch {
            return false;
        }
    }

    private async isWindsurfAvailable(): Promise<boolean> {
        try {
            const commands = await vscode.commands.getCommands();
            return commands.some(cmd => cmd.includes('windsurf'));
        } catch {
            return false;
        }
    }

    private async isContinueAvailable(): Promise<boolean> {
        try {
            const extension = vscode.extensions.getExtension('continue.continue');
            return extension !== undefined && extension.isActive;
        } catch {
            return false;
        }
    }

    // Provider-specific message sending
    private async sendToCursor(prompt: string): Promise<string> {
        // Cursor API integration
        // Note: This is a placeholder - actual implementation depends on Cursor's API
        try {
            // Try to use Cursor's chat API if available
            const result = await vscode.commands.executeCommand('cursor.chat.sendMessage', prompt);
            return result as string;
        } catch (error) {
            // Fallback: Open Cursor chat with the prompt
            await vscode.commands.executeCommand('cursor.chat.open');
            await vscode.env.clipboard.writeText(prompt);
            vscode.window.showInformationMessage(
                'Prompt copied to clipboard. Paste it into Cursor Chat.'
            );
            throw new Error('Manual intervention required');
        }
    }

    private async sendToCopilot(prompt: string): Promise<string> {
        // GitHub Copilot API integration
        try {
            // Use Copilot Chat API
            const result = await vscode.commands.executeCommand('github.copilot.chat.sendMessage', {
                message: prompt
            });
            return result as string;
        } catch (error) {
            // Fallback: Open Copilot chat
            await vscode.commands.executeCommand('github.copilot.chat.open');
            await vscode.env.clipboard.writeText(prompt);
            vscode.window.showInformationMessage(
                'Prompt copied to clipboard. Paste it into Copilot Chat.'
            );
            throw new Error('Manual intervention required');
        }
    }

    private async sendToWindsurf(prompt: string): Promise<string> {
        // Windsurf API integration
        try {
            const result = await vscode.commands.executeCommand('windsurf.chat.sendMessage', prompt);
            return result as string;
        } catch (error) {
            await vscode.env.clipboard.writeText(prompt);
            vscode.window.showInformationMessage(
                'Prompt copied to clipboard. Paste it into Windsurf Chat.'
            );
            throw new Error('Manual intervention required');
        }
    }

    private async sendToContinue(prompt: string): Promise<string> {
        // Continue.dev API integration
        try {
            const result = await vscode.commands.executeCommand('continue.sendMessage', prompt);
            return result as string;
        } catch (error) {
            await vscode.env.clipboard.writeText(prompt);
            vscode.window.showInformationMessage(
                'Prompt copied to clipboard. Paste it into Continue Chat.'
            );
            throw new Error('Manual intervention required');
        }
    }
}

function extractFileName(fix: any): string {
    const changes = fix.edit?.changes;
    if (changes) {
        const fileUri = Object.keys(changes)[0];
        if (fileUri) {
            return fileUri.split('/').pop() || 'unknown file';
        }
    }
    return 'unknown file';
}

/**
 * Process fixes using AI provider
 */
export async function processFixesWithAI(
    fixes: any[],
    provider: AIProvider,
    onProgress?: (current: number, total: number, message: string) => void
): Promise<{ applied: number; skipped: number; failed: number }> {
    let applied = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < fixes.length; i++) {
        const fix = fixes[i];

        if (onProgress) {
            onProgress(i + 1, fixes.length, `Processing: ${fix.title}`);
        }

        // Extract AI prompt from the fix
        const prompt = extractAIPrompt(fix);
        if (!prompt) {
            console.log(`No AI prompt found for: ${fix.title}`);
            skipped++;
            continue;
        }

        try {
            // Send to AI provider (will copy to clipboard for manual mode)
            const response = await provider.sendMessage(prompt);

            // If we get here, AI returned a response (not manual mode)
            // Show response to user for review
            const action = await vscode.window.showInformationMessage(
                `AI suggested fix for: ${fix.title}`,
                { modal: true, detail: response },
                'Apply',
                'Skip',
                'Stop'
            );

            if (action === 'Apply') {
                // Apply the fix (implementation depends on fix type)
                await applyAIGeneratedFix(fix, response);
                applied++;
            } else if (action === 'Skip') {
                skipped++;
            } else {
                // Stop processing
                break;
            }

        } catch (error: any) {
            if (error.message === 'MANUAL_MODE') {
                // User will manually paste and apply - this is expected, not a failure
                const fileName = extractFileName(fix);
                vscode.window.showInformationMessage(
                    `📋 Fix ${i + 1}/${fixes.length}: ${fix.title} (${fileName}) - Prompt copied!`,
                    { modal: false }
                );

                // Count as skipped, not failed
                skipped++;

                // Small delay so user can see the message
                await new Promise(resolve => setTimeout(resolve, 500));
            } else {
                // Actual error
                console.error(`Failed to process fix: ${fix.title}`, error);
                failed++;
            }
        }
    }

    return { applied, skipped, failed };
}

function extractAIPrompt(fix: any): string | null {
    const changes = fix.edit?.changes;
    if (!changes) return null;

    const edits = Object.values(changes)[0] as any[];
    if (!edits || edits.length === 0) return null;

    const newText = edits[0].newText;

    // Extract the AI PROMPT section from the comment block
    const promptMatch = newText.match(/AI PROMPT.*?:\n([\s\S]*?)---/);
    if (promptMatch) {
        return promptMatch[1]
            .split('\n')
            .map((line: string) => line.replace(/^\/\/\s*/, '').replace(/^#\s*/, ''))
            .join('\n')
            .trim();
    }

    return null;
}

async function applyAIGeneratedFix(fix: any, aiResponse: string): Promise<void> {
    // Parse AI response and apply the fix
    // This is a simplified implementation
    const changes = fix.edit?.changes;
    if (!changes) return;

    const fileUri = Object.keys(changes)[0];
    const edits = changes[fileUri];

    // Apply the AI-generated code
    const edit = new vscode.WorkspaceEdit();
    const uri = vscode.Uri.parse(fileUri);

    for (const change of edits) {
        const range = new vscode.Range(
            new vscode.Position(change.range.start.line, change.range.start.character),
            new vscode.Position(change.range.end.line, change.range.end.character)
        );

        // Use AI response as the new text
        edit.replace(uri, range, aiResponse);
    }

    await vscode.workspace.applyEdit(edit);
}
