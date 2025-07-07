# User Profile Management API

This document describes the user profile and organization management endpoints added to the CodeQual API.

## Authentication

All endpoints require Bearer token authentication. Include the token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## User Profile Endpoints

### Get User Profile
```http
GET /api/users/profile
```

Returns the current user's profile including organization memberships.

**Response:**
```json
{
  "profile": {
    "id": "uuid",
    "user_id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "avatar_url": "https://...",
    "bio": "Software engineer",
    "location": "San Francisco",
    "website": "https://example.com",
    "company": "ACME Corp",
    "preferred_language": "en",
    "theme": "light",
    "email_notifications": true,
    "organizations": {...},
    "memberships": [...]
  }
}
```

### Update User Profile
```http
PUT /api/users/profile
```

Updates the user's profile information.

**Request Body:**
```json
{
  "full_name": "John Doe",
  "bio": "Senior Software Engineer",
  "location": "San Francisco, CA",
  "website": "https://johndoe.com",
  "company": "ACME Corp"
}
```

### Upload Avatar
```http
POST /api/users/avatar
```

Uploads a new avatar image. Use multipart/form-data with field name "avatar".

**Supported formats:** JPEG, PNG, GIF, WebP
**Max size:** 5MB

### Update Settings
```http
PATCH /api/users/settings
```

Updates user preferences and settings.

**Request Body:**
```json
{
  "preferred_language": "en",
  "theme": "dark",
  "email_notifications": false
}
```

### Delete Account
```http
DELETE /api/users/account
```

Permanently deletes the user account. Requires confirmation.

**Request Body:**
```json
{
  "confirmation": "DELETE_MY_ACCOUNT"
}
```

### Get User Repositories
```http
GET /api/users/repositories?provider=github
```

Returns the user's accessible repositories.

**Query Parameters:**
- `provider` (optional): Filter by provider (github, gitlab)

## Organization Management Endpoints

### Create Organization
```http
POST /api/organizations
```

Creates a new organization.

**Request Body:**
```json
{
  "name": "My Organization",
  "slug": "my-org",
  "allowed_email_domains": ["example.com"]
}
```

### Get User's Organizations
```http
GET /api/organizations
```

Returns all organizations the user is a member of.

### Get Organization Details
```http
GET /api/organizations/:organizationId
```

Returns detailed information about an organization.

### Update Organization
```http
PUT /api/organizations/:organizationId
```

Updates organization settings. Requires admin permissions.

**Request Body:**
```json
{
  "name": "Updated Organization Name",
  "allowed_email_domains": ["example.com", "company.com"],
  "github_org_name": "my-github-org",
  "gitlab_group_name": "my-gitlab-group"
}
```

### Get Organization Members
```http
GET /api/organizations/:organizationId/members
```

Returns all members of an organization.

### Invite Member
```http
POST /api/organizations/:organizationId/members
```

Invites a new member to the organization. Requires admin permissions.

**Request Body:**
```json
{
  "email": "newmember@example.com",
  "role": "member"
}
```

**Roles:** owner, admin, member

### Update Member Role
```http
PUT /api/organizations/:organizationId/members/:userId
```

Updates a member's role and permissions. Requires admin permissions.

**Request Body:**
```json
{
  "role": "admin",
  "can_manage_billing": false,
  "can_manage_members": true,
  "can_manage_settings": true
}
```

### Remove Member
```http
DELETE /api/organizations/:organizationId/members/:userId
```

Removes a member from the organization. Requires admin permissions.

### Leave Organization
```http
POST /api/organizations/:organizationId/leave
```

Allows a member to leave an organization.

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Error message"
}
```

Common status codes:
- 400: Bad Request (validation errors)
- 401: Unauthorized (invalid/missing token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Internal Server Error

## Notes

1. **Magic Link Authentication**: Since Magic Link is implemented, there's no need for password reset or email verification endpoints.

2. **Avatar Storage**: Avatar images are stored in Supabase Storage buckets.

3. **Organization Ownership**: Organization owners cannot be removed or have their role changed. They must transfer ownership first.

4. **Rate Limiting**: These endpoints inherit the global rate limiting configured for the API.

5. **RBAC**: Role-based access control is enforced at both the database (RLS) and API levels.