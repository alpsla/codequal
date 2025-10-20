import Redis from 'ioredis';
import { getSimpleOpenRouterClient } from './simple-openrouter-client';

interface BraveWebResultItem {
  title: string;
  url: string;
  description?: string;
}

interface RankedResource extends BraveWebResultItem {
  score: number;
  source?: string;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * EducationalSearchService
 * 
 * Fetches high-signal educational resources using Brave Search, caches them
 * (Redis → memory fallback), and optionally summarizes via a minimal AI pass.
 */
export class EducationalSearchService {
  private redis?: Redis;
  private memoryCache = new Map<string, CacheEntry<RankedResource[]>>();
  private readonly braveApiKey?: string;
  private readonly cacheTtlMs: number;
  private readonly featureEnabled: boolean;

  constructor() {
    this.braveApiKey = process.env.BRAVE_API_KEY;
    this.cacheTtlMs = (parseInt(process.env.EDU_CACHE_TTL_DAYS || '7', 10) || 7) * 24 * 60 * 60 * 1000;
    this.featureEnabled = (process.env.EDU_USE_BRAVE || '').toLowerCase() === 'true';

    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 });
      } catch {
        this.redis = undefined;
      }
    }
  }

  isEnabled(): boolean {
    return this.featureEnabled && !!this.braveApiKey;
  }

  async getResourcesFor(ruleId: string, language: string): Promise<RankedResource[]> {
    const cacheKey = this.getCacheKey(ruleId, language);

    // 1) Try Redis
    if (this.redis) {
      try {
        const raw = await this.redis.get(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw) as CacheEntry<RankedResource[]>;
          if (parsed.expiresAt > Date.now()) return parsed.value;
        }
      } catch {
        // Ignore Redis errors, fall through to memory cache
      }
    }

    // 2) Memory cache
    const mem = this.memoryCache.get(cacheKey);
    if (mem && mem.expiresAt > Date.now()) return mem.value;

    // 3) Fetch via Brave
    const query = this.buildQuery(ruleId, language);
    const results = await this.searchBrave(query);
    const ranked = this.normalizeAndRank(results, ruleId, language).slice(0, 6);

    // 4) Store
    const entry: CacheEntry<RankedResource[]> = {
      value: ranked,
      expiresAt: Date.now() + this.cacheTtlMs
    };
    this.memoryCache.set(cacheKey, entry);
    if (this.redis) {
      try {
        await this.redis.setex(cacheKey, Math.floor(this.cacheTtlMs / 1000), JSON.stringify(entry));
      } catch {
        // Ignore Redis write errors, data is still in memory cache
      }
    }

    return ranked;
  }

  async summarize(ruleId: string, language: string, resources: RankedResource[], maxWords = 180): Promise<string> {
    const client = getSimpleOpenRouterClient();
    const top = resources.slice(0, 4);
    const links = top.map(r => `- ${r.title} (${r.url})`).join('\n');

    const systemPrompt = [
      'You are a senior educator producing concise, actionable learning guidance.',
      'Audience: experienced developers, need practical, modern references.',
      'Constraints: keep it concrete, language-aware, < ' + maxWords + ' words.',
    ].join(' ');

    const userPrompt = [
      `Rule/Pattern: ${ruleId}`,
      `Language: ${language}`,
      'Provide a short learning summary and how to fix similar issues, then list the references below.',
      'References:',
      links
    ].join('\n');

    // Strict: require explicit EDU_SUMMARY_MODEL from Supabase-configured env
    if ((process.env.STRICT_NO_FALLBACK === 'true' || (process.env.E2E_DISABLE_EMERGENCY_FALLBACK === 'true')) && !process.env.EDU_SUMMARY_MODEL) {
      throw new Error('ALERT: EDU_SUMMARY_MODEL is not configured under STRICT_NO_FALLBACK. Configure via Supabase-driven env.');
    }

    const resp = await client.chat({
      systemPrompt,
      userPrompt,
      model: process.env.EDU_SUMMARY_MODEL,
      temperature: 0.2,
      maxTokens: 600
    });

    return resp.content.trim();
  }

  private getCacheKey(ruleId: string, language: string): string {
    const normRule = ruleId.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').slice(0, 120);
    const lang = (language || 'any').toLowerCase();
    return `edu:brave:${lang}:${normRule}`;
  }

  private buildQuery(ruleId: string, language: string): string {
    const base = ruleId
      .replace(/java\.lang\.[^.]*/gi, '')
      .replace(/pmd\.|semgrep\.|checkstyle\./gi, '')
      .replace(/[^a-zA-Z0-9\s.-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const lang = (language || '').toLowerCase();
    const langTag = lang ? ` ${lang} code example` : '';
    return `${base} secure fix best practices${langTag}`.trim();
  }

  private async searchBrave(query: string): Promise<BraveWebResultItem[]> {
    if (!this.braveApiKey) return [];
    try {
      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10&search_lang=en`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.braveApiKey}`
        }
      } as any);
      if (!res.ok) return [];
      const data = await res.json() as any;
      const items: BraveWebResultItem[] = (data.web?.results || []).map((r: any) => ({
        title: r.title,
        url: r.url,
        description: r.description
      }));
      return items;
    } catch {
      return [];
    }
  }

  private normalizeAndRank(items: BraveWebResultItem[], ruleId: string, language: string): RankedResource[] {
    const preferredHosts = [
      'owasp.org', 'cwe.mitre.org', 'docs.oracle.com', 'kotlinlang.org', 'go.dev', 'learn.microsoft.com',
      'rules.sonarsource.com', 'pmd.github.io', 'semgrep.dev', 'jetbrains.com', 'snyk.io', 'veracode.com'
    ];
    const ruleTokens = ruleId.toLowerCase().split(/[\s._-]+/).filter(Boolean);
    const lang = (language || '').toLowerCase();
    const seen = new Set<string>();

    const ranked = items
      .filter(i => i && i.url && !i.url.includes('translate.google'))
      .map<RankedResource>(i => {
        const host = this.extractHost(i.url);
        let score = 0;
        if (preferredHosts.some(h => host.endsWith(h))) score += 5;
        if (i.title?.toLowerCase().includes(lang)) score += 2;
        if (i.description?.toLowerCase().includes(lang)) score += 1;
        for (const t of ruleTokens) {
          if (i.title?.toLowerCase().includes(t)) score += 2;
          if (i.description?.toLowerCase().includes(t)) score += 1;
        }
        return { ...i, score, source: host };
      })
      .sort((a, b) => b.score - a.score)
      .filter(r => {
        const key = r.url.split('#')[0];
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    return ranked;
  }

  private extractHost(url: string): string {
    try {
      const u = new URL(url);
      return u.hostname || '';
    } catch {
      return '';
    }
  }
}



