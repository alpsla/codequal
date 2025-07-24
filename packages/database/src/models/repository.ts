import { getSupabase } from '../supabase/client';
import type { Tables } from '../supabase/client';

/**
 * Interface for repository data
 */
export interface Repository {
  id: string;
  provider: string;
  name: string;
  url: string;
  private: boolean;
  primaryLanguage?: string;
  languages?: Record<string, number>;
  size?: number; // Repository size in bytes
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Repository model for database operations
 */
export class RepositoryModel {
  /**
   * Find or create a repository
   * @param provider Repository provider (github, gitlab, etc.)
   * @param name Repository name (owner/repo)
   * @param url Repository URL
   * @param isPrivate Whether the repository is private
   * @returns Repository
   */
  static async findOrCreate(
    provider: string,
    name: string,
    url: string,
    isPrivate = false
  ): Promise<Repository> {
    const supabase = getSupabase();
    
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
      return this.mapToRepository(existingRepo as Tables['repositories']);
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
    
    return this.mapToRepository(newRepo as Tables['repositories']);
  }
  
  /**
   * Get repository by ID
   * @param id Repository ID
   * @returns Repository
   */
  static async getById(id: string): Promise<Repository> {
    const supabase = getSupabase();
    
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
    
    return this.mapToRepository(data as Tables['repositories']);
  }
  
  /**
   * Get repositories by provider and owner
   * @param provider Repository provider
   * @param owner Repository owner
   * @returns Repositories
   */
  static async getByProviderAndOwner(provider: string, owner: string): Promise<Repository[]> {
    const supabase = getSupabase();
    
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
    
    return data.map((item) => this.mapToRepository(item as Tables['repositories']));
  }
  
  /**
   * Map database record to repository
   * @param data Database record
   * @returns Repository
   */
  private static mapToRepository(data: Tables['repositories']): Repository {
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