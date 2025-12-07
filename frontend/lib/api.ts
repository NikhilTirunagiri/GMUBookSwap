/**
 * API helper functions for making requests to the FastAPI backend
 * Handles authentication token management via localStorage
 */
import { getApiUrl } from "./config";

// Token management
const TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  setAccessToken(accessToken);
  setRefreshToken(refreshToken);
}

/**
 * Make an authenticated API request
 * Automatically includes the JWT token from localStorage
 */
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Add authorization header if user is logged in
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = getApiUrl(endpoint);

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Convenience method for GET requests
 */
export async function apiGet(endpoint: string): Promise<Response> {
  return authenticatedFetch(endpoint, { method: "GET" });
}

/**
 * Convenience method for POST requests
 */
export async function apiPost(endpoint: string, body: any): Promise<Response> {
  return authenticatedFetch(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Convenience method for PUT requests
 */
export async function apiPut(endpoint: string, body: any): Promise<Response> {
  return authenticatedFetch(endpoint, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/**
 * Convenience method for DELETE requests
 */
export async function apiDelete(endpoint: string): Promise<Response> {
  return authenticatedFetch(endpoint, { method: "DELETE" });
}

/**
 * Handle API errors uniformly
 */
export async function handleApiError(response: Response): Promise<never> {
  let errorMessage = `Request failed with status ${response.status}`;

  try {
    const errorData = await response.json();
    errorMessage = errorData.detail || errorData.message || errorMessage;
  } catch {
    // If JSON parsing fails, use the default message
  }

  throw new Error(errorMessage);
}

/**
 * Auth API helpers
 */
export interface SignupData {
  email: string;
  password: string;
  full_name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user_id: string;
  email: string;
  full_name?: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface UserData {
  user_id: string;
  email: string;
  full_name?: string;
  email_confirmed: boolean;
  created_at: string;
}

export async function signup(data: SignupData): Promise<{ message: string }> {
  const response = await fetch(getApiUrl("/auth/signup"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await fetch(getApiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const authData: AuthResponse = await response.json();

  // Store tokens
  setTokens(authData.access_token, authData.refresh_token);

  return authData;
}

export async function logout(): Promise<void> {
  try {
    // Call backend logout endpoint
    await apiPost("/auth/logout", {});
  } catch (error) {
    // Continue with logout even if backend call fails
    console.error("Logout error:", error);
  } finally {
    // Always clear local tokens
    clearTokens();
  }
}

export async function getCurrentUser(): Promise<UserData> {
  const response = await apiGet("/auth/me");

  if (!response.ok) {
    await handleApiError(response);
  }

  return response.json();
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await fetch(getApiUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    clearTokens();
    await handleApiError(response);
  }

  const data = await response.json();
  setTokens(data.access_token, data.refresh_token);

  return data.access_token;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
