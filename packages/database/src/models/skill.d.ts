/**
 * Interface for skill category
 */
export interface SkillCategory {
    id: string;
    name: string;
    description?: string;
    parentId?: string;
    createdAt: Date;
}
/**
 * Interface for developer skill
 */
export interface DeveloperSkill {
    id: string;
    userId: string;
    categoryId: string;
    categoryName?: string;
    level: number;
    lastUpdated: Date;
    createdAt: Date;
}
/**
 * Interface for skill history entry
 */
export interface SkillHistoryEntry {
    id: string;
    skillId: string;
    level: number;
    evidenceType: string;
    evidenceId?: string;
    createdAt: Date;
}
/**
 * Skill model for database operations
 */
export declare class SkillModel {
    /**
     * Get all skill categories
     * @returns Skill categories
     */
    static getAllCategories(): Promise<SkillCategory[]>;
    /**
     * Get skill category by ID
     * @param id Category ID
     * @returns Skill category
     */
    static getCategoryById(id: string): Promise<SkillCategory>;
    /**
     * Get developer skills by user ID
     * @param userId User ID
     * @returns Developer skills
     */
    static getUserSkills(userId: string): Promise<DeveloperSkill[]>;
    /**
     * Update developer skill
     * @param skillId Skill ID
     * @param level New skill level
     * @param evidenceType Evidence type
     * @param evidenceId Evidence ID (optional)
     * @returns Updated developer skill
     */
    static updateSkill(skillId: string, level: number, evidenceType: string, evidenceId?: string): Promise<DeveloperSkill>;
    /**
     * Get skill history
     * @param skillId Skill ID
     * @returns Skill history entries
     */
    static getSkillHistory(skillId: string): Promise<SkillHistoryEntry[]>;
    /**
     * Map database record to skill category
     * @param data Database record
     * @returns Skill category
     */
    private static mapToSkillCategory;
    /**
     * Map database record to skill history entry
     * @param data Database record
     * @returns Skill history entry
     */
    private static mapToSkillHistoryEntry;
}
//# sourceMappingURL=skill.d.ts.map