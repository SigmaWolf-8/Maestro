// @ts-ignore
import { Client } from "@microsoft/microsoft-graph-client";

interface TokenInfo {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

interface MicrosoftCredentials {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

// OAuth state store with expiration for CSRF protection
interface OAuthState {
  state: string;
  createdAt: number;
  userId?: string;
  tenantId?: string;
  credentials?: MicrosoftCredentials;
}
const oauthStateStore = new Map<string, OAuthState>();

// Token store keyed by authenticated user ID
const tokenStore = new Map<string, TokenInfo>();

// Credentials store keyed by tenant ID (for use after OAuth callback)
const credentialsStore = new Map<string, MicrosoftCredentials>();

// Generate and store OAuth state for CSRF protection
export function generateOAuthState(userId?: string, tenantId?: string, credentials?: MicrosoftCredentials): string {
  const state = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  oauthStateStore.set(state, {
    state,
    createdAt: Date.now(),
    userId,
    tenantId,
    credentials,
  });
  
  // Store credentials for later use
  if (tenantId && credentials) {
    credentialsStore.set(tenantId, credentials);
  }
  
  // Clean up old states (older than 10 minutes)
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [key, value] of oauthStateStore.entries()) {
    if (value.createdAt < tenMinutesAgo) {
      oauthStateStore.delete(key);
    }
  }
  
  return state;
}

// Validate OAuth state and return associated user ID and credentials
export function validateOAuthState(state: string): { valid: boolean; userId?: string; tenantId?: string; credentials?: MicrosoftCredentials } {
  const stored = oauthStateStore.get(state);
  if (!stored) {
    return { valid: false };
  }
  
  // State should not be older than 10 minutes
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  if (stored.createdAt < tenMinutesAgo) {
    oauthStateStore.delete(state);
    return { valid: false };
  }
  
  // Remove used state (one-time use)
  oauthStateStore.delete(state);
  
  return { valid: true, userId: stored.userId, tenantId: stored.tenantId, credentials: stored.credentials };
}

// Get stored credentials for a tenant
export function getStoredCredentials(tenantId: string): MicrosoftCredentials | undefined {
  return credentialsStore.get(tenantId);
}

// Store credentials for a tenant
export function setStoredCredentials(tenantId: string, credentials: MicrosoftCredentials): void {
  credentialsStore.set(tenantId, credentials);
}

const REDIRECT_URI = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/microsoft/callback`
  : "http://localhost:5000/api/microsoft/callback";

// Legacy: Check if configured via environment variables
export function isConfigured(): boolean {
  return !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}

// Check if tenant has credentials configured
export function isTenantConfigured(tenantConfig?: { clientId?: string; clientSecret?: string }): boolean {
  if (tenantConfig?.clientId && tenantConfig?.clientSecret) {
    return true;
  }
  return isConfigured();
}

// Get credentials - prefer tenant config, fall back to env vars
export function getCredentials(tenantConfig?: MicrosoftCredentials): MicrosoftCredentials | null {
  if (tenantConfig?.clientId && tenantConfig?.clientSecret) {
    return {
      clientId: tenantConfig.clientId,
      clientSecret: tenantConfig.clientSecret,
      tenantId: tenantConfig.tenantId || "common",
    };
  }
  
  // Fallback to environment variables
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (clientId && clientSecret) {
    return {
      clientId,
      clientSecret,
      tenantId: process.env.MICROSOFT_TENANT_ID || "common",
    };
  }
  
  return null;
}

export function getAuthUrl(state: string, credentials: MicrosoftCredentials): string {
  const scopes = [
    "openid",
    "profile",
    "offline_access",
    "Files.ReadWrite",
    "Files.ReadWrite.All"
  ].join(" ");
  
  const params = new URLSearchParams({
    client_id: credentials.clientId,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    response_mode: "query",
    scope: scopes,
    state: state
  });
  
  return `https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string, credentials: MicrosoftCredentials): Promise<TokenInfo> {
  const params = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    code: code,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code"
  });
  
  const response = await fetch(
    `https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }
  
  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in * 1000)
  };
}

export async function refreshAccessToken(refreshToken: string, credentials: MicrosoftCredentials): Promise<TokenInfo> {
  const params = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });
  
  const response = await fetch(
    `https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }
  
  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + (data.expires_in * 1000)
  };
}

export function storeToken(userId: string, token: TokenInfo): void {
  tokenStore.set(userId, token);
}

export function getToken(userId: string): TokenInfo | undefined {
  return tokenStore.get(userId);
}

export async function getValidToken(userId: string, credentials?: MicrosoftCredentials): Promise<string | null> {
  const token = tokenStore.get(userId);
  if (!token) return null;
  
  if (Date.now() >= token.expiresAt - 60000) {
    if (token.refreshToken && credentials) {
      try {
        const newToken = await refreshAccessToken(token.refreshToken, credentials);
        storeToken(userId, newToken);
        return newToken.accessToken;
      } catch {
        tokenStore.delete(userId);
        return null;
      }
    }
    tokenStore.delete(userId);
    return null;
  }
  
  return token.accessToken;
}

function getGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done: (error: any, token: string) => void) => {
      done(null, accessToken);
    }
  });
}

export async function uploadToOneDrive(
  accessToken: string,
  fileName: string,
  content: Buffer | string,
  mimeType: string
): Promise<{ id: string; webUrl: string; name: string }> {
  const client = getGraphClient(accessToken);
  
  const folderPath = "TheMaestro";
  
  try {
    await client.api("/me/drive/root/children").post({
      name: folderPath,
      folder: {},
      "@microsoft.graph.conflictBehavior": "fail"
    });
  } catch {
  }
  
  const uploadPath = `/me/drive/root:/${folderPath}/${fileName}:/content`;
  
  const result = await client.api(uploadPath).put(content);
  
  return {
    id: result.id,
    webUrl: result.webUrl,
    name: result.name
  };
}

export async function getOneDriveFileUrl(
  accessToken: string,
  fileId: string
): Promise<{ webUrl: string; editUrl: string }> {
  const client = getGraphClient(accessToken);
  
  const file = await client.api(`/me/drive/items/${fileId}`).get();
  
  // Try to create a proper edit link using Microsoft Graph createLink API
  try {
    const linkResult = await client
      .api(`/me/drive/items/${fileId}/createLink`)
      .post({
        type: "edit",
        scope: "organization"
      });
    
    return {
      webUrl: file.webUrl,
      editUrl: linkResult.link?.webUrl || file.webUrl
    };
  } catch {
    // Fallback: try with anonymous scope or use webUrl directly
    try {
      const linkResult = await client
        .api(`/me/drive/items/${fileId}/createLink`)
        .post({
          type: "edit",
          scope: "anonymous"
        });
      
      return {
        webUrl: file.webUrl,
        editUrl: linkResult.link?.webUrl || file.webUrl
      };
    } catch {
      // Final fallback: just use webUrl which should open in Office Online
      return {
        webUrl: file.webUrl,
        editUrl: file.webUrl
      };
    }
  }
}

export async function getFilePreviewUrl(
  accessToken: string,
  fileId: string
): Promise<string> {
  const client = getGraphClient(accessToken);
  
  try {
    const preview = await client
      .api(`/me/drive/items/${fileId}/preview`)
      .post({});
    
    return preview.getUrl;
  } catch {
    const file = await client.api(`/me/drive/items/${fileId}`).get();
    return file.webUrl + "?action=view";
  }
}

export async function listOneDriveFiles(
  accessToken: string,
  folderPath: string = "TheMaestro"
): Promise<Array<{ id: string; name: string; webUrl: string; size: number; lastModified: string }>> {
  const client = getGraphClient(accessToken);
  
  try {
    const result = await client
      .api(`/me/drive/root:/${folderPath}:/children`)
      .select("id,name,webUrl,size,lastModifiedDateTime")
      .get();
    
    return result.value.map((item: any) => ({
      id: item.id,
      name: item.name,
      webUrl: item.webUrl,
      size: item.size,
      lastModified: item.lastModifiedDateTime
    }));
  } catch {
    return [];
  }
}
