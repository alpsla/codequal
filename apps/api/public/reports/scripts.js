// Language switching functionality
function changeLanguage(lang) {
    // Get current path and replace language code
    const currentPath = window.location.pathname;
    const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
    const newPath = `${basePath}/report-${lang}.html`;
    
    // Redirect to the new language version
    window.location.href = newPath;
}

// Toggle lower priority PR issues
function toggleLowerPriorityPRIssues() {
    const section = document.getElementById('lowerPriorityPRIssues');
    const toggleText = document.getElementById('togglePRText');
    const toggleArrow = document.getElementById('togglePRArrow');
    
    if (section.style.display === 'none') {
        section.style.display = 'block';
        toggleArrow.textContent = '▲';
        toggleText.textContent = toggleText.textContent.replace(/Show All|Показать все|Mostrar todos|Afficher tout|Alle anzeigen|すべて表示|显示全部|모두 표시|Mostra tutti/gi, 'Hide');
    } else {
        section.style.display = 'none';
        toggleArrow.textContent = '▼';
        toggleText.textContent = toggleText.textContent.replace(/Hide|Скрыть|Ocultar|Masquer|Ausblenden|非表示|隐藏|숨기기|Nascondi/gi, 'Show All');
    }
}

// Toggle lower priority issues
function toggleLowerPriorityIssues() {
    const section = document.getElementById('lowerPriorityIssues');
    const button = document.getElementById('toggleRepoIssues');
    const toggleText = document.getElementById('toggleText');
    const toggleArrow = document.getElementById('toggleArrow');
    
    if (section.style.display === 'none') {
        // Show issues
        section.style.display = 'block';
        toggleArrow.textContent = '▲';
        
        // Update text based on language
        const lang = document.body.getAttribute('data-lang');
        if (lang === 'ru') {
            toggleText.textContent = toggleText.textContent.replace('Показать все', 'Скрыть');
        } else if (lang === 'es') {
            toggleText.textContent = toggleText.textContent.replace('Mostrar todos', 'Ocultar');
        } else if (lang === 'fr') {
            toggleText.textContent = toggleText.textContent.replace('Afficher tout', 'Masquer');
        } else if (lang === 'de') {
            toggleText.textContent = toggleText.textContent.replace('Alle anzeigen', 'Ausblenden');
        } else if (lang === 'ja') {
            toggleText.textContent = toggleText.textContent.replace('すべて表示', '非表示');
        } else if (lang === 'zh') {
            toggleText.textContent = toggleText.textContent.replace('显示全部', '隐藏');
        } else if (lang === 'pt') {
            toggleText.textContent = toggleText.textContent.replace('Mostrar todos', 'Ocultar');
        } else if (lang === 'it') {
            toggleText.textContent = toggleText.textContent.replace('Mostra tutti', 'Nascondi');
        } else if (lang === 'ko') {
            toggleText.textContent = toggleText.textContent.replace('모두 표시', '숨기기');
        } else {
            toggleText.textContent = toggleText.textContent.replace('Show All', 'Hide');
        }
    } else {
        // Hide issues
        section.style.display = 'none';
        toggleArrow.textContent = '▼';
        
        // Update text based on language
        const lang = document.body.getAttribute('data-lang');
        if (lang === 'ru') {
            toggleText.textContent = toggleText.textContent.replace('Скрыть', 'Показать все');
        } else if (lang === 'es') {
            toggleText.textContent = toggleText.textContent.replace('Ocultar', 'Mostrar todos');
        } else if (lang === 'fr') {
            toggleText.textContent = toggleText.textContent.replace('Masquer', 'Afficher tout');
        } else if (lang === 'de') {
            toggleText.textContent = toggleText.textContent.replace('Ausblenden', 'Alle anzeigen');
        } else if (lang === 'ja') {
            toggleText.textContent = toggleText.textContent.replace('非表示', 'すべて表示');
        } else if (lang === 'zh') {
            toggleText.textContent = toggleText.textContent.replace('隐藏', '显示全部');
        } else if (lang === 'pt') {
            toggleText.textContent = toggleText.textContent.replace('Ocultar', 'Mostrar todos');
        } else if (lang === 'it') {
            toggleText.textContent = toggleText.textContent.replace('Nascondi', 'Mostra tutti');
        } else if (lang === 'ko') {
            toggleText.textContent = toggleText.textContent.replace('숨기기', '모두 표시');
        } else {
            toggleText.textContent = toggleText.textContent.replace('Hide', 'Show All');
        }
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
    
    // Check URL parameter for showing all issues
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('show') === 'all') {
        const toggleButton = document.getElementById('toggleRepoIssues');
        if (toggleButton) {
            toggleButton.click();
        }
    }
    
    // Set correct language in dropdown
    const lang = document.body.getAttribute('data-lang');
    const dropdown = document.querySelector('.language-dropdown');
    if (dropdown && lang) {
        dropdown.value = lang;
    }
});

// Smooth scroll for anchor links
document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});