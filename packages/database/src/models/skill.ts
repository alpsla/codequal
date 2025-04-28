import { getSupabase } from '../supabase/client';

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
  categoryName?: string; // Joined field
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
export class SkillModel {
  /**
   * Get all skill categories
   * @returns Skill categories
   */
  static async getAllCategories(): Promise<SkillCategory[]> {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('skill_categories')
      .select()
      .order('name', { ascending: true });
    
    if (error) {
      throw new Error(`Error getting skill categories: ${error.message}`);
    }
    
    return data.map(this.mapToSkillCategory);
  }
  
  /**
   * Get skill category by ID
   * @param id Category ID
   * @returns Skill category
   */
  static async getCategoryById(id: string): Promise<SkillCategory> {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('skill_categories')
      .select()
      .eq('id', id)
      .single();
    
    if (error) {
      throw new Error(`Error getting skill category: ${error.message}`);
    }
    
    return this.mapToSkillCategory(data);
  }
  
  /**
   * Get developer skills by user ID
   * @param userId User ID
   * @returns Developer skills
   */
  static async getUserSkills(userId: string): Promise<DeveloperSkill[]> {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('developer_skills')
      .select(`
        *,
        skill_categories(name)
      `)
      .eq('user_id', userId);
    
    if (error) {
      throw new Error(`Error getting user skills: ${error.message}`);
    }
    
    return data.map((item: Record<string, unknown>) => ({
      id: item.id as string,
      userId: item.user_id as string,
      categoryId: item.category_id as string,
      categoryName: item.skill_categories?.name as string | undefined,
      level: Number(item.level),
      lastUpdated: new Date(item.last_updated as string),
      createdAt: new Date(item.created_at as string)
    }));
  }
  
  /**
   * Update developer skill
   * @param skillId Skill ID
   * @param level New skill level
   * @param evidenceType Evidence type
   * @param evidenceId Evidence ID (optional)
   * @returns Updated developer skill
   */
  static async updateSkill(
    skillId: string,
    level: number,
    evidenceType: string,
    evidenceId?: string
  ): Promise<DeveloperSkill> {
    const supabase = getSupabase();
    
    // Start a transaction
    // Update skill level
    const { data: skillData, error: skillError } = await supabase
      .from('developer_skills')
      .update({
        level: level,
        last_updated: new Date().toISOString()
      })
      .eq('id', skillId)
      .select(`
        *,
        skill_categories(name)
      `)
      .single();
    
    if (skillError) {
      throw new Error(`Error updating skill: ${skillError.message}`);
    }
    
    // Add history entry
    const { error: historyError } = await supabase
      .from('skill_history')
      .insert({
        skill_id: skillId,
        level: level,
        evidence_type: evidenceType,
        evidence_id: evidenceId
      });
    
    if (historyError) {
      throw new Error(`Error adding skill history: ${historyError.message}`);
    }
    
    return {
      id: skillData.id as string,
      userId: skillData.user_id as string,
      categoryId: skillData.category_id as string,
      categoryName: skillData.skill_categories?.name as string | undefined,
      level: Number(skillData.level),
      lastUpdated: new Date(skillData.last_updated as string),
      createdAt: new Date(skillData.created_at as string)
    };
  }
  
  /**
   * Get skill history
   * @param skillId Skill ID
   * @returns Skill history entries
   */
  static async getSkillHistory(skillId: string): Promise<SkillHistoryEntry[]> {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('skill_history')
      .select()
      .eq('skill_id', skillId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Error getting skill history: ${error.message}`);
    }
    
    return data.map(this.mapToSkillHistoryEntry);
  }
  
  /**
   * Map database record to skill category
   * @param data Database record
   * @returns Skill category
   */
  private static mapToSkillCategory(data: Record<string, unknown>): SkillCategory {
    return {
      id: data.id as string,
      name: data.name as string,
      description: data.description as string | undefined,
      parentId: data.parent_id as string | undefined,
      createdAt: new Date(data.created_at as string)
    };
  }
  
  /**
   * Map database record to skill history entry
   * @param data Database record
   * @returns Skill history entry
   */
  private static mapToSkillHistoryEntry(data: Record<string, unknown>): SkillHistoryEntry {
    return {
      id: data.id as string,
      skillId: data.skill_id as string,
      level: Number(data.level),
      evidenceType: data.evidence_type as string,
      evidenceId: data.evidence_id as string | undefined,
      createdAt: new Date(data.created_at as string)
    };
  }
}