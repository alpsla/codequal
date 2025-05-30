import { getSupabase } from '../supabase/client';
import { Tables } from '../supabase/client';

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
 * Interface for joined skill data
 */
interface SkillWithCategory {
  id: string;
  user_id: string;
  category_id: string;
  level: number;
  last_updated: string;
  created_at: string;
  skill_categories?: {
    name?: string;
  };
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
    
    if (!data) {
      return [];
    }
    
    return data.map(item => this.mapToSkillCategory(item as Tables['skill_categories']));
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
    
    if (!data) {
      throw new Error(`Skill category not found: ${id}`);
    }
    
    return this.mapToSkillCategory(data as Tables['skill_categories']);
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
    
    if (!data) {
      return [];
    }
    
    return data.map((item: Record<string, unknown>) => {
      const skillData = item as unknown as SkillWithCategory;
      return {
        id: skillData.id,
        userId: skillData.user_id,
        categoryId: skillData.category_id,
        categoryName: skillData.skill_categories?.name,
        level: Number(skillData.level),
        lastUpdated: new Date(skillData.last_updated),
        createdAt: new Date(skillData.created_at)
      };
    });
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
    
    if (!skillData) {
      throw new Error(`Failed to update skill: ${skillId}`);
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
    
    const skill = skillData as unknown as SkillWithCategory;
    
    return {
      id: skill.id,
      userId: skill.user_id,
      categoryId: skill.category_id,
      categoryName: skill.skill_categories?.name,
      level: Number(skill.level),
      lastUpdated: new Date(skill.last_updated),
      createdAt: new Date(skill.created_at)
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
    
    if (!data) {
      return [];
    }
    
    return data.map(item => this.mapToSkillHistoryEntry(item as Tables['skill_history']));
  }
  
  /**
   * Map database record to skill category
   * @param data Database record
   * @returns Skill category
   */
  private static mapToSkillCategory(data: Tables['skill_categories']): SkillCategory {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      parentId: data.parent_id,
      createdAt: new Date(data.created_at)
    };
  }
  
  /**
   * Map database record to skill history entry
   * @param data Database record
   * @returns Skill history entry
   */
  private static mapToSkillHistoryEntry(data: Tables['skill_history']): SkillHistoryEntry {
    return {
      id: data.id,
      skillId: data.skill_id,
      level: Number(data.level),
      evidenceType: data.evidence_type,
      evidenceId: data.evidence_id,
      createdAt: new Date(data.created_at)
    };
  }
}