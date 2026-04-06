// Main Application Entry Point
// Initializes all components and event listeners

document.addEventListener('DOMContentLoaded', () => {
    // Initialize user auth
    loadUser();
    
    // Fetch initial content
    fetchContent().then(() => {
        renderCarousel(contentLibrary);
    });
    
    // Setup all event listeners
    setupEventListeners();
    
    // Cursor blink effect
    setupCursorBlink();
});

// Setup all event listeners
function setupEventListeners() {
    // Enter button (startup)
    const enterBtn = document.getElementById('enterBtn');
    if (enterBtn) {
        enterBtn.addEventListener('click', enterMainSite);
    }
    
    // Browse button
    const browseBtn = document.getElementById('browseBtn');
    if (browseBtn) {
        browseBtn.addEventListener('click', scrollToContent);
    }
    
    // Navigation links
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            handleNavClick(link);
        });
    });
    
    // Search functionality
    setupSearch();
    
    // Auth button
    const authBtn = document.getElementById('authBtn');
    if (authBtn) {
        authBtn.addEventListener('click', toggleAuth);
    }
    
    // Auth modal buttons
    const loginSubmit = document.getElementById('loginSubmit');
    const cancelAuth = document.getElementById('cancelAuth');
    const closeAuth = document.getElementById('closeAuth');
    
    if (loginSubmit) loginSubmit.addEventListener('click', loginUser);
    if (cancelAuth) cancelAuth.addEventListener('click', closeAuthModal);
    if (closeAuth) closeAuth.addEventListener('click', closeAuthModal);
    
    // Player controls
    const closePlayerBtn = document.getElementById('closePlayer');
    const sourceSelect = document.getElementById('sourceSelect');
    const seasonSelect = document.getElementById('seasonSelect');
    const skipIntroBtn = document.getElementById('skipIntro');
    const skipOutroBtn = document.getElementById('skipOutro');
    const autoNextToggle = document.getElementById('autoNextToggle');
    
    if (closePlayerBtn) closePlayerBtn.addEventListener('click', closePlayer);
    if (sourceSelect) sourceSelect.addEventListener('change', manualSourceChange);
    if (seasonSelect) seasonSelect.addEventListener('change', changeSeason);
    if (skipIntroBtn) skipIntroBtn.addEventListener('click', skipIntro);
    if (skipOutroBtn) skipOutroBtn.addEventListener('click', skipOutro);
    if (autoNextToggle) {
        autoNextToggle.addEventListener('change', (e) => {
            autoNextEnabled = e.target.checked;
        });
    }
    
    // Carousel navigation
    document.querySelectorAll('.carousel-nav').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            const dir = parseInt(btn.dataset.dir);
            scrollCarousel(target, dir);
        });
    });
}

// Enter main site from startup
function enterMainSite() {
    const startup = document.getElementById('startupPage');
    const mainPage = document.getElementById('mainPage');
    
    if (startup) startup.classList.add('fade-out');
    
    setTimeout(() => {
        if (startup) startup.style.display = 'none';
        if (mainPage) mainPage.classList.add('visible');
        document.body.style.overflow = 'auto';
    }, 1500);
}

// Handle navigation clicks
function handleNavClick(link) {
    // Update active state
    document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    
    const category = link.dataset.cat;
    const sectionTitle = document.getElementById('sectionTitle');
    const genreFilter = document.getElementById('genreFilter');
    
    // Update content based on category
    if (category === 'movie') {
        if (sectionTitle) sectionTitle.innerHTML = 'MOVIE_ARCHIVE';
        renderCarousel(movieLibrary);
        if (movieLibrary[0]) updateHero(movieLibrary[0]);
        setupGenreFilter('movie');
    } else if (category === 'tv') {
        if (sectionTitle) sectionTitle.innerHTML = 'SERIES_NEXUS';
        renderCarousel(seriesLibrary);
        if (seriesLibrary[0]) updateHero(seriesLibrary[0]);
        setupGenreFilter('tv');
    } else {
        if (sectionTitle) sectionTitle.innerHTML = 'ALL_CONTENT';
        renderCarousel(contentLibrary);
        if (contentLibrary[0]) updateHero(contentLibrary[0]);
        if (genreFilter) genreFilter.style.display = 'none';
    }
}

// Setup search functionality
function setupSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const dropdown = document.getElementById('autocompleteDropdown');
    
    if (!searchBtn || !searchInput) return;
    
    // Toggle search input
    searchBtn.addEventListener('click', () => {
        if (searchInput.classList.contains('active')) {
            if (searchInput.value) performSearch(searchInput.value);
            searchInput.classList.remove('active');
            searchInput.value = '';
            if (dropdown) dropdown.style.display = 'none';
        } else {
            searchInput.classList.add('active');
            searchInput.focus();
        }
    });
    
    // Input with autocomplete
    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value;
        if (!query.trim()) {
            if (dropdown) dropdown.style.display = 'none';
            return;
        }
        
        const suggestions = await searchSuggestions(query);
        showAutocomplete(suggestions, dropdown, searchInput);
    });
    
    // Enter key
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch(searchInput.value);
            searchInput.classList.remove('active');
            searchInput.value = '';
            if (dropdown) dropdown.style.display = 'none';
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (dropdown && !searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}

// Show autocomplete dropdown
function showAutocomplete(items, dropdown, input) {
    if (!dropdown) return;
    
    dropdown.innerHTML = '';
    
    if (items.length === 0) {
        dropdown.style.display = 'none';
        return;
    }
    
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.textContent = `${item.title || item.name} (${item.media_type === 'movie' ? 'MOVIE' : 'SERIES'})`;
        div.addEventListener('click', () => {
            input.value = item.title || item.name;
            dropdown.style.display = 'none';
            performSearch(item.title || item.name);
            // Open directly
            openContent(item);
        });
        dropdown.appendChild(div);
    });
    
    dropdown.style.display = 'block';
}

// Perform search
async function performSearch(query) {
    if (!query.trim()) return;
    
    logToTerminal(`🔍 SEARCHING: ${query}`);
    const results = await searchContent(query);
    
    renderCarousel(results);
    if (results[0]) updateHero(results[0]);
    
    // Update title
    const sectionTitle = document.getElementById('sectionTitle');
    if (sectionTitle) sectionTitle.innerHTML = `SEARCH: ${query.toUpperCase()}`;
}

// Scroll carousel
function scrollCarousel(id, dir) {
    const el = document.getElementById(id);
    if (el) {
        el.scrollBy({ left: dir * 280, behavior: 'smooth' });
    }
}

// Scroll to content section
function scrollToContent() {
    const section = document.getElementById('contentSection');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Cursor blink effect
function setupCursorBlink() {
    const cursor = document.getElementById('cursor');
    if (!cursor) return;
    
    let visible = true;
    setInterval(() => {
        cursor.style.opacity = visible ? '0' : '1';
        visible = !visible;
    }, 600);
}