// @ts-ignore
import { Client } from "@microsoft/microsoft-graph-client";

interface TokenInfo {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

// OAuth state store with expiration for CSRF protection
interface OAuthState {
  state: string;
  createdAt: number;
  userId?: string;
}
const oauthStateStore = new Map<string, OAuthState>();

// Token store keyed by authenticated user ID
const tokenStore = new Map<string, TokenInfo>();

// Generate and store OAuth state for CSRF protection
export function generateOAuthState(userId?: string): string {
  const state = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  oauthStateStore.set(state, {
    state,
    createdAt: Date.now(),
    userId,
  });
  
  // Clean up old states (older than 10 minutes)
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [key, value] of oauthStateStore.entries()) {
    if (value.createdAt < tenMinutesAgo) {
      oauthStateStore.delete(key);
    }
  }
  
  return state;
}

// Validate OAuth state and return associated user ID
export function validateOAuthState(state: string): { valid: boolean; userId?: string } {
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
  
  return { valid: true, userId: stored.userId };
}

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID || "common";
const REDIRECT_URI = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/microsoft/callback`
  : "http://localhost:5000/api/microsoft/callback";

export function isConfigured(): boolean {
  return !!(MICROSOFT_CLIENT_ID && MICROSOFT_CLIENT_SECRET);
}

export function getAuthUrl(state: string): string {
  if (!MICROSOFT_CLIENT_ID) {
    throw new Error("Microsoft Client ID not configured");
  }
  
  const scopes = [
    "openid",
    "profile",
    "offline_access",
    "Files.ReadWrite",
    "Files.ReadWrite.All"
  ].join(" ");
  
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    response_mode: "query",
    scope: scopes,
    state: state
  });
  
  return `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<TokenInfo> {
  if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
    throw new Error("Microsoft credentials not configured");
  }
  
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    client_secret: MICROSOFT_CLIENT_SECRET,
    code: code,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code"
  });
  
  const response = await fetch(
    `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
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

export async function refreshAccessToken(refreshToken: string): Promise<TokenInfo> {
  if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
    throw new Error("Microsoft credentials not configured");
  }
  
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    client_secret: MICROSOFT_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });
  
  const response = await fetch(
    `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
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

export async function getValidToken(userId: string): Promise<string | null> {
  const token = tokenStore.get(userId);
  if (!token) return null;
  
  if (Date.now() >= token.expiresAt - 60000) {
    if (token.refreshToken) {
      try {
        const newToken = await refreshAccessToken(token.refreshToken);
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
  
  const editUrl = file.webUrl.replace(/\?.*$/, "") + "?action=edit";
  
  return {
    webUrl: file.webUrl,
    editUrl: editUrl
  };
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
