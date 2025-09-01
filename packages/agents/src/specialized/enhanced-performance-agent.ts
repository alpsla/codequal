/**
 * Enhanced Performance Agent with Optimization Examples
 * Provides specific performance improvements and optimization code
 */

import { BaseAgent } from '../base/base-agent';
import { AnalysisResult } from '../agent';

export interface OptimizationRecommendation {
  description: string;
  before: string;
  after: string;
  explanation: string;
  performanceGains: string[];
  metrics?: {
    beforeMs?: number;
    afterMs?: number;
    improvement?: string;
  };
}

export interface EnhancedPerformanceIssue {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  location?: {
    file: string;
    line?: number;
    function?: string;
  };
  evidence?: {
    codeSnippet: string;
    metrics?: {
      executionTime?: number;
      memoryUsage?: number;
      cpuUsage?: number;
    };
  };
  optimization?: OptimizationRecommendation;
  references?: string[];
}

export class EnhancedPerformanceAgent extends BaseAgent {
  agentName = 'Enhanced Performance Specialist';
  
  // Implement required abstract methods
  async analyze(context: any): Promise<AnalysisResult> {
    return {
      insights: [],
      suggestions: [],
      educational: [],
      metadata: {
        agentName: this.agentName,
        confidence: 88
      }
    };
  }
  
  formatResult(rawResult: unknown): AnalysisResult {
    return {
      insights: [],
      suggestions: [],
      educational: [],
      metadata: {
        agentName: this.agentName,
        confidence: 88
      }
    };
  }
  
  /**
   * Generate specific optimization recommendations based on performance issue type
   */
  generateOptimization(issue: any): OptimizationRecommendation | undefined {
    const optimizationGenerators: Record<string, () => OptimizationRecommendation> = {
      'n-plus-one-query': () => this.generateNPlusOneOptimization(issue),
      'inefficient-loop': () => this.generateInefficientLoopOptimization(issue),
      'memory-leak': () => this.generateMemoryLeakOptimization(issue),
      'blocking-io': () => this.generateBlockingIOOptimization(issue),
      'large-bundle': () => this.generateLargeBundleOptimization(issue),
      'render-blocking': () => this.generateRenderBlockingOptimization(issue),
      'inefficient-algorithm': () => this.generateAlgorithmOptimization(issue),
      'excessive-re-renders': () => this.generateReRenderOptimization(issue),
      'unoptimized-images': () => this.generateImageOptimization(issue),
      'cache-miss': () => this.generateCacheOptimization(issue)
    };

    const generator = optimizationGenerators[issue.category?.toLowerCase()];
    return generator ? generator() : this.generateGenericOptimization(issue);
  }

  private generateNPlusOneOptimization(issue: any): OptimizationRecommendation {
    return {
      description: 'Optimize N+1 database queries using eager loading or batching',
      before: `// N+1 Query Problem - Makes 1 + N database queries
async function getUsersWithPosts() {
  const users = await db.query('SELECT * FROM users');
  
  for (const user of users) {
    // This runs a separate query for each user (N queries)
    user.posts = await db.query(
      'SELECT * FROM posts WHERE user_id = ?',
      [user.id]
    );
  }
  
  return users;
}

// Example with ORM (Sequelize)
async function getAuthorsWithBooks() {
  const authors = await Author.findAll();
  
  // N+1 problem - separate query for each author
  for (const author of authors) {
    author.books = await author.getBooks();
  }
  
  return authors;
}

// GraphQL resolver with N+1
const resolvers = {
  User: {
    // This runs for each user in the list
    posts: async (user) => {
      return await db.query(
        'SELECT * FROM posts WHERE user_id = ?',
        [user.id]
      );
    }
  }
};`,
      after: `// Solution 1: Use JOIN to fetch all data in one query
async function getUsersWithPostsOptimized() {
  const query = \`
    SELECT 
      u.id as user_id,
      u.name as user_name,
      u.email as user_email,
      p.id as post_id,
      p.title as post_title,
      p.content as post_content
    FROM users u
    LEFT JOIN posts p ON u.id = p.user_id
    ORDER BY u.id, p.created_at DESC
  \`;
  
  const rows = await db.query(query);
  
  // Transform flat rows into nested structure
  const usersMap = new Map();
  
  for (const row of rows) {
    if (!usersMap.has(row.user_id)) {
      usersMap.set(row.user_id, {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        posts: []
      });
    }
    
    if (row.post_id) {
      usersMap.get(row.user_id).posts.push({
        id: row.post_id,
        title: row.post_title,
        content: row.post_content
      });
    }
  }
  
  return Array.from(usersMap.values());
}

// Solution 2: Use IN clause for batch loading
async function getUsersWithPostsBatched() {
  const users = await db.query('SELECT * FROM users');
  const userIds = users.map(u => u.id);
  
  // Single query for all posts
  const posts = await db.query(
    'SELECT * FROM posts WHERE user_id IN (?)',
    [userIds]
  );
  
  // Group posts by user
  const postsByUser = posts.reduce((acc, post) => {
    if (!acc[post.user_id]) acc[post.user_id] = [];
    acc[post.user_id].push(post);
    return acc;
  }, {});
  
  // Assign posts to users
  users.forEach(user => {
    user.posts = postsByUser[user.id] || [];
  });
  
  return users;
}

// Solution 3: ORM with eager loading (Sequelize)
async function getAuthorsWithBooksEager() {
  return await Author.findAll({
    include: [{
      model: Book,
      as: 'books',
      attributes: ['id', 'title', 'publishedAt']
    }]
  });
}

// Solution 4: DataLoader pattern for GraphQL
import DataLoader from 'dataloader';

const postLoader = new DataLoader(async (userIds) => {
  const posts = await db.query(
    'SELECT * FROM posts WHERE user_id IN (?)',
    [userIds]
  );
  
  // Group posts by user_id
  const postsByUser = userIds.map(userId => 
    posts.filter(post => post.user_id === userId)
  );
  
  return postsByUser;
});

const resolvers = {
  User: {
    posts: (user) => postLoader.load(user.id)
  }
};

// Solution 5: Query builder with relations (Knex + Objection.js)
class User extends Model {
  static get relationMappings() {
    return {
      posts: {
        relation: Model.HasManyRelation,
        modelClass: Post,
        join: {
          from: 'users.id',
          to: 'posts.user_id'
        }
      }
    };
  }
}

async function getUsersWithPostsObjection() {
  return await User.query()
    .withGraphFetched('posts')
    .modifyGraph('posts', builder => {
      builder.orderBy('created_at', 'desc');
    });
}`,
      explanation: 'N+1 queries severely impact performance. Use eager loading, batching, or joins to reduce database round trips.',
      performanceGains: [
        'Reduces database queries from N+1 to 1-2',
        'Dramatically improves response time for large datasets',
        'Reduces database connection pool usage',
        'Lower network latency impact',
        'Better scalability with growing data'
      ],
      metrics: {
        beforeMs: 500,
        afterMs: 50,
        improvement: '10x faster'
      }
    };
  }

  private generateInefficientLoopOptimization(issue: any): OptimizationRecommendation {
    return {
      description: 'Optimize loops using better algorithms and data structures',
      before: `// Inefficient nested loops - O(n²) complexity
function findDuplicates(arr1, arr2) {
  const duplicates = [];
  
  for (let i = 0; i < arr1.length; i++) {
    for (let j = 0; j < arr2.length; j++) {
      if (arr1[i] === arr2[j]) {
        duplicates.push(arr1[i]);
      }
    }
  }
  
  return duplicates;
}

// Inefficient array operations in loop
function processLargeArray(items) {
  let result = [];
  
  for (let i = 0; i < items.length; i++) {
    // Array.includes is O(n) inside a loop
    if (!result.includes(items[i])) {
      result.push(items[i]);
    }
  }
  
  return result;
}

// Repeated expensive calculations in loop
function calculateTotals(orders) {
  const results = [];
  
  for (const order of orders) {
    // Expensive calculation repeated for same values
    const taxRate = calculateTaxRate(order.state);
    const shippingCost = calculateShipping(order.items);
    
    results.push({
      orderId: order.id,
      total: order.subtotal * (1 + taxRate) + shippingCost
    });
  }
  
  return results;
}`,
      after: `// Optimized using Set - O(n) complexity
function findDuplicatesOptimized(arr1, arr2) {
  const set2 = new Set(arr2);
  const duplicates = [];
  
  for (const item of arr1) {
    if (set2.has(item)) {
      duplicates.push(item);
    }
  }
  
  return duplicates;
}

// Even better - using filter and Set
function findDuplicatesFunctional(arr1, arr2) {
  const set2 = new Set(arr2);
  return arr1.filter(item => set2.has(item));
}

// Use Set for uniqueness check - O(1) lookup
function processLargeArrayOptimized(items) {
  const seen = new Set();
  const result = [];
  
  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  
  return result;
}

// Or simply use Set to remove duplicates
function removeDuplicates(items) {
  return [...new Set(items)];
}

// Cache expensive calculations
function calculateTotalsOptimized(orders) {
  // Pre-calculate and cache repeated values
  const taxRateCache = new Map();
  const shippingCache = new Map();
  
  return orders.map(order => {
    // Cache tax rate per state
    if (!taxRateCache.has(order.state)) {
      taxRateCache.set(order.state, calculateTaxRate(order.state));
    }
    const taxRate = taxRateCache.get(order.state);
    
    // Cache shipping by items hash
    const itemsKey = JSON.stringify(order.items.map(i => i.id).sort());
    if (!shippingCache.has(itemsKey)) {
      shippingCache.set(itemsKey, calculateShipping(order.items));
    }
    const shippingCost = shippingCache.get(itemsKey);
    
    return {
      orderId: order.id,
      total: order.subtotal * (1 + taxRate) + shippingCost
    };
  });
}

// Use Map for O(1) lookups instead of nested loops
function mergeDataOptimized(users, posts) {
  // Create lookup map
  const userMap = new Map(users.map(u => [u.id, u]));
  
  // Single pass through posts
  return posts.map(post => ({
    ...post,
    author: userMap.get(post.userId)
  }));
}

// Process in chunks for very large arrays
async function processInChunks(largeArray, processFunc, chunkSize = 1000) {
  const results = [];
  
  for (let i = 0; i < largeArray.length; i += chunkSize) {
    const chunk = largeArray.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(
      chunk.map(item => processFunc(item))
    );
    results.push(...chunkResults);
    
    // Allow event loop to process other tasks
    await new Promise(resolve => setImmediate(resolve));
  }
  
  return results;
}

// Use binary search for sorted arrays
function binarySearch(sortedArray, target) {
  let left = 0;
  let right = sortedArray.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    if (sortedArray[mid] === target) return mid;
    if (sortedArray[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  
  return -1; // Not found
}`,
      explanation: 'Using appropriate data structures and algorithms can improve performance from O(n²) to O(n) or O(log n).',
      performanceGains: [
        'Reduces time complexity from O(n²) to O(n)',
        'Set operations provide O(1) lookup time',
        'Caching eliminates redundant calculations',
        'Binary search reduces O(n) to O(log n) for sorted data',
        'Chunk processing prevents blocking the event loop'
      ],
      metrics: {
        beforeMs: 5000,
        afterMs: 100,
        improvement: '50x faster for 10,000 items'
      }
    };
  }

  private generateMemoryLeakOptimization(issue: any): OptimizationRecommendation {
    return {
      description: 'Fix memory leaks by properly cleaning up resources',
      before: `// Memory leak - event listeners not removed
class Component {
  constructor() {
    this.handleResize = this.handleResize.bind(this);
    this.data = new Array(1000000).fill('data');
  }
  
  mount() {
    // Adding listener without cleanup
    window.addEventListener('resize', this.handleResize);
    
    // Interval without cleanup
    this.interval = setInterval(() => {
      this.updateData();
    }, 1000);
    
    // Storing references without cleanup
    globalCache[this.id] = this;
  }
  
  unmount() {
    // Forgot to clean up!
  }
}

// Closure memory leak
function createHandler() {
  const largeData = new Array(1000000).fill('data');
  
  return function() {
    // Only uses a tiny part but keeps entire largeData in memory
    console.log(largeData.length);
  };
}

// DOM reference leak
let detachedNodes = [];
function removeElement() {
  const element = document.getElementById('content');
  detachedNodes.push(element); // Keeps reference
  element.parentNode.removeChild(element);
}

// Timer leak
const cache = {};
function cacheData(key, value) {
  cache[key] = {
    value,
    timer: setTimeout(() => {
      // Forgot to delete from cache
      console.log('Expired');
    }, 60000)
  };
}`,
      after: `// Properly cleanup resources
class Component {
  constructor() {
    this.handleResize = this.handleResize.bind(this);
    this.data = new Array(1000000).fill('data');
    this.listeners = [];
    this.timers = [];
  }
  
  mount() {
    // Track listeners for cleanup
    window.addEventListener('resize', this.handleResize);
    this.listeners.push({
      target: window,
      event: 'resize',
      handler: this.handleResize
    });
    
    // Track timers for cleanup
    const interval = setInterval(() => {
      this.updateData();
    }, 1000);
    this.timers.push(interval);
    
    // Use WeakMap for automatic garbage collection
    componentCache.set(this, this.data);
  }
  
  unmount() {
    // Clean up all listeners
    this.listeners.forEach(({ target, event, handler }) => {
      target.removeEventListener(event, handler);
    });
    this.listeners = [];
    
    // Clear all timers
    this.timers.forEach(timer => clearInterval(timer));
    this.timers = [];
    
    // Clear data references
    this.data = null;
    
    // Remove from cache
    componentCache.delete(this);
  }
  
  handleResize() {
    // Handle resize
  }
  
  updateData() {
    // Update data
  }
}

// Use WeakMap for automatic garbage collection
const componentCache = new WeakMap();

// Avoid closure memory leaks
function createHandlerOptimized() {
  const largeData = new Array(1000000).fill('data');
  const dataLength = largeData.length; // Extract only what's needed
  
  // Allow largeData to be garbage collected
  return function() {
    console.log(dataLength);
  };
}

// Proper DOM cleanup
class DOMManager {
  constructor() {
    this.observers = [];
  }
  
  observeElement(element) {
    const observer = new MutationObserver(mutations => {
      // Handle mutations
    });
    
    observer.observe(element, { childList: true });
    this.observers.push(observer);
  }
  
  cleanup() {
    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Timer cleanup with auto-expiry
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }
  
  set(key, value, ttl = 60000) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    
    this.cache.set(key, value);
    
    // Set new timer with cleanup
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);
    
    this.timers.set(key, timer);
  }
  
  delete(key) {
    this.cache.delete(key);
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }
  
  clear() {
    // Clean up all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.cache.clear();
  }
}

// React hooks with cleanup
import { useEffect, useRef } from 'react';

function useEventListener(event, handler) {
  const savedHandler = useRef();
  
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);
  
  useEffect(() => {
    const eventListener = (event) => savedHandler.current(event);
    
    window.addEventListener(event, eventListener);
    
    // Cleanup function
    return () => {
      window.removeEventListener(event, eventListener);
    };
  }, [event]);
}

// Prevent memory leaks in async operations
class AsyncManager {
  constructor() {
    this.abortControllers = new Set();
  }
  
  async fetchData(url) {
    const controller = new AbortController();
    this.abortControllers.add(controller);
    
    try {
      const response = await fetch(url, {
        signal: controller.signal
      });
      return await response.json();
    } finally {
      this.abortControllers.delete(controller);
    }
  }
  
  cleanup() {
    // Abort all pending requests
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }
}`,
      explanation: 'Memory leaks occur when references to unused objects prevent garbage collection. Always clean up event listeners, timers, and references.',
      performanceGains: [
        'Prevents memory usage from growing over time',
        'Avoids browser/app crashes from out-of-memory errors',
        'Improves garbage collection efficiency',
        'Better performance for long-running applications',
        'Reduces memory footprint'
      ],
      metrics: {
        beforeMs: 100,
        afterMs: 100,
        improvement: 'Prevents 10MB/hour memory leak'
      }
    };
  }

  private generateBlockingIOOptimization(issue: any): OptimizationRecommendation {
    return {
      description: 'Replace blocking I/O with non-blocking async operations',
      before: `// Blocking synchronous file operations
const fs = require('fs');

function processFiles(filePaths) {
  const results = [];
  
  for (const path of filePaths) {
    // Blocks event loop
    const data = fs.readFileSync(path, 'utf8');
    const processed = processData(data);
    fs.writeFileSync(path + '.processed', processed);
    results.push(processed);
  }
  
  return results;
}

// Blocking database queries
function getUserData(userIds) {
  const users = [];
  
  for (const id of userIds) {
    // Sequential queries block each other
    const user = db.querySync('SELECT * FROM users WHERE id = ?', [id]);
    const posts = db.querySync('SELECT * FROM posts WHERE user_id = ?', [id]);
    users.push({ ...user, posts });
  }
  
  return users;
}

// Blocking HTTP requests
const request = require('sync-request');

function fetchMultipleAPIs(urls) {
  const responses = [];
  
  for (const url of urls) {
    // Blocks until response received
    const res = request('GET', url);
    responses.push(JSON.parse(res.getBody()));
  }
  
  return responses;
}`,
      after: `// Non-blocking async file operations
const fs = require('fs').promises;
const { pipeline } = require('stream/promises');
const { createReadStream, createWriteStream } = require('fs');

async function processFilesAsync(filePaths) {
  // Process files in parallel
  const promises = filePaths.map(async (path) => {
    const data = await fs.readFile(path, 'utf8');
    const processed = await processData(data);
    await fs.writeFile(path + '.processed', processed);
    return processed;
  });
  
  return Promise.all(promises);
}

// Even better - use streams for large files
async function processLargeFilesStream(filePaths) {
  const promises = filePaths.map(async (path) => {
    const readStream = createReadStream(path);
    const writeStream = createWriteStream(path + '.processed');
    const transformStream = new TransformStream();
    
    await pipeline(readStream, transformStream, writeStream);
  });
  
  return Promise.all(promises);
}

// Non-blocking database queries with connection pooling
const { Pool } = require('pg');
const pool = new Pool({ max: 20 });

async function getUserDataAsync(userIds) {
  // Parallel queries using Promise.all
  const promises = userIds.map(async (id) => {
    const [user, posts] = await Promise.all([
      pool.query('SELECT * FROM users WHERE id = $1', [id]),
      pool.query('SELECT * FROM posts WHERE user_id = $1', [id])
    ]);
    
    return {
      ...user.rows[0],
      posts: posts.rows
    };
  });
  
  return Promise.all(promises);
}

// Batch database operations
async function getUserDataBatched(userIds) {
  const users = await pool.query(
    'SELECT * FROM users WHERE id = ANY($1)',
    [userIds]
  );
  
  const posts = await pool.query(
    'SELECT * FROM posts WHERE user_id = ANY($1)',
    [userIds]
  );
  
  // Group posts by user
  const postsByUser = posts.rows.reduce((acc, post) => {
    if (!acc[post.user_id]) acc[post.user_id] = [];
    acc[post.user_id].push(post);
    return acc;
  }, {});
  
  return users.rows.map(user => ({
    ...user,
    posts: postsByUser[user.id] || []
  }));
}

// Non-blocking HTTP requests with concurrency control
const axios = require('axios');
const pLimit = require('p-limit');

async function fetchMultipleAPIsAsync(urls, concurrency = 5) {
  const limit = pLimit(concurrency);
  
  const promises = urls.map(url => 
    limit(() => axios.get(url).then(res => res.data))
  );
  
  return Promise.all(promises);
}

// Use worker threads for CPU-intensive operations
const { Worker } = require('worker_threads');

function runWorker(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./worker.js', {
      workerData: data
    });
    
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(\`Worker stopped with exit code \${code}\`));
      }
    });
  });
}

async function processCPUIntensive(dataArray) {
  const promises = dataArray.map(data => runWorker(data));
  return Promise.all(promises);
}

// Event-driven architecture for better concurrency
const EventEmitter = require('events');

class AsyncProcessor extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.processing = false;
  }
  
  add(task) {
    this.queue.push(task);
    this.emit('task-added');
    this.process();
  }
  
  async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, 10); // Process in batches
      await Promise.all(batch.map(task => this.executeTask(task)));
    }
    
    this.processing = false;
  }
  
  async executeTask(task) {
    try {
      const result = await task();
      this.emit('task-complete', result);
    } catch (error) {
      this.emit('task-error', error);
    }
  }
}`,
      explanation: 'Non-blocking I/O allows the event loop to handle multiple operations concurrently, dramatically improving throughput.',
      performanceGains: [
        'Prevents event loop blocking',
        'Enables concurrent request handling',
        'Better CPU utilization',
        'Improved response times under load',
        'Higher throughput for I/O-heavy operations'
      ],
      metrics: {
        beforeMs: 10000,
        afterMs: 500,
        improvement: '20x faster for 100 files'
      }
    };
  }

  private generateLargeBundleOptimization(issue: any): OptimizationRecommendation {
    return {
      description: 'Reduce JavaScript bundle size using code splitting and tree shaking',
      before: `// Large monolithic bundle
// main.js - 2.5MB minified
import React from 'react';
import ReactDOM from 'react-dom';
import moment from 'moment'; // 67KB - using entire library
import _ from 'lodash'; // 71KB - importing everything
import * as d3 from 'd3'; // 240KB - entire D3 library
import 'antd/dist/antd.css'; // 60KB - all component styles

// Importing entire icon libraries
import * as Icons from '@ant-design/icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';

// All routes loaded upfront
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel';

// Large component with everything
const App = () => {
  return (
    <Router>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={AdminPanel} />
    </Router>
  );
};

// webpack.config.js - no optimization
module.exports = {
  entry: './src/main.js',
  output: {
    filename: 'bundle.js'
  }
};`,
      after: `// Optimized with code splitting and tree shaking
// main.js - 150KB minified

import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom';

// Import only what you need
import { format, parseISO } from 'date-fns'; // 7KB vs 67KB moment
import debounce from 'lodash/debounce'; // 2KB vs 71KB full lodash
import { select, scaleLinear } from 'd3'; // 20KB vs 240KB full d3

// Dynamic imports for code splitting
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => 
  import(/* webpackChunkName: "dashboard" */ './pages/Dashboard')
);
const Analytics = lazy(() => 
  import(/* webpackChunkName: "analytics" */ './pages/Analytics')
);
const Settings = lazy(() => 
  import(/* webpackChunkName: "settings" */ './pages/Settings')
);
const AdminPanel = lazy(() => 
  import(/* webpackChunkName: "admin" */ './pages/AdminPanel')
);

// Import only used icons
import { UserOutlined, SettingOutlined } from '@ant-design/icons';

// Route-based code splitting
const App = () => {
  return (
    <Router>
      <Suspense fallback={<Loading />}>
        <Switch>
          <Route exact path="/" component={Home} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/settings" component={Settings} />
          <Route path="/admin" component={AdminPanel} />
        </Switch>
      </Suspense>
    </Router>
  );
};

// Optimized webpack configuration
module.exports = {
  entry: './src/main.js',
  output: {
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
    clean: true
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\\\/]node_modules[\\\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true
        }
      }
    },
    usedExports: true, // Tree shaking
    sideEffects: false,
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log']
          }
        }
      })
    ]
  },
  // Analyze bundle size
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false
    })
  ]
};

// Dynamic component loading with intersection observer
const LazyImage = ({ src, alt }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const imgRef = useRef();
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, [src]);
  
  return <img ref={imgRef} src={imageSrc} alt={alt} />;
};

// Prefetch critical chunks
const prefetchComponent = (componentPath) => {
  return import(/* webpackPrefetch: true */ componentPath);
};

// Progressive enhancement
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

// Service worker for caching
// sw.js
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('v1').then(cache => {
      return cache.addAll([
        '/',
        '/static/css/main.css',
        '/static/js/main.js'
      ]);
    })
  );
});

// Use dynamic imports for heavy libraries
const loadHeavyLibrary = async () => {
  const { default: HeavyComponent } = await import(
    /* webpackChunkName: "heavy" */
    './HeavyComponent'
  );
  return HeavyComponent;
};

// Vite config for better dev experience
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'utils': ['date-fns', 'lodash']
        }
      }
    },
    minify: 'esbuild',
    target: 'es2015'
  }
};`,
      explanation: 'Code splitting, tree shaking, and lazy loading dramatically reduce initial bundle size and improve load times.',
      performanceGains: [
        'Reduces initial bundle from 2.5MB to 150KB',
        'Faster initial page load',
        'Improved Time to Interactive (TTI)',
        'Better caching with content hashing',
        'Reduced bandwidth usage'
      ],
      metrics: {
        beforeMs: 8000,
        afterMs: 1500,
        improvement: '5x faster initial load'
      }
    };
  }

  private generateRenderBlockingOptimization(issue: any): OptimizationRecommendation {
    return {
      description: 'Eliminate render-blocking resources and optimize critical rendering path',
      before: `<!-- Render-blocking resources -->
<!DOCTYPE html>
<html>
<head>
  <!-- Blocking CSS in head -->
  <link rel="stylesheet" href="/css/bootstrap.css"> <!-- 200KB -->
  <link rel="stylesheet" href="/css/animate.css"> <!-- 80KB -->
  <link rel="stylesheet" href="/css/font-awesome.css"> <!-- 70KB -->
  <link rel="stylesheet" href="/css/custom.css"> <!-- 50KB -->
  
  <!-- Blocking JavaScript in head -->
  <script src="/js/jquery.js"></script> <!-- 90KB -->
  <script src="/js/bootstrap.js"></script> <!-- 60KB -->
  <script src="/js/analytics.js"></script> <!-- 20KB -->
  
  <!-- Web fonts blocking render -->
  <link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700" rel="stylesheet">
</head>
<body>
  <!-- Content can't render until all resources load -->
  <div id="app"></div>
  
  <!-- More blocking scripts -->
  <script src="/js/vendor.js"></script> <!-- 500KB -->
  <script src="/js/app.js"></script> <!-- 300KB -->
</body>
</html>`,
      after: `<!DOCTYPE html>
<html>
<head>
  <!-- Critical CSS inline -->
  <style>
    /* Only above-the-fold critical styles */
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
    .header { background: #333; color: white; padding: 1rem; }
    .hero { min-height: 400px; display: flex; align-items: center; }
    /* ~2KB of critical CSS */
  </style>
  
  <!-- Preload critical resources -->
  <link rel="preload" href="/fonts/roboto.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/js/app.js" as="script">
  
  <!-- DNS prefetch for external domains -->
  <link rel="dns-prefetch" href="https://fonts.googleapis.com">
  <link rel="dns-prefetch" href="https://cdn.analytics.com">
  
  <!-- Async load non-critical CSS -->
  <link rel="preload" href="/css/main.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/css/main.css"></noscript>
  
  <!-- Resource hints -->
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  
  <!-- Progressive font loading -->
  <style>
    @font-face {
      font-family: 'Roboto';
      src: url('/fonts/roboto.woff2') format('woff2');
      font-display: swap; /* Show fallback font immediately */
    }
  </style>
</head>
<body>
  <!-- Content renders immediately with critical CSS -->
  <div id="app">
    <!-- Server-side rendered content or skeleton -->
    <div class="header">
      <h1>Welcome</h1>
    </div>
    <div class="hero">
      <div class="skeleton-loader"></div>
    </div>
  </div>
  
  <!-- Load JavaScript asynchronously -->
  <script async src="/js/app.js"></script>
  
  <!-- Defer non-critical scripts -->
  <script defer src="/js/analytics.js"></script>
  
  <!-- Load polyfills only if needed -->
  <script>
    if (!window.IntersectionObserver) {
      document.write('<script src="/js/polyfills.js"><\\/script>');
    }
  </script>
  
  <!-- Progressive enhancement -->
  <script>
    // Inline critical JavaScript
    document.documentElement.className = 'js';
    
    // Load CSS progressively
    function loadCSS(href) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.media = 'print';
      link.onload = function() { this.media = 'all'; };
      document.head.appendChild(link);
    }
    
    // Load non-critical CSS after page load
    window.addEventListener('load', function() {
      loadCSS('/css/animations.css');
      loadCSS('/css/icons.css');
    });
    
    // Lazy load components
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            imageObserver.unobserve(img);
          }
        });
      });
      
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  </script>
  
  <!-- Module scripts for modern browsers -->
  <script type="module">
    import { App } from '/js/app.mjs';
    new App().init();
  </script>
  
  <!-- Fallback for older browsers -->
  <script nomodule src="/js/app.legacy.js"></script>
  
  <!-- HTTP/2 Server Push configuration -->
  <!-- Link: </css/critical.css>; rel=preload; as=style -->
  <!-- Link: </js/app.js>; rel=preload; as=script -->
</body>
</html>

/* Critical CSS generation script */
const critical = require('critical');

critical.generate({
  base: 'dist/',
  src: 'index.html',
  target: 'index-critical.html',
  width: 1300,
  height: 900,
  inline: true,
  minify: true
});

/* Service Worker for resource caching */
self.addEventListener('fetch', event => {
  if (event.request.destination === 'style' ||
      event.request.destination === 'script') {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).then(response => {
          return caches.open('v1').then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
  }
});`,
      explanation: 'Optimizing the critical rendering path ensures content is displayed as quickly as possible.',
      performanceGains: [
        'Eliminates render-blocking resources',
        'Faster First Contentful Paint (FCP)',
        'Improved Largest Contentful Paint (LCP)',
        'Better Core Web Vitals scores',
        'Progressive rendering of content'
      ],
      metrics: {
        beforeMs: 3500,
        afterMs: 800,
        improvement: '4x faster FCP'
      }
    };
  }

  private generateAlgorithmOptimization(issue: any): OptimizationRecommendation {
    return {
      description: 'Optimize algorithms from O(n²) or worse to O(n log n) or O(n)',
      before: `// Inefficient sorting - Bubble sort O(n²)
function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  return arr;
}

// Inefficient search - Linear search O(n)
function findMax(arr) {
  let max = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > max) {
      max = arr[i];
    }
  }
  return max;
}

// Inefficient duplicate removal O(n²)
function removeDuplicates(arr) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    let isDuplicate = false;
    for (let j = 0; j < result.length; j++) {
      if (arr[i] === result[j]) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      result.push(arr[i]);
    }
  }
  return result;
}

// Inefficient string matching O(n*m)
function findSubstring(text, pattern) {
  for (let i = 0; i <= text.length - pattern.length; i++) {
    let match = true;
    for (let j = 0; j < pattern.length; j++) {
      if (text[i + j] !== pattern[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}`,
      after: `// Efficient sorting - QuickSort O(n log n) average
function quickSort(arr, left = 0, right = arr.length - 1) {
  if (left < right) {
    const pivotIndex = partition(arr, left, right);
    quickSort(arr, left, pivotIndex - 1);
    quickSort(arr, pivotIndex + 1, right);
  }
  return arr;
}

function partition(arr, left, right) {
  const pivot = arr[right];
  let i = left - 1;
  
  for (let j = left; j < right; j++) {
    if (arr[j] < pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  
  [arr[i + 1], arr[right]] = [arr[right], arr[i + 1]];
  return i + 1;
}

// Or use built-in sort (Timsort - O(n log n))
function efficientSort(arr) {
  return arr.sort((a, b) => a - b);
}

// Efficient max finding - O(n) but optimized
function findMaxOptimized(arr) {
  return Math.max(...arr);
}

// For very large arrays, use reduce
function findMaxLarge(arr) {
  return arr.reduce((max, val) => val > max ? val : max, -Infinity);
}

// Efficient duplicate removal - O(n) with Set
function removeDuplicatesOptimized(arr) {
  return [...new Set(arr)];
}

// Or maintain order with seen set
function removeDuplicatesOrdered(arr) {
  const seen = new Set();
  return arr.filter(item => {
    if (seen.has(item)) return false;
    seen.add(item);
    return true;
  });
}

// Efficient string matching - KMP Algorithm O(n + m)
function kmpSearch(text, pattern) {
  const lps = computeLPSArray(pattern);
  let i = 0; // index for text
  let j = 0; // index for pattern
  
  while (i < text.length) {
    if (pattern[j] === text[i]) {
      i++;
      j++;
    }
    
    if (j === pattern.length) {
      return i - j; // Pattern found
    } else if (i < text.length && pattern[j] !== text[i]) {
      if (j !== 0) {
        j = lps[j - 1];
      } else {
        i++;
      }
    }
  }
  
  return -1; // Pattern not found
}

function computeLPSArray(pattern) {
  const lps = new Array(pattern.length).fill(0);
  let len = 0;
  let i = 1;
  
  while (i < pattern.length) {
    if (pattern[i] === pattern[len]) {
      len++;
      lps[i] = len;
      i++;
    } else {
      if (len !== 0) {
        len = lps[len - 1];
      } else {
        lps[i] = 0;
        i++;
      }
    }
  }
  
  return lps;
}

// Binary search for sorted arrays - O(log n)
function binarySearch(sortedArr, target) {
  let left = 0;
  let right = sortedArr.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    if (sortedArr[mid] === target) return mid;
    if (sortedArr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  
  return -1;
}

// Memoization for recursive algorithms
const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

// Example: Fibonacci with memoization O(n) vs O(2^n)
const fibonacci = memoize((n) => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
});

// Dynamic programming example
function longestCommonSubsequence(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  return dp[m][n];
}`,
      explanation: 'Using efficient algorithms and data structures can improve performance by orders of magnitude.',
      performanceGains: [
        'Reduces time complexity from O(n²) to O(n log n) or O(n)',
        'Scales better with large datasets',
        'Uses optimal data structures (Set, Map)',
        'Leverages memoization to avoid redundant calculations',
        'Applies dynamic programming for complex problems'
      ],
      metrics: {
        beforeMs: 10000,
        afterMs: 50,
        improvement: '200x faster for 10,000 items'
      }
    };
  }

  private generateReRenderOptimization(issue: any): OptimizationRecommendation {
    return {
      description: 'Optimize React component re-renders using memoization and proper state management',
      before: `// Excessive re-renders in React
function ParentComponent() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');
  
  // Creates new object every render
  const config = {
    theme: 'dark',
    size: 'large'
  };
  
  // Creates new function every render  
  const handleClick = () => {
    console.log('Clicked');
  };
  
  // Expensive calculation on every render
  const expensiveValue = calculateExpensiveValue(count);
  
  return (
    <div>
      <input value={text} onChange={e => setText(e.target.value)} />
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      
      {/* ChildComponent re-renders on every parent render */}
      <ChildComponent 
        config={config}
        onClick={handleClick}
        data={expensiveValue}
      />
      
      {/* List re-renders all items */}
      {items.map(item => (
        <ListItem key={item.id} item={item} />
      ))}
    </div>
  );
}

function ChildComponent({ config, onClick, data }) {
  console.log('ChildComponent rendered');
  return <div onClick={onClick}>{data}</div>;
}

function ListItem({ item }) {
  console.log('ListItem rendered:', item.id);
  return <div>{item.name}</div>;
}`,
      after: `// Optimized with memoization and proper state management
import React, { useState, useCallback, useMemo, memo } from 'react';

function ParentComponent() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');
  
  // Memoize object to maintain reference
  const config = useMemo(() => ({
    theme: 'dark',
    size: 'large'
  }), []); // Empty deps = created once
  
  // Memoize callback function
  const handleClick = useCallback(() => {
    console.log('Clicked');
  }, []); // Empty deps = created once
  
  // Memoize expensive calculation
  const expensiveValue = useMemo(() => {
    return calculateExpensiveValue(count);
  }, [count]); // Only recalculate when count changes
  
  // Use callback for state updates
  const incrementCount = useCallback(() => {
    setCount(prev => prev + 1); // Use function form
  }, []);
  
  return (
    <div>
      <input value={text} onChange={e => setText(e.target.value)} />
      <button onClick={incrementCount}>Count: {count}</button>
      
      {/* ChildComponent only re-renders when props change */}
      <MemoizedChild 
        config={config}
        onClick={handleClick}
        data={expensiveValue}
      />
      
      {/* Virtualized list for large datasets */}
      <VirtualizedList items={items} />
    </div>
  );
}

// Memoized child component
const MemoizedChild = memo(function ChildComponent({ config, onClick, data }) {
  console.log('ChildComponent rendered');
  return <div onClick={onClick}>{data}</div>;
}, (prevProps, nextProps) => {
  // Custom comparison for deep equality if needed
  return prevProps.data === nextProps.data &&
         prevProps.config.theme === nextProps.config.theme;
});

// Memoized list item
const MemoizedListItem = memo(function ListItem({ item }) {
  console.log('ListItem rendered:', item.id);
  return <div>{item.name}</div>;
});

// Virtualized list for performance
import { FixedSizeList } from 'react-window';

function VirtualizedList({ items }) {
  const Row = useCallback(({ index, style }) => (
    <div style={style}>
      <MemoizedListItem item={items[index]} />
    </div>
  ), [items]);
  
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

// Use React Context for deep prop drilling
const ThemeContext = React.createContext();
const UserContext = React.createContext();

function App() {
  const [theme, setTheme] = useState('dark');
  const [user, setUser] = useState(null);
  
  // Split contexts to minimize re-renders
  return (
    <ThemeContext.Provider value={theme}>
      <UserContext.Provider value={user}>
        <MainContent />
      </UserContext.Provider>
    </ThemeContext.Provider>
  );
}

// Use state management library for complex state
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

const useStore = create(
  subscribeWithSelector((set) => ({
    count: 0,
    text: '',
    incrementCount: () => set(state => ({ count: state.count + 1 })),
    setText: (text) => set({ text })
  }))
);

// Component only subscribes to needed state
function OptimizedComponent() {
  const count = useStore(state => state.count);
  const incrementCount = useStore(state => state.incrementCount);
  
  return <button onClick={incrementCount}>{count}</button>;
}

// Use React.lazy for code splitting
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

function LazyLoadedSection() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  );
}

// Debounce expensive operations
import { useDebouncedCallback } from 'use-debounce';

function SearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  
  const debouncedSearch = useDebouncedCallback(
    async (searchQuery) => {
      const data = await fetchSearchResults(searchQuery);
      setResults(data);
    },
    300 // 300ms delay
  );
  
  const handleSearch = (e) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };
  
  return (
    <div>
      <input value={query} onChange={handleSearch} />
      <SearchResults results={results} />
    </div>
  );
}`,
      explanation: 'Proper memoization and state management prevents unnecessary re-renders, improving React app performance.',
      performanceGains: [
        'Reduces unnecessary component re-renders',
        'Prevents child component updates when props haven\'t changed',
        'Optimizes expensive calculations with memoization',
        'Improves performance for large lists with virtualization',
        'Better performance with proper state management'
      ],
      metrics: {
        beforeMs: 16,
        afterMs: 3,
        improvement: '5x fewer re-renders'
      }
    };
  }

  private generateImageOptimization(issue: any): OptimizationRecommendation {
    return {
      description: 'Optimize images using modern formats, lazy loading, and responsive images',
      before: `<!-- Unoptimized images -->
<img src="hero-image.jpg" alt="Hero"> <!-- 2MB JPEG -->
<img src="product1.png" alt="Product"> <!-- 500KB PNG -->
<img src="background.jpg" alt="Background"> <!-- 3MB JPEG -->
<img src="team-photo.jpg" alt="Team"> <!-- 1.5MB JPEG -->

<!-- CSS with large background images -->
<style>
.hero {
  background-image: url('hero-bg.jpg'); /* 4MB image */
}
</style>

<!-- Loading all images immediately -->
<div class="gallery">
  <img src="photo1.jpg" alt="Photo 1">
  <img src="photo2.jpg" alt="Photo 2">
  <img src="photo3.jpg" alt="Photo 3">
  <!-- ... 50 more images -->
</div>`,
      after: `<!-- Optimized images with modern formats and lazy loading -->

<!-- Use picture element for modern formats -->
<picture>
  <source srcset="hero-image.webp" type="image/webp">
  <source srcset="hero-image.avif" type="image/avif">
  <img 
    src="hero-image-optimized.jpg" 
    alt="Hero"
    loading="lazy"
    decoding="async"
    width="1920"
    height="1080"
  >
</picture>

<!-- Responsive images with srcset -->
<img 
  srcset="
    product1-320w.webp 320w,
    product1-640w.webp 640w,
    product1-1280w.webp 1280w
  "
  sizes="(max-width: 320px) 280px,
         (max-width: 640px) 600px,
         1280px"
  src="product1-640w.jpg"
  alt="Product"
  loading="lazy"
>

<!-- CSS with optimized background images -->
<style>
.hero {
  background-image: url('hero-bg-placeholder.jpg'); /* 20KB placeholder */
}

.hero.loaded {
  background-image: 
    image-set(
      url('hero-bg.avif') type('image/avif'),
      url('hero-bg.webp') type('image/webp'),
      url('hero-bg-optimized.jpg') type('image/jpeg')
    );
}

/* Use CSS containment for better performance */
.image-container {
  contain: layout style paint;
}
</style>

<!-- JavaScript image optimization -->
<script>
// Lazy loading with Intersection Observer
const imageObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      
      // Load image
      if (img.dataset.src) {
        img.src = img.dataset.src;
      }
      
      // Load srcset
      if (img.dataset.srcset) {
        img.srcset = img.dataset.srcset;
      }
      
      // Clean up
      img.classList.add('loaded');
      observer.unobserve(img);
    }
  });
}, {
  rootMargin: '50px 0px', // Start loading 50px before visible
  threshold: 0.01
});

// Observe all lazy images
document.querySelectorAll('img[data-src]').forEach(img => {
  imageObserver.observe(img);
});

// Progressive image loading
class ProgressiveImage {
  constructor(small, large) {
    this.small = small;
    this.large = large;
    this.container = null;
  }
  
  load() {
    // Load small image first
    const smallImg = new Image();
    smallImg.src = this.small;
    smallImg.onload = () => {
      this.container.classList.add('loaded-small');
      
      // Then load large image
      const largeImg = new Image();
      largeImg.src = this.large;
      largeImg.onload = () => {
        this.container.style.backgroundImage = \`url(\${this.large})\`;
        this.container.classList.add('loaded-large');
      };
    };
  }
}

// Image optimization service
async function optimizeImage(file) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = await createImageBitmap(file);
  
  // Calculate optimal dimensions
  const maxWidth = 1920;
  const maxHeight = 1080;
  let { width, height } = img;
  
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width *= ratio;
    height *= ratio;
  }
  
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);
  
  // Convert to WebP or JPEG with quality setting
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/webp', 0.85);
  });
}

// Next.js Image component example
import Image from 'next/image';

function OptimizedGallery() {
  return (
    <div>
      <Image
        src="/hero.jpg"
        alt="Hero"
        width={1920}
        height={1080}
        priority // Load immediately for above-fold images
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,..."
      />
      
      <Image
        src="/product.jpg"
        alt="Product"
        width={800}
        height={600}
        loading="lazy"
        quality={85}
      />
    </div>
  );
}
</script>

<!-- Use CDN with image transformation -->
<img 
  src="https://cdn.example.com/images/photo.jpg?w=800&q=85&auto=format"
  alt="Optimized via CDN"
>

<!-- Webpack configuration for image optimization -->
<script>
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\\.(png|jpg|jpeg|gif)$/i,
        use: [
          {
            loader: 'image-webpack-loader',
            options: {
              mozjpeg: {
                progressive: true,
                quality: 85
              },
              optipng: {
                enabled: false
              },
              pngquant: {
                quality: [0.65, 0.90],
                speed: 4
              },
              gifsicle: {
                interlaced: false
              },
              webp: {
                quality: 85
              }
            }
          }
        ]
      }
    ]
  }
};
</script>`,
      explanation: 'Modern image formats, lazy loading, and responsive images dramatically reduce bandwidth and improve load times.',
      performanceGains: [
        'Reduces image sizes by 50-80% with WebP/AVIF',
        'Lazy loading defers off-screen image loading',
        'Responsive images serve appropriate sizes',
        'Progressive loading improves perceived performance',
        'CDN delivery reduces latency'
      ],
      metrics: {
        beforeMs: 15000,
        afterMs: 2000,
        improvement: '7x faster image loading'
      }
    };
  }

  private generateCacheOptimization(issue: any): OptimizationRecommendation {
    return {
      description: 'Implement effective caching strategies at multiple levels',
      before: `// No caching - hitting database every time
async function getUserData(userId) {
  const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  const posts = await db.query('SELECT * FROM posts WHERE user_id = ?', [userId]);
  const comments = await db.query('SELECT * FROM comments WHERE user_id = ?', [userId]);
  
  return { user, posts, comments };
}

// No HTTP caching headers
app.get('/api/data', async (req, res) => {
  const data = await fetchExpensiveData();
  res.json(data); // No cache headers
});

// Fetching same data repeatedly
function Dashboard() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Fetches on every component mount
    fetch('/api/user')
      .then(res => res.json())
      .then(setUser);
  }, []);
  
  return <div>{user?.name}</div>;
}`,
      after: `// Multi-level caching strategy
import Redis from 'ioredis';
import LRU from 'lru-cache';

// Level 1: In-memory cache
const memoryCache = new LRU({
  max: 500,
  maxAge: 1000 * 60 * 5, // 5 minutes
  updateAgeOnGet: true
});

// Level 2: Redis cache
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

// Level 3: Database with connection pooling
const dbPool = mysql.createPool({
  connectionLimit: 10,
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'myapp'
});

// Caching wrapper with multiple levels
class CacheManager {
  async get(key, fetchFn, options = {}) {
    const { ttl = 3600, skipCache = false } = options;
    
    if (skipCache) {
      return fetchFn();
    }
    
    // Check memory cache
    const memCached = memoryCache.get(key);
    if (memCached) {
      console.log('Memory cache hit:', key);
      return memCached;
    }
    
    // Check Redis cache
    const redisCached = await redis.get(key);
    if (redisCached) {
      console.log('Redis cache hit:', key);
      const data = JSON.parse(redisCached);
      memoryCache.set(key, data); // Update memory cache
      return data;
    }
    
    // Fetch from source
    console.log('Cache miss, fetching:', key);
    const data = await fetchFn();
    
    // Update both caches
    memoryCache.set(key, data);
    await redis.setex(key, ttl, JSON.stringify(data));
    
    return data;
  }
  
  async invalidate(pattern) {
    // Clear memory cache
    memoryCache.forEach((value, key) => {
      if (key.match(pattern)) {
        memoryCache.del(key);
      }
    });
    
    // Clear Redis cache
    const keys = await redis.keys(pattern);
    if (keys.length) {
      await redis.del(...keys);
    }
  }
}

const cache = new CacheManager();

// Optimized function with caching
async function getUserDataCached(userId) {
  return cache.get(\`user:\${userId}\`, async () => {
    const [user, posts, comments] = await Promise.all([
      dbPool.query('SELECT * FROM users WHERE id = ?', [userId]),
      dbPool.query('SELECT * FROM posts WHERE user_id = ?', [userId]),
      dbPool.query('SELECT * FROM comments WHERE user_id = ?', [userId])
    ]);
    
    return { user, posts, comments };
  }, { ttl: 300 }); // Cache for 5 minutes
}

// HTTP caching headers
app.get('/api/data', async (req, res) => {
  // Check ETag
  const data = await cache.get('api:data', fetchExpensiveData);
  const etag = generateETag(data);
  
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end(); // Not Modified
  }
  
  res.set({
    'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400',
    'ETag': etag,
    'Last-Modified': new Date().toUTCString(),
    'Vary': 'Accept-Encoding'
  });
  
  res.json(data);
});

// Frontend caching with SWR
import useSWR from 'swr';

function Dashboard() {
  const { data: user, error, mutate } = useSWR('/api/user', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 60000, // Refresh every minute
    dedupingInterval: 10000, // Dedupe requests within 10 seconds
    shouldRetryOnError: false
  });
  
  if (error) return <div>Error loading user</div>;
  if (!user) return <div>Loading...</div>;
  
  return <div>{user.name}</div>;
}

// Service Worker caching strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Cache-first strategy for assets
  if (url.pathname.match(/\\.(js|css|png|jpg|webp)$/)) {
    event.respondWith(
      caches.match(request).then(cached => {
        return cached || fetch(request).then(response => {
          return caches.open('assets-v1').then(cache => {
            cache.put(request, response.clone());
            return response;
          });
        });
      })
    );
  }
  
  // Network-first strategy for API calls
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open('api-v1').then(cache => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});

// CDN caching configuration
// cloudflare-page-rules.json
{
  "rules": [
    {
      "pattern": "*.js",
      "cache_level": "aggressive",
      "edge_cache_ttl": 2592000, // 30 days
      "browser_cache_ttl": 86400 // 1 day
    },
    {
      "pattern": "/api/*",
      "cache_level": "standard",
      "edge_cache_ttl": 300, // 5 minutes
      "bypass_cache_on_cookie": "session"
    }
  ]
}

// Database query caching
const sql = require('sql-template-strings');

class QueryCache {
  constructor(db, redis) {
    this.db = db;
    this.redis = redis;
  }
  
  async query(query, params, ttl = 60) {
    const key = \`query:\${hash(query + JSON.stringify(params))}\`;
    
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);
    
    const result = await this.db.query(query, params);
    await this.redis.setex(key, ttl, JSON.stringify(result));
    
    return result;
  }
  
  // Invalidate on write
  async execute(query, params) {
    const result = await this.db.execute(query, params);
    
    // Clear relevant caches
    const table = extractTableName(query);
    await this.redis.del(\`query:*\${table}*\`);
    
    return result;
  }
}`,
      explanation: 'Multi-level caching dramatically reduces database load and improves response times.',
      performanceGains: [
        'Reduces database queries by 90%+',
        'Sub-millisecond response times from memory cache',
        'Reduced server load and costs',
        'Better scalability under high traffic',
        'Improved user experience with instant data'
      ],
      metrics: {
        beforeMs: 500,
        afterMs: 5,
        improvement: '100x faster for cached data'
      }
    };
  }

  private generateGenericOptimization(issue: any): OptimizationRecommendation {
    return {
      description: `Performance optimization for ${issue.title}`,
      before: 'Unable to generate specific code example',
      after: 'Review performance best practices for your specific case',
      explanation: `This ${issue.severity} severity performance issue requires optimization.`,
      performanceGains: [
        'Improved response times',
        'Better resource utilization',
        'Enhanced user experience',
        'Reduced operational costs'
      ]
    };
  }

  /**
   * Enhance performance issues with optimization recommendations
   */
  async analyzeWithOptimizations(issues: any[]): Promise<EnhancedPerformanceIssue[]> {
    return issues.map(issue => {
      const enhanced: EnhancedPerformanceIssue = {
        ...issue,
        optimization: this.generateOptimization(issue)
      };
      return enhanced;
    });
  }
}