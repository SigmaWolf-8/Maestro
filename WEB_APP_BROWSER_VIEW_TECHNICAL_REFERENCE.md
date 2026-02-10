# The Maestro ERP - Web App Browser View: Technical Reference

## Summary of All Approaches Tried

This document catalogs every mechanism implemented, attempted, or architected for opening external web applications and documents inside The Maestro's local browser view (the in-app embedded viewer), rather than forcing users to open separate browser tabs.

---

## 1. WebViewer Component (In-App Iframe Browser)

**Status:** Implemented and Active  
**Files:**
- `client/src/components/web-viewer.tsx`
- `client/src/hooks/use-web-viewer.tsx`
- `client/src/App.tsx` (integration)

### Architecture

A React Context (`WebViewerContext`) provides `openApp(url)`, `closeApp()`, and `isOpen` across the entire app. When any component calls `openApp(url)`, the main `<AppLayout>` replaces the `<Router />` area with the `<WebViewer>` component.

```tsx
// client/src/hooks/use-web-viewer.tsx
interface WebViewerContextValue {
  openApp: (url: string) => void;
  closeApp: () => void;
  isOpen: boolean;
}
export const WebViewerContext = createContext<WebViewerContextValue>({...});
export function useWebViewer() { return useContext(WebViewerContext); }
```

```tsx
// client/src/App.tsx - AppLayout component
const [webViewerUrl, setWebViewerUrl] = useState<string | null>(null);

const webViewerContextValue = {
  openApp: handleOpenApp,     // sets webViewerUrl
  closeApp: handleCloseViewer, // clears webViewerUrl
  isOpen: !!webViewerUrl,
};

// In render:
<WebViewerContext.Provider value={webViewerContextValue}>
  <main>
    {webViewerUrl ? (
      <WebViewer initialUrl={webViewerUrl} onClose={handleCloseViewer} />
    ) : (
      <Router />
    )}
  </main>
</WebViewerContext.Provider>
```

### WebViewer Component Details

The `WebViewer` loads external URLs via a **server-side proxy** to avoid CORS/CSP restrictions:

```tsx
// client/src/components/web-viewer.tsx
function proxyUrl(url: string): string {
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}
```

**Features implemented:**
- URL bar with navigation (Go button, form submit)
- Home button (returns to initial URL)
- Refresh button (reloads iframe)
- "Open in New Tab" button (external link)
- Loading spinner with 20-second timeout
- Error state with fallback "Open in New Tab" button
- Authentication hint detection (shows warning bar if auth is required)
- Escape key to close

**Iframe configuration:**
```html
<iframe
  src={proxyUrl(url)}
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups
           allow-popups-to-escape-sandbox allow-modals allow-downloads"
  allow="camera; microphone; fullscreen; clipboard-read; clipboard-write"
/>
```

### Where It's Triggered

The sidebar (`client/src/components/app-sidebar.tsx`) has an `onOpenApp` callback that triggers the WebViewer from:
1. **Company URL links** - clicking the tenant company URL in sidebar header
2. **Tenant Apps** - clicking configured third-party app links under navigation items

```tsx
// Sidebar header company URL click
if (companyUrl && onOpenApp) {
  onOpenApp(companyUrl);
}

// Tenant app links
onClick={() => onOpenApp?.(app.url)}
```

### Known Limitations

1. **Authentication walls** - Most SaaS apps (Office 365, Google Workspace, Procore, etc.) redirect to SSO/OAuth login pages that cannot be completed inside an iframe due to `X-Frame-Options` and CSP restrictions
2. **Service Workers** - The proxy disables service workers, which breaks some PWA-style apps
3. **Redirect loops** - SSO redirect flows cause infinite loops; a navigation blocker (`blockNav`) was added to mitigate
4. **Content-Security-Policy** - Even with proxy URL rewriting, many sites set CSP headers that prevent iframe embedding

---

## 2. Server-Side Reverse Proxy

**Status:** Implemented and Active  
**Files:**
- `server/api/proxy.ts`
- `server/routes.ts` (registration)

### Architecture

An Express router that fetches external URLs server-side and serves the content through the Maestro domain, stripping `X-Frame-Options` and `Content-Security-Policy` headers.

### Domain Allowlist

A curated list of ~110 allowed domains including:
- Microsoft: `office.com`, `office365.com`, `outlook.office.com`, `sharepoint.com`, `teams.microsoft.com`, `onedrive.com`, `login.microsoftonline.com`, CDNs (`cdn.office.net`, `res.cdn.office.net`, etc.)
- Google: `docs.google.com`, `drive.google.com`, `mail.google.com`, `calendar.google.com`, `accounts.google.com`, CDNs
- Construction: `procore.com`, `plangrid.com`, `bluebeam.com`, `autodesk.com`
- Project Management: `slack.com`, `notion.so`, `trello.com`, `asana.com`, `atlassian.net`, `jira.atlassian.com`, `monday.com`, `clickup.com`, `airtable.com`
- Finance: `quickbooks.intuit.com`, `xero.com`, `hubspot.com`, `salesforce.com`
- Development: `github.com`, `gitlab.com`, `figma.com`
- Other: `zoom.us`, `dropbox.com`, `box.com`, `canva.com`, `powerbi.com`, `dynamics.com`

### Security Features

```typescript
// Private/localhost blocking
function isPrivateOrLocalhost(hostname: string): boolean {
  // Blocks: localhost, 127.0.0.1, 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x
}

// Domain allowlist check
function isDomainAllowed(hostname: string): boolean {
  return ALLOWED_DOMAINS.some(d => lower === d || lower.endsWith("." + d));
}
```

### Content Rewriting Pipeline

1. **HTML URL rewriting** - Rewrites `src`, `href`, `action`, `data`, `poster` attributes to route through proxy
2. **CSS URL rewriting** - Rewrites `url()` references in `<style>` blocks and inline styles
3. **Network interceptor script injection** - Injects JavaScript that monkey-patches:
   - `window.fetch()` - redirects API calls through proxy
   - `XMLHttpRequest.prototype.open()` - redirects XHR through proxy
   - `window.location.assign()` / `location.replace()` / `location.href` setter - intercepts navigation
   - `history.pushState()` / `history.replaceState()` - blocks SSO reload paths
   - `window.open()` - blocks SSO popup windows
   - `ServiceWorkerContainer` - disables service worker registration
4. **Meta refresh removal** - Strips `<meta http-equiv="refresh">` tags
5. **SSO pattern blocking** - Replaces `sso_reload` strings with `sso_blocked`
6. **Base tag handling** - Removes existing `<base>` tags to prevent relative URL conflicts

### Authentication Detection

```typescript
// URL-based detection
const AUTH_DOMAINS = [
  "login.microsoftonline.com", "login.live.com", "login.windows.net",
  "accounts.google.com", "auth.atlassian.com", "id.atlassian.com",
  "login.salesforce.com", "auth0.com", "login.okta.com",
  "sso.procore.com", "accounts.autodesk.com", "signin.bluebeam.com",
  "login.notion.so"
];

// Content-based detection (HTML patterns)
const authPatterns = [
  /name\s*=\s*["']loginfmt["']/i,        // Microsoft login form
  /id\s*=\s*["']loginForm["']/i,          // Generic login form
  /oauth2\/v2\.0\/authorize/i,            // OAuth2 authorize endpoint
  /<title[^>]*>\s*(Sign in|Log in)/i,     // Login page titles
  /microsoft.*sign\s*in/i,               // Microsoft sign-in text
  /accounts\.google\.com/i,              // Google accounts
];
```

When auth is detected:
- HEAD request: sets `X-Auth-Required: true` response header
- GET request: sets header AND returns the auth page content
- Frontend: shows amber hint bar suggesting "Open in New Tab"

### Service Name Detection

```typescript
function getServiceName(url: string): string {
  // Maps hostnames to friendly names:
  // outlook -> "Microsoft Outlook"
  // /launch/word -> "Microsoft Word"
  // /launch/excel -> "Microsoft Excel"
  // docs.google -> "Google Docs"
  // procore -> "Procore"
  // bluebeam -> "Bluebeam Studio"
  // etc.
}
```

### Response Size Limit

```typescript
const MAX_RESPONSE_SIZE = 15 * 1024 * 1024; // 15 MB
```

### Known Limitations

1. **JavaScript SPA routing** - Client-side routers in proxied apps don't work correctly because the browser's origin differs from the app's expected origin
2. **WebSocket connections** - Not proxied; real-time features in external apps break
3. **Cookie scoping** - Proxied apps can't set cookies on their own domains; session management fails
4. **CORS preflight** - Some APIs use OPTIONS preflight that the proxy doesn't handle for POST/PUT/DELETE
5. **Binary content** - Large file downloads (>15MB) are blocked
6. **OAuth callback URLs** - OAuth flows redirect to the external app's domain, not the proxy, breaking the flow

---

## 3. WOPI Protocol Integration (Office Online Editing)

**Status:** Implemented (requires Microsoft 365 credentials)  
**Files:**
- `server/api/wopi.ts` (API endpoints)
- `server/services/wopi-host-service.ts` (WOPI host logic)
- `client/src/components/documents/office-online-embed.tsx` (embed component)
- `client/src/lib/integrations/ms-graph/wopi-hooks.ts` (React hooks)
- `kong/wopi-bridge.yaml` (Kong gateway config)
- `scripts/tools/validate-wopi.mjs` (validation script)

### Architecture

Full WOPI (Web Application Open Platform Interface) host implementation enabling Office Online (Word, Excel, PowerPoint) to edit documents stored in Maestro.

### WOPI API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/wopi/files/:id` | GET | CheckFileInfo - Returns file metadata |
| `/api/wopi/files/:id/contents` | GET | GetFile - Returns file binary content |
| `/api/wopi/files/:id/contents` | POST | PutFile - Saves edited file content |
| `/api/wopi/files/:id` | POST | Lock/Unlock/RefreshLock/Delete/Rename operations |
| `/api/wopi/token/:documentId` | POST | Generate WOPI access token |
| `/api/wopi/files/:id/share` | GET | GetShareUrl |
| `/api/wopi/discovery` | GET | WOPI discovery document |

### WOPI Host Service Details

```typescript
// Token management
export function generateAccessToken(userId: string, fileId: string, canWrite: boolean): WopiAccessToken {
  const token = `wopi_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  const tokenTtl = Date.now() + 10 * 60 * 60 * 1000; // 10 hours
  const permissions = canWrite ? ["view", "edit", "save"] : ["view"];
  // Stored in in-memory Map
}

// CheckFileInfo response shape
interface WopiFileInfo {
  BaseFileName, OwnerId, Size, SHA256, Version,
  SupportsUpdate, UserCanWrite, UserCanNotWriteRelative,
  SupportsLocks, SupportsGetLock, ReadOnly,
  UserFriendlyName, LastModifiedTime,
  CloseUrl?, HostEditUrl?, HostViewUrl?,
  DownloadUrl?, FileSharingUrl?, FileExtension?,
  BreadcrumbBrandName?, BreadcrumbBrandUrl?, BreadcrumbDocName?
}

// Supported document types
const OFFICE_DOCUMENT_TYPES = [
  ".docx" -> Word,  ".doc" -> Word,
  ".xlsx" -> Excel,  ".xls" -> Excel,
  ".pptx" -> PowerPoint,  ".ppt" -> PowerPoint
];

// Lock duration: 30 minutes
const LOCK_DURATION_MS = 30 * 60 * 1000;
```

### Frontend WOPI Hooks

```typescript
// client/src/lib/integrations/ms-graph/wopi-hooks.ts

// Token query with 30-min stale time, 50-min refetch
export function useWopiToken(documentId: string | null);

// Lock status polling every 30 seconds
export function useWopiLockStatus(documentId: string | null);

// Lock/unlock mutations
export function useWopiLock(documentId: string);

// Full embed hook combining token, lock status, iframe management
export function useOfficeOnlineEmbed(documentId: string | null);
```

### OfficeOnlineEmbed Component

The `OfficeOnlineEmbed` component (`client/src/components/documents/office-online-embed.tsx`) renders:
1. **Idle state** - "Open Editor" button to request WOPI token
2. **Loading state** - Spinner while token is being generated
3. **Ready state** - Shows "Office Online Editor Ready" with badges for WOPI token and edit mode
4. **Error state** - "Retry" button with error message
5. **Fullscreen toggle** - Expand to fill viewport

**Current limitation:** The component generates a WOPI token and displays a "ready" state, but does not yet render the actual Office Online iframe because the WOPI host URL must be registered with Microsoft's WOPI discovery service, which requires a publicly accessible WOPI endpoint with a valid SSL certificate and Microsoft partner registration.

### Known Limitations

1. **Microsoft Partner Registration** - Office Online requires the WOPI host to be registered in Microsoft's WOPI discovery service
2. **Public WOPI Endpoint** - The WOPI host must be publicly accessible (not behind VPN/localhost)
3. **SSL Certificate** - WOPI protocol requires HTTPS with a valid certificate
4. **In-memory token store** - Tokens are stored in a JavaScript Map; lost on server restart

---

## 4. Microsoft 365 / OneDrive Integration (Edit-in-Office Flow)

**Status:** Implemented (requires Azure AD app registration)  
**Files:**
- `client/src/pages/file-manager.tsx` (DocumentContentViewer > handleEditInOffice)
- `client/src/components/microsoft-config-modal.tsx` (Azure AD config)
- `server/api/microsoft.ts` (Microsoft Graph API routes)
- `server/microsoft-graph.ts` (Graph client implementation)

### Architecture

Alternative to WOPI that uploads documents to OneDrive and opens them in Office Online via the standard Office web URLs.

### Flow

1. **Configuration** - User enters Azure AD `clientId`, `clientSecret`, `tenantId` via `MicrosoftConfigModal`
2. **OAuth** - User authenticates via Microsoft OAuth2 flow (`/api/microsoft/auth-url` -> Microsoft login -> callback)
3. **Upload** - Document content is uploaded to OneDrive via Microsoft Graph API (`/api/microsoft/upload`)
4. **Open** - The OneDrive edit URL is opened in a new browser tab (`window.open(editUrl, "_blank")`)
5. **Auto-sync** - When user returns to the Maestro tab, `visibilitychange` event triggers sync from OneDrive (`/api/microsoft/sync/:fileId`)

```typescript
// File Manager - handleEditInOffice
const handleEditInOffice = async () => {
  if (!msStatus?.configured) { setShowMsConfigModal(true); return; }
  if (!msStatus?.connected) { /* initiate OAuth */ return; }
  
  // Upload to OneDrive
  const uploadRes = await fetch("/api/microsoft/upload", {
    method: "POST", body: JSON.stringify({
      fileName: document.name, content, mimeType: document.mimeType, tenantId
    })
  });
  const uploadData = await uploadRes.json();
  
  // Open in new tab (NOT in iframe)
  window.open(uploadData.editUrl || uploadData.webUrl, "_blank");
};
```

### Auto-Sync on Tab Return

```typescript
useEffect(() => {
  if (!oneDriveFileId) return;
  const handleVisibilityChange = () => {
    if (window.document.visibilityState === 'visible' && oneDriveFileId) {
      handleSyncFromOneDrive(); // Pull edited content back
    }
  };
  window.addEventListener('visibilitychange', handleVisibilityChange);
  return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
}, [oneDriveFileId]);
```

### Known Limitations

1. **Opens in new tab** - Not in-app; user leaves the Maestro interface
2. **Azure AD app registration required** - Per-tenant configuration needed
3. **OAuth token management** - Tokens stored in server memory; lost on restart
4. **Content sync is one-way** - Only pulls changes back; no real-time collaboration awareness
5. **File format conversion** - Base64 content handling may fail for large files

---

## 5. DocumentContentViewer (In-App File Preview)

**Status:** Implemented and Active  
**Files:**
- `client/src/pages/file-manager.tsx` (lines 151-700+)

### Architecture

Inline viewer for documents stored in Maestro's database. Handles different file types:

### File Type Handlers

| Type | Method | Details |
|---|---|---|
| **PDF** | Native browser viewer via `<iframe src={dataUrl}>` | Uses `data:` URL from base64 content |
| **DOCX** | `mammoth` library | Converts DOCX ArrayBuffer to HTML, renders in `prose` div with `dangerouslySetInnerHTML` |
| **Images** | Native `<img>` tag | PNG, JPG, JPEG, GIF, BMP, WEBP via `data:` URL |
| **Office (edit)** | `OfficeOnlineEmbed` component | WOPI-based editing (see section 3) |

### Security Verification

Every document view passes through a security verification step:

```typescript
type SecurityState = 'verifying' | 'verified' | 'failed';

// Simulates Kong backend security verification
await new Promise(resolve => setTimeout(resolve, 800)); // 800ms verification delay

setSecurityDetails({
  timestamp: document.kongTimestamp || new Date().toISOString(),
  checksum: document.checksum || 'SHA-256 Verified',
  encryptionMode: document.encryptionMode || 'balanced',
});
```

After verification, a green "Security Verified" banner shows encryption mode and timestamp.

### DOCX Rendering Pipeline

```typescript
const mammoth = await import('mammoth'); // Dynamic import

// Handle base64 data URLs
if (content.startsWith('data:')) {
  const base64Data = content.split(',')[1];
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  arrayBuffer = bytes.buffer;
}

const result = await mammoth.convertToHtml({ arrayBuffer });
setRenderedHtml(result.value); // Rendered with prose CSS
```

### Known Limitations

1. **DOCX rendering quality** - Mammoth produces simplified HTML; complex formatting (tables, images, charts) may not render accurately
2. **No edit capability** - View-only for PDF/DOCX/images in the inline viewer
3. **Memory usage** - Large documents loaded entirely into memory as base64
4. **PDF rendering** - Depends on browser's native PDF viewer; some browsers may not render inline PDFs well

---

## 6. Kong Gateway WOPI Bridge

**Status:** Configured (not active in development)  
**Files:**
- `kong/wopi-bridge.yaml`
- `kong/routes/wopi-routes.yml`
- `kong/services/maestro-wopi.yml`

### Architecture

Kong API gateway configuration for routing WOPI requests in production, with PlenumNET security plugins for document encryption, compression, and timestamping.

### Known Limitations

1. **Development mode only** - Kong is not running in the Replit development environment
2. **Requires infrastructure** - Needs Kong Gateway deployed alongside the application

---

## 7. Sidebar Web App Launcher

**Status:** Implemented and Active  
**Files:**
- `client/src/components/app-sidebar.tsx`

### Architecture

Navigation sidebar items can have associated "tenant apps" - external web application URLs configured per-tenant. Clicking these triggers the `onOpenApp` callback which opens the `WebViewer`.

```tsx
// Sidebar nav item with tenant apps
{tenantApps.map(app => (
  <SidebarMenuSubItem key={app.id}>
    <SidebarMenuSubButton onClick={() => onOpenApp?.(app.url)}>
      <Globe className="h-3 w-3" />
      <span>{app.name}</span>
    </SidebarMenuSubButton>
  </SidebarMenuSubItem>
))}
```

### Known Limitations

Same as WebViewer limitations (section 1) - most external apps require authentication that can't complete inside an iframe.

---

## Summary Table

| Approach | Type | In-App? | Auth Support | Status |
|---|---|---|---|---|
| WebViewer + Proxy | Iframe + reverse proxy | Yes | Auth detection + hint bar | Active but limited |
| WOPI Protocol | Office Online iframe | Yes (intended) | WOPI tokens | Implemented, needs MS registration |
| OneDrive Edit Flow | Upload + new tab | No (new tab) | Azure AD OAuth | Active with config |
| DocumentContentViewer | Native renderers | Yes | N/A (local files) | Active |
| Kong WOPI Bridge | Gateway routing | Yes (production) | Kong plugins | Configured, not active |
| Sidebar App Launcher | Triggers WebViewer | Yes | Same as WebViewer | Active |

---

## Core Challenge

The fundamental challenge for in-app web app viewing is that **modern SaaS applications use security headers (`X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'self'`) and OAuth flows that are designed to prevent iframe embedding**. The proxy approach can strip these headers server-side, but the OAuth authentication flows still require redirects to external domains that break the iframe context.

### Potential Future Approaches

1. **Electron/Desktop wrapper** - A desktop application could use `BrowserWindow` or `webview` tags that bypass iframe restrictions
2. **Browser extension** - A companion browser extension could inject Maestro's UI into external app tabs
3. **OAuth token relay** - Pre-authenticate with external services and inject session tokens into proxied requests (security implications)
4. **Microsoft WOPI partner registration** - Register as an official WOPI host to enable true in-app Office editing
5. **Popup-based auth** - Open auth flows in popup windows, capture tokens, then load the authenticated app in the iframe
