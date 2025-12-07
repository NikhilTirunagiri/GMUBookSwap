// Environment configuration with validation
// This file validates all required environment variables at startup

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please add ${key} to your .env.local file.`
    );
  }

  return value;
}

// Validate required environment variables
export const config = {
  api: {
    url: getEnvVar('NEXT_PUBLIC_API_URL'),
  },
} as const;

// Helper to get API endpoint URLs
export const getApiUrl = (path: string) => {
  const baseUrl = config.api.url.replace(/\/$/, ''); // Remove trailing slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};
