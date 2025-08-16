# Quick Marketing

Rapid marketing task execution for common CodeQual marketing activities.

## Trigger Phrases:
- "market this feature"
- "create some content"
- "launch campaign"
- "check marketing metrics"

## Quick Marketing Actions:

### Step 1: What to Market?
```bash
echo "🚀 Quick Marketing Launcher"
echo "========================="

# Detect current context
CURRENT_FEATURE=$(git log -1 --pretty=%B | head -1)
echo "Recent work: $CURRENT_FEATURE"

echo -e "\nWhat would you like to market?"
echo "1. New feature announcement"
echo "2. Blog post idea"
echo "3. Social media update"
echo "4. Email campaign"
echo "5. Product Hunt launch"
```

### Step 2: Generate Content
```bash
echo -e "\n✍️ Quick Content Generation:"

# Feature announcement template
cat << 'EOF'
🎉 New Feature: [Feature Name]

What's new:
- [Benefit 1]
- [Benefit 2]
- [Benefit 3]

Why it matters:
[Problem it solves]

Try it now: [CTA]

#CodeQuality #DevTools #[Feature]
EOF
```

### Step 3: Channel Selection
```bash
echo -e "\n📢 Where to publish:"

# Check day/time for optimal posting
HOUR=$(date +%H)
DAY=$(date +%A)

if [[ "$DAY" == "Tuesday" || "$DAY" == "Wednesday" || "$DAY" == "Thursday" ]]; then
  echo "✅ Good day for Product Hunt"
fi

if [[ $HOUR -ge 9 && $HOUR -le 11 ]]; then
  echo "✅ Peak time for Twitter/LinkedIn"
fi

if [[ "$DAY" == "Monday" || "$DAY" == "Friday" ]]; then
  echo "⚠️ Lower engagement expected"
fi
```

### Step 4: Quick Campaign Builder
```bash
echo -e "\n🎯 Quick Campaign Setup:"

CAMPAIGN_TYPE=${1:-"feature-launch"}
FEATURE_NAME=${2:-"New Feature"}

# Generate campaign assets
cat << EOF
## Campaign: $FEATURE_NAME

### Twitter Thread:
1/ Excited to announce $FEATURE_NAME! 

2/ Problem: [What problem does it solve]

3/ Solution: [How your feature solves it]

4/ Results: [Expected outcomes]

5/ Try it free: [Link]

### LinkedIn Post:
🚀 Announcing $FEATURE_NAME

After talking to 100+ developers, we discovered...
[Problem statement]

That's why we built...
[Solution description]

Early results show...
[Metrics/benefits]

Learn more: [Link]

### Email Subject Lines:
A: "$FEATURE_NAME is here!"
B: "You asked, we delivered: $FEATURE_NAME"
C: "[First Name], check out $FEATURE_NAME"
EOF
```

### Step 5: SEO Quick Check
```bash
echo -e "\n🔍 SEO Optimization:"

# Keywords to target
KEYWORDS="PR analysis, code review automation, $FEATURE_NAME"

echo "Target keywords: $KEYWORDS"
echo "URL slug: /features/$(echo $FEATURE_NAME | tr '[:upper:]' '[:lower:]' | tr ' ' '-')"
echo "Meta title: $FEATURE_NAME - Automated PR Analysis | CodeQual"
echo "Meta desc: $FEATURE_NAME helps developers [benefit]. Start free trial."
```

### Step 6: Metrics to Track
```bash
echo -e "\n📊 Success Metrics:"

cat << 'EOF'
Launch Day:
- [ ] Product Hunt rank
- [ ] Traffic spike (GA)
- [ ] Sign-ups
- [ ] Social shares

Week 1:
- [ ] Trial starts
- [ ] Feature adoption
- [ ] User feedback
- [ ] Press mentions

Month 1:
- [ ] Conversions
- [ ] Retention
- [ ] NPS impact
- [ ] Revenue impact
EOF
```

## Quick Marketing Workflows:

### Blog Post in 5 Minutes:
```bash
# Generate blog outline
claude --agent marketing-agent --generate-blog-outline "$TOPIC"

# Create draft
claude --agent marketing-agent --write-blog "$TOPIC"

# SEO optimize
claude --agent marketing-agent --seo-optimize "$DRAFT"

# Schedule publication
claude --agent marketing-agent --schedule-content "$DATE"
```

### Social Media Blast:
```bash
# Generate posts for all channels
claude --agent marketing-agent --social-blast "$ANNOUNCEMENT"

# Returns:
# - Twitter thread
# - LinkedIn post
# - GitHub discussion
# - Discord announcement
```

### Email Campaign:
```bash
# Quick email to list
claude --agent marketing-agent --quick-email \
  --segment "all-users" \
  --template "feature-announcement" \
  --feature "$FEATURE_NAME"
```

## Marketing Shortcuts:

```bash
# Check what's working
alias marketing-roi="claude --agent marketing-agent --channel-performance"

# Content ideas
alias content-ideas="claude --agent marketing-agent --generate-content-calendar"

# Competitor check
alias comp-check="claude --agent marketing-agent --competitor-monitoring"

# Quick metrics
alias marketing-metrics="claude --agent marketing-agent --dashboard"
```

## Integration with Development:

```bash
# After feature completion
git commit -m "feat: $FEATURE_NAME"
/quick-marketing "$FEATURE_NAME"  # Auto-generates marketing materials

# After bug fix
git commit -m "fix: $BUG"
/quick-marketing "reliability-improvement"  # Spins positive messaging

# After performance improvement
git commit -m "perf: $IMPROVEMENT"
/quick-marketing "speed-boost"  # Creates performance marketing
```

## Templates Library:

```bash
# Product Hunt Launch
/quick-marketing product-hunt-launch

# Feature Announcement
/quick-marketing feature-announcement

# Case Study
/quick-marketing case-study

# Comparison Post
/quick-marketing vs-competitor

# Technical Blog
/quick-marketing technical-deep-dive
```