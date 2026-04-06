// User Authentication & Watch History

let currentUser = null;
let watchHistory = [];

// Load saved user from localStorage
function loadUser() {
    const saved = localStorage.getItem('soultv_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        updateUIForUser();
        return true;
    }
    return false;
}

// Update UI for logged in user
function updateUIForUser() {
    const emailDisplay = document.getElementById('userEmailDisplay');
    const authBtn = document.getElementById('authBtn');
    
    if (emailDisplay) {
        emailDisplay.innerHTML = `👤 ${currentUser.email.split('@')[0]}`;
    }
    if (authBtn) {
        authBtn.innerHTML = '[LOGOUT]';
    }
    
    showRecommendedSection();
    logToTerminal(`✅ Welcome back, ${currentUser.email}`);
}

// Login user
function loginUser() {
    const emailInput = document.getElementById('loginEmail');
    const email = emailInput ? emailInput.value.trim() : '';
    
    if (!email || !email.includes('@')) {
        alert('Enter a valid email address');
        return false;
    }
    
    currentUser = { 
        email: email, 
        history: watchHistory,
        joined: Date.now()
    };
    
    localStorage.setItem('soultv_user', JSON.stringify(currentUser));
    updateUIForUser();
    closeAuthModal();
    
    return true;
}

// Logout user
function logoutUser() {
    currentUser = null;
    localStorage.removeItem('soultv_user');
    
    const emailDisplay = document.getElementById('userEmailDisplay');
    const authBtn = document.getElementById('authBtn');
    const recommendedSection = document.getElementById('recommendedSection');
    
    if (emailDisplay) emailDisplay.innerHTML = '';
    if (authBtn) authBtn.innerHTML = '[LOGIN]';
    if (recommendedSection) recommendedSection.style.display = 'none';
    
    logToTerminal(`🔓 User logged out`);
}

// Toggle auth modal
function toggleAuth() {
    if (currentUser) {
        logoutUser();
    } else {
        const modal = document.getElementById('authModal');
        if (modal) modal.classList.add('active');
    }
}

// Close auth modal
function closeAuthModal() {
    const modal = document.getElementById('authModal');
    const emailInput = document.getElementById('loginEmail');
    
    if (modal) modal.classList.remove('active');
    if (emailInput) emailInput.value = '';
}

// Add to watch history
function addToWatchHistory(item, season = null, episode = null) {
    if (!currentUser) return;
    
    const historyItem = {
        id: item.id,
        title: item.title || item.name,
        type: item.title ? 'movie' : 'tv',
        timestamp: Date.now(),
        season: season,
        episode: episode
    };
    
    // Remove duplicate if exists
    const existingIndex = watchHistory.findIndex(w => w.id === item.id);
    if (existingIndex !== -1) watchHistory.splice(existingIndex, 1);
    
    // Add to front
    watchHistory.unshift(historyItem);
    
    // Keep only last 20
    if (watchHistory.length > 20) watchHistory.pop();
    
    // Save
    currentUser.history = watchHistory;
    localStorage.setItem('soultv_user', JSON.stringify(currentUser));
    
    // Update recommendations
    generateRecommendations();
}

// Show recommended section
function showRecommendedSection() {
    const section = document.getElementById('recommendedSection');
    if (!section || !currentUser || watchHistory.length === 0) {
        if (section) section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    generateRecommendations();
}

// Generate recommendations based on watch history
function generateRecommendations() {
    if (!contentLibrary.length || !currentUser || !watchHistory.length) return;
    
    const watchedIds = watchHistory.map(w => w.id);
    const recommended = contentLibrary
        .filter(item => !watchedIds.includes(item.id))
        .slice(0, 12);
    
    const container = document.getElementById('recommendedCarousel');
    if (!container) return;
    
    container.innerHTML = '';
    recommended.forEach(item => {
        const card = createContentCard(item);
        card.addEventListener('click', () => openContent(item));
        container.appendChild(card);
    });
}