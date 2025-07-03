// Enhanced CodeQual Report Scripts

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeNavigation();
    initializeSearch();
    initializeCharts();
    initializeTooltips();
    initializeInteractions();
    initializeAnimations();
    initializeFeedback();
    initializeFilters();
    initializeViewToggle();
    initializeCodeCopy();
});

// Theme Management
function initializeTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('codequalTheme') || 'light';
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        updateThemeIcon(true);
    }
    
    themeToggle?.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('codequalTheme', isDark ? 'dark' : 'light');
        updateThemeIcon(isDark);
        
        // Update charts for theme change
        updateChartsTheme();
    });
}

function updateThemeIcon(isDark) {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Navigation
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');
    
    // Smooth scrolling
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) {
                const offset = 80; // Header height + padding
                const targetPosition = targetSection.offsetTop - offset;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Update active state
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
        });
    });
    
    // Update active nav on scroll
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            let current = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop - 100;
                if (scrollY >= sectionTop) {
                    current = section.getAttribute('id');
                }
            });
            
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        }, 100);
    });
}

// Search Functionality
function initializeSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchModal = document.getElementById('searchModal');
    const searchInput = document.getElementById('searchInput');
    const searchClose = document.getElementById('searchClose');
    const searchResults = document.getElementById('searchResults');
    
    searchBtn?.addEventListener('click', () => {
        searchModal.style.display = 'flex';
        searchInput.focus();
    });
    
    searchClose?.addEventListener('click', () => {
        searchModal.style.display = 'none';
        searchInput.value = '';
        searchResults.innerHTML = '';
    });
    
    searchModal?.addEventListener('click', (e) => {
        if (e.target === searchModal) {
            searchModal.style.display = 'none';
        }
    });
    
    let searchTimeout;
    searchInput?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.toLowerCase();
        
        if (query.length < 2) {
            searchResults.innerHTML = '';
            return;
        }
        
        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 300);
    });
}

function performSearch(query) {
    const searchResults = document.getElementById('searchResults');
    const findings = document.querySelectorAll('.finding');
    const results = [];
    
    findings.forEach(finding => {
        const text = finding.textContent.toLowerCase();
        if (text.includes(query)) {
            const title = finding.querySelector('h3')?.textContent || 'Finding';
            const snippet = getTextSnippet(text, query);
            results.push({ element: finding, title, snippet });
        }
    });
    
    displaySearchResults(results, query);
}

function getTextSnippet(text, query) {
    const index = text.indexOf(query);
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + query.length + 50);
    let snippet = text.substring(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    
    return snippet;
}

function displaySearchResults(results, query) {
    const searchResults = document.getElementById('searchResults');
    
    if (results.length === 0) {
        searchResults.innerHTML = '<p class="no-results">No results found</p>';
        return;
    }
    
    searchResults.innerHTML = results.map(result => `
        <div class="search-result" data-element="${results.indexOf(result)}">
            <h4>${highlightQuery(result.title, query)}</h4>
            <p>${highlightQuery(result.snippet, query)}</p>
        </div>
    `).join('');
    
    // Add click handlers
    searchResults.querySelectorAll('.search-result').forEach((resultEl, index) => {
        resultEl.addEventListener('click', () => {
            const finding = results[index].element;
            const searchModal = document.getElementById('searchModal');
            searchModal.style.display = 'none';
            
            finding.scrollIntoView({ behavior: 'smooth', block: 'center' });
            finding.classList.add('highlight');
            setTimeout(() => finding.classList.remove('highlight'), 2000);
        });
    });
}

function highlightQuery(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// Charts
let charts = {};

function initializeCharts() {
    initializeIssuesChart();
    initializeTimelineChart();
    initializeSkillsRadar();
    animateScoreCircle();
}

function initializeIssuesChart() {
    const canvas = document.getElementById('issuesChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const data = {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
            data: [
                parseInt(document.querySelector('.stat-item.critical .stat-value')?.textContent || 0),
                parseInt(document.querySelector('.stat-item.high .stat-value')?.textContent || 0),
                parseInt(document.querySelector('.stat-item.medium .stat-value')?.textContent || 0),
                parseInt(document.querySelector('.stat-item.low .stat-value')?.textContent || 0)
            ],
            backgroundColor: [
                '#ef4444',
                '#f59e0b',
                '#eab308',
                '#10b981'
            ],
            borderWidth: 0
        }]
    };
    
    charts.issues = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed;
                        }
                    }
                }
            }
        }
    });
}

function initializeTimelineChart() {
    const canvas = document.getElementById('timelineChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Mock data - in real implementation, this would come from the template
    const data = {
        labels: ['6 months ago', '5 months ago', '4 months ago', '3 months ago', '2 months ago', '1 month ago', 'Current'],
        datasets: [{
            label: 'Quality Score',
            data: [65, 68, 70, 72, 75, 73, 78],
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            tension: 0.4
        }]
    };
    
    charts.timeline = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function initializeSkillsRadar() {
    const canvas = document.getElementById('skillsRadar');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Extract skill data from the page
    const skills = [];
    const scores = [];
    document.querySelectorAll('.skill-card').forEach(card => {
        const name = card.querySelector('.skill-header')?.firstChild?.textContent?.trim();
        const score = parseInt(card.querySelector('.skill-header span')?.textContent) || 0;
        if (name) {
            skills.push(name);
            scores.push(score);
        }
    });
    
    const data = {
        labels: skills,
        datasets: [{
            label: 'Current Skills',
            data: scores,
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            borderColor: '#6366f1',
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#6366f1'
        }]
    };
    
    charts.skills = new Chart(ctx, {
        type: 'radar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function animateScoreCircle() {
    const scoreCircle = document.querySelector('.score-circle-enhanced');
    if (!scoreCircle) return;
    
    const score = parseInt(scoreCircle.dataset.score) || 0;
    const progress = scoreCircle.querySelector('.score-progress');
    const circumference = 2 * Math.PI * 90; // radius = 90
    const offset = circumference - (score / 100) * circumference;
    
    if (progress) {
        progress.style.strokeDashoffset = circumference;
        setTimeout(() => {
            progress.style.strokeDashoffset = offset;
        }, 100);
    }
}

function updateChartsTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    const textColor = isDark ? '#f1f5f9' : '#212529';
    const gridColor = isDark ? '#334155' : '#e9ecef';
    
    Object.values(charts).forEach(chart => {
        if (chart && chart.options) {
            // Update text colors
            if (chart.options.scales) {
                Object.values(chart.options.scales).forEach(scale => {
                    scale.ticks = { ...scale.ticks, color: textColor };
                    scale.grid = { ...scale.grid, color: gridColor };
                });
            }
            
            chart.update();
        }
    });
}

// Export Functionality
document.getElementById('exportBtn')?.addEventListener('click', () => {
    document.getElementById('exportModal').style.display = 'flex';
});

function closeExportModal() {
    document.getElementById('exportModal').style.display = 'none';
}

function exportToPDF() {
    window.print();
    closeExportModal();
}

function copyShareLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        showNotification('Share link copied to clipboard!');
        closeExportModal();
    });
}

function exportToMarkdown() {
    // Simple markdown export - in production, this would be more sophisticated
    let markdown = '# CodeQual Analysis Report\n\n';
    
    // Add metadata
    const timestamp = document.querySelector('.meta-item')?.textContent || '';
    markdown += `Generated: ${timestamp}\n\n`;
    
    // Add findings
    document.querySelectorAll('.finding').forEach(finding => {
        const severity = finding.querySelector('.badge')?.textContent || '';
        const title = finding.querySelector('h3')?.textContent || '';
        const description = finding.querySelector('p')?.textContent || '';
        
        markdown += `## ${severity} - ${title}\n\n${description}\n\n`;
    });
    
    // Download the file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codequal-report.md';
    a.click();
    URL.revokeObjectURL(url);
    
    closeExportModal();
}

// Toggle Lower Priority Issues
function toggleLowerPriorityIssues() {
    const section = document.getElementById('lowerPriorityIssues');
    const button = document.getElementById('toggleRepoIssues');
    const toggleText = document.getElementById('toggleText');
    const toggleArrow = document.getElementById('toggleArrow');
    
    if (section.style.display === 'none') {
        section.style.display = 'block';
        toggleArrow.textContent = '▲';
        toggleText.textContent = toggleText.textContent.replace('Show All', 'Hide');
    } else {
        section.style.display = 'none';
        toggleArrow.textContent = '▼';
        toggleText.textContent = toggleText.textContent.replace('Hide', 'Show All');
    }
}

// Copy PR Comment
function copyPRComment() {
    const commentText = document.querySelector('.pr-comment-preview pre')?.textContent;
    if (commentText) {
        navigator.clipboard.writeText(commentText).then(() => {
            showNotification('PR comment copied to clipboard!');
        });
    }
}

// Tooltips
function initializeTooltips() {
    // Add tooltips to badges
    document.querySelectorAll('.badge').forEach(badge => {
        badge.setAttribute('title', `${badge.textContent} severity issue`);
    });
    
    // Add tooltips to skill bars
    document.querySelectorAll('.skill-card').forEach(card => {
        const score = card.querySelector('.skill-header span')?.textContent;
        const fill = card.querySelector('.skill-fill');
        if (fill && score) {
            fill.setAttribute('title', `Current score: ${score}/100`);
        }
    });
}

// Interactions
function initializeInteractions() {
    // Make findings collapsible
    document.querySelectorAll('.finding').forEach(finding => {
        const header = finding.querySelector('h3');
        if (header) {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                finding.classList.toggle('collapsed');
            });
        }
    });
}

// Animations
function initializeAnimations() {
    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe sections
    document.querySelectorAll('.section').forEach(section => {
        observer.observe(section);
    });
}

// Feedback System
function initializeFeedback() {
    const feedbackWidget = document.getElementById('feedbackWidget');
    const ratingBtns = document.querySelectorAll('.rating-btn');
    
    ratingBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            ratingBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });
}

function toggleFeedback() {
    const form = document.querySelector('.feedback-form');
    form?.classList.toggle('show');
}

function submitFeedback() {
    const rating = document.querySelector('.rating-btn.selected')?.dataset.rating;
    const feedback = document.querySelector('.feedback-text')?.value;
    
    if (rating) {
        // In production, this would send to your API
        console.log('Feedback submitted:', { rating, feedback });
        showNotification('Thank you for your feedback!');
        
        // Reset form
        document.querySelector('.feedback-form').classList.remove('show');
        document.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('selected'));
        document.querySelector('.feedback-text').value = '';
    }
}

function showFeedback() {
    toggleFeedback();
}

// Filter System
let activeFilters = {
    severity: ['critical', 'high', 'medium', 'low'],
    type: ['security', 'performance', 'quality', 'style']
};

function initializeFilters() {
    // Initialize filter checkboxes
    document.querySelectorAll('input[name="severity"], input[name="type"]').forEach(input => {
        input.addEventListener('change', updateActiveFilters);
    });
}

function showFilterModal(context) {
    document.getElementById('filterModal').style.display = 'flex';
}

function closeFilterModal() {
    document.getElementById('filterModal').style.display = 'none';
}

function updateActiveFilters() {
    activeFilters.severity = Array.from(document.querySelectorAll('input[name="severity"]:checked'))
        .map(input => input.value);
    activeFilters.type = Array.from(document.querySelectorAll('input[name="type"]:checked'))
        .map(input => input.value);
}

function applyFilters() {
    const findings = document.querySelectorAll('.finding');
    
    findings.forEach(finding => {
        const severity = finding.dataset.severity || '';
        const type = finding.dataset.type || '';
        
        const showBySeverity = activeFilters.severity.includes(severity.toLowerCase());
        const showByType = activeFilters.type.includes(type.toLowerCase());
        
        finding.style.display = (showBySeverity && showByType) ? 'block' : 'none';
    });
    
    closeFilterModal();
}

function resetFilters() {
    document.querySelectorAll('input[name="severity"], input[name="type"]').forEach(input => {
        input.checked = true;
    });
    updateActiveFilters();
    applyFilters();
}

// View Toggle
function initializeViewToggle() {
    const viewBtns = document.querySelectorAll('.view-btn');
    
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const container = document.querySelector('.issues-container');
            if (container) {
                container.classList.toggle('list-view', view === 'list');
            }
        });
    });
}

// Code Copy
function initializeCodeCopy() {
    document.querySelectorAll('.code-snippet').forEach(snippet => {
        snippet.addEventListener('click', () => {
            const code = snippet.textContent;
            navigator.clipboard.writeText(code).then(() => {
                showNotification('Code copied to clipboard!');
            });
        });
    });
}

// Show Skill Details
function showSkillDetails() {
    // In production, this could show a modal with detailed skill information
    alert('Skills are calculated based on your code quality, best practices adherence, and improvement over time.');
}

// Notification System
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--primary);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: var(--shadow-lg);
        z-index: 3000;
        animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        to {
            transform: translateX(-50%) translateY(100px);
            opacity: 0;
        }
    }
    
    .finding.collapsed {
        height: auto;
        max-height: 60px;
        overflow: hidden;
    }
    
    .finding.highlight {
        animation: highlight 2s ease;
    }
    
    @keyframes highlight {
        0%, 100% { background-color: var(--bg-secondary); }
        50% { background-color: var(--primary-light); }
    }
    
    .animate-in {
        animation: fadeInUp 0.6s ease forwards;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .no-results {
        text-align: center;
        color: var(--text-secondary);
        padding: 20px;
    }
    
    .search-result {
        padding: 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s;
    }
    
    .search-result:hover {
        background: var(--bg-secondary);
    }
    
    .search-result h4 {
        margin: 0 0 5px 0;
        color: var(--primary);
    }
    
    .search-result p {
        margin: 0;
        font-size: 0.875rem;
        color: var(--text-secondary);
    }
    
    .search-result mark {
        background: var(--warning);
        color: var(--text-primary);
        padding: 2px 4px;
        border-radius: 2px;
    }
    
    .list-view .finding {
        display: flex;
        align-items: center;
        padding: 15px;
    }
    
    .list-view .finding h3 {
        margin: 0;
        flex: 1;
    }
`;
document.head.appendChild(style);