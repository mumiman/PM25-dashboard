/**
 * API Configuration for PM2.5 Dashboard
 * Handles different base URLs for development and production environments.
 */

// Detect environment and set API base URL
export const API_BASE_URL = import.meta.env.PROD
    ? '/r6world/api/pm'
    : '/api';

/**
 * Fetch wrapper that uses the correct API base URL
 * @param endpoint - API endpoint (e.g., '/compute', '/health')
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export const fetchAPI = async (endpoint: string, options?: RequestInit): Promise<Response> => {
    const url = `${API_BASE_URL}${endpoint}`;
    return fetch(url, options);
};

/**
 * JSON fetch wrapper with automatic JSON parsing
 * @param endpoint - API endpoint
 * @param options - Fetch options
 * @returns Promise<T>
 */
export const fetchJSON = async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    const response = await fetchAPI(endpoint, {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        ...options,
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
};
