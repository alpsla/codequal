// If @supabase/supabase-js module is not found, define minimal types for TypeScript
// This is a temporary workaround until dependencies are installed

/**
 * Interface for Supabase response with data and error
 */
type SupabaseResponse<T> = Promise<{
  data: T | null;
  error: Error | null;
}>;

/**
 * Interface for Supabase query builder
 */
interface SupabaseQueryBuilder {
  select: (columns?: string) => SupabaseResponse<unknown[]>;
  single: () => SupabaseResponse<unknown>;
  maybeSingle: () => SupabaseResponse<unknown>;
  order: (column: string, options?: { ascending?: boolean }) => SupabaseQueryBuilder;
  limit: (count: number) => SupabaseQueryBuilder;
  eq: (column: string, value: unknown) => SupabaseQueryBuilder;
  neq: (column: string, value: unknown) => SupabaseQueryBuilder;
  ilike: (column: string, value: string) => SupabaseQueryBuilder;
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
  from(table: string): {
    select: (columns?: string) => SupabaseResponse<unknown[]>;
    insert: (data: Record<string, unknown>) => SupabaseResponse<unknown>;
    update: (data: Record<string, unknown>) => SupabaseResponse<unknown>;
    delete: () => SupabaseResponse<unknown>;
    eq: (column: string, value: unknown) => SupabaseQueryBuilder;
    neq: (column: string, value: unknown) => SupabaseQueryBuilder;
    gt: (column: string, value: unknown) => SupabaseQueryBuilder;
    lt: (column: string, value: unknown) => SupabaseQueryBuilder;
    gte: (column: string, value: unknown) => SupabaseQueryBuilder;
    lte: (column: string, value: unknown) => SupabaseQueryBuilder;
    is: (column: string, value: unknown) => SupabaseQueryBuilder;
    in: (column: string, values: unknown[]) => SupabaseQueryBuilder;
    contains: (column: string, value: unknown) => SupabaseQueryBuilder;
    containedBy: (column: string, value: unknown) => SupabaseQueryBuilder;
    rangeLt: (column: string, range: unknown) => SupabaseQueryBuilder;
    rangeGt: (column: string, range: unknown) => SupabaseQueryBuilder;
    rangeGte: (column: string, range: unknown) => SupabaseQueryBuilder;
    rangeLte: (column: string, range: unknown) => SupabaseQueryBuilder;
    rangeAdjacent: (column: string, range: unknown) => SupabaseQueryBuilder;
    overlaps: (column: string, value: unknown) => SupabaseQueryBuilder;
    textSearch: (column: string, query: string, options?: { config?: string }) => SupabaseQueryBuilder;
    filter: (column: string, operator: string, value: unknown) => SupabaseQueryBuilder;
    match: (query: Record<string, unknown>) => SupabaseQueryBuilder;
    single: () => SupabaseResponse<unknown>;
    maybeSingle: () => SupabaseResponse<unknown>;
    order: (column: string, options?: { ascending?: boolean }) => SupabaseQueryBuilder;
    limit: (count: number) => SupabaseQueryBuilder;
    range: (from: number, to: number) => SupabaseQueryBuilder;
    abortSignal: (signal: AbortSignal) => SupabaseQueryBuilder;
    ilike: (column: string, value: string) => SupabaseQueryBuilder;
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
      select: () => Promise.resolve({ data: [], error: null }),
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      order: () => mockQueryBuilder,
      limit: () => mockQueryBuilder,
      eq: () => mockQueryBuilder,
      neq: () => mockQueryBuilder,
      ilike: () => mockQueryBuilder,
    } as unknown as SupabaseQueryBuilder;
    
    const mockResult = {
      from: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
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
        single: () => Promise.resolve({ data: null, error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        order: () => mockQueryBuilder,
        limit: () => mockQueryBuilder,
        range: () => mockQueryBuilder,
        abortSignal: () => mockQueryBuilder,
        ilike: () => mockQueryBuilder,
      }),
      auth: {
        signUp: () => Promise.resolve({ data: null, error: null }),
        signIn: () => Promise.resolve({ data: null, error: null }),
        signOut: () => Promise.resolve({ data: null, error: null }),
        getUser: () => Promise.resolve({ data: null, error: null }),
        getSession: () => Promise.resolve({ data: null, error: null }),
        refreshSession: () => Promise.resolve({ data: null, error: null }),
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