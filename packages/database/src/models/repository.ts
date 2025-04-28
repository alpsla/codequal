import { getSupabase } from '../supabase/client';

/**
 * Interface for repository data
 */
export interface Repository {
  id: string;
  provider: string;
  name: string;
  url: string;
  private: boolean;
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
    
    return this.mapToRepository(newRepo);
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
    
    return this.mapToRepository(data);
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
    
    return data.map(this.mapToRepository);
  }
  
  /**
   * Map database record to repository
   * @param data Database record
   * @returns Repository
   */
  private static mapToRepository(data: Record<string, unknown>): Repository {
    return {
      id: data.id as string,
      provider: data.provider as string,
      name: data.name as string,
      url: data.url as string,
      private: Boolean(data.private),
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string)
    };
  }
}