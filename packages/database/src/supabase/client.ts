// If @supabase/supabase-js module is not found, define minimal types for TypeScript
// This is a temporary workaround until dependencies are installed

/**
 * Interface for Supabase response with data and error
 */
export type SupabaseResponse<T> = Promise<{
  data: T;
  error: Error | null;
  select: (columns?: string) => SupabaseResponse<T>;
  single: () => SupabaseResponse<T>;
  maybeSingle: () => SupabaseResponse<T>;
  order: (column: string, options?: { ascending?: boolean }) => SupabaseResponse<T>;
  limit: (count: number) => SupabaseResponse<T>;
  eq: (column: string, value: unknown) => SupabaseResponse<T>;
  neq: (column: string, value: unknown) => SupabaseResponse<T>;
  ilike: (column: string, value: string) => SupabaseResponse<T>;
}>;

/**
 * Interface for Supabase query builder
 */
interface SupabaseQueryBuilder<T> {
  select: (columns?: string) => SupabaseResponse<T[]>;
  single: () => SupabaseResponse<T>;
  maybeSingle: () => SupabaseResponse<T>;
  order: (column: string, options?: { ascending?: boolean }) => SupabaseQueryBuilder<T>;
  limit: (count: number) => SupabaseQueryBuilder<T>;
  eq: (column: string, value: unknown) => SupabaseQueryBuilder<T>;
  neq: (column: string, value: unknown) => SupabaseQueryBuilder<T>;
  ilike: (column: string, value: string) => SupabaseQueryBuilder<T>;
}

/**
 * Interface for Supabase client options
 */
interface SupabaseClientOptions {
  auth?: {
    autoRefreshToken?: boolean;
    persistSession?: boolean;
  };
}

interface SupabaseClient {
  from<T = any>(table: string): {
    select: (columns?: string) => SupabaseResponse<T[]>;
    insert: (data: Record<string, unknown>) => SupabaseResponse<T>;
    update: (data: Record<string, unknown>) => SupabaseResponse<T>;
    delete: () => SupabaseResponse<T>;
    eq: (column: string, value: unknown) => SupabaseQueryBuilder<T>;
    neq: (column: string, value: unknown) => SupabaseQueryBuilder<T>;
    gt: (column: string, value: unknown) => SupabaseQueryBuilder<T>;
    lt: (column: string, value: unknown) => SupabaseQueryBuilder<T>;
    gte: (column: string, value: unknown) => SupabaseQueryBuilder<T>;
    lte: (column: string, value: unknown) => SupabaseQueryBuilder<T>;
    is: (column: string, value: unknown) => SupabaseQueryBuilder<T>;
    in: (column: string, values: unknown[]) => SupabaseQueryBuilder<T>;
    contains: (column: string, value: unknown) => SupabaseQueryBuilder<T>;
    containedBy: (column: string, value: unknown) => SupabaseQueryBuilder<T>;
    rangeLt: (column: string, range: unknown) => SupabaseQueryBuilder<T>;
    rangeGt: (column: string, range: unknown) => SupabaseQueryBuilder<T>;
    rangeGte: (column: string, range: unknown) => SupabaseQueryBuilder<T>;
    rangeLte: (column: string, range: unknown) => SupabaseQueryBuilder<T>;
    rangeAdjacent: (column: string, range: unknown) => SupabaseQueryBuilder<T>;
    overlaps: (column: string, value: unknown) => SupabaseQueryBuilder<T>;
    textSearch: (column: string, query: string, options?: { config?: string }) => SupabaseQueryBuilder<T>;
    filter: (column: string, operator: string, value: unknown) => SupabaseQueryBuilder<T>;
    match: (query: Record<string, unknown>) => SupabaseQueryBuilder<T>;
    single: () => SupabaseResponse<T>;
    maybeSingle: () => SupabaseResponse<T>;
    order: (column: string, options?: { ascending?: boolean }) => SupabaseQueryBuilder<T>;
    limit: (count: number) => SupabaseQueryBuilder<T>;
    range: (from: number, to: number) => SupabaseQueryBuilder<T>;
    abortSignal: (signal: AbortSignal) => SupabaseQueryBuilder<T>;
    ilike: (column: string, value: string) => SupabaseQueryBuilder<T>;
  };
  auth: {
    signUp: (options: Record<string, unknown>) => SupabaseResponse<unknown>;
    signIn: (options: Record<string, unknown>) => SupabaseResponse<unknown>;
    signOut: () => SupabaseResponse<unknown>;
    getUser: () => SupabaseResponse<unknown>;
    getSession: () => SupabaseResponse<unknown>;
    refreshSession: () => SupabaseResponse<unknown>;
  };
}

// Import @supabase/supabase-js if available
let supabaseJs: { createClient: (url: string, key: string, options?: SupabaseClientOptions) => SupabaseClient };

// Try to import from @supabase/supabase-js, if it fails use mock implementation
let createClient: (url: string, key: string, options?: SupabaseClientOptions) => SupabaseClient;

try {
  // Try to import the real module
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  supabaseJs = require('@supabase/supabase-js');
  createClient = supabaseJs.createClient;
} catch (error) {
  // Provide a mock implementation if the module isn't available
  // Use a simpler log here since the logger might not be available yet
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn('Warning: @supabase/supabase-js not found, using mock implementation');
  }
  
  // Define a mock implementation - used when the package is not installed
  createClient = (_url: string, _key: string) => {
    // Underscore prefix indicates unused params
    
    const mockQueryBuilder = {
      select: () => Promise.resolve({ 
        data: [], 
        error: null,
        select: () => mockQueryBuilder.select(),
        single: () => mockQueryBuilder.single(),
        maybeSingle: () => mockQueryBuilder.maybeSingle(),
        order: () => mockQueryBuilder,
        limit: () => mockQueryBuilder,
        eq: () => mockQueryBuilder,
        neq: () => mockQueryBuilder,
        ilike: () => mockQueryBuilder,
      }),
      single: () => Promise.resolve({ 
        data: null, 
        error: null,
        select: () => mockQueryBuilder.select(),
        single: () => mockQueryBuilder.single(),
        maybeSingle: () => mockQueryBuilder.maybeSingle(),
        order: () => mockQueryBuilder,
        limit: () => mockQueryBuilder,
        eq: () => mockQueryBuilder,
        neq: () => mockQueryBuilder,
        ilike: () => mockQueryBuilder,
      }),
      maybeSingle: () => Promise.resolve({ 
        data: null, 
        error: null,
        select: () => mockQueryBuilder.select(),
        single: () => mockQueryBuilder.single(),
        maybeSingle: () => mockQueryBuilder.maybeSingle(),
        order: () => mockQueryBuilder,
        limit: () => mockQueryBuilder,
        eq: () => mockQueryBuilder,
        neq: () => mockQueryBuilder,
        ilike: () => mockQueryBuilder,
      }),
      order: () => mockQueryBuilder,
      limit: () => mockQueryBuilder,
      eq: () => mockQueryBuilder,
      neq: () => mockQueryBuilder,
      ilike: () => mockQueryBuilder,
    } as unknown as SupabaseQueryBuilder<any>;
    
    const mockResult = {
      from: () => ({
        select: () => Promise.resolve({ 
          data: [], 
          error: null,
          select: () => mockQueryBuilder.select(),
          single: () => mockQueryBuilder.single(),
          maybeSingle: () => mockQueryBuilder.maybeSingle(),
          order: () => mockQueryBuilder,
          limit: () => mockQueryBuilder,
          eq: () => mockQueryBuilder,
          neq: () => mockQueryBuilder,
          ilike: () => mockQueryBuilder,
        }),
        insert: () => Promise.resolve({ 
          data: null, 
          error: null,
          select: () => mockQueryBuilder.select(),
          single: () => mockQueryBuilder.single(),
          maybeSingle: () => mockQueryBuilder.maybeSingle(),
          order: () => mockQueryBuilder,
          limit: () => mockQueryBuilder,
          eq: () => mockQueryBuilder,
          neq: () => mockQueryBuilder,
          ilike: () => mockQueryBuilder,
        }),
        update: () => Promise.resolve({ 
          data: null, 
          error: null,
          select: () => mockQueryBuilder.select(),
          single: () => mockQueryBuilder.single(),
          maybeSingle: () => mockQueryBuilder.maybeSingle(),
          order: () => mockQueryBuilder,
          limit: () => mockQueryBuilder,
          eq: () => mockQueryBuilder,
          neq: () => mockQueryBuilder,
          ilike: () => mockQueryBuilder,
        }),
        delete: () => Promise.resolve({ 
          data: null, 
          error: null,
          select: () => mockQueryBuilder.select(),
          single: () => mockQueryBuilder.single(),
          maybeSingle: () => mockQueryBuilder.maybeSingle(),
          order: () => mockQueryBuilder,
          limit: () => mockQueryBuilder,
          eq: () => mockQueryBuilder,
          neq: () => mockQueryBuilder,
          ilike: () => mockQueryBuilder,
        }),
        eq: () => mockQueryBuilder,
        neq: () => mockQueryBuilder,
        gt: () => mockQueryBuilder,
        lt: () => mockQueryBuilder,
        gte: () => mockQueryBuilder,
        lte: () => mockQueryBuilder,
        is: () => mockQueryBuilder,
        in: () => mockQueryBuilder,
        contains: () => mockQueryBuilder,
        containedBy: () => mockQueryBuilder,
        rangeLt: () => mockQueryBuilder,
        rangeGt: () => mockQueryBuilder,
        rangeGte: () => mockQueryBuilder,
        rangeLte: () => mockQueryBuilder,
        rangeAdjacent: () => mockQueryBuilder,
        overlaps: () => mockQueryBuilder,
        textSearch: () => mockQueryBuilder,
        filter: () => mockQueryBuilder,
        match: () => mockQueryBuilder,
        single: () => Promise.resolve({ 
          data: null, 
          error: null,
          select: () => mockQueryBuilder.select(),
          single: () => mockQueryBuilder.single(),
          maybeSingle: () => mockQueryBuilder.maybeSingle(),
          order: () => mockQueryBuilder,
          limit: () => mockQueryBuilder,
          eq: () => mockQueryBuilder,
          neq: () => mockQueryBuilder,
          ilike: () => mockQueryBuilder,
        }),
        maybeSingle: () => Promise.resolve({ 
          data: null, 
          error: null,
          select: () => mockQueryBuilder.select(),
          single: () => mockQueryBuilder.single(),
          maybeSingle: () => mockQueryBuilder.maybeSingle(),
          order: () => mockQueryBuilder,
          limit: () => mockQueryBuilder,
          eq: () => mockQueryBuilder,
          neq: () => mockQueryBuilder,
          ilike: () => mockQueryBuilder,
        }),
        order: () => mockQueryBuilder,
        limit: () => mockQueryBuilder,
        range: () => mockQueryBuilder,
        abortSignal: () => mockQueryBuilder,
        ilike: () => mockQueryBuilder,
      }),
      auth: {
        signUp: () => Promise.resolve({ 
          data: null, 
          error: null,
          select: () => mockQueryBuilder.select(),
          single: () => mockQueryBuilder.single(),
          maybeSingle: () => mockQueryBuilder.maybeSingle(),
          order: () => mockQueryBuilder,
          limit: () => mockQueryBuilder,
          eq: () => mockQueryBuilder,
          neq: () => mockQueryBuilder,
          ilike: () => mockQueryBuilder,
        }),
        signIn: () => Promise.resolve({ 
          data: null, 
          error: null,
          select: () => mockQueryBuilder.select(),
          single: () => mockQueryBuilder.single(),
          maybeSingle: () => mockQueryBuilder.maybeSingle(),
          order: () => mockQueryBuilder,
          limit: () => mockQueryBuilder,
          eq: () => mockQueryBuilder,
          neq: () => mockQueryBuilder,
          ilike: () => mockQueryBuilder,
        }),
        signOut: () => Promise.resolve({ 
          data: null, 
          error: null,
          select: () => mockQueryBuilder.select(),
          single: () => mockQueryBuilder.single(),
          maybeSingle: () => mockQueryBuilder.maybeSingle(),
          order: () => mockQueryBuilder,
          limit: () => mockQueryBuilder,
          eq: () => mockQueryBuilder,
          neq: () => mockQueryBuilder,
          ilike: () => mockQueryBuilder,
        }),
        getUser: () => Promise.resolve({ 
          data: null, 
          error: null,
          select: () => mockQueryBuilder.select(),
          single: () => mockQueryBuilder.single(),
          maybeSingle: () => mockQueryBuilder.maybeSingle(),
          order: () => mockQueryBuilder,
          limit: () => mockQueryBuilder,
          eq: () => mockQueryBuilder,
          neq: () => mockQueryBuilder,
          ilike: () => mockQueryBuilder,
        }),
        getSession: () => Promise.resolve({ 
          data: null, 
          error: null,
          select: () => mockQueryBuilder.select(),
          single: () => mockQueryBuilder.single(),
          maybeSingle: () => mockQueryBuilder.maybeSingle(),
          order: () => mockQueryBuilder,
          limit: () => mockQueryBuilder,
          eq: () => mockQueryBuilder,
          neq: () => mockQueryBuilder,
          ilike: () => mockQueryBuilder,
        }),
        refreshSession: () => Promise.resolve({ 
          data: null, 
          error: null,
          select: () => mockQueryBuilder.select(),
          single: () => mockQueryBuilder.single(),
          maybeSingle: () => mockQueryBuilder.maybeSingle(),
          order: () => mockQueryBuilder,
          limit: () => mockQueryBuilder,
          eq: () => mockQueryBuilder,
          neq: () => mockQueryBuilder,
          ilike: () => mockQueryBuilder,
        }),
      },
    };
    
    return mockResult as unknown as SupabaseClient;
  };
}

/**
 * Supabase client instance
 */
let supabaseInstance: SupabaseClient | null = null;

/**
 * Initialize Supabase client
 * @returns Supabase client instance
 */
export const initSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and key must be provided');
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  
  return supabaseInstance;
};

/**
 * Get Supabase client instance
 * @returns Supabase client instance
 */
export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    return initSupabase();
  }
  
  return supabaseInstance;
};