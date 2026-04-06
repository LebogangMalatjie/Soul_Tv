// Video Player & Streaming Logic

// Video source configurations
const VIDEO_SOURCES = [
    { name: "VIDKING", url: (id, type, season, episode) => `https://www.vidking.net/embed/${type === 'movie' ? 'movie' : 'tv'}/${id}${type !== 'movie' ? `/${season}/${episode}` : ''}` },
    { name: "VIDSRC.PRO", url: (id, type, season, episode) => `https://vidsrc.pro/embed/${type === 'movie' ? 'movie' : 'tv'}/${id}${type !== 'movie' ? `/${season}/${episode}` : ''}` },
    { name: "VIDSRC.ME", url: (id, type, season, episode) => `https://vidsrc.me/embed/${type === 'movie' ? 'movie' : 'tv'}/${id}${type !== 'movie' ? `/${season}/${episode}` : ''}` },
    { name: "VIDSRC.WTF", url: (id, type, season, episode) => `https://vidsrc.wtf/embed/${type === 'movie' ? 'movie' : 'tv'}/${id}${type !== 'movie' ? `/${season}/${episode}` : ''}` },
    { name: "VIDLINK.PRO", url: (id, type, season, episode) => `https://vidlink.pro/embed/${type === 'movie' ? 'movie' : 'tv'}/${id}${type !== 'movie' ? `/${season}/${episode}` : ''}` },
    { name: "2EMBED", url: (id, type, season, episode) => `https://2embed.org/embed/${type === 'movie' ? 'movie' : 'tv'}/${id}${type !== 'movie' ? `/${season}/${episode}` : ''}` },
    { name: "AUTOEMBED", url: (id, type, season, episode) => `https://autoembed.to/embed/${type === 'movie' ? 'movie' : 'tv'}/${id}${type !== 'movie' ? `/${season}/${episode}` : ''}` },
    { name: "MULTIEMBED", url: (id, type, season, episode) => `https://multiembed.to/embed/${type === 'movie' ? 'movie' : 'tv'}/${id}${type !== 'movie' ? `/${season}/${episode}` : ''}` },
    { name: "SUPEREMBED", url: (id, type, season, episode) => `https://superembed.net/embed/${type === 'movie' ? 'movie' : 'tv'}/${id}${type !== 'movie' ? `/${season}/${episode}` : ''}` },
    { name: "VIDEMBED", url: (id, type, season, episode) => `https://vidembed.cc/embed/${type === 'movie' ? 'movie' : 'tv'}/${id}${type !== 'movie' ? `/${season}/${episode}` : ''}` },
    { name: "FLIXEMBED", url: (id, type, season, episode) => `https://flixembed.com/embed/${type === 'movie' ? 'movie' : 'tv'}/${id}${type !== 'movie' ? `/${season}/${episode}` : ''}` },
    { name: "MOVCLOUD", url: (id, type, season, episode) => `https://movcloud.net/embed/${type === 'movie' ? 'movie' : 'tv'}/${id}${type !== 'movie' ? `/${season}/${episode}` : ''}` }
];

// Player state
let currentContent = null;
let currentType = null;
let currentSeason = 1;
let currentEpisode = 0;
let episodeList = [];
let autoNextEnabled = true;
let isAutoMode = true;
let failoverTimeout = null;

// Get embed URL
function getEmbedUrl(sourceIndex, mediaType, tmdbId, season = 1, episode = 1) {
    if (sourceIndex >= VIDEO_SOURCES.length) return null;
    return VIDEO_SOURCES[sourceIndex].url(tmdbId, mediaType, season, episode);
}

// Load specific source (manual selection)
function loadSpecificSource(sourceIndex, mediaType, tmdbId, season, episode, title) {
    if (failoverTimeout) clearTimeout(failoverTimeout);
    
    const embedUrl = getEmbedUrl(sourceIndex, mediaType, tmdbId, season, episode);
    if (!embedUrl) return false;
    
    const videoFrame = document.getElementById('videoFrame');
    const failoverBadge = document.getElementById('failoverBadge');
    
    if (videoFrame) videoFrame.src = embedUrl;
    logToTerminal(`🎬 SOURCE: ${VIDEO_SOURCES[sourceIndex].name}`);
    if (failoverBadge) {
        failoverBadge.innerHTML = `🎬 SOURCE: ${VIDEO_SOURCES[sourceIndex].name}`;
    }
    
    return true;
}

// Auto-failover system
async function tryLoadVideo(sourceIndex, mediaType, tmdbId, season, episode, title) {
    if (!isAutoMode) return;
    
    if (sourceIndex >= VIDEO_SOURCES.length) {
        logToTerminal(`❌ All sources failed`);
        const badge = document.getElementById('failoverBadge');
        if (badge) badge.innerHTML = `❌ NO WORKING SOURCES`;
        return false;
    }
    
    const embedUrl = getEmbedUrl(sourceIndex, mediaType, tmdbId, season, episode);
    logToTerminal(`🔄 Trying ${VIDEO_SOURCES[sourceIndex].name} (${sourceIndex + 1}/${VIDEO_SOURCES.length})`);
    
    const badge = document.getElementById('failoverBadge');
    if (badge) badge.innerHTML = `🔄 TRYING: ${VIDEO_SOURCES[sourceIndex].name}`;
    
    const videoFrame = document.getElementById('videoFrame');
    if (videoFrame) videoFrame.src = embedUrl;
    
    return new Promise((resolve) => {
        let resolved = false;
        
        if (failoverTimeout) clearTimeout(failoverTimeout);
        
        // 10 second timeout per source
        failoverTimeout = setTimeout(() => {
            if (!resolved && isAutoMode) {
                resolved = true;
                tryLoadVideo(sourceIndex + 1, mediaType, tmdbId, season, episode, title).then(resolve);
            }
        }, 10000);
        
        // Success handler
        videoFrame.onload = () => {
            if (!resolved && isAutoMode) {
                clearTimeout(failoverTimeout);
                resolved = true;
                logToTerminal(`✅ Working: ${VIDEO_SOURCES[sourceIndex].name}`);
                if (badge) badge.innerHTML = `✅ ACTIVE: ${VIDEO_SOURCES[sourceIndex].name}`;
                resolve(true);
            }
        };
        
        // Error handler
        videoFrame.onerror = () => {
            if (!resolved && isAutoMode) {
                clearTimeout(failoverTimeout);
                resolved = true;
                tryLoadVideo(sourceIndex + 1, mediaType, tmdbId, season, episode, title).then(resolve);
            }
        };
    });
}

// Main load function
function loadVideoWithFailover(mediaType, tmdbId, season = 1, episode = 1, title = "") {
    const sourceSelect = document.getElementById('sourceSelect');
    const mode = sourceSelect ? sourceSelect.value : 'auto';
    
    if (mode === 'auto') {
        isAutoMode = true;
        tryLoadVideo(0, mediaType, tmdbId, season, episode, title);
    } else {
        isAutoMode = false;
        loadSpecificSource(parseInt(mode), mediaType, tmdbId, season, episode, title);
    }
}

// Manual source change handler
function manualSourceChange() {
    if (!currentContent) return;
    
    const sourceSelect = document.getElementById('sourceSelect');
    const mode = sourceSelect ? sourceSelect.value : 'auto';
    
    if (mode === 'auto') {
        isAutoMode = true;
        loadVideoWithFailover(currentType, currentContent.id, currentSeason, currentEpisode + 1, currentContent.title || currentContent.name);
    } else {
        isAutoMode = false;
        loadSpecificSource(parseInt(mode), currentType, currentContent.id, currentSeason, currentEpisode + 1, currentContent.title || currentContent.name);
    }
}

// Open content (movie or series)
async function openContent(item) {
    const isMovie = !!item.title;
    const tmdbId = item.id;
    const title = item.title || item.name;
    
    currentContent = item;
    currentType = isMovie ? 'movie' : 'tv';
    
    // Update player title
    const playerTitle = document.getElementById('playerTitle');
    if (playerTitle) {
        playerTitle.innerHTML = `${title.toUpperCase()} ${!isMovie ? '• SERIES' : ''}`;
    }
    
    // Show modal
    const modal = document.getElementById('playerModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    // Add to history if logged in
    if (typeof addToWatchHistory === 'function') {
        addToWatchHistory(item);
    }
    
    if (!isMovie) {
        // TV Show setup
        setupTVPlayer(tmdbId, title);
    } else {
        // Movie setup
        setupMoviePlayer(tmdbId, title);
    }
}

// Setup TV player
async function setupTVPlayer(tmdbId, title) {
    const seasonSelect = document.getElementById('seasonSelect');
    const episodeListContainer = document.getElementById('episodeListContainer');
    
    if (seasonSelect) seasonSelect.style.display = 'inline-block';
    if (episodeListContainer) episodeListContainer.style.display = 'flex';
    
    try {
        const details = await getTVDetails(tmdbId);
        if (details && details.seasons) {
            const seasons = details.seasons.filter(s => s.season_number > 0);
            
            // Populate season selector
            if (seasonSelect) {
                seasonSelect.innerHTML = '';
                for (let s of seasons) {
                    const option = document.createElement('option');
                    option.value = s.season_number;
                    option.textContent = `Season ${s.season_number} (${s.episode_count || '?'} eps)`;
                    seasonSelect.appendChild(option);
                }
            }
            
            if (seasons.length > 0) {
                await loadSeasonEpisodes(tmdbId, seasons[0].season_number);
            }
        } else {
            setupDefaultSeasons(tmdbId);
        }
    } catch(e) {
        setupDefaultSeasons(tmdbId);
    }
}

// Setup Movie player
function setupMoviePlayer(tmdbId, title) {
    const seasonSelect = document.getElementById('seasonSelect');
    const episodeListContainer = document.getElementById('episodeListContainer');
    
    if (seasonSelect) seasonSelect.style.display = 'none';
    if (episodeListContainer) episodeListContainer.style.display = 'none';
    
    loadVideoWithFailover('movie', tmdbId, 1, 1, title);
}

// Setup default seasons (fallback)
function setupDefaultSeasons(tmdbId) {
    const seasonSelect = document.getElementById('seasonSelect');
    if (seasonSelect) {
        seasonSelect.innerHTML = '';
        for (let s = 1; s <= 3; s++) {
            const option = document.createElement('option');
            option.value = s;
            option.textContent = `Season ${s} (10 eps)`;
            seasonSelect.appendChild(option);
        }
    }
    loadSeasonEpisodes(tmdbId, 1);
}

// Load season episodes
async function loadSeasonEpisodes(tmdbId, seasonNum) {
    currentSeason = seasonNum;
    
    const episodes = await getSeasonEpisodes(tmdbId, seasonNum);
    
    if (episodes.length > 0) {
        episodeList = episodes;
    } else {
        // Fallback
        episodeList = [];
        for (let i = 1; i <= 10; i++) {
            episodeList.push({ episode: i, title: `Episode ${i}` });
        }
    }
    
    renderEpisodeList();
    currentEpisode = 0;
    playEpisode(0);
}

// Render episode buttons
function renderEpisodeList() {
    const container = document.getElementById('episodeListContainer');
    if (!container) return;
    
    container.innerHTML = '<div style="width:100%; margin-bottom:8px; color:var(--neon-red); font-size:13px;">📺 EPISODES</div>';
    
    episodeList.forEach((ep, idx) => {
        const btn = document.createElement('button');
        btn.className = 'episode-btn';
        if (idx === currentEpisode) btn.classList.add('active');
        btn.innerText = `EP ${ep.episode}`;
        btn.title = ep.title;
        btn.addEventListener('click', () => {
            currentEpisode = idx;
            playEpisode(idx);
        });
        container.appendChild(btn);
    });
}

// Play specific episode
function playEpisode(index) {
    if (!episodeList[index] || !currentContent) return;
    
    const ep = episodeList[index];
    const title = currentContent.name;
    
    loadVideoWithFailover('tv', currentContent.id, currentSeason, ep.episode, title);
    
    // Update active button
    document.querySelectorAll('.episode-btn').forEach((btn, i) => {
        if (i === index) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    
    // Update history
    if (typeof addToWatchHistory === 'function') {
        addToWatchHistory(currentContent, currentSeason, ep.episode);
    }
}

// Change season handler
function changeSeason() {
    const seasonSelect = document.getElementById('seasonSelect');
    const newSeason = seasonSelect ? parseInt(seasonSelect.value) : 1;
    
    if (currentContent && currentType === 'tv') {
        loadSeasonEpisodes(currentContent.id, newSeason);
    }
}

// Skip intro
function skipIntro() {
    logToTerminal('⏩ SKIP INTRO');
    // Implementation depends on video source capabilities
}

// Skip outro + auto next
function skipOutro() {
    logToTerminal('⏩ SKIP OUTRO');
    if (autoNextEnabled && currentType === 'tv') {
        nextEpisode();
    }
}

// Next episode
function nextEpisode() {
    if (currentType === 'tv' && currentEpisode + 1 < episodeList.length) {
        currentEpisode++;
        playEpisode(currentEpisode);
        logToTerminal(`⏭️ AUTO-NEXT: Episode ${currentEpisode + 1}`);
    }
}

// Close player
function closePlayer() {
    if (failoverTimeout) clearTimeout(failoverTimeout);
    
    const modal = document.getElementById('playerModal');
    const videoFrame = document.getElementById('videoFrame');
    const sourceSelect = document.getElementById('sourceSelect');
    const failoverBadge = document.getElementById('failoverBadge');
    
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
    if (videoFrame) videoFrame.src = '';
    if (sourceSelect) sourceSelect.value = 'auto';
    if (failoverBadge) failoverBadge.innerHTML = '🔄 SOURCE: AUTO MODE';
    
    currentContent = null;
    episodeList = [];
    currentEpisode = 0;
    isAutoMode = true;
}

// Terminal logging
function logToTerminal(msg) {
    const term = document.getElementById('playerTerminal');
    if (!term) return;
    
    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.innerHTML = `[${new Date().toLocaleTimeString()}] ${msg}`;
    term.appendChild(line);
    term.scrollTop = term.scrollHeight;
    
    // Keep only last 20 lines
    while (term.children.length > 20) {
        term.removeChild(term.children[0]);
    }
}