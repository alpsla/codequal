import * as fs from 'fs/promises';
import * as path from 'path';
import Handlebars from 'handlebars';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('report-generator');

export interface ReportData {
    analysisId: string;
    repository: {
        name: string;
        url: string;
    };
    summary: {
        totalIssues: number;
        criticalIssues: number;
        score: number;
    };
    issues: Array<{
        severity: string;
        type: string;
        message: string;
        file?: string;
        line?: number;
    }>;
    timestamp: string;
    [key: string]: unknown;
}

export interface TranslationData {
    [key: string]: string | TranslationData;
}

export interface ReportConfig {
    language: string;
    data: ReportData;
    outputPath: string;
}

interface HandlebarsContext {
    i18n?: TranslationData;
    [key: string]: unknown;
}

export class ModularReportGenerator {
    private templatesPath: string;
    private componentsCache: Map<string, string> = new Map();
    private translationsCache: Map<string, TranslationData> = new Map();
    
    constructor(templatesPath: string) {
        this.templatesPath = templatesPath;
        this.registerHelpers();
    }
    
    private registerHelpers() {
        // Register i18n helper
        Handlebars.registerHelper('i18n', function(this: HandlebarsContext, key: string) {
            const keys = key.split('.');
            let value: unknown = this.i18n;
            for (const k of keys) {
                value = value && typeof value === 'object' ? (value as Record<string, unknown>)[k] : undefined;
            }
            return (typeof value === 'string' ? value : key) as string;
        });
        
        // Register conditional helpers
        Handlebars.registerHelper('ifEquals', function(this: HandlebarsContext, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
            return a === b ? options.fn(this) : options.inverse(this);
        });
    }
    
    private async loadComponent(componentName: string): Promise<string> {
        const cached = this.componentsCache.get(componentName);
        if (cached) {
            return cached;
        }
        
        const componentPath = path.join(this.templatesPath, 'components', `${componentName}.html`);
        const content = await fs.readFile(componentPath, 'utf-8');
        this.componentsCache.set(componentName, content);
        return content;
    }
    
    private async loadTranslations(language: string): Promise<TranslationData> {
        const cached = this.translationsCache.get(language);
        if (cached) {
            return cached;
        }
        
        const translationPath = path.join(this.templatesPath, 'languages', `${language}.json`);
        const content = await fs.readFile(translationPath, 'utf-8');
        const translations = JSON.parse(content);
        this.translationsCache.set(language, translations);
        return translations;
    }
    
    private async loadLayout(): Promise<string> {
        const layoutPath = path.join(this.templatesPath, 'base', 'layout.html');
        return await fs.readFile(layoutPath, 'utf-8');
    }
    
    async generateReport(config: ReportConfig): Promise<void> {
        try {
            // Load translations
            const translations = await this.loadTranslations(config.language);
            
            // Load and compile components
            const components = [
                'header',
                'pr-decision',
                'pr-issues',
                'repo-issues',
                'score-display',
                'skills-breakdown',
                'educational',
                'pr-comment',
                'footer'
            ];
            
            const compiledComponents: string[] = [];
            
            for (const component of components) {
                const componentHtml = await this.loadComponent(component);
                const template = Handlebars.compile(componentHtml);
                const rendered = template({
                    ...config.data,
                    i18n: translations,
                    lang: config.language
                });
                compiledComponents.push(rendered);
            }
            
            // Load base layout
            const layout = await this.loadLayout();
            const layoutTemplate = Handlebars.compile(layout);
            
            // Generate final HTML
            const finalHtml = layoutTemplate({
                title: (typeof translations.title === 'string' ? translations.title : '').replace('{{pr_number}}', String(config.data.pr_number)),
                lang: config.language,
                [`lang_${config.language}`]: true,
                styles_path: './styles.css',
                scripts_path: './scripts.js',
                components: compiledComponents
            });
            
            // Write output file
            await fs.writeFile(config.outputPath, finalHtml);
            logger.info(`Report generated: ${config.outputPath}`);
            
            // Copy CSS and JS files if they don't exist in output directory
            const outputDir = path.dirname(config.outputPath);
            const cssSource = path.join(this.templatesPath, 'base', 'styles.css');
            const jsSource = path.join(this.templatesPath, 'base', 'scripts.js');
            const cssTarget = path.join(outputDir, 'styles.css');
            const jsTarget = path.join(outputDir, 'scripts.js');
            
            try {
                await fs.copyFile(cssSource, cssTarget);
                await fs.copyFile(jsSource, jsTarget);
            } catch (err) {
                // Files might already exist
            }
            
        } catch (error) {
            logger.error('Error generating report:', error as Error);
            throw error;
        }
    }
    
    async generateMultilingualReports(data: ReportData, outputDir: string): Promise<void> {
        const languages = ['en', 'ru', 'es', 'fr', 'de', 'ja', 'zh', 'pt', 'it', 'ko'];
        
        for (const lang of languages) {
            try {
                await this.generateReport({
                    language: lang,
                    data: data,
                    outputPath: path.join(outputDir, `report-${lang}.html`)
                });
            } catch (error) {
                logger.error(`Failed to generate report for language ${lang}:`, error as Error);
            }
        }
    }
}

// Example usage
export async function generateReports(data: ReportData, outputDir: string) {
    const generator = new ModularReportGenerator(
        path.join(__dirname, 'templates')
    );
    
    // Generate all language versions
    await generator.generateMultilingualReports(data, outputDir);
    
    // Or generate a specific language
    // await generator.generateReport({
    //     language: 'en',
    //     data: data,
    //     outputPath: path.join(outputDir, 'report-en.html')
    // });
}