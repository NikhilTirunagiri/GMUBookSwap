// Environment configuration with validation
// This file validates all required environment variables

function getEnvVar(key: string, defaultValue?: string): string {
  // In browser, use window-injected env vars
  // In server/build, use process.env
  const value = typeof window !== 'undefined'
    ? (window as any).__NEXT_PUBLIC_ENV__?.[key] || process.env[key]
    : process.env[key];

  const finalValue = value || defaultValue;

  if (!finalValue) {
    // Don't throw during build/SSR for NEXT_PUBLIC_ vars
    // They might not be available yet
    if (typeof window === 'undefined' && key.startsWith('NEXT_PUBLIC_')) {
      console.warn(`Environment variable ${key} not found during SSR, will retry on client`);
      return defaultValue || '';
    }

    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please add ${key} to your .env.local file.`
    );
  }

  return finalValue;
}

// Helper to get API endpoint URLs
export const getApiUrl = (path: string) => {
  // Get API URL directly from environment
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const baseUrl = apiUrl.replace(/\/$/, ''); // Remove trailing slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

// Lazy-loaded config
let _config: { api: { url: string } } | null = null;

export const getConfig = () => {
  if (!_config) {
    _config = {
      api: {
        url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      },
    };
  }
  return _config;
};

// For backwards compatibility
export const config = new Proxy({} as { api: { url: string } }, {
  get(target, prop) {
    return getConfig()[prop as keyof typeof target];
  }
});
