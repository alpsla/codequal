// Script to populate the demo report with data
const fs = require('fs');
const path = require('path');

// Read the template
const templatePath = path.join(__dirname, 'demo-report-final.html');
let template = fs.readFileSync(templatePath, 'utf-8');

// Demo data replacements
const replacements = {
    '{{repository_name}}': 'codequal/demo-repo',
    '{{pr_number}}': '42',
    '{{timestamp}}': new Date().toLocaleString(),
    '{{analysis_id}}': 'demo_analysis_2025',
    '{{app_version}}': '1.0.0',
    '{{report_version}}': '2.0',
    '{{overall_score}}': '84',
    '{{score_class}}': 'good',
    '{{score_trend_icon}}': 'fa-arrow-up',
    '{{score_trend_class}}': 'positive',
    '{{score_trend_value}}': '+5',
    '{{confidence_percentage}}': '95',
    '{{approval_status_text}}': 'Approved with Suggestions',
    '{{approval_class}}': 'approved',
    '{{approval_icon}}': 'fa-check-circle',
    '{{approval_message}}': 'This PR is ready to merge with minor improvements',
    '{{critical_count}}': '0',
    '{{high_count}}': '2',
    '{{medium_count}}': '1',
    '{{low_count}}': '2',
    '{{files_changed}}': '8',
    '{{lines_added}}': '245',
    '{{lines_removed}}': '32',
    '{{primary_language}}': 'TypeScript',
    '{{total_learning_time}}': '15 mins',
    '{{pr_comment_text}}': 'Implements JWT authentication system',
    '{{toggle_button_html}}': '<i class="fas fa-eye"></i> Show All Issues',
    '{{blocking_issues_html}}': `
        <div class="issue-card severity-high">
            <div class="issue-header">
                <i class="fas fa-exclamation-triangle"></i>
                <span class="issue-type">Security</span>
                <span class="issue-file">src/database/queries.ts:45</span>
            </div>
            <div class="issue-message">Potential SQL injection vulnerability detected</div>
            <div class="issue-recommendation">
                <i class="fas fa-lightbulb"></i>
                Use parameterized queries instead of string concatenation
            </div>
        </div>
        <div class="issue-card severity-high">
            <div class="issue-header">
                <i class="fas fa-tachometer-alt"></i>
                <span class="issue-type">Performance</span>
                <span class="issue-file">src/api/users.ts:67</span>
            </div>
            <div class="issue-message">Inefficient database query in loop</div>
            <div class="issue-recommendation">
                <i class="fas fa-lightbulb"></i>
                Use batch queries or JOIN operations instead of N+1 queries
            </div>
        </div>
    `,
    '{{high_priority_issues_html}}': `
        <div class="issue-card severity-medium">
            <div class="issue-header">
                <i class="fas fa-shield-alt"></i>
                <span class="issue-type">Security</span>
                <span class="issue-file">src/auth/jwt.ts:23</span>
            </div>
            <div class="issue-message">JWT secret should be loaded from environment variables</div>
            <div class="issue-recommendation">
                <i class="fas fa-lightbulb"></i>
                Move secret to .env file and use process.env.JWT_SECRET
            </div>
        </div>
    `,
    '{{lower_priority_issues_html}}': `
        <div class="issue-card severity-low">
            <div class="issue-header">
                <i class="fas fa-code"></i>
                <span class="issue-type">Code Quality</span>
                <span class="issue-file">src/services/analyzer.ts:123</span>
            </div>
            <div class="issue-message">Function complexity is too high (cyclomatic complexity: 12)</div>
            <div class="issue-recommendation">
                <i class="fas fa-lightbulb"></i>
                Consider breaking down this function into smaller, more focused functions
            </div>
        </div>
        <div class="issue-card severity-low">
            <div class="issue-header">
                <i class="fas fa-code"></i>
                <span class="issue-type">Code Style</span>
                <span class="issue-file">src/utils.ts:25</span>
            </div>
            <div class="issue-message">Unused variable 'tempData'</div>
            <div class="issue-recommendation">
                <i class="fas fa-lightbulb"></i>
                Remove unused variable or use it in the code
            </div>
        </div>
    `,
    '{{positive_findings_html}}': `
        <div class="positive-card">
            <i class="fas fa-shield-alt text-success"></i>
            <div>
                <strong>Secure Password Hashing</strong>
                <p>Great job using bcrypt for password hashing with appropriate salt rounds</p>
            </div>
        </div>
        <div class="positive-card">
            <i class="fas fa-lock text-success"></i>
            <div>
                <strong>Input Validation</strong>
                <p>Comprehensive input validation on all API endpoints</p>
            </div>
        </div>
    `,
    '{{pr_issues_content}}': `
        <div class="pr-section">
            <h4>Changes Summary</h4>
            <ul>
                <li>Added JWT authentication middleware</li>
                <li>Implemented user login and registration endpoints</li>
                <li>Added password hashing with bcrypt</li>
                <li>Created user session management</li>
                <li>Added rate limiting to auth endpoints</li>
            </ul>
        </div>
    `,
    '{{skills_html}}': `
        <div class="skill-card">
            <div class="skill-header">
                <i class="fas fa-shield-alt"></i>
                <span>Security</span>
                <span class="skill-score">85/100</span>
            </div>
            <div class="skill-progress">
                <div class="progress-bar" style="width: 85%"></div>
            </div>
        </div>
        <div class="skill-card">
            <div class="skill-header">
                <i class="fas fa-code"></i>
                <span>Code Quality</span>
                <span class="skill-score">92/100</span>
            </div>
            <div class="skill-progress">
                <div class="progress-bar" style="width: 92%"></div>
            </div>
        </div>
        <div class="skill-card">
            <div class="skill-header">
                <i class="fas fa-tachometer-alt"></i>
                <span>Performance</span>
                <span class="skill-score">78/100</span>
            </div>
            <div class="skill-progress">
                <div class="progress-bar" style="width: 78%"></div>
            </div>
        </div>
    `,
    '{{skill_recommendations_html}}': `
        <div class="recommendation-card">
            <h4><i class="fas fa-graduation-cap"></i> Security Best Practices</h4>
            <p>Consider implementing OAuth2 for third-party integrations</p>
            <a href="#" class="learn-more">Learn More →</a>
        </div>
        <div class="recommendation-card">
            <h4><i class="fas fa-book"></i> Performance Optimization</h4>
            <p>Implement caching strategies for frequently accessed data</p>
            <a href="#" class="learn-more">Learn More →</a>
        </div>
    `,
    '{{educational_html}}': `
        <div class="educational-card">
            <h4><i class="fas fa-lock"></i> JWT Best Practices</h4>
            <p>When implementing JWT authentication:</p>
            <ul>
                <li>Always validate tokens on the server side</li>
                <li>Use appropriate expiration times</li>
                <li>Implement refresh token rotation</li>
                <li>Store sensitive data in HTTP-only cookies</li>
            </ul>
            <div class="resources">
                <a href="https://jwt.io/introduction" target="_blank">JWT Introduction</a>
                <a href="https://owasp.org/www-project-cheat-sheets/" target="_blank">OWASP Guidelines</a>
            </div>
        </div>
    `
};

// Replace all placeholders
for (const [placeholder, value] of Object.entries(replacements)) {
    template = template.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
}

// Write the populated template
const outputPath = path.join(__dirname, 'demo-report-populated.html');
fs.writeFileSync(outputPath, template);

console.log('Demo report populated successfully!');
console.log('View at: http://localhost:3001/demo-report-populated.html');