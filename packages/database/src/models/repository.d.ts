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
    size?: number;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Repository model for database operations
 */
export declare class RepositoryModel {
    /**
     * Find or create a repository
     * @param provider Repository provider (github, gitlab, etc.)
     * @param name Repository name (owner/repo)
     * @param url Repository URL
     * @param isPrivate Whether the repository is private
     * @returns Repository
     */
    static findOrCreate(provider: string, name: string, url: string, isPrivate?: boolean): Promise<Repository>;
    /**
     * Get repository by ID
     * @param id Repository ID
     * @returns Repository
     */
    static getById(id: string): Promise<Repository>;
    /**
     * Get repositories by provider and owner
     * @param provider Repository provider
     * @param owner Repository owner
     * @returns Repositories
     */
    static getByProviderAndOwner(provider: string, owner: string): Promise<Repository[]>;
    /**
     * Map database record to repository
     * @param data Database record
     * @returns Repository
     */
    private static mapToRepository;
}
//# sourceMappingURL=repository.d.ts.map