# Email Authentication Setup for CodeQual

## Development Setup (Recommended)

For development, it's best to **disable email confirmations**:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ftjhmbbcuqjqmmbaymqb/auth/users)
2. Navigate to **Authentication → Settings**
3. Under **Email Auth**, disable "Enable email confirmations"
4. Save changes

This allows immediate sign-in after sign-up without waiting for emails.

## Production Setup

For production, you should set up custom SMTP for reliable email delivery:

### Using SendGrid (Recommended)

1. **Create SendGrid Account**
   - Sign up at [sendgrid.com](https://sendgrid.com)
   - Get API Key from Settings → API Keys

2. **Configure in Supabase**
   - Go to Project Settings → Auth
   - Enable "Custom SMTP"
   - Fill in:
     ```
     Host: smtp.sendgrid.net
     Port: 587
     Username: apikey
     Password: [Your SendGrid API Key]
     Sender email: noreply@yourdomain.com
     Sender name: CodeQual
     ```

### Using Resend (Alternative)

1. **Create Resend Account**
   - Sign up at [resend.com](https://resend.com)
   - Get API Key

2. **Configure in Supabase**
   ```
   Host: smtp.resend.com
   Port: 587
   Username: resend
   Password: [Your Resend API Key]
   ```

### Email Templates

Customize email templates in Authentication → Email Templates:
- Confirmation Email
- Password Reset
- Magic Link
- Email Change

## Testing Email Locally

If you need to test emails locally without SMTP:

1. **Use Supabase Logs**
   - Go to Logs → Auth Logs
   - You can see the confirmation links there

2. **Manual Confirmation**
   - Go to Authentication → Users
   - Click on the user
   - Manually confirm their email

## Environment Variables for Email

Add these to your `.env` for production:
```env
# Email Settings (Optional)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=noreply@codequal.dev
```

Note: These are for your reference - Supabase handles SMTP configuration in their dashboard, not through environment variables.

## Troubleshooting

1. **Not receiving emails?**
   - Check spam folder
   - Check Supabase email rate limits (3-4/hour on free tier)
   - Verify email address is correct

2. **User can't sign in?**
   - Check if email confirmation is required
   - Manually confirm user in Supabase Dashboard
   - Disable email confirmation for development

3. **Production email issues?**
   - Set up custom SMTP
   - Verify sender domain
   - Check SMTP credentials