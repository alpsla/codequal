"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoryModel = void 0;
const client_1 = require("../supabase/client");
/**
 * Repository model for database operations
 */
class RepositoryModel {
    /**
     * Find or create a repository
     * @param provider Repository provider (github, gitlab, etc.)
     * @param name Repository name (owner/repo)
     * @param url Repository URL
     * @param isPrivate Whether the repository is private
     * @returns Repository
     */
    static async findOrCreate(provider, name, url, isPrivate = false) {
        const supabase = (0, client_1.getSupabase)();
        // Try to find existing repository
        const { data: existingRepo, error: findError } = await supabase
            .from('repositories')
            .select()
            .eq('provider', provider)
            .eq('name', name)
            .maybeSingle();
        if (findError) {
            throw new Error(`Error finding repository: ${findError.message}`);
        }
        // If found, return it
        if (existingRepo) {
            return this.mapToRepository(existingRepo);
        }
        // Otherwise, create a new repository
        const { data: newRepo, error: createError } = await supabase
            .from('repositories')
            .insert({
            provider,
            name,
            url,
            private: isPrivate
        })
            .select()
            .single();
        if (createError) {
            throw new Error(`Error creating repository: ${createError.message}`);
        }
        if (!newRepo) {
            throw new Error('Failed to create repository: No data returned');
        }
        return this.mapToRepository(newRepo);
    }
    /**
     * Get repository by ID
     * @param id Repository ID
     * @returns Repository
     */
    static async getById(id) {
        const supabase = (0, client_1.getSupabase)();
        const { data, error } = await supabase
            .from('repositories')
            .select()
            .eq('id', id)
            .single();
        if (error) {
            throw new Error(`Error getting repository: ${error.message}`);
        }
        if (!data) {
            throw new Error(`Repository not found: ${id}`);
        }
        return this.mapToRepository(data);
    }
    /**
     * Get repositories by provider and owner
     * @param provider Repository provider
     * @param owner Repository owner
     * @returns Repositories
     */
    static async getByProviderAndOwner(provider, owner) {
        const supabase = (0, client_1.getSupabase)();
        const { data, error } = await supabase
            .from('repositories')
            .select()
            .eq('provider', provider)
            .ilike('name', `${owner}/%`);
        if (error) {
            throw new Error(`Error getting repositories: ${error.message}`);
        }
        if (!data) {
            return [];
        }
        return data.map((item) => this.mapToRepository(item));
    }
    /**
     * Map database record to repository
     * @param data Database record
     * @returns Repository
     */
    static mapToRepository(data) {
        return {
            id: data.id,
            provider: data.provider,
            name: data.name,
            url: data.url,
            private: data.private,
            primaryLanguage: data.primary_language,
            languages: data.languages,
            size: data.size,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        };
    }
}
exports.RepositoryModel = RepositoryModel;
//# sourceMappingURL=repository.js.map