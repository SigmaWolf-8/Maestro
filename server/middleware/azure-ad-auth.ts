import type { Request, Response, NextFunction } from "express";

const AZURE_AD_TENANT_ID = process.env.AZURE_AD_TENANT_ID;
const AZURE_AD_CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;
const AZURE_AD_CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET;
const AZURE_AD_REDIRECT_URI = process.env.AZURE_AD_REDIRECT_URI;

export interface AzureADConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authority: string;
  scopes: string[];
}

function getAzureConfig(): AzureADConfig | null {
  if (!AZURE_AD_TENANT_ID || !AZURE_AD_CLIENT_ID || !AZURE_AD_CLIENT_SECRET) {
    return null;
  }

  return {
    tenantId: AZURE_AD_TENANT_ID,
    clientId: AZURE_AD_CLIENT_ID,
    clientSecret: AZURE_AD_CLIENT_SECRET,
    redirectUri: AZURE_AD_REDIRECT_URI || "http://localhost:5000/api/auth/azure/callback",
    authority: `https://login.microsoftonline.com/${AZURE_AD_TENANT_ID}`,
    scopes: ["openid", "profile", "email", "User.Read"],
  };
}

export function isAzureADConfigured(): boolean {
  return getAzureConfig() !== null;
}

export function getAzureAuthUrl(): string | null {
  const config = getAzureConfig();
  if (!config) return null;

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    response_mode: "query",
    scope: config.scopes.join(" "),
    state: generateState(),
  });

  return `${config.authority}/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeAzureCode(code: string): Promise<{
  accessToken: string;
  idToken: string;
  email: string;
  name: string;
  oid: string;
  tenantId: string;
} | null> {
  const config = getAzureConfig();
  if (!config) return null;

  try {
    const tokenResponse = await fetch(`${config.authority}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
        scope: config.scopes.join(" "),
      }),
    });

    if (!tokenResponse.ok) {
      console.error("[AZURE_AD] Token exchange failed:", tokenResponse.status);
      return null;
    }

    const tokens = await tokenResponse.json();

    const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileResponse.ok) {
      console.error("[AZURE_AD] Profile fetch failed:", profileResponse.status);
      return null;
    }

    const profile = await profileResponse.json();

    return {
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      email: profile.mail || profile.userPrincipalName,
      name: profile.displayName,
      oid: profile.id,
      tenantId: AZURE_AD_TENANT_ID!,
    };
  } catch (err: any) {
    console.error("[AZURE_AD] Authentication error:", err.message);
    return null;
  }
}

export function azureADAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!isAzureADConfigured()) {
    return next();
  }

  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return next();
  }

  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    (req as any).azureUser = {
      oid: payload.oid,
      email: payload.preferred_username || payload.email,
      name: payload.name,
      tenantId: payload.tid,
      roles: payload.roles || [],
    };
  } catch {
    // Token parsing failed — continue without Azure user context
  }

  next();
}

function generateState(): string {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

export function getAuthStatus() {
  return {
    azureAD: {
      configured: isAzureADConfigured(),
      tenantId: AZURE_AD_TENANT_ID ? `${AZURE_AD_TENANT_ID.substring(0, 8)}...` : null,
    },
    replitOIDC: {
      configured: true,
      mode: "development",
    },
    activeProvider: isAzureADConfigured() ? "azure_ad" : "replit_oidc",
  };
}
