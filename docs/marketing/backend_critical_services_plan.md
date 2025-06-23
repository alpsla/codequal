# CodeQual Backend Critical Services Implementation Plan
## Priority: Backend Services First, Automation Second

---

## 🎯 Implementation Priority Order

### **Phase 1: Advanced Feedback Service** (Week 1-2)
### **Phase 2: Advanced Chat System** (Week 3-4) 
### **Phase 3: Unified Notification System** (Week 5-6)
### **Phase 4: Marketing Automation** (Week 7-8)

---

## 📝 Phase 1: Advanced Feedback Service (Priority 1)

### **1.1 Database Schema Implementation**
```sql
-- Extend existing feedback tables
CREATE TABLE IF NOT EXISTS feedback_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  feedback_type feedback_type_enum NOT NULL,
  context JSONB DEFAULT '{}',
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  message TEXT,
  metadata JSONB DEFAULT '{}',
  status feedback_status_enum DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_feedback_user_id (user_id),
  INDEX idx_feedback_type (feedback_type),
  INDEX idx_feedback_status (status),
  INDEX idx_feedback_created_at (created_at)
);

-- Create enum types
CREATE TYPE feedback_type_enum AS ENUM (
  'finding_feedback',
  'educational_feedback', 
  'feature_request',
  'bug_report',
  'beta_feedback',
  'general_feedback',
  'testimonial',
  'nps_survey'
);

CREATE TYPE feedback_status_enum AS ENUM (
  'open',
  'acknowledged', 
  'in_progress',
  'resolved',
  'archived'
);

-- Beta program specific table
CREATE TABLE IF NOT EXISTS beta_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active',
  feedback_frequency TEXT DEFAULT 'weekly',
  last_feedback_at TIMESTAMP WITH TIME ZONE,
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  testimonial_approved BOOLEAN DEFAULT FALSE,
  referral_count INTEGER DEFAULT 0,
  
  UNIQUE(user_id)
);

-- Feedback templates for consistent collection
CREATE TABLE IF NOT EXISTS feedback_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  feedback_type feedback_type_enum NOT NULL,
  trigger_condition JSONB, -- When to show this feedback
  questions JSONB NOT NULL, -- Array of questions
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **1.2 TypeScript Interfaces**
```typescript
// Core feedback interfaces
interface FeedbackEntry {
  id: string;
  userId: string;
  feedbackType: FeedbackType;
  context?: FeedbackContext;
  rating?: number;
  message?: string;
  metadata: FeedbackMetadata;
  status: FeedbackStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface FeedbackContext {
  findingId?: string;
  analysisId?: string;
  featureName?: string;
  pageUrl?: string;
  repositoryUrl?: string;
  sessionId?: string;
}

interface FeedbackMetadata {
  userAgent: string;
  timestamp: Date;
  userTier: 'free' | 'pro' | 'team';
  betaProgram: boolean;
  previousFeedbackCount: number;
  timeSpentOnPage?: number;
  lastAnalysisDate?: Date;
}

// Beta program interfaces
interface BetaParticipant {
  id: string;
  userId: string;
  joinedAt: Date;
  status: 'active' | 'churned' | 'converted' | 'paused';
  feedbackFrequency: 'daily' | 'weekly' | 'monthly';
  lastFeedbackAt?: Date;
  npsScore?: number;
  testimonialApproved: boolean;
  referralCount: number;
}

interface FeedbackTemplate {
  id: string;
  name: string;
  feedbackType: FeedbackType;
  triggerCondition: FeedbackTrigger;
  questions: FeedbackQuestion[];
  active: boolean;
}

interface FeedbackTrigger {
  event: 'analysis_complete' | 'feature_used' | 'time_based' | 'nps_threshold';
  conditions: Record<string, any>;
  delay?: number; // minutes
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
}
```

### **1.3 API Endpoints Implementation**
```typescript
// Feedback service endpoints
POST   /api/feedback/submit
GET    /api/feedback/user/:userId
GET    /api/feedback/analytics/summary
PUT    /api/feedback/:id/status
POST   /api/feedback/template/trigger
GET    /api/feedback/templates/active

// Beta program endpoints  
POST   /api/beta/join
GET    /api/beta/participant/:userId
POST   /api/beta/feedback/submit
GET    /api/beta/analytics/dashboard
POST   /api/beta/testimonial/approve

// Admin endpoints (for you)
GET    /api/admin/feedback/dashboard
POST   /api/admin/feedback/bulk-update
GET    /api/admin/beta/participants
POST   /api/admin/feedback/template
```

### **1.4 React Components Structure**
```typescript
// Feedback components hierarchy
<FeedbackSystem>
  <FeedbackProvider> // Context for feedback state
    <FeedbackTrigger> // Handles when to show feedback
      <FeedbackModal> // Main feedback collection UI
        <FeedbackForm> // Dynamic form based on type
          <RatingComponent />
          <TextAreaComponent />
          <MultipleChoiceComponent />
          <NPSComponent />
        </FeedbackForm>
      </FeedbackModal>
    </FeedbackTrigger>
    
    <BetaFeedbackFlow> // Beta-specific components
      <BetaWelcomeSurvey />
      <WeeklyCheckIn />
      <NPSSurvey />
      <TestimonialRequest />
    </BetaFeedbackFlow>
    
    <AdminFeedbackDashboard> // For your review
      <FeedbackAnalytics />
      <FeedbackList />
      <TemplateManager />
    </AdminFeedbackDashboard>
  </FeedbackProvider>
</FeedbackSystem>
```

---

## 💬 Phase 2: Advanced Chat System (Priority 2)

### **2.1 Database Schema**
```sql
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  conversation_type chat_type_enum NOT NULL,
  repository_url TEXT,
  context JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_chat_user_id (user_id),
  INDEX idx_chat_type (conversation_type),
  INDEX idx_chat_status (status)
);

CREATE TYPE chat_type_enum AS ENUM (
  'general_support',    -- Pro tier: general questions
  'repository_chat',    -- Team tier: repo-specific discussions
  'educational_chat',   -- Educational Q&A
  'beta_feedback',      -- Beta program discussions
  'escalated'          -- Escalated to human (you)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_conversations(id) NOT NULL,
  sender_type TEXT NOT NULL, -- 'user', 'assistant', 'human'
  message_content TEXT NOT NULL,
  message_metadata JSONB DEFAULT '{}',
  tokens_used INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  escalation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_chat_messages_conversation (conversation_id),
  INDEX idx_chat_messages_created_at (created_at)
);

-- AI response caching for cost optimization
CREATE TABLE IF NOT EXISTS chat_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash TEXT NOT NULL, -- MD5 hash of normalized question
  chat_type chat_type_enum NOT NULL,
  response_content TEXT NOT NULL,
  confidence_score DECIMAL(3,2),
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(question_hash, chat_type),
  INDEX idx_cache_hash (question_hash),
  INDEX idx_cache_usage (usage_count DESC)
);
```

### **2.2 Chat Service Implementation**
```typescript
interface ChatService {
  // Core chat functionality
  createConversation(userId: string, type: ChatType, context?: any): Promise<Conversation>;
  sendMessage(conversationId: string, message: string): Promise<ChatResponse>;
  getConversationHistory(conversationId: string): Promise<ChatMessage[]>;
  
  // AI response optimization
  getCachedResponse(question: string, type: ChatType): Promise<string | null>;
  cacheResponse(question: string, type: ChatType, response: string): Promise<void>;
  
  // Escalation handling
  escalateToHuman(conversationId: string, reason: string): Promise<void>;
  getEscalatedChats(): Promise<Conversation[]>;
  
  // Analytics
  getChatAnalytics(timeframe: string): Promise<ChatAnalytics>;
}

interface ChatResponse {
  messageId: string;
  content: string;
  confidence: number;
  tokensUsed: number;
  responseTime: number;
  needsEscalation: boolean;
  escalationReason?: string;
  suggestedActions?: string[];
}

// Auto-escalation triggers
interface EscalationRules {
  lowConfidence: number; // < 0.7 confidence score
  complexRepository: boolean; // Requires repo-specific knowledge
  userFrustration: boolean; // Detected from message tone
  repeatedQuestions: number; // Same question > 3 times
  premiumUser: boolean; // Team tier gets priority escalation
}
```

### **2.3 Chat API Endpoints**
```typescript
// Chat endpoints
POST   /api/chat/conversation/create
POST   /api/chat/message/send
GET    /api/chat/conversation/:id/history
PUT    /api/chat/conversation/:id/escalate
GET    /api/chat/user/:userId/conversations

// Admin chat management (for you)
GET    /api/admin/chat/escalated
POST   /api/admin/chat/:id/respond
GET    /api/admin/chat/analytics
PUT    /api/admin/chat/cache/manage
```

---

## 🔔 Phase 3: Unified Notification System (Priority 3)

### **3.1 Notification Database Schema**
```sql
CREATE TABLE IF NOT EXISTS notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type notification_type_enum NOT NULL,
  channel notification_channel_enum NOT NULL,
  template_name TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  status notification_status_enum DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_notifications_user_id (user_id),
  INDEX idx_notifications_scheduled (scheduled_for),
  INDEX idx_notifications_status (status)
);

CREATE TYPE notification_type_enum AS ENUM (
  'analysis_complete',
  'beta_feedback_request',
  'testimonial_request', 
  'upgrade_suggestion',
  'feature_announcement',
  'weekly_summary',
  'escalated_chat',
  'payment_failed',
  'trial_expiring'
);

CREATE TYPE notification_channel_enum AS ENUM (
  'email',
  'in_app',
  'slack',           -- For internal notifications to you
  'webhook',         -- For Zapier integrations
  'push'            -- Future mobile app
);

CREATE TYPE notification_status_enum AS ENUM (
  'pending',
  'sent',
  'failed',
  'cancelled'
);

-- Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_type notification_type_enum NOT NULL,
  channel notification_channel_enum NOT NULL,
  subject_template TEXT,
  content_template TEXT NOT NULL,
  personalization_fields JSONB DEFAULT '[]',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(name, event_type, channel)
);
```

### **3.2 Notification Service**
```typescript
interface NotificationService {
  // Core notification functions
  scheduleNotification(event: NotificationEvent): Promise<string>;
  sendImmediateNotification(event: NotificationEvent): Promise<boolean>;
  cancelNotification(notificationId: string): Promise<boolean>;
  
  // Template management
  createTemplate(template: NotificationTemplate): Promise<string>;
  renderTemplate(templateName: string, data: any): Promise<string>;
  
  // Channel handlers
  sendEmail(to: string, subject: string, content: string): Promise<boolean>;
  sendSlackMessage(message: string, channel?: string): Promise<boolean>;
  sendWebhook(url: string, payload: any): Promise<boolean>;
  sendInAppNotification(userId: string, message: string): Promise<boolean>;
  
  // Analytics and management
  getNotificationHistory(userId: string): Promise<NotificationHistory[]>;
  getFailedNotifications(): Promise<NotificationEvent[]>;
  retryFailedNotifications(): Promise<void>;
}

interface NotificationEvent {
  type: NotificationType;
  userId?: string;
  channel: NotificationChannel;
  templateName: string;
  data: Record<string, any>;
  scheduledFor?: Date;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

// Automated notification triggers
interface NotificationTriggers {
  analysisComplete: {
    delay: 5, // minutes after analysis
    condition: 'analysis.status === "completed"',
    template: 'analysis_complete_email'
  };
  betaFeedbackRequest: {
    delay: 4320, // 3 days in minutes  
    condition: 'user.betaProgram && !user.lastFeedback',
    template: 'beta_weekly_checkin'
  };
  testimonialRequest: {
    delay: 0,
    condition: 'feedback.npsScore >= 9 && !user.testimonialRequested',
    template: 'testimonial_request'
  };
}
```

---

## 📊 Blog Content Management System

### **Hybrid Approach: AI-Assisted with Human Control**

```typescript
interface BlogContentSystem {
  // Content idea generation
  generateBlogIdeas(): Promise<BlogIdea[]>;
  
  // Human-curated topic list  
  addTopicToQueue(topic: BlogTopic): Promise<string>;
  approveTopicForGeneration(topicId: string): Promise<void>;
  
  // AI content generation
  generateBlogDraft(topicId: string): Promise<BlogDraft>;
  
  // Review and approval workflow
  submitDraftForReview(draftId: string): Promise<void>;
  approveDraft(draftId: string, edits?: string[]): Promise<void>;
  scheduleDraftPublication(draftId: string, publishAt: Date): Promise<void>;
}

interface BlogTopic {
  id: string;
  title: string;
  description: string;
  keyPoints: string[];
  targetAudience: 'developers' | 'managers' | 'enterprises';
  urgency: 'low' | 'medium' | 'high';
  seoKeywords: string[];
  estimatedReadTime: number;
  status: 'queued' | 'approved' | 'in_progress' | 'draft_ready' | 'published';
}

interface BlogDraft {
  id: string;
  topicId: string;
  title: string;
  content: string;
  metaDescription: string;
  tags: string[];
  estimatedReadTime: number;
  seoScore: number;
  readabilityScore: number;
  aiGeneratedSections: string[];
  needsReview: boolean;
  status: 'draft' | 'review_pending' | 'approved' | 'scheduled' | 'published';
}
```

### **Recommended Blog Topic Curation Process**

#### **Option 1: Curated Topic Lists (Recommended)**
```typescript
// You maintain a list of blog topics you want to cover
const curatedTopics = [
  {
    title: "Why Context Matters in Code Reviews",
    description: "Explain how full repository analysis differs from PR-only reviews",
    keyPoints: [
      "67% of architectural issues missed by PR-only tools",
      "Ripple effects across modules", 
      "Case studies with real examples"
    ],
    urgency: "high",
    targetAudience: "developers"
  },
  {
    title: "Shift-Left Testing: QA Team Benefits",
    description: "How early code analysis empowers QA teams",
    keyPoints: [
      "Cost savings of early bug detection",
      "QA can focus on exploratory testing",
      "Real customer metrics and case studies"
    ],
    urgency: "medium", 
    targetAudience: "managers"
  }
  // ... more topics
];
```

#### **Option 2: AI-Suggested + Human Approval**
```typescript
// AI generates ideas from various sources
const aiTopicGeneration = {
  sources: [
    'User feedback themes',
    'Support ticket patterns',
    'Competitor content gaps',
    'Google Trends in developer tools',
    'Social media discussions'
  ],
  process: [
    '1. AI generates 10 topic ideas weekly',
    '2. You review and approve 2-3 topics',
    '3. AI generates outlines for approved topics',
    '4. AI creates first drafts',
    '5. You review and edit before publishing'
  ]
};
```

### **Review Workflow Dashboard**
```typescript
// Simple dashboard for content review
interface ContentDashboard {
  pendingTopics: BlogTopic[];      // Topics waiting for your approval
  draftsForReview: BlogDraft[];    // AI-generated drafts for your review
  scheduledPosts: BlogDraft[];     // Approved content scheduled for publishing
  publishedPosts: BlogDraft[];     // Recently published content
  
  // Quick actions
  approveTopic(topicId: string): void;
  editDraft(draftId: string, edits: string): void;
  scheduleDraft(draftId: string, publishDate: Date): void;
}
```

## **Recommended Implementation Order**

### **Week 1-2: Advanced Feedback Service**
- Database schema + migrations
- API endpoints
- React components
- Basic admin dashboard for feedback review

### **Week 3-4: Advanced Chat System**  
- Database schema + chat service
- AI response caching
- Escalation system
- Chat UI components

### **Week 5-6: Unified Notification System**
- Notification database + service
- Email/Slack integration
- Template system
- Automated triggers

### **Week 7-8: Blog Content System** 
- Content management database
- AI integration for draft generation
- Review dashboard
- Publishing automation

This approach gives you full control over content quality while leveraging AI for efficiency. You can start with a curated list of 20-30 blog topics you want to cover, then let AI help with research and first drafts.