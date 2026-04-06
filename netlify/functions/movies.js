// Netlify Serverless Function - Secure TMDB API Proxy
// Hides API keys from frontend code

exports.handler = async (event, context) => {
    // Get API keys from environment variables (set in Netlify dashboard)
    const TMDB_KEYS = [
        process.env.TMDB_KEY_1,
        process.env.TMDB_KEY_2,
        process.env.TMDB_KEY_3,
        process.env.TMDB_API_KEY  // Fallback
    ].filter(Boolean);
    
    if (TMDB_KEYS.length === 0) {
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'No TMDB API keys configured. Add them in Netlify dashboard.' 
            })
        };
    }
    
    // Rotate through keys randomly for load distribution
    const TMDB_KEY = TMDB_KEYS[Math.floor(Math.random() * TMDB_KEYS.length)];
    
    // Parse query parameters
    const params = event.queryStringParameters || {};
    const { type, query, id, season } = params;
    
    let url;
    const baseUrl = 'https://api.themoviedb.org/3';
    
    // Build TMDB URL based on request type
    switch(type) {
        // Trending and general lists
        case 'trending':
            url = `${baseUrl}/trending/all/week?api_key=${TMDB_KEY}&language=en-US`;
            break;
            
        // Movies
        case 'popular':
            url = `${baseUrl}/movie/popular?api_key=${TMDB_KEY}&language=en-US&page=1`;
            break;
            
        case 'top_rated':
            url = `${baseUrl}/movie/top_rated?api_key=${TMDB_KEY}&language=en-US&page=1`;
            break;
            
        case 'upcoming':
            url = `${baseUrl}/movie/upcoming?api_key=${TMDB_KEY}&language=en-US&page=1`;
            break;
            
        case 'now_playing':
            url = `${baseUrl}/movie/now_playing?api_key=${TMDB_KEY}&language=en-US&page=1`;
            break;
            
        // TV Shows
        case 'tv_popular':
            url = `${baseUrl}/tv/popular?api_key=${TMDB_KEY}&language=en-US&page=1`;
            break;
            
        case 'tv_top_rated':
            url = `${baseUrl}/tv/top_rated?api_key=${TMDB_KEY}&language=en-US&page=1`;
            break;
            
        case 'tv_airing_today':
            url = `${baseUrl}/tv/airing_today?api_key=${TMDB_KEY}&language=en-US&page=1`;
            break;
            
        // Genre-specific movies
        case 'action':
            url = `${baseUrl}/discover/movie?api_key=${TMDB_KEY}&with_genres=28&sort_by=popularity.desc&page=1`;
            break;
            
        case 'comedy':
            url = `${baseUrl}/discover/movie?api_key=${TMDB_KEY}&with_genres=35&sort_by=popularity.desc&page=1`;
            break;
            
        case 'horror':
            url = `${baseUrl}/discover/movie?api_key=${TMDB_KEY}&with_genres=27&sort_by=popularity.desc&page=1`;
            break;
            
        case 'scifi':
            url = `${baseUrl}/discover/movie?api_key=${TMDB_KEY}&with_genres=878&sort_by=popularity.desc&page=1`;
            break;
            
        case 'thriller':
            url = `${baseUrl}/discover/movie?api_key=${TMDB_KEY}&with_genres=53&sort_by=popularity.desc&page=1`;
            break;
            
        case 'romance':
            url = `${baseUrl}/discover/movie?api_key=${TMDB_KEY}&with_genres=10749&sort_by=popularity.desc&page=1`;
            break;
            
        case 'animation':
            url = `${baseUrl}/discover/movie?api_key=${TMDB_KEY}&with_genres=16&sort_by=popularity.desc&page=1`;
            break;
            
        case 'documentary':
            url = `${baseUrl}/discover/movie?api_key=${TMDB_KEY}&with_genres=99&sort_by=popularity.desc&page=1`;
            break;
            
        // Search
        case 'search':
            if (!query) {
                return {
                    statusCode: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ error: 'Query parameter required' })
                };
            }
            url = `${baseUrl}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=en-US`;
            break;
            
        // TV details
        case 'tv_details':
            if (!id) {
                return {
                    statusCode: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ error: 'ID parameter required' })
                };
            }
            url = `${baseUrl}/tv/${id}?api_key=${TMDB_KEY}&language=en-US`;
            break;
            
        // Season episodes
        case 'season':
            if (!id || !season) {
                return {
                    statusCode: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ error: 'ID and season parameters required' })
                };
            }
            url = `${baseUrl}/tv/${id}/season/${season}?api_key=${TMDB_KEY}&language=en-US`;
            break;
            
        // Movie details
        case 'movie_details':
            if (!id) {
                return {
                    statusCode: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ error: 'ID parameter required' })
                };
            }
            url = `${baseUrl}/movie/${id}?api_key=${TMDB_KEY}&language=en-US`;
            break;
            
        // Default fallback
        default:
            url = `${baseUrl}/trending/all/week?api_key=${TMDB_KEY}&language=en-US`;
    }
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300' // Cache 5 minutes
            },
            body: JSON.stringify(data)
        };
        
    } catch (error) {
        console.error('Function error:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: 'Failed to fetch from TMDB',
                message: error.message
            })
        };
    }
};
