# CodeQual Site Architecture
**Created**: 2025-08-17
**Last Updated**: 2025-08-17

## Complete Page Structure

### 1. Marketing Pages (Public)

#### Homepage (`/`)
- Hero: "Analyze Any PR in 30 Seconds" with URL input
- Value props: 6 risk dimensions
- How it works (3 steps)
- Testimonials/social proof
- Integration options showcase
- CTA: Try free / View pricing

#### Pricing (`/pricing`)
```
Free Tier          Individual         Team (3+ users)
$0/month          $29/user/month     $79/user/month
- 3 PR/month      - Unlimited PRs    - Everything in Individual
- Basic insights  - Full reports     - Team dashboard
- No history      - Skill tracking   - Shared insights
                  - API access       - Priority support
                  - IDE plugins      - Admin controls
                  
Enterprise: Contact us for custom pricing
```

#### About Us (`/about`)
- Mission & vision
- Team (optional)
- Why we built CodeQual
- Our approach to code quality

#### Feature Pages
- `/features/security` - Deep dive into security analysis
- `/features/performance` - Performance optimization
- `/features/skill-tracking` - Developer growth features
- `/features/integrations` - API, IDE, CI/CD options

### 2. Application Pages (Authenticated)

#### Dashboard (`/dashboard`)
- Welcome message with current skill level
- Quick actions: Analyze New PR, View Reports
- Recent analyses list
- Growth chart for the month

#### Profile & Settings (`/profile`)
- **Account Tab**: Personal info, avatar, timezone
- **Preferences Tab**: Email notifications, report formats
- **Security Tab**: Password change, 2FA, sessions
- **API Keys Tab**: Generate/manage API keys
- **Integrations Tab**: Connect GitHub/GitLab, IDE settings
- **Billing Tab**: Current plan, usage, invoices

#### Reports Hub (`/reports`)
- List view of all analyses
- Filters: date range, score range, repository
- Search functionality
- Bulk export options

#### Individual Report (`/reports/:id`)
- Progressive disclosure navigation
- Export options (PDF, MD, JSON)
- Share functionality
- Comments/notes feature

#### Subscription Management (`/subscription`)
- Current plan details
- Usage metrics
- Upgrade/downgrade options
- Payment method management
- Billing history

### 3. Documentation & Support

#### Documentation (`/docs`)
- `/docs` - Overview
- `/docs/getting-started` - Quick start guide
- `/docs/api` - API reference
- `/docs/integrations/ide` - IDE setup guides
- `/docs/integrations/cicd` - CI/CD integration
- `/docs/report-guide` - Understanding reports
- `/docs/skill-tracking` - How skills are calculated

#### Support (`/support`)
- FAQ section
- Chatbot integration (Intercom/Crisp)
- Email support form
- Video tutorials
- Status page link

### 4. Legal Pages
- `/privacy` - Privacy Policy
- `/terms` - Terms of Service
- `/security` - Security practices
- `/compliance` - SOC2, GDPR info
- `/cookies` - Cookie policy

### 5. Cross-Sell Pages

#### Integration Hub (`/integrations`)
- API documentation link
- Web dashboard features
- IDE plugin downloads
- CI/CD setup guides

### 6. Authentication Flow
- `/auth/login`
- `/auth/signup`
- `/auth/github` (OAuth callback)
- `/auth/gitlab` (OAuth callback)
- `/auth/forgot-password`
- `/auth/reset-password`
- `/auth/verify-email`

### 7. Additional Pages
- `/404` - Custom not found
- `/500` - Error page
- `/maintenance` - Maintenance mode
- `/changelog` - Product updates
- `/roadmap` - Future features

## Navigation Structure

### Public Header
```
[Logo] Features | Pricing | Docs | About    [Sign In] [Try Free]
```

### Authenticated Header
```
[Logo] Dashboard | Reports | Docs | Support    [👤 Profile ▼] [🔔]
```

### Footer (All Pages)
```
Product          Company         Legal           Connect
- Features       - About         - Privacy       - Twitter
- Pricing        - Blog          - Terms         - GitHub
- API Docs       - Careers       - Security      - LinkedIn
- Integrations   - Contact       - Compliance    - Discord
```