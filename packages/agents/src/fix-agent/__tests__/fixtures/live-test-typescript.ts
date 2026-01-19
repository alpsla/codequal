/**
 * Live Test TypeScript File for Tier 2 Native Fixer Validation
 *
 * This file contains INTENTIONAL issues that should be fixed by various tiers:
 *
 * Tier 1 (ESLint --fix):
 * - semi: Missing semicolons
 * - quotes: Inconsistent quote style (single vs double)
 * - comma-dangle: Missing trailing commas
 * - indent: Inconsistent indentation
 * - no-trailing-spaces: Trailing whitespace
 *
 * Tier 3 (AI Required):
 * - @typescript-eslint/no-explicit-any: Requires semantic understanding to replace
 * - @typescript-eslint/no-unused-vars: Requires understanding of code intent
 *
 * DO NOT manually fix these issues - they are test fixtures.
 */

// Tier 1: Missing semicolons (semi rule)
const APP_NAME = "TestApp"
const VERSION = "1.0.0"
const DEBUG_MODE = true

// Tier 1: Inconsistent quotes (quotes rule) - should be single quotes
const MESSAGE = "Hello World"
const ERROR_MSG = "Something went wrong"
const SUCCESS = "Operation completed"

// Tier 3: @typescript-eslint/no-explicit-any - requires AI to determine proper type
interface UserData {
  id: number
  name: string
  metadata: any  // @typescript-eslint/no-explicit-any
  settings: any  // @typescript-eslint/no-explicit-any
  extraData: any  // @typescript-eslint/no-explicit-any
}

// Tier 3: Function with any parameters - needs AI to infer types
function processData(input: any, options: any): any {
  if (input === null) {
    return null
  }
  const result: any = {
    processed: true,
    data: input,
    opts: options
  }
  return result
}

// Tier 1: Missing semicolons and trailing commas
const config = {
  host: "localhost",
  port: 3000,
  secure: false,
  timeout: 5000
}

// Tier 3: Array with any type - needs AI to determine element type
function filterItems(items: any[]): any[] {
  return items.filter((item: any) => item !== null)
}

// Tier 1: Mixed quote styles
const ENDPOINTS = {
  users: '/api/users',
  posts: "/api/posts",
  comments: '/api/comments',
  auth: "/api/auth"
}

// Tier 3: Generic function with any - AI needs to add proper generic constraint
function transformArray<T>(arr: T[], transformer: any): any[] {
  return arr.map((item: any) => transformer(item))
}

// Tier 1: Missing semicolons in class
class DataProcessor {
  private data: any  // Tier 3: no-explicit-any
  private options: any  // Tier 3: no-explicit-any

  constructor(data: any, options: any) {
    this.data = data
    this.options = options
  }

  // Tier 3: Method returning any
  process(): any {
    if (this.data === null) {
      return null
    }
    return {
      result: this.data,
      processed: true
    }
  }

  // Tier 1: Missing semicolons
  getOptions(): any {
    return this.options
  }

  // Tier 3: Callback with any parameter
  transform(callback: (item: any) => any): any {
    return callback(this.data)
  }
}

// Tier 1: Inconsistent formatting - missing trailing comma
const SETTINGS = {
  theme: "dark",
  language: "en",
  notifications: true
}

// Tier 3: Handler with any event type
function handleEvent(event: any): void {
  console.log("Event received:", event.type)
  if (event.data !== undefined) {
    processData(event.data, {})
  }
}

// Tier 3: Promise returning any
async function fetchData(url: string): Promise<any> {
  // Simulated fetch
  return { url, data: null }
}

// Tier 1: Mixed semicolons and quote styles
const API_CONFIG = {
  baseUrl: "https://api.example.com",
  version: 'v1',
  headers: {
    'Content-Type': "application/json",
    "Accept": 'application/json'
  }
}

// Tier 3: Object with any values - needs AI analysis
interface ResponseWrapper {
  status: number
  data: any  // Tier 3: no-explicit-any
  error: any  // Tier 3: no-explicit-any
  meta: any  // Tier 3: no-explicit-any
}

// Tier 3: Function accepting any callback
function registerHandler(name: string, handler: any): void {
  console.log(`Handler ${name} registered`)
  if (typeof handler === 'function') {
    handler()
  }
}

// Tier 1: Missing semicolons in arrow functions
const add = (a: number, b: number): number => a + b
const multiply = (a: number, b: number): number => a * b
const divide = (a: number, b: number): number => a / b

// Tier 3: Reducer with any state
function createReducer(initialState: any) {
  return (state: any, action: any): any => {
    switch (action.type) {
      case 'SET':
        return action.payload
      case 'RESET':
        return initialState
      default:
        return state
    }
  }
}

// Tier 1: Object with missing trailing commas
const FEATURE_FLAGS = {
  enableCache: true,
  enableLogging: DEBUG_MODE,
  enableMetrics: false,
  maxRetries: 3
}

// Tier 3: Event emitter with any listener
class EventEmitter {
  private listeners: Map<string, any[]> = new Map()

  on(event: string, listener: any): void {
    const existing = this.listeners.get(event) || []
    existing.push(listener)
    this.listeners.set(event, existing)
  }

  emit(event: string, data: any): void {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.forEach((handler: any) => handler(data))
    }
  }
}

// Tier 1: Inconsistent string quotes in array
const ALLOWED_METHODS = ['GET', "POST", 'PUT', "DELETE", 'PATCH']

// Tier 3: Factory function returning any
function createFactory(type: string): any {
  switch (type) {
    case 'processor':
      return new DataProcessor(null, {})
    case 'emitter':
      return new EventEmitter()
    default:
      return null
  }
}

// Export for testing
export {
  APP_NAME,
  VERSION,
  DEBUG_MODE,
  processData,
  filterItems,
  transformArray,
  DataProcessor,
  handleEvent,
  fetchData,
  registerHandler,
  createReducer,
  EventEmitter,
  createFactory
}
