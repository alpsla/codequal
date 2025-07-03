// Language handling
function changeLanguage(lang) {
    // Redirect to the appropriate language version
    const currentPath = window.location.pathname;
    const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
    window.location.href = `${basePath}/report-${lang}.html${window.location.search}`;
}

// Toggle lower priority repository issues
function toggleLowerPriorityIssues() {
    const section = document.getElementById('lowerPriorityRepoIssues');
    const button = document.getElementById('toggleRepoIssues');
    const arrow = button.querySelector('span:last-child');
    
    if (section.style.display === 'none') {
        section.style.display = 'block';
        arrow.textContent = '▲';
    } else {
        section.style.display = 'none';
        arrow.textContent = '▼';
    }
}

// Initialize on page load
window.addEventListener('load', () => {
    // Animate skill bars
    const fills = document.querySelectorAll('.skill-fill');
    fills.forEach(fill => {
        const width = fill.style.width;
        fill.style.width = '0';
        setTimeout(() => {
            fill.style.transition = 'width 1s ease';
            fill.style.width = width;
        }, 100);
    });
    
    // Set score circle color based on score
    const scoreCircles = document.querySelectorAll('.score-circle');
    scoreCircles.forEach(circle => {
        const score = parseInt(circle.style.getPropertyValue('--score'));
        if (score < 40) {
            circle.classList.add('low');
        } else if (score < 70) {
            circle.classList.add('medium');
        }
    });
    
    // Check URL parameter for showing all issues
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('show') === 'all') {
        toggleLowerPriorityIssues();
    }
});