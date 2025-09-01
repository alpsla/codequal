/**
 * Enhanced Code Quality Agent with Refactoring Examples
 * Provides specific code improvements and refactoring suggestions
 */

import { BaseAgent } from '../base/base-agent';
import { AnalysisResult } from '../agent';

export interface RefactoringRecommendation {
  description: string;
  before: string;
  after: string;
  explanation: string;
  benefits: string[];
  relatedPatterns?: string[];
}

export interface EnhancedCodeQualityIssue {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  location?: {
    file: string;
    line?: number;
    column?: number;
  };
  evidence?: {
    codeSnippet: string;
    complexity?: number;
    metrics?: Record<string, any>;
  };
  refactoring?: RefactoringRecommendation;
  references?: string[];
}

export class EnhancedCodeQualityAgent extends BaseAgent {
  agentName = 'Enhanced Code Quality Specialist';
  
  // Implement required abstract methods
  async analyze(context: any): Promise<AnalysisResult> {
    return {
      insights: [],
      suggestions: [],
      educational: [],
      metadata: {
        agentName: this.agentName,
        confidence: 90
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
        confidence: 90
      }
    };
  }
  
  /**
   * Generate specific refactoring recommendations based on code quality issue type
   */
  generateRefactoring(issue: any): RefactoringRecommendation | undefined {
    const refactoringGenerators: Record<string, () => RefactoringRecommendation> = {
      'complex-function': () => this.generateComplexFunctionRefactoring(issue),
      'duplicate-code': () => this.generateDuplicateCodeRefactoring(issue),
      'long-parameter-list': () => this.generateLongParameterRefactoring(issue),
      'nested-callbacks': () => this.generateNestedCallbacksRefactoring(issue),
      'god-class': () => this.generateGodClassRefactoring(issue),
      'magic-numbers': () => this.generateMagicNumbersRefactoring(issue),
      'poor-naming': () => this.generatePoorNamingRefactoring(issue),
      'missing-abstraction': () => this.generateMissingAbstractionRefactoring(issue),
      'tight-coupling': () => this.generateTightCouplingRefactoring(issue),
      'dead-code': () => this.generateDeadCodeRefactoring(issue)
    };

    const generator = refactoringGenerators[issue.category?.toLowerCase()];
    return generator ? generator() : this.generateGenericRefactoring(issue);
  }

  private generateComplexFunctionRefactoring(issue: any): RefactoringRecommendation {
    return {
      description: 'Extract complex logic into smaller, focused functions',
      before: `async function processUserData(userData) {
  // Validate user data
  if (!userData.email || !userData.email.includes('@')) {
    throw new Error('Invalid email');
  }
  if (!userData.age || userData.age < 18) {
    throw new Error('User must be 18+');
  }
  if (!userData.password || userData.password.length < 8) {
    throw new Error('Password too short');
  }
  
  // Hash password
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(userData.password, salt, 1000, 64, 'sha512');
  
  // Save to database
  const user = {
    email: userData.email.toLowerCase(),
    age: userData.age,
    passwordHash: hash.toString('hex'),
    salt: salt.toString('hex'),
    createdAt: new Date()
  };
  
  const result = await db.users.insert(user);
  
  // Send welcome email
  const emailContent = \`Welcome \${userData.email}!\`;
  await emailService.send({
    to: userData.email,
    subject: 'Welcome!',
    body: emailContent
  });
  
  return result;
}`,
      after: `// Main function - orchestrates the process
async function processUserData(userData) {
  const validatedData = validateUserData(userData);
  const hashedPassword = hashPassword(validatedData.password);
  const user = await createUser(validatedData, hashedPassword);
  await sendWelcomeEmail(user.email);
  return user;
}

// Extracted validation logic
function validateUserData(userData) {
  const errors = [];
  
  if (!isValidEmail(userData.email)) {
    errors.push('Invalid email format');
  }
  
  if (!isValidAge(userData.age)) {
    errors.push('User must be 18 or older');
  }
  
  if (!isValidPassword(userData.password)) {
    errors.push('Password must be at least 8 characters');
  }
  
  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
  
  return userData;
}

// Extracted password hashing
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512');
  
  return {
    hash: hash.toString('hex'),
    salt: salt.toString('hex')
  };
}

// Extracted user creation
async function createUser(userData, hashedPassword) {
  const user = {
    email: userData.email.toLowerCase(),
    age: userData.age,
    passwordHash: hashedPassword.hash,
    salt: hashedPassword.salt,
    createdAt: new Date()
  };
  
  return await db.users.insert(user);
}

// Extracted email sending
async function sendWelcomeEmail(email) {
  return await emailService.send({
    to: email,
    subject: 'Welcome!',
    body: \`Welcome \${email}!\`
  });
}

// Helper validation functions
const isValidEmail = (email) => email && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
const isValidAge = (age) => age && age >= 18;
const isValidPassword = (password) => password && password.length >= 8;`,
      explanation: 'Breaking down complex functions improves readability, testability, and maintainability. Each function now has a single responsibility.',
      benefits: [
        'Improved readability - each function has a clear purpose',
        'Better testability - can test each function in isolation',
        'Easier maintenance - changes are localized',
        'Reusability - extracted functions can be reused',
        'Lower cognitive load - easier to understand smaller functions'
      ],
      relatedPatterns: ['Single Responsibility Principle', 'Extract Method', 'Compose Method']
    };
  }

  private generateDuplicateCodeRefactoring(issue: any): RefactoringRecommendation {
    return {
      description: 'Extract duplicate code into reusable functions or modules',
      before: `// File: userController.js
function updateUserEmail(userId, email) {
  if (!email || !email.includes('@')) {
    return { error: 'Invalid email', status: 400 };
  }
  const user = db.users.findById(userId);
  if (!user) {
    return { error: 'User not found', status: 404 };
  }
  user.email = email;
  user.updatedAt = new Date();
  db.users.save(user);
  return { success: true, user };
}

// File: adminController.js
function adminUpdateEmail(userId, email) {
  if (!email || !email.includes('@')) {
    return { error: 'Invalid email', status: 400 };
  }
  const user = db.users.findById(userId);
  if (!user) {
    return { error: 'User not found', status: 404 };
  }
  user.email = email;
  user.updatedAt = new Date();
  db.users.save(user);
  logAdminAction('email_update', userId);
  return { success: true, user };
}`,
      after: `// File: utils/userUtils.js
export function validateEmail(email) {
  if (!email || !email.includes('@')) {
    throw new ValidationError('Invalid email format');
  }
  return email;
}

export async function findUserOrThrow(userId) {
  const user = await db.users.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
}

export async function updateUserField(userId, field, value) {
  const user = await findUserOrThrow(userId);
  user[field] = value;
  user.updatedAt = new Date();
  return await db.users.save(user);
}

// File: userController.js
import { validateEmail, updateUserField } from './utils/userUtils';

async function updateUserEmail(userId, email) {
  try {
    const validEmail = validateEmail(email);
    const user = await updateUserField(userId, 'email', validEmail);
    return { success: true, user };
  } catch (error) {
    return handleError(error);
  }
}

// File: adminController.js
import { validateEmail, updateUserField } from './utils/userUtils';

async function adminUpdateEmail(userId, email) {
  try {
    const validEmail = validateEmail(email);
    const user = await updateUserField(userId, 'email', validEmail);
    await logAdminAction('email_update', userId);
    return { success: true, user };
  } catch (error) {
    return handleError(error);
  }
}`,
      explanation: 'DRY (Don\'t Repeat Yourself) principle - extracting common logic reduces maintenance burden and ensures consistency.',
      benefits: [
        'Single source of truth for business logic',
        'Consistent behavior across the application',
        'Easier to fix bugs - fix once, apply everywhere',
        'Reduced code size',
        'Better testability of shared logic'
      ],
      relatedPatterns: ['DRY Principle', 'Extract Method', 'Template Method Pattern']
    };
  }

  private generateLongParameterRefactoring(issue: any): RefactoringRecommendation {
    return {
      description: 'Use parameter objects or configuration objects for functions with many parameters',
      before: `function createOrder(
  customerId,
  productId,
  quantity,
  price,
  discount,
  shippingAddress,
  billingAddress,
  paymentMethod,
  giftWrap,
  giftMessage,
  expeditedShipping,
  insuranceRequired
) {
  // Complex order creation logic
  const order = {
    customerId,
    productId,
    quantity,
    price,
    discount,
    shippingAddress,
    billingAddress,
    paymentMethod,
    giftWrap,
    giftMessage,
    expeditedShipping,
    insuranceRequired,
    total: (price * quantity) * (1 - discount)
  };
  
  return processOrder(order);
}

// Calling the function is error-prone
const order = createOrder(
  123,
  456,
  2,
  29.99,
  0.1,
  '123 Main St',
  '456 Bill Ave',
  'credit_card',
  true,
  'Happy Birthday!',
  false,
  true
);`,
      after: `// Define clear interfaces for complex parameters
interface OrderDetails {
  customerId: number;
  productId: number;
  quantity: number;
  pricing: PricingInfo;
}

interface PricingInfo {
  unitPrice: number;
  discount?: number;
}

interface ShippingInfo {
  shippingAddress: string;
  billingAddress?: string;
  expedited?: boolean;
  insured?: boolean;
}

interface OrderOptions {
  paymentMethod: 'credit_card' | 'paypal' | 'crypto';
  gift?: GiftOptions;
}

interface GiftOptions {
  wrap: boolean;
  message?: string;
}

// Refactored function with parameter objects
function createOrder(
  details: OrderDetails,
  shipping: ShippingInfo,
  options?: OrderOptions
) {
  const order = {
    ...details,
    shipping,
    payment: options?.paymentMethod || 'credit_card',
    gift: options?.gift,
    total: calculateTotal(details.pricing, details.quantity)
  };
  
  return processOrder(order);
}

function calculateTotal(pricing: PricingInfo, quantity: number): number {
  const discount = pricing.discount || 0;
  return (pricing.unitPrice * quantity) * (1 - discount);
}

// Much clearer function calls
const order = createOrder(
  {
    customerId: 123,
    productId: 456,
    quantity: 2,
    pricing: {
      unitPrice: 29.99,
      discount: 0.1
    }
  },
  {
    shippingAddress: '123 Main St',
    billingAddress: '456 Bill Ave',
    expedited: false,
    insured: true
  },
  {
    paymentMethod: 'credit_card',
    gift: {
      wrap: true,
      message: 'Happy Birthday!'
    }
  }
);

// Or with defaults using builder pattern
class OrderBuilder {
  private details: Partial<OrderDetails> = {};
  private shipping: Partial<ShippingInfo> = {};
  private options: Partial<OrderOptions> = {};
  
  withCustomer(customerId: number) {
    this.details.customerId = customerId;
    return this;
  }
  
  withProduct(productId: number, quantity: number) {
    this.details.productId = productId;
    this.details.quantity = quantity;
    return this;
  }
  
  withPricing(unitPrice: number, discount?: number) {
    this.details.pricing = { unitPrice, discount };
    return this;
  }
  
  withShipping(address: string) {
    this.shipping.shippingAddress = address;
    return this;
  }
  
  build() {
    return createOrder(
      this.details as OrderDetails,
      this.shipping as ShippingInfo,
      this.options
    );
  }
}

// Even cleaner with builder
const order = new OrderBuilder()
  .withCustomer(123)
  .withProduct(456, 2)
  .withPricing(29.99, 0.1)
  .withShipping('123 Main St')
  .build();`,
      explanation: 'Parameter objects group related parameters, making function signatures cleaner and more maintainable.',
      benefits: [
        'Improved readability of function signatures',
        'Type safety with interfaces/types',
        'Easier to add optional parameters',
        'Self-documenting code with named properties',
        'Reduced chance of parameter order mistakes'
      ],
      relatedPatterns: ['Parameter Object', 'Builder Pattern', 'Options Pattern']
    };
  }

  private generateNestedCallbacksRefactoring(issue: any): RefactoringRecommendation {
    return {
      description: 'Replace nested callbacks with async/await or promises',
      before: `function processFile(filePath, callback) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return callback(err);
    }
    
    parseData(data, (err, parsed) => {
      if (err) {
        return callback(err);
      }
      
      validateData(parsed, (err, validated) => {
        if (err) {
          return callback(err);
        }
        
        saveToDatabase(validated, (err, result) => {
          if (err) {
            return callback(err);
          }
          
          sendNotification(result.id, (err, notificationResult) => {
            if (err) {
              console.error('Notification failed:', err);
              // Don't fail the whole operation
            }
            
            callback(null, result);
          });
        });
      });
    });
  });
}

// Callback hell makes error handling difficult
processFile('data.json', (err, result) => {
  if (err) {
    console.error('Processing failed:', err);
  } else {
    console.log('Success:', result);
  }
});`,
      after: `// Option 1: Using async/await (recommended)
async function processFile(filePath) {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    const parsed = await parseData(data);
    const validated = await validateData(parsed);
    const result = await saveToDatabase(validated);
    
    // Non-critical operation in try-catch
    try {
      await sendNotification(result.id);
    } catch (notificationError) {
      console.error('Notification failed:', notificationError);
      // Don't fail the whole operation
    }
    
    return result;
  } catch (error) {
    // Centralized error handling
    throw new ProcessingError(\`Failed to process file: \${error.message}\`, error);
  }
}

// Clean usage with async/await
try {
  const result = await processFile('data.json');
  console.log('Success:', result);
} catch (error) {
  console.error('Processing failed:', error);
}

// Option 2: Using promise chains
function processFileWithPromises(filePath) {
  return readFilePromise(filePath)
    .then(data => parseData(data))
    .then(parsed => validateData(parsed))
    .then(validated => saveToDatabase(validated))
    .then(result => {
      // Handle non-critical notification
      sendNotification(result.id).catch(err => 
        console.error('Notification failed:', err)
      );
      return result;
    })
    .catch(error => {
      throw new ProcessingError(\`Failed to process file: \${error.message}\`, error);
    });
}

// Option 3: Using pipeline pattern for better composition
class FileProcessor {
  private pipeline: Array<(data: any) => Promise<any>> = [];
  
  constructor(private filePath: string) {}
  
  addStep(step: (data: any) => Promise<any>) {
    this.pipeline.push(step);
    return this;
  }
  
  async execute() {
    let result = await fs.promises.readFile(this.filePath, 'utf8');
    
    for (const step of this.pipeline) {
      result = await step(result);
    }
    
    return result;
  }
}

// Flexible pipeline approach
const processor = new FileProcessor('data.json')
  .addStep(parseData)
  .addStep(validateData)
  .addStep(saveToDatabase)
  .addStep(async (result) => {
    await sendNotificationSafely(result.id);
    return result;
  });

const result = await processor.execute();`,
      explanation: 'Async/await provides linear, readable code flow while maintaining asynchronous execution.',
      benefits: [
        'Improved readability - looks like synchronous code',
        'Better error handling with try/catch',
        'Easier debugging with proper stack traces',
        'Reduced nesting levels',
        'More maintainable code structure'
      ],
      relatedPatterns: ['Promise Pattern', 'Async/Await', 'Pipeline Pattern', 'Chain of Responsibility']
    };
  }

  private generateGodClassRefactoring(issue: any): RefactoringRecommendation {
    return {
      description: 'Break down large classes into smaller, focused classes',
      before: `class UserManager {
  constructor(db, emailService, paymentService, analyticsService) {
    this.db = db;
    this.emailService = emailService;
    this.paymentService = paymentService;
    this.analyticsService = analyticsService;
  }
  
  // User CRUD operations
  createUser(userData) { /* ... */ }
  updateUser(userId, data) { /* ... */ }
  deleteUser(userId) { /* ... */ }
  findUser(userId) { /* ... */ }
  
  // Authentication
  login(email, password) { /* ... */ }
  logout(userId) { /* ... */ }
  resetPassword(email) { /* ... */ }
  verifyEmail(token) { /* ... */ }
  
  // Profile management
  updateProfile(userId, profile) { /* ... */ }
  uploadAvatar(userId, image) { /* ... */ }
  updatePreferences(userId, prefs) { /* ... */ }
  
  // Subscription management
  createSubscription(userId, plan) { /* ... */ }
  cancelSubscription(userId) { /* ... */ }
  upgradeSubscription(userId, newPlan) { /* ... */ }
  processPayment(userId, amount) { /* ... */ }
  
  // Email notifications
  sendWelcomeEmail(userId) { /* ... */ }
  sendPasswordResetEmail(email) { /* ... */ }
  sendSubscriptionEmail(userId, type) { /* ... */ }
  
  // Analytics
  trackUserAction(userId, action) { /* ... */ }
  getUserAnalytics(userId) { /* ... */ }
  generateUserReport(userId) { /* ... */ }
  
  // Admin functions
  banUser(userId) { /* ... */ }
  unbanUser(userId) { /* ... */ }
  getUserList(filters) { /* ... */ }
  exportUsers() { /* ... */ }
}`,
      after: `// Separate concerns into focused classes

// 1. User Repository - Data access layer
class UserRepository {
  constructor(private db: Database) {}
  
  async create(userData: UserData): Promise<User> {
    return this.db.users.insert(userData);
  }
  
  async update(userId: string, data: Partial<UserData>): Promise<User> {
    return this.db.users.update(userId, data);
  }
  
  async delete(userId: string): Promise<void> {
    await this.db.users.delete(userId);
  }
  
  async findById(userId: string): Promise<User | null> {
    return this.db.users.findById(userId);
  }
  
  async findByEmail(email: string): Promise<User | null> {
    return this.db.users.findOne({ email });
  }
}

// 2. Authentication Service - Auth logic
class AuthenticationService {
  constructor(
    private userRepo: UserRepository,
    private tokenService: TokenService
  ) {}
  
  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.userRepo.findByEmail(email);
    if (!user || !await this.verifyPassword(password, user.passwordHash)) {
      throw new AuthenticationError('Invalid credentials');
    }
    
    const token = this.tokenService.generateToken(user);
    return { user, token };
  }
  
  async logout(userId: string): Promise<void> {
    await this.tokenService.revokeUserTokens(userId);
  }
  
  async resetPassword(email: string): Promise<void> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) return; // Don't reveal if email exists
    
    const resetToken = this.tokenService.generateResetToken(user);
    await this.sendPasswordResetEmail(user, resetToken);
  }
  
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

// 3. Profile Service - Profile management
class ProfileService {
  constructor(
    private userRepo: UserRepository,
    private storageService: StorageService
  ) {}
  
  async updateProfile(userId: string, profile: ProfileData): Promise<User> {
    return this.userRepo.update(userId, { profile });
  }
  
  async uploadAvatar(userId: string, image: Buffer): Promise<string> {
    const avatarUrl = await this.storageService.uploadImage(image, \`avatars/\${userId}\`);
    await this.userRepo.update(userId, { avatarUrl });
    return avatarUrl;
  }
  
  async updatePreferences(userId: string, preferences: Preferences): Promise<void> {
    await this.userRepo.update(userId, { preferences });
  }
}

// 4. Subscription Service - Payment and subscription logic
class SubscriptionService {
  constructor(
    private userRepo: UserRepository,
    private paymentService: PaymentService,
    private emailService: EmailService
  ) {}
  
  async createSubscription(userId: string, plan: SubscriptionPlan): Promise<Subscription> {
    const user = await this.userRepo.findById(userId);
    const payment = await this.paymentService.createRecurringPayment(user, plan);
    
    const subscription = {
      userId,
      planId: plan.id,
      paymentId: payment.id,
      status: 'active',
      startDate: new Date()
    };
    
    await this.emailService.sendSubscriptionConfirmation(user, subscription);
    return subscription;
  }
  
  async cancelSubscription(userId: string): Promise<void> {
    const subscription = await this.getActiveSubscription(userId);
    await this.paymentService.cancelRecurringPayment(subscription.paymentId);
    subscription.status = 'cancelled';
    subscription.endDate = new Date();
  }
}

// 5. Notification Service - Email notifications
class NotificationService {
  constructor(private emailService: EmailService) {}
  
  async sendWelcomeEmail(user: User): Promise<void> {
    await this.emailService.send({
      to: user.email,
      template: 'welcome',
      data: { name: user.name }
    });
  }
  
  async sendPasswordResetEmail(user: User, resetToken: string): Promise<void> {
    await this.emailService.send({
      to: user.email,
      template: 'password-reset',
      data: { name: user.name, resetLink: this.getResetLink(resetToken) }
    });
  }
}

// 6. Analytics Service - User analytics
class UserAnalyticsService {
  constructor(private analyticsProvider: AnalyticsProvider) {}
  
  async trackAction(userId: string, action: UserAction): Promise<void> {
    await this.analyticsProvider.track({
      userId,
      event: action.type,
      properties: action.data,
      timestamp: new Date()
    });
  }
  
  async getUserMetrics(userId: string): Promise<UserMetrics> {
    return this.analyticsProvider.getUserMetrics(userId);
  }
}

// 7. User Administration Service - Admin functions
class UserAdministrationService {
  constructor(
    private userRepo: UserRepository,
    private auditService: AuditService
  ) {}
  
  async banUser(userId: string, reason: string, adminId: string): Promise<void> {
    await this.userRepo.update(userId, { 
      status: 'banned',
      banReason: reason
    });
    
    await this.auditService.log({
      action: 'user_banned',
      targetId: userId,
      performedBy: adminId,
      reason
    });
  }
  
  async exportUsers(filters?: UserFilters): Promise<Buffer> {
    const users = await this.userRepo.findAll(filters);
    return this.generateCSV(users);
  }
}

// Facade pattern for simplified API if needed
class UserManagementFacade {
  constructor(
    private auth: AuthenticationService,
    private profile: ProfileService,
    private subscription: SubscriptionService,
    private notifications: NotificationService
  ) {}
  
  // Orchestrate complex operations
  async registerUser(userData: UserRegistrationData) {
    const user = await this.auth.register(userData);
    await this.profile.setupDefaultProfile(user.id);
    await this.notifications.sendWelcomeEmail(user);
    return user;
  }
}`,
      explanation: 'Splitting a God Class into focused classes follows Single Responsibility Principle and improves maintainability.',
      benefits: [
        'Each class has a single, clear responsibility',
        'Easier to test individual components',
        'Better code organization and navigation',
        'Reduced coupling between different concerns',
        'Easier to modify and extend individual features',
        'Improved team collaboration - different developers can work on different classes'
      ],
      relatedPatterns: ['Single Responsibility Principle', 'Repository Pattern', 'Service Layer', 'Facade Pattern']
    };
  }

  private generateMagicNumbersRefactoring(issue: any): RefactoringRecommendation {
    return {
      description: 'Replace magic numbers and strings with named constants',
      before: `function calculatePrice(quantity, userType) {
  let price = quantity * 29.99;
  
  // Apply discounts based on quantity
  if (quantity > 100) {
    price *= 0.7;  // What does 0.7 mean?
  } else if (quantity > 50) {
    price *= 0.85;
  } else if (quantity > 10) {
    price *= 0.95;
  }
  
  // Apply user type discounts
  if (userType === 1) {  // What is user type 1?
    price *= 0.9;
  } else if (userType === 2) {
    price *= 0.8;
  }
  
  // Add shipping
  if (price < 50) {  // Why 50?
    price += 9.99;
  }
  
  // Apply tax
  price *= 1.0825;  // What tax rate is this?
  
  return Math.round(price * 100) / 100;
}

function isValidPassword(password) {
  return password.length >= 8 &&  // Why 8?
         password.length <= 128 &&  // Why 128?
         /[A-Z]/.test(password) &&
         /[0-9]/.test(password);
}`,
      after: `// Define all constants in a clear, centralized location
const PRICING = {
  BASE_PRICE: 29.99,
  QUANTITY_DISCOUNTS: {
    BULK: { minQuantity: 100, discount: 0.30 },      // 30% off for bulk
    LARGE: { minQuantity: 50, discount: 0.15 },      // 15% off for large orders
    MEDIUM: { minQuantity: 10, discount: 0.05 }      // 5% off for medium orders
  },
  FREE_SHIPPING_THRESHOLD: 50.00,
  SHIPPING_COST: 9.99,
  TAX_RATE: 0.0825  // 8.25% sales tax
} as const;

enum UserType {
  REGULAR = 'regular',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

const USER_DISCOUNTS: Record<UserType, number> = {
  [UserType.REGULAR]: 0.00,      // No discount
  [UserType.PREMIUM]: 0.10,      // 10% discount
  [UserType.ENTERPRISE]: 0.20    // 20% discount
};

const PASSWORD_RULES = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: false  // Can be enabled later
} as const;

// Refactored functions with named constants
function calculatePrice(quantity: number, userType: UserType): number {
  let price = quantity * PRICING.BASE_PRICE;
  
  // Apply quantity-based discounts
  price = applyQuantityDiscount(price, quantity);
  
  // Apply user type discount
  price = applyUserDiscount(price, userType);
  
  // Add shipping if below threshold
  price = addShippingCost(price);
  
  // Apply tax
  price = applyTax(price);
  
  return roundToTwoDecimals(price);
}

function applyQuantityDiscount(price: number, quantity: number): number {
  const { BULK, LARGE, MEDIUM } = PRICING.QUANTITY_DISCOUNTS;
  
  if (quantity >= BULK.minQuantity) {
    return price * (1 - BULK.discount);
  } else if (quantity >= LARGE.minQuantity) {
    return price * (1 - LARGE.discount);
  } else if (quantity >= MEDIUM.minQuantity) {
    return price * (1 - MEDIUM.discount);
  }
  
  return price;
}

function applyUserDiscount(price: number, userType: UserType): number {
  const discount = USER_DISCOUNTS[userType] || 0;
  return price * (1 - discount);
}

function addShippingCost(price: number): number {
  if (price < PRICING.FREE_SHIPPING_THRESHOLD) {
    return price + PRICING.SHIPPING_COST;
  }
  return price;
}

function applyTax(price: number): number {
  return price * (1 + PRICING.TAX_RATE);
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

// Password validation with named constants
function isValidPassword(password: string): boolean {
  const errors = validatePassword(password);
  return errors.length === 0;
}

function validatePassword(password: string): string[] {
  const errors: string[] = [];
  
  if (password.length < PASSWORD_RULES.MIN_LENGTH) {
    errors.push(\`Password must be at least \${PASSWORD_RULES.MIN_LENGTH} characters\`);
  }
  
  if (password.length > PASSWORD_RULES.MAX_LENGTH) {
    errors.push(\`Password must be no more than \${PASSWORD_RULES.MAX_LENGTH} characters\`);
  }
  
  if (PASSWORD_RULES.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (PASSWORD_RULES.REQUIRE_NUMBER && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (PASSWORD_RULES.REQUIRE_SPECIAL && !/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return errors;
}

// Even better: Configuration-driven approach
class PricingCalculator {
  constructor(private config: PricingConfig) {}
  
  calculate(quantity: number, userType: UserType): number {
    const pipeline = [
      this.applyBasePrice.bind(this),
      this.applyQuantityDiscount.bind(this),
      this.applyUserDiscount.bind(this),
      this.addShipping.bind(this),
      this.applyTax.bind(this)
    ];
    
    return pipeline.reduce(
      (price, step) => step(price, quantity, userType),
      0
    );
  }
}`,
      explanation: 'Named constants make code self-documenting and easier to maintain. Changes to business rules only require updating the constants.',
      benefits: [
        'Self-documenting code - clear what each value represents',
        'Centralized configuration - easy to find and update',
        'Prevents typos and inconsistencies',
        'Easier to test with different configurations',
        'Business rules are explicit and visible'
      ],
      relatedPatterns: ['Named Constants', 'Configuration Object', 'Strategy Pattern']
    };
  }

  private generatePoorNamingRefactoring(issue: any): RefactoringRecommendation {
    return {
      description: 'Use descriptive, meaningful names for variables, functions, and classes',
      before: `// Poor naming examples
let d = new Date();
let yrs = calcAge(bd);
let temp = getUserData();
let flag = true;
let arr = [];
let obj = {};

function calc(x, y, z) {
  return x * y + z;
}

function process(data) {
  let result = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i].st === 1) {
      result.push(data[i]);
    }
  }
  return result;
}

class Mgr {
  constructor() {
    this.d = [];
  }
  
  add(i) {
    this.d.push(i);
  }
  
  get(n) {
    return this.d[n];
  }
}

// Unclear abbreviations
const usrMgr = new UserManager();
const configs = loadCfg();
const err = validate(input);`,
      after: `// Clear, descriptive naming
const currentDate = new Date();
const userAgeInYears = calculateAgeFromBirthdate(birthDate);
const currentUserProfile = fetchUserProfile();
const isEmailVerified = true;
const productList = [];
const userPreferences = {};

// Descriptive function names with clear parameters
function calculateTotalPrice(unitPrice, quantity, taxAmount) {
  return unitPrice * quantity + taxAmount;
}

function filterActiveUsers(users) {
  const ACTIVE_STATUS = 1;
  return users.filter(user => user.status === ACTIVE_STATUS);
}

// Full, descriptive class names
class TaskQueueManager {
  constructor() {
    this.taskQueue = [];
  }
  
  enqueueTask(task) {
    this.taskQueue.push(task);
  }
  
  getTaskByIndex(index) {
    return this.taskQueue[index];
  }
  
  getNextTask() {
    return this.taskQueue.shift();
  }
  
  getTotalTaskCount() {
    return this.taskQueue.length;
  }
}

// Avoid unclear abbreviations
const userManager = new UserManager();
const applicationConfiguration = loadConfiguration();
const validationError = validateUserInput(input);

// Use meaningful names for loop variables
for (const product of products) {
  processProduct(product);
}

for (const [index, customer] of customers.entries()) {
  console.log(\`Customer #\${index + 1}: \${customer.name}\`);
}

// Boolean naming conventions
const hasUserPermission = checkPermission(user, 'admin');
const isLoading = false;
const canEdit = true;
const shouldUpdate = needsUpdate();

// Function names that describe what they return
function getUserById(userId) { /* ... */ }         // Returns a user
function isValidEmail(email) { /* ... */ }         // Returns boolean
function createAuthToken(user) { /* ... */ }       // Returns created token
function calculateDiscount(price) { /* ... */ }    // Returns calculated value

// Constant naming conventions
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 5000;
const API_BASE_URL = 'https://api.example.com';

// Event handler naming
function handleLoginButtonClick() { /* ... */ }
function onUserProfileUpdate() { /* ... */ }
function validateFormBeforeSubmit() { /* ... */ }

// Naming for different contexts
interface UserCredentials {
  emailAddress: string;      // Not just 'email' - be specific
  hashedPassword: string;     // Not just 'password' - indicate it's hashed
  twoFactorToken?: string;    // Not just 'token' - specify what kind
}

class EmailNotificationService {  // Not just 'NotificationService'
  async sendPasswordResetEmail() { /* ... */ }     // Specific action
  async sendWelcomeEmail() { /* ... */ }          // Clear purpose
  async sendInvoiceEmail() { /* ... */ }          // Descriptive
}`,
      explanation: 'Good naming is one of the most important aspects of maintainable code. Names should clearly communicate intent.',
      benefits: [
        'Code becomes self-documenting',
        'Reduced need for comments',
        'Easier onboarding for new team members',
        'Fewer bugs from misunderstanding code',
        'Improved code searchability'
      ],
      relatedPatterns: ['Clean Code Principles', 'Naming Conventions', 'Self-Documenting Code']
    };
  }

  private generateMissingAbstractionRefactoring(issue: any): RefactoringRecommendation {
    return {
      description: 'Create abstractions to encapsulate complex logic and improve reusability',
      before: `// Repeated validation logic without abstraction
function createUser(data) {
  // Email validation
  if (!data.email || !data.email.includes('@') || data.email.length > 255) {
    throw new Error('Invalid email');
  }
  
  // Phone validation
  if (data.phone && !data.phone.match(/^\\+?[1-9]\\d{1,14}$/)) {
    throw new Error('Invalid phone');
  }
  
  // Save user
  return db.users.create(data);
}

function updateUserEmail(userId, email) {
  // Same email validation repeated
  if (!email || !email.includes('@') || email.length > 255) {
    throw new Error('Invalid email');
  }
  
  return db.users.update(userId, { email });
}

// Date manipulation without abstraction
function getNextBusinessDay(date) {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
}

function addBusinessDays(date, days) {
  const result = new Date(date);
  let daysAdded = 0;
  
  while (daysAdded < days) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      daysAdded++;
    }
  }
  
  return result;
}`,
      after: `// Create validation abstraction
class Validator {
  private rules: ValidationRule[] = [];
  
  constructor(private value: any, private fieldName: string) {}
  
  required(): this {
    this.rules.push({
      validate: (val) => val != null && val !== '',
      message: \`\${this.fieldName} is required\`
    });
    return this;
  }
  
  email(): this {
    this.rules.push({
      validate: (val) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(val),
      message: \`\${this.fieldName} must be a valid email\`
    });
    return this;
  }
  
  maxLength(max: number): this {
    this.rules.push({
      validate: (val) => !val || val.length <= max,
      message: \`\${this.fieldName} must be at most \${max} characters\`
    });
    return this;
  }
  
  phone(): this {
    this.rules.push({
      validate: (val) => !val || /^\\+?[1-9]\\d{1,14}$/.test(val),
      message: \`\${this.fieldName} must be a valid phone number\`
    });
    return this;
  }
  
  validate(): ValidationResult {
    const errors: string[] = [];
    
    for (const rule of this.rules) {
      if (!rule.validate(this.value)) {
        errors.push(rule.message);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Use validation abstraction
function createUser(data) {
  const emailValidation = new Validator(data.email, 'Email')
    .required()
    .email()
    .maxLength(255)
    .validate();
    
  if (!emailValidation.isValid) {
    throw new ValidationError(emailValidation.errors);
  }
  
  const phoneValidation = new Validator(data.phone, 'Phone')
    .phone()
    .validate();
    
  if (!phoneValidation.isValid) {
    throw new ValidationError(phoneValidation.errors);
  }
  
  return db.users.create(data);
}

// Or use a schema-based approach
const UserSchema = {
  email: {
    type: 'string',
    required: true,
    validators: ['email'],
    maxLength: 255
  },
  phone: {
    type: 'string',
    required: false,
    validators: ['phone']
  }
};

function validateAgainstSchema(data, schema) {
  const errors = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const validator = new Validator(data[field], field);
    
    if (rules.required) validator.required();
    if (rules.validators?.includes('email')) validator.email();
    if (rules.validators?.includes('phone')) validator.phone();
    if (rules.maxLength) validator.maxLength(rules.maxLength);
    
    const result = validator.validate();
    if (!result.isValid) {
      errors[field] = result.errors;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Date abstraction
class BusinessCalendar {
  private holidays: Set<string> = new Set();
  
  constructor(holidays: Date[] = []) {
    holidays.forEach(date => 
      this.holidays.add(date.toISOString().split('T')[0])
    );
  }
  
  isBusinessDay(date: Date): boolean {
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split('T')[0];
    
    return dayOfWeek !== 0 && // Not Sunday
           dayOfWeek !== 6 && // Not Saturday
           !this.holidays.has(dateStr); // Not a holiday
  }
  
  getNextBusinessDay(date: Date): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    
    while (!this.isBusinessDay(next)) {
      next.setDate(next.getDate() + 1);
    }
    
    return next;
  }
  
  addBusinessDays(date: Date, days: number): Date {
    const result = new Date(date);
    let daysAdded = 0;
    
    while (daysAdded < days) {
      result.setDate(result.getDate() + 1);
      if (this.isBusinessDay(result)) {
        daysAdded++;
      }
    }
    
    return result;
  }
  
  getBusinessDaysBetween(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);
    
    while (current < end) {
      if (this.isBusinessDay(current)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }
}

// Usage with abstraction
const calendar = new BusinessCalendar([
  new Date('2024-12-25'), // Christmas
  new Date('2024-01-01')  // New Year
]);

const nextWorkDay = calendar.getNextBusinessDay(new Date());
const deadline = calendar.addBusinessDays(new Date(), 10);`,
      explanation: 'Creating proper abstractions eliminates code duplication and provides reusable, testable components.',
      benefits: [
        'Eliminates code duplication',
        'Single source of truth for business logic',
        'Easier to test abstracted components',
        'Better code organization',
        'Improved maintainability and extensibility'
      ],
      relatedPatterns: ['DRY Principle', 'Single Responsibility', 'Strategy Pattern', 'Value Object']
    };
  }

  private generateTightCouplingRefactoring(issue: any): RefactoringRecommendation {
    return {
      description: 'Reduce tight coupling between components using dependency injection and interfaces',
      before: `// Tightly coupled classes
class EmailService {
  sendEmail(to, subject, body) {
    // Direct SMTP implementation
    const smtp = new SMTPClient('smtp.gmail.com', 587);
    smtp.authenticate('user@gmail.com', 'password');
    smtp.send(to, subject, body);
  }
}

class UserService {
  constructor() {
    // Directly instantiating dependencies (tight coupling)
    this.emailService = new EmailService();
    this.database = new MySQLDatabase('localhost', 'root', 'password');
    this.logger = new FileLogger('/var/log/app.log');
  }
  
  async createUser(userData) {
    try {
      // Direct database calls
      const user = await this.database.query(
        'INSERT INTO users SET ?', userData
      );
      
      // Direct email service call
      this.emailService.sendEmail(
        userData.email,
        'Welcome!',
        'Thanks for signing up!'
      );
      
      // Direct logger call
      this.logger.log('User created: ' + user.id);
      
      return user;
    } catch (error) {
      this.logger.log('Error: ' + error.message);
      throw error;
    }
  }
}

// Direct instantiation makes testing difficult
const userService = new UserService();`,
      after: `// Define interfaces for dependencies
interface EmailProvider {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

interface DatabaseProvider {
  query(sql: string, params?: any): Promise<any>;
  insert(table: string, data: any): Promise<any>;
  update(table: string, data: any, where: any): Promise<any>;
}

interface Logger {
  log(message: string, level?: 'info' | 'warn' | 'error'): void;
  error(message: string, error?: Error): void;
}

// Implement interfaces with specific providers
class SMTPEmailProvider implements EmailProvider {
  constructor(private config: SMTPConfig) {}
  
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    const smtp = new SMTPClient(this.config);
    await smtp.send({ to, subject, body });
  }
}

class SendGridEmailProvider implements EmailProvider {
  constructor(private apiKey: string) {}
  
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    await sendgrid.send({
      apiKey: this.apiKey,
      to,
      subject,
      body
    });
  }
}

class MySQLDatabaseProvider implements DatabaseProvider {
  constructor(private connection: MySQLConnection) {}
  
  async query(sql: string, params?: any): Promise<any> {
    return this.connection.query(sql, params);
  }
  
  async insert(table: string, data: any): Promise<any> {
    return this.connection.query(\`INSERT INTO \${table} SET ?\`, data);
  }
  
  async update(table: string, data: any, where: any): Promise<any> {
    return this.connection.query(
      \`UPDATE \${table} SET ? WHERE ?\`,
      [data, where]
    );
  }
}

// Loosely coupled UserService with dependency injection
class UserService {
  constructor(
    private emailProvider: EmailProvider,
    private database: DatabaseProvider,
    private logger: Logger
  ) {}
  
  async createUser(userData: UserData): Promise<User> {
    try {
      const user = await this.database.insert('users', userData);
      
      // Send welcome email
      await this.emailProvider.sendEmail(
        userData.email,
        'Welcome!',
        this.getWelcomeEmailBody(userData)
      );
      
      this.logger.log(\`User created: \${user.id}\`);
      
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error);
      throw error;
    }
  }
  
  private getWelcomeEmailBody(userData: UserData): string {
    return \`Welcome \${userData.name}! Thanks for joining us.\`;
  }
}

// Dependency injection container
class DIContainer {
  private services = new Map<string, any>();
  
  register(name: string, factory: () => any): void {
    this.services.set(name, factory);
  }
  
  get<T>(name: string): T {
    const factory = this.services.get(name);
    if (!factory) {
      throw new Error(\`Service \${name} not registered\`);
    }
    return factory();
  }
}

// Configure dependencies
const container = new DIContainer();

container.register('emailProvider', () => {
  if (process.env.NODE_ENV === 'production') {
    return new SendGridEmailProvider(process.env.SENDGRID_API_KEY);
  }
  return new SMTPEmailProvider(getSmtpConfig());
});

container.register('database', () => {
  return new MySQLDatabaseProvider(getDatabaseConnection());
});

container.register('logger', () => {
  if (process.env.NODE_ENV === 'test') {
    return new ConsoleLogger();
  }
  return new FileLogger(process.env.LOG_PATH);
});

container.register('userService', () => {
  return new UserService(
    container.get('emailProvider'),
    container.get('database'),
    container.get('logger')
  );
});

// Usage
const userService = container.get<UserService>('userService');

// Easy testing with mocks
describe('UserService', () => {
  it('should create user and send email', async () => {
    const mockEmail = { sendEmail: jest.fn() };
    const mockDb = { insert: jest.fn().mockResolvedValue({ id: 1 }) };
    const mockLogger = { log: jest.fn(), error: jest.fn() };
    
    const service = new UserService(mockEmail, mockDb, mockLogger);
    
    await service.createUser({ email: 'test@test.com', name: 'Test' });
    
    expect(mockDb.insert).toHaveBeenCalledWith('users', expect.any(Object));
    expect(mockEmail.sendEmail).toHaveBeenCalled();
    expect(mockLogger.log).toHaveBeenCalledWith('User created: 1');
  });
});`,
      explanation: 'Dependency injection and interfaces reduce coupling, making code more flexible, testable, and maintainable.',
      benefits: [
        'Easier unit testing with mocks',
        'Flexibility to swap implementations',
        'Better separation of concerns',
        'Follows SOLID principles',
        'Easier to maintain and extend'
      ],
      relatedPatterns: ['Dependency Injection', 'Inversion of Control', 'Interface Segregation', 'Strategy Pattern']
    };
  }

  private generateDeadCodeRefactoring(issue: any): RefactoringRecommendation {
    return {
      description: 'Remove dead code and unused variables, functions, and imports',
      before: `import { utils, helpers, validators, formatters } from './lib';
import _ from 'lodash';  // Unused
import moment from 'moment';  // Replaced with date-fns
import { OldAPI } from './legacy';  // No longer used

// Unused variables
const MAX_RETRIES = 3;  // Never used
const DEBUG_MODE = false;  // Never checked
let tempData = null;  // Never assigned

// Deprecated function still in codebase
function oldCalculatePrice(amount) {
  // Old pricing logic
  return amount * 1.2;
}

// New function being used
function calculatePrice(amount, taxRate = 0.1) {
  const subtotal = amount;
  const tax = subtotal * taxRate;
  
  // Commented out old logic
  // const oldPrice = oldCalculatePrice(amount);
  // console.log('Old price was:', oldPrice);
  
  // Dead code - condition is always false
  if (false) {
    console.log('This never runs');
    return amount * 2;
  }
  
  // Unreachable code
  return subtotal + tax;
  console.log('Price calculated');  // Never executed
}

// Unused class
class LegacyProcessor {
  process(data) {
    // Old processing logic
    return data;
  }
}

// Function with unused parameters
function createUser(name, email, phone, address, age) {
  // Only using name and email
  return {
    name: name,
    email: email
  };
}

// Redundant conditions
function checkStatus(user) {
  if (user.isActive) {
    return true;
  } else {
    return false;
  }
}`,
      after: `// Only import what's actually used
import { utils, formatters } from './lib';
import { addDays, format } from 'date-fns';

// Only keep constants that are used
const TAX_RATE = {
  DEFAULT: 0.1,
  REDUCED: 0.05,
  EXEMPT: 0
} as const;

// Clean, focused function without dead code
function calculatePrice(amount: number, taxRate = TAX_RATE.DEFAULT): number {
  const subtotal = amount;
  const tax = subtotal * taxRate;
  return subtotal + tax;
}

// Use proper TypeScript types instead of unused parameters
interface CreateUserData {
  name: string;
  email: string;
}

function createUser({ name, email }: CreateUserData) {
  return {
    name,
    email
  };
}

// Simplified boolean return
function checkStatus(user: User): boolean {
  return user.isActive;
}

// Remove entire unused code blocks and add documentation
/**
 * Calculates the final price including tax
 * @param amount Base amount before tax
 * @param taxRate Optional tax rate (defaults to 10%)
 * @returns Total price including tax
 */
function calculatePriceWithTax(amount: number, taxRate?: number): number {
  const rate = taxRate ?? TAX_RATE.DEFAULT;
  return amount * (1 + rate);
}

// Use tree-shaking friendly exports
export { calculatePrice, createUser, checkStatus };

// Configuration for build tools to eliminate dead code
// webpack.config.js
module.exports = {
  optimization: {
    usedExports: true,
    sideEffects: false,
    terserOptions: {
      compress: {
        dead_code: true,
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        unused: true
      }
    }
  }
};

// Use TypeScript compiler options to catch unused code
// tsconfig.json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false
  }
}

// ESLint configuration to prevent dead code
// .eslintrc.json
{
  "rules": {
    "no-unused-vars": "error",
    "no-unused-expressions": "error",
    "no-unreachable": "error",
    "no-dead-code": "error",
    "import/no-unused-modules": "error"
  }
}`,
      explanation: 'Removing dead code reduces bundle size, improves maintainability, and eliminates confusion.',
      benefits: [
        'Reduced bundle size and better performance',
        'Cleaner, more maintainable codebase',
        'Eliminates confusion from unused code',
        'Faster build times',
        'Easier to understand code flow'
      ],
      relatedPatterns: ['Code Hygiene', 'Tree Shaking', 'Minimalism']
    };
  }

  private generateGenericRefactoring(issue: any): RefactoringRecommendation {
    return {
      description: `Refactoring for ${issue.title}`,
      before: 'Unable to generate specific code example',
      after: 'Review code quality best practices for your specific case',
      explanation: `This ${issue.severity} severity issue requires refactoring to improve code quality.`,
      benefits: [
        'Improved code maintainability',
        'Better readability',
        'Easier testing',
        'Reduced technical debt'
      ]
    };
  }

  /**
   * Enhance code quality issues with refactoring recommendations
   */
  async analyzeWithRefactoring(issues: any[]): Promise<EnhancedCodeQualityIssue[]> {
    return issues.map(issue => {
      const enhanced: EnhancedCodeQualityIssue = {
        ...issue,
        refactoring: this.generateRefactoring(issue)
      };
      return enhanced;
    });
  }
}