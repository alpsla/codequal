/**
 * Supabase data store stub
 */

export class SupabaseDataStore {
  public cache: Map<string, any> = new Map();
  
  constructor(url?: string, key?: string) {
    console.log('SupabaseDataStore initialized');
  }
  
  async get(table: string, id: string): Promise<any> {
    return this.cache.get(`${table}:${id}`) || null;
  }
  
  async set(table: string, data: any): Promise<void> {
    console.log(`Data stored in ${table}`);
    if (data.id) {
      this.cache.set(`${table}:${data.id}`, data);
    }
  }
  
  async query(table: string, filters?: any): Promise<any[]> {
    return [];
  }
}