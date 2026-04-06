// API Configuration - Uses Netlify Serverless Function (NO exposed keys!)
const API_BASE = '/.netlify/functions/movies';
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/original';

// Genre mappings (keep these, they're public)
const movieGenres = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
    99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
    27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
    53: 'Thriller', 10752: 'War', 37: 'Western'
};

const tvGenres = {
    10759: 'Action & Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
    99: 'Documentary', 18: 'Drama', 10751: 'Family', 10762: 'Kids', 9648: 'Mystery',
    10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap',
    10767: 'Talk', 10768: 'War & Politics', 37: 'Western'
};

// State
let contentLibrary = [];
let movieLibrary = [];
let seriesLibrary = [];
let currentDisplayItems = [];

// Fetch from Netlify function (secure, no API key exposed)
async function fetchFromTMDB(endpoint) {
    try {
        const res = await fetch(`${API_BASE}?${endpoint}`);
        return await res.json();
    } catch(e) { 
        console.error('API fetch error:', e);
        return { results: [] }; 
    }
}

// Fetch all content
async function fetchContent() {
    const [trending, movies, tvShows] = await Promise.all([
        fetchFromTMDB('type=trending'),
        fetchFromTMDB('type=popular'),
        fetchFromTMDB('type=tv_popular')  // We'll add this endpoint
    ]);
    
    let all = [];
    if (trending.results) all.push(...trending.results);
    if (movies.results) all.push(...movies.results);
    if (tvShows.results) all.push(...tvShows.results);
    
    // Remove duplicates
    const unique = new Map();
    all.forEach(item => unique.set(item.id, item));
    all = Array.from(unique.values());
    
    // Separate libraries
    movieLibrary = all.filter(i => i.title);
    seriesLibrary = all.filter(i => i.name);
    contentLibrary = all;
    
    return all;
}

// Search content
async function searchContent(query) {
    if (!query.trim()) return [];
    try {
        const res = await fetch(`${API_BASE}?type=search&query=${encodeURIComponent(query)}`);
        const data = await res.json();
        return data.results ? data.results.filter(r => r.media_type !== 'person') : [];
    } catch(e) {
        console.error('Search error:', e);
        return [];
    }
}

// Search suggestions
async function searchSuggestions(query) {
    if (!query.trim()) return [];
    try {
        const res = await fetch(`${API_BASE}?type=search&query=${encodeURIComponent(query)}`);
        const data = await res.json();
        return data.results ? data.results.filter(r => r.media_type !== 'person').slice(0, 8) : [];
    } catch(e) {
        return [];
    }
}

// Get TV show details
async function getTVDetails(tmdbId) {
    try {
        const res = await fetch(`${API_BASE}?type=tv_details&id=${tmdbId}`);
        return await res.json();
    } catch(e) {
        return null;
    }
}

// Get season episodes
async function getSeasonEpisodes(tmdbId, seasonNum) {
    try {
        const res = await fetch(`${API_BASE}?type=season&id=${tmdbId}&season=${seasonNum}`);
        const data = await res.json();
        return data.episodes ? data.episodes.map(ep => ({ 
            episode: ep.episode_number, 
            title: ep.name 
        })) : [];
    } catch(e) {
        return [];
    }
}

// Create content card HTML
function createContentCard(item) {
    const card = document.createElement('div');
    card.className = 'content-card';
    card.dataset.id = item.id;
    card.dataset.type = item.title ? 'movie' : 'tv';
    
    const title = item.title || item.name;
    const year = (item.release_date || item.first_air_date || '').slice(0,4) || '2024';
    const poster = item.poster_path ? 
        `${IMG_BASE}${item.poster_path}` : 
        'https://via.placeholder.com/300x450/0a0a0f/ff003c?text=NO+IMAGE';
    
    card.innerHTML = `
        <img class="card-image" src="${poster}" alt="${title}" loading="lazy">
        <div class="card-info">
            <div class="card-title">${title.substring(0, 35)}</div>
            <div class="card-meta">${year} • ${item.title ? 'MOVIE' : 'SERIES'}</div>
        </div>
    `;
    
    return card;
}

// Update hero section
function updateHero(item) {
    const title = item.title || item.name;
    const bg = item.backdrop_path ? 
        `${BACKDROP_BASE}${item.backdrop_path}` : '';
    
    const heroBg = document.getElementById('heroBg');
    const heroTitle = document.getElementById('heroTitle');
    const heroDesc = document.getElementById('heroDesc');
    const heroYear = document.getElementById('heroYear');
    
    if (heroBg && bg) heroBg.style.backgroundImage = `url(${bg})`;
    if (heroTitle) {
        heroTitle.innerHTML = title.toUpperCase().replace(/ /g, '_');
        heroTitle.setAttribute('data-text', title.toUpperCase().replace(/ /g, '_'));
    }
    if (heroDesc) heroDesc.innerHTML = item.overview || 'Click to start streaming.';
    if (heroYear) heroYear.innerHTML = `[${(item.release_date || item.first_air_date || '').slice(0,4) || '2025'}]`;
}

// Render carousel
function renderCarousel(items, containerId = 'mainCarousel') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    currentDisplayItems = items.slice(0, 60);
    
    currentDisplayItems.forEach(item => {
        const card = createContentCard(item);
        card.addEventListener('click', () => openContent(item));
        container.appendChild(card);
    });
    
    if (items[0] && containerId === 'mainCarousel') updateHero(items[0]);
}

// Filter by genre
function filterByGenre(genreId, type) {
    let filtered;
    if (type === 'movie') {
        filtered = genreId === 'all' ? 
            movieLibrary : 
            movieLibrary.filter(m => m.genre_ids && m.genre_ids.includes(parseInt(genreId)));
    } else if (type === 'tv') {
        filtered = genreId === 'all' ? 
            seriesLibrary : 
            seriesLibrary.filter(s => s.genre_ids && s.genre_ids.includes(parseInt(genreId)));
    } else {
        filtered = contentLibrary;
    }
    renderCarousel(filtered);
    return filtered;
}

// Setup genre filters
function setupGenreFilter(category) {
    const genreFilter = document.getElementById('genreFilter');
    if (!genreFilter) return;
    
    genreFilter.style.display = 'flex';
    genreFilter.innerHTML = '<button class="genre-btn active" data-genre="all">ALL</button>';
    
    let genres;
    if (category === 'movie') {
        genres = [...new Set(movieLibrary.flatMap(m => m.genre_ids || []).filter(g => movieGenres[g]))];
        genres.forEach(genreId => {
            const btn = document.createElement('button');
            btn.className = 'genre-btn';
            btn.dataset.genre = genreId;
            btn.textContent = movieGenres[genreId];
            btn.addEventListener('click', () => {
                document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterByGenre(genreId, 'movie');
            });
            genreFilter.appendChild(btn);
        });
    } else if (category === 'tv') {
        genres = [...new Set(seriesLibrary.flatMap(s => s.genre_ids || []).filter(g => tvGenres[g]))];
        genres.forEach(genreId => {
            const btn = document.createElement('button');
            btn.className = 'genre-btn';
            btn.dataset.genre = genreId;
            btn.textContent = tvGenres[genreId];
            btn.addEventListener('click', () => {
                document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterByGenre(genreId, 'tv');
            });
            genreFilter.appendChild(btn);
        });
    }
    
    // All button
    const allBtn = genreFilter.querySelector('[data-genre="all"]');
    if (allBtn) {
        allBtn.addEventListener('click', () => {
            document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
            allBtn.classList.add('active');
            filterByGenre('all', category);
        });
    }
}