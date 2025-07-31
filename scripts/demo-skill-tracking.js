#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function demoSkillTracking() {
  // Sample user profile
  const userProfile = {
    userId: 'user123',
    skills: {
      security: {
        current: 65,
        trend: 'stable',
        lastUpdated: new Date(),
        issuesResolved: 12,
        issuesIntroduced: 3,
        experiencePoints: 450
      },
      performance: {
        current: 78,
        trend: 'improving',
        lastUpdated: new Date(),
        issuesResolved: 8,
        issuesIntroduced: 1,
        experiencePoints: 320
      },
      codeQuality: {
        current: 82,
        trend: 'improving',
        lastUpdated: new Date(),
        issuesResolved: 15,
        issuesIntroduced: 2,
        experiencePoints: 520
      },
      architecture: {
        current: 75,
        trend: 'stable',
        lastUpdated: new Date(),
        issuesResolved: 5,
        issuesIntroduced: 0,
        experiencePoints: 280
      },
      testing: {
        current: 70,
        trend: 'improving',
        lastUpdated: new Date(),
        issuesResolved: 10,
        issuesIntroduced: 1,
        experiencePoints: 380
      },
      debugging: {
        current: 72,
        trend: 'stable',
        lastUpdated: new Date(),
        issuesResolved: 6,
        issuesIntroduced: 0,
        experiencePoints: 250
      }
    },
    achievements: [
      { id: 'sec-hero', title: 'Security Hero', description: 'Fixed 10 security issues', earnedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), category: 'security', icon: '🛡️' },
      { id: 'perf-optimizer', title: 'Performance Optimizer', description: 'Improved performance by 20%', earnedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), category: 'performance', icon: '⚡' }
    ]
  };

  // Sample team profiles
  const teamProfiles = [
    userProfile,
    {
      userId: 'user456',
      skills: {
        security: { current: 72 },
        performance: { current: 75 },
        codeQuality: { current: 88 },
        architecture: { current: 80 },
        testing: { current: 85 }
      }
    },
    {
      userId: 'user789',
      skills: {
        security: { current: 80 },
        performance: { current: 70 },
        codeQuality: { current: 75 },
        architecture: { current: 85 },
        testing: { current: 78 }
      }
    }
  ];

  // Sample comparison data with issues that affect skills
  const comparisonData = {
    newIssues: {
      critical: [{
        id: 'sec-002',
        title: 'XSS Vulnerability',
        description: 'User input rendered without escaping',
        severity: 'critical',
        category: 'security',
        file: 'src/components/Comment.jsx',
        line: 34,
        codeSnippet: `document.getElementById('output').innerHTML = userComment; // XSS Risk!`,
        recommendation: 'Use textContent instead of innerHTML or properly escape HTML',
        fixExample: `// Secure approach
document.getElementById('output').textContent = userComment;
// OR with sanitization
document.getElementById('output').innerHTML = DOMPurify.sanitize(userComment);`
      }],
      high: [{
        id: 'sec-003',
        title: 'Unvalidated User Input',
        description: 'User input is being used without proper validation',
        severity: 'high',
        category: 'security',
        file: 'src/api/auth.js',
        line: 156,
        codeSnippet: `const userInput = req.body.search;
db.query(\`SELECT * FROM products WHERE name LIKE '%\${userInput}%'\`);`,
        recommendation: 'Validate and sanitize all user input before using it in queries',
        fixExample: `// Use parameterized queries
const userInput = validator.escape(req.body.search);
db.query('SELECT * FROM products WHERE name LIKE ?', [\`%\${userInput}%\`]);`
      }],
      medium: [{
        id: 'perf-002',
        title: 'Inefficient Loop',
        description: 'Nested loops causing O(n²) complexity',
        severity: 'medium',
        category: 'performance',
        file: 'src/utils/data.js',
        line: 89,
        codeSnippet: `for (let i = 0; i < users.length; i++) {
  for (let j = 0; j < posts.length; j++) {
    if (users[i].id === posts[j].userId) {
      users[i].posts.push(posts[j]);
    }
  }
}`,
        recommendation: 'Use a Map for O(n) complexity',
        fixExample: `// Efficient approach
const postsByUser = posts.reduce((map, post) => {
  if (!map[post.userId]) map[post.userId] = [];
  map[post.userId].push(post);
  return map;
}, {});

users.forEach(user => {
  user.posts = postsByUser[user.id] || [];
});`
      }],
      low: [],
      total: 3
    },
    resolvedIssues: {
      critical: [],
      high: [{
        id: 'perf-001',
        title: 'N+1 Query Problem',
        description: 'Multiple database queries in a loop - FIXED',
        severity: 'high',
        category: 'performance'
      }],
      medium: [],
      low: [],
      total: 1
    },
    securityImpact: {
      score: -5, // Decreased due to new vulnerabilities
      vulnerabilitiesAdded: 2,
      vulnerabilitiesResolved: 0,
      criticalIssues: ['XSS Vulnerability'],
      improvements: []
    },
    performanceImpact: {
      score: 3, // Small improvement
      improvements: ['Fixed N+1 query problem'],
      regressions: ['Added inefficient loop'],
      metrics: { issueCount: 0, scoreChange: 3 }
    },
    scoreChanges: {
      overall: { before: 72, after: 70, change: -2 },
      security: { before: 65, after: 60, change: -5 },
      performance: { before: 78, after: 76, change: -2 },
      maintainability: { before: 82, after: 82, change: 0 },
      testing: { before: 70, after: 75, change: 5 }
    }
  };

  // Simulate skill impact calculation
  console.log('🎮 CodeQual Skill Tracking Demo\n');
  console.log('================================\n');

  console.log('👤 Current User Profile:');
  console.log(`User ID: ${userProfile.userId}`);
  console.log('\nCurrent Skills:');
  Object.entries(userProfile.skills).forEach(([skill, data]) => {
    console.log(`- ${skill}: ${data.current}/100 (${data.trend})`);
  });

  console.log('\n📊 PR Analysis Impact:\n');
  console.log('Issues Found:');
  console.log(`- Critical Security: ${comparisonData.newIssues.critical.length}`);
  console.log(`- High Priority: ${comparisonData.newIssues.high.length}`);
  console.log(`- Issues Resolved: ${comparisonData.resolvedIssues.total}`);

  // Calculate skill updates
  const skillUpdates = calculateSkillImpact(userProfile.skills, comparisonData);

  console.log('\n📈 Skill Changes:');
  Object.entries(skillUpdates).forEach(([skill, data]) => {
    const before = userProfile.skills[skill].current;
    const change = data.current - before;
    if (change !== 0) {
      console.log(`${skill}: ${before} → ${data.current} (${change > 0 ? '+' : ''}${change})`);
    }
  });

  console.log('\n🎯 Personalized Learning Recommendations:\n');
  
  const recommendations = [
    {
      title: 'Critical Security Fundamentals',
      description: 'Master input validation and SQL injection prevention',
      priority: 'critical',
      estimatedTime: '75 minutes',
      experienceReward: 150,
      badge: 'Security Guardian',
      modules: [
        {
          title: 'Input Validation & Sanitization',
          duration: '45 minutes',
          topics: ['XSS Prevention', 'SQL Injection', 'CSRF Protection']
        }
      ]
    },
    {
      title: 'Performance Optimization Essentials',
      description: 'Learn to identify and fix performance bottlenecks',
      priority: 'high',
      estimatedTime: '55 minutes',
      experienceReward: 100,
      badge: 'Performance Pro'
    }
  ];

  recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec.title} ${rec.priority === 'critical' ? '🚨' : '⚠️'}`);
    console.log(`   Time: ${rec.estimatedTime} | XP: +${rec.experienceReward}`);
    if (rec.badge) console.log(`   Achievement: 🏆 ${rec.badge}`);
    console.log('');
  });

  console.log('\n👥 Team Comparison:');
  const teamAvgSecurity = Math.round(teamProfiles.reduce((sum, p) => sum + p.skills.security.current, 0) / teamProfiles.length);
  console.log(`Your Security Score: ${userProfile.skills.security.current}`);
  console.log(`Team Average: ${teamAvgSecurity}`);
  console.log(`Difference: ${userProfile.skills.security.current - teamAvgSecurity}`);
  console.log(`\nRank: #2 of 3 developers (Top 67%)`);

  console.log('\n🔥 Motivational Insights:');
  console.log('📉 Your security skills decreased by 5 points. Time to focus on security training!');
  console.log('✅ Great job resolving the N+1 query issue! Your performance skills are improving!');
  console.log('🎯 You\'re only 5 points away from reaching Advanced level in Architecture!');

  console.log('\n🏆 Upcoming Achievements:');
  console.log('🛡️ Security Expert - 15 points away!');
  console.log('⚡ Performance Master - Fix 2 more performance issues');
  console.log('📚 Testing Champion - Reach 80% test coverage');

  console.log('\n✨ Summary:');
  console.log('This PR introduced critical security issues that negatively impacted your security score.');
  console.log('However, you showed improvement in testing by adding comprehensive tests.');
  console.log('\nFocus on the security fundamentals course to prevent similar issues in the future!');
}

function calculateSkillImpact(currentSkills, comparison) {
  const updatedSkills = JSON.parse(JSON.stringify(currentSkills));
  
  // Security impact - negative due to critical issues
  if (comparison.newIssues.critical.filter(i => i.category === 'security').length > 0) {
    updatedSkills.security.current = Math.max(0, updatedSkills.security.current - 5);
    updatedSkills.security.trend = 'declining';
    updatedSkills.security.issuesIntroduced += comparison.securityImpact.vulnerabilitiesAdded;
  }
  
  // Performance impact - mixed (resolved one, introduced another)
  updatedSkills.performance.current = Math.max(0, updatedSkills.performance.current - 2);
  updatedSkills.performance.issuesResolved += 1;
  updatedSkills.performance.issuesIntroduced += 1;
  updatedSkills.performance.experiencePoints += 30;
  
  // Testing improvement
  updatedSkills.testing.current = Math.min(100, updatedSkills.testing.current + 5);
  updatedSkills.testing.trend = 'improving';
  updatedSkills.testing.experiencePoints += 50;
  
  return updatedSkills;
}

demoSkillTracking().catch(console.error);