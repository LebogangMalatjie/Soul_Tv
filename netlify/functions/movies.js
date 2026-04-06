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
        case 'trending':
            url = `${baseUrl}/trending/all/week?api_key=${TMDB_KEY}&language=en-US`;
            break;
            
        case 'popular':
            url = `${baseUrl}/movie/popular?api_key=${TMDB_KEY}&language=en-US&page=1`;
            break;
            
        case 'top_rated':
            url = `${baseUrl}/movie/top_rated?api_key=${TMDB_KEY}&language=en-US&page=1`;
            break;
            
        case 'upcoming':
            url = `${baseUrl}/movie/upcoming?api_key=${TMDB_KEY}&language=en-US&page=1`;
            break;
            
        case 'tv_popular':
            url = `${baseUrl}/discover/tv?sort_by=popularity.desc&api_key=${TMDB_KEY}&language=en-US&page=1`;
            break;
            
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
            
        default:
            // Default to trending
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