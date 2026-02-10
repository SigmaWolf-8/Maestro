import { Router } from "express";
import type { Request, Response } from "express";

const ALLOWED_DOMAINS = [
  "office.com",
  "office365.com",
  "outlook.office.com",
  "outlook.office365.com",
  "outlook.live.com",
  "sharepoint.com",
  "microsoft.com",
  "microsoftonline.com",
  "live.com",
  "onedrive.com",
  "onenote.com",
  "teams.microsoft.com",
  "google.com",
  "docs.google.com",
  "drive.google.com",
  "mail.google.com",
  "calendar.google.com",
  "slack.com",
  "notion.so",
  "notion.site",
  "trello.com",
  "asana.com",
  "atlassian.net",
  "jira.atlassian.com",
  "procore.com",
  "plangrid.com",
  "bluebeam.com",
  "autodesk.com",
  "github.com",
  "gitlab.com",
  "figma.com",
  "canva.com",
  "zoom.us",
  "dropbox.com",
  "box.com",
  "airtable.com",
  "monday.com",
  "clickup.com",
  "hubspot.com",
  "salesforce.com",
  "quickbooks.intuit.com",
  "xero.com",
  "powerbi.com",
  "dynamics.com",
  "tasks.office.com",
  "project.microsoft.com",
  "sheets.google.com",
  "app.slack.com",
  "app.asana.com",
  "app.procore.com",
  "app.plangrid.com",
  "studio.bluebeam.com",
  "web.autocad.com",
  "app.powerbi.com",
  "home.dynamics.com",
  "cdn.office.net",
  "res.cdn.office.net",
  "aadcdn.msftauth.net",
  "aadcdn.msauth.net",
  "logincdn.msftauth.net",
  "login.microsoftonline.com",
  "login.live.com",
  "login.windows.net",
  "accounts.google.com",
  "apis.google.com",
  "www.gstatic.com",
  "fonts.gstatic.com",
  "fonts.googleapis.com",
  "ssl.gstatic.com",
  "lh3.googleusercontent.com",
  "googleusercontent.com",
  "owa.office.com",
  "substrate.office.com",
  "outlook.office365.com",
  "res-1.cdn.office.net",
  "c.s-microsoft.com",
  "r.office.microsoft.com",
  "static2.sharepointonline.com",
  "spoprod-a.akamaihd.net",
  "srtcdn.azureedge.net",
  "statics.teams.cdn.office.net",
  "officeapps.live.com",
  "word-edit.officeapps.live.com",
  "excel.officeapps.live.com",
  "powerpoint.officeapps.live.com",
  "onenote.officeapps.live.com",
  "apc.delve.office.com",
  "shellprod.msocdn.com",
  "shell.cdn.office.net",
  "p.sfx.ms",
  "r1.res.office365.com",
  "c1.microsoft.com",
  "ajax.aspnetcdn.com",
  "self.events.data.microsoft.com",
  "browser.events.data.microsoft.com",
  "nps.onyx.azure.net",
  "onecdn.static.microsoft",
  "res.public.onecdn.static.microsoft",
  "static.microsoft",
  "owamail.cdn.office.net",
  "owa.cdn.office.net",
  "aadcdn.msftauth.net",
  "aadcdn.msauth.net",
  "logincdn.msftauth.net",
  "cdn.jsdelivr.net",
  "unpkg.com",
  "cdnjs.cloudflare.com",
];

function isDomainAllowed(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return ALLOWED_DOMAINS.some(
    (d) => lower === d || lower.endsWith("." + d)
  );
}

function isPrivateOrLocalhost(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.endsWith(".local")
  ) {
    return true;
  }
  const parts = hostname.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const first = parseInt(parts[0]);
    const second = parseInt(parts[1]);
    if (first === 10) return true;
    if (first === 172 && second >= 16 && second <= 31) return true;
    if (first === 192 && second === 168) return true;
    if (first === 169 && second === 254) return true;
  }
  return false;
}

const MAX_RESPONSE_SIZE = 15 * 1024 * 1024;

function resolveUrl(relative: string, baseOrigin: string, basePath: string): string {
  try {
    if (relative.startsWith("//")) {
      return "https:" + relative;
    }
    if (relative.startsWith("http://") || relative.startsWith("https://")) {
      return relative;
    }
    if (relative.startsWith("/")) {
      return baseOrigin + relative;
    }
    const dir = basePath.substring(0, basePath.lastIndexOf("/") + 1);
    return baseOrigin + dir + relative;
  } catch {
    return relative;
  }
}

function proxyWrapUrl(absoluteUrl: string): string {
  return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
}

function shouldSkipUrl(url: string): boolean {
  if (!url) return true;
  const t = url.trim();
  return t.startsWith("data:") || t.startsWith("blob:") || t.startsWith("javascript:") || t.startsWith("#") || t.startsWith("about:") || t.startsWith("mailto:") || t.startsWith("tel:");
}

function tryRewriteUrl(url: string, baseOrigin: string, basePath: string): string | null {
  if (shouldSkipUrl(url)) return null;
  const absUrl = resolveUrl(url.trim(), baseOrigin, basePath);
  try {
    const parsed = new URL(absUrl);
    if (isDomainAllowed(parsed.hostname)) {
      return proxyWrapUrl(absUrl);
    }
  } catch {}
  return null;
}

function rewriteHtmlUrls(html: string, baseOrigin: string, basePath: string): string {
  const attrPattern = /(\b(?:src|href|action|data|poster)\s*=\s*)(?:(")((?:[^"\\]|\\.)*)"|('(?:[^'\\]|\\.)*')|([^\s>"']+))/gi;

  html = html.replace(attrPattern, (match, prefix, dq, dqVal, sqFull, unquoted) => {
    let url: string;
    let quote: string;
    if (dq !== undefined && dqVal !== undefined) {
      url = dqVal;
      quote = '"';
    } else if (sqFull !== undefined) {
      url = sqFull.slice(1, -1);
      quote = "'";
    } else if (unquoted !== undefined) {
      url = unquoted;
      quote = '"';
    } else {
      return match;
    }

    const rewritten = tryRewriteUrl(url, baseOrigin, basePath);
    if (rewritten) {
      return `${prefix}${quote}${rewritten}${quote}`;
    }
    if (dq !== undefined) return match;
    if (sqFull !== undefined) return match;
    return `${prefix}"${url}"`;
  });

  html = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_match, cssContent) => {
    const rewrittenCss = rewriteCssUrls(cssContent, baseOrigin, basePath);
    return `<style>${rewrittenCss}</style>`;
  });

  html = html.replace(/\bstyle\s*=\s*"([^"]*)"/gi, (_match, styleContent) => {
    const rewritten = rewriteCssUrls(styleContent, baseOrigin, basePath);
    return `style="${rewritten}"`;
  });

  return html;
}

function rewriteCssUrls(css: string, baseOrigin: string, basePath: string): string {
  return css.replace(
    /url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi,
    (_match, quote, url) => {
      if (!url || url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("#")) {
        return `url(${quote}${url}${quote})`;
      }
      const absUrl = resolveUrl(url, baseOrigin, basePath);
      try {
        const parsed = new URL(absUrl);
        if (isDomainAllowed(parsed.hostname)) {
          return `url(${quote}${proxyWrapUrl(absUrl)}${quote})`;
        }
      } catch {}
      return `url(${quote}${url}${quote})`;
    }
  );
}

function buildNetworkInterceptorScript(baseOrigin: string): string {
  return `
<script data-maestro-proxy="intercept">
(function() {
  var PROXY_BASE = '/api/proxy?url=';
  var PAGE_ORIGIN = ${JSON.stringify(baseOrigin)};

  function toAbsolute(url) {
    if (!url) return url;
    url = String(url);
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('javascript:') || url.startsWith('about:')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return PAGE_ORIGIN + url;
    return PAGE_ORIGIN + '/' + url;
  }

  function shouldProxy(url) {
    if (!url) return false;
    url = String(url);
    if (url.startsWith(PROXY_BASE) || url.startsWith('/api/proxy')) return false;
    if (url.startsWith('/') && !url.startsWith('//')) return true;
    try {
      var u = new URL(url);
      if (u.origin === window.location.origin) return false;
      return true;
    } catch(e) { return false; }
  }

  function proxyUrl(url) {
    var abs = toAbsolute(url);
    return PROXY_BASE + encodeURIComponent(abs);
  }

  var _origFetch = window.fetch;
  window.fetch = function(input, init) {
    var url = (input instanceof Request) ? input.url : String(input);
    if (shouldProxy(url)) {
      var proxied = proxyUrl(url);
      if (input instanceof Request) {
        var newReq = new Request(proxied, {
          method: input.method,
          headers: input.headers,
          body: input.body,
          mode: 'cors',
          credentials: 'omit',
          redirect: input.redirect
        });
        return _origFetch.call(window, newReq, init);
      }
      return _origFetch.call(window, proxied, init);
    }
    return _origFetch.call(window, input, init);
  };

  var _origXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (shouldProxy(url)) {
      arguments[1] = proxyUrl(url);
    }
    return _origXHROpen.apply(this, arguments);
  };

  var _maestroNavCount = 0;
  function blockNav(target) {
    if (String(target).indexOf('sso_reload') !== -1) return true;
    _maestroNavCount++;
    return _maestroNavCount > 3;
  }

  var _origAssign = window.location.assign;
  if (_origAssign) {
    window.location.assign = function(url) {
      if (blockNav(url)) return;
      if (shouldProxy(url)) { _origAssign.call(window.location, proxyUrl(url)); return; }
      _origAssign.call(window.location, url);
    };
  }
  var _origReplace = window.location.replace;
  if (_origReplace) {
    window.location.replace = function(url) {
      if (blockNav(url)) return;
      if (shouldProxy(url)) { _origReplace.call(window.location, proxyUrl(url)); return; }
      _origReplace.call(window.location, url);
    };
  }

  try {
    var _hrefDesc = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
    if (_hrefDesc && _hrefDesc.set) {
      var _origSet = _hrefDesc.set;
      Object.defineProperty(Location.prototype, 'href', {
        get: _hrefDesc.get,
        set: function(val) {
          if (blockNav(val)) return;
          if (shouldProxy(val)) { _origSet.call(this, proxyUrl(val)); return; }
          _origSet.call(this, val);
        },
        configurable: true, enumerable: true
      });
    }
  } catch(e) {}

  var _reloadCount = 0;
  var _origReload = window.location.reload;
  window.location.reload = function() {
    _reloadCount++;
    if (_reloadCount > 1) return;
    if (_origReload) _origReload.call(window.location);
  };

  try {
    var _origPush = history.pushState;
    var _origRepState = history.replaceState;
    history.pushState = function() {
      var url = arguments[2];
      if (url && String(url).indexOf('sso_reload') !== -1) return;
      return _origPush.apply(history, arguments);
    };
    history.replaceState = function() {
      var url = arguments[2];
      if (url && String(url).indexOf('sso_reload') !== -1) return;
      return _origRepState.apply(history, arguments);
    };
  } catch(e) {}

  var _origOpen = window.open;
  window.open = function(url) {
    if (url && String(url).indexOf('sso_reload') !== -1) return null;
    return _origOpen.apply(window, arguments);
  };

  if (typeof ServiceWorkerContainer !== 'undefined' && navigator.serviceWorker) {
    try {
      Object.defineProperty(navigator, 'serviceWorker', {
        get: function() { return { register: function() { return Promise.reject('disabled'); }, ready: Promise.reject('disabled') }; }
      });
    } catch(e) {}
  }
})();
</script>`;
}

function sanitizeHtmlForEmbedding(html: string, finalUrl: string): string {
  const parsed = new URL(finalUrl);
  const baseOrigin = parsed.origin;
  const basePath = parsed.pathname;

  html = html.replace(/<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '');
  html = html.replace(/sso_reload/gi, 'sso_blocked');

  const existingBase = html.match(/<base\s[^>]*href\s*=\s*["']([^"']*)["'][^>]*>/i);
  if (existingBase) {
    html = html.replace(/<base\s[^>]*>/gi, '');
  }

  html = rewriteHtmlUrls(html, baseOrigin, basePath);

  const interceptScript = buildNetworkInterceptorScript(baseOrigin);
  if (html.includes("<head")) {
    html = html.replace(/<head([^>]*)>/i, `<head$1>${interceptScript}`);
  } else {
    html = interceptScript + html;
  }

  return html;
}

const AUTH_DOMAINS = [
  "login.microsoftonline.com",
  "login.live.com",
  "login.windows.net",
  "accounts.google.com",
  "auth.atlassian.com",
  "id.atlassian.com",
  "login.salesforce.com",
  "auth0.com",
  "login.okta.com",
  "sso.procore.com",
  "accounts.autodesk.com",
  "signin.bluebeam.com",
  "login.notion.so",
];

function isAuthRedirect(finalUrl: string, originalUrl: string): boolean {
  try {
    const final = new URL(finalUrl);
    const original = new URL(originalUrl);
    const finalHost = final.hostname.toLowerCase();
    const originalHost = original.hostname.toLowerCase();

    if (AUTH_DOMAINS.some(d => finalHost === d || finalHost.endsWith("." + d))) return true;

    if (finalHost !== originalHost) {
      if (finalHost.includes("login") || finalHost.includes("signin") || finalHost.includes("auth") || finalHost.includes("sso")) return true;
    }

    const finalPath = final.pathname + final.search;
    if (/\/oauth2?\//i.test(finalPath) || /\/authorize/i.test(finalPath) || /\/saml/i.test(finalPath)) {
      if (finalHost !== originalHost) return true;
    }

    return false;
  } catch {
    return false;
  }
}

function detectAuthPage(html: string, finalUrl: string): boolean {
  try {
    const host = new URL(finalUrl).hostname.toLowerCase();
    if (AUTH_DOMAINS.some(d => host === d || host.endsWith("." + d))) return true;
  } catch {}

  const authPatterns = [
    /name\s*=\s*["']loginfmt["']/i,
    /id\s*=\s*["']loginForm["']/i,
    /action\s*=\s*["'][^"']*\/login/i,
    /oauth2\/v2\.0\/authorize/i,
    /<title[^>]*>\s*(Sign in|Log in|Login|Authenticate)/i,
    /id\s*=\s*["']credentials["']/i,
    /microsoft.*sign\s*in/i,
    /accounts\.google\.com/i,
  ];

  return authPatterns.some(p => p.test(html));
}

function getServiceName(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("outlook")) return "Microsoft Outlook";
    if (host.includes("office.com")) {
      if (url.includes("/launch/word")) return "Microsoft Word";
      if (url.includes("/launch/excel")) return "Microsoft Excel";
      if (url.includes("/launch/powerpoint")) return "Microsoft PowerPoint";
      if (url.includes("/launch/sharepoint")) return "Microsoft SharePoint";
      if (url.includes("/launch/onenote")) return "Microsoft OneNote";
      return "Microsoft Office";
    }
    if (host.includes("teams.microsoft")) return "Microsoft Teams";
    if (host.includes("onedrive")) return "Microsoft OneDrive";
    if (host.includes("sharepoint")) return "Microsoft SharePoint";
    if (host.includes("google.com")) {
      if (host.includes("docs")) return "Google Docs";
      if (host.includes("sheets")) return "Google Sheets";
      if (host.includes("drive")) return "Google Drive";
      if (host.includes("mail")) return "Gmail";
      if (host.includes("calendar")) return "Google Calendar";
      return "Google Workspace";
    }
    if (host.includes("slack")) return "Slack";
    if (host.includes("notion")) return "Notion";
    if (host.includes("procore")) return "Procore";
    if (host.includes("bluebeam")) return "Bluebeam Studio";
    if (host.includes("autodesk") || host.includes("autocad")) return "Autodesk";
    if (host.includes("powerbi")) return "Power BI";
    if (host.includes("dynamics")) return "Dynamics 365";
    return host;
  } catch {
    return "This application";
  }
}

export function createProxyRouter(): Router {
  const router = Router();

  router.head("/api/proxy", async (req: Request, res: Response) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).end();

    let parsedUrl: URL;
    try { parsedUrl = new URL(targetUrl); } catch { return res.status(400).end(); }

    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") return res.status(400).end();
    if (isPrivateOrLocalhost(parsedUrl.hostname)) return res.status(403).end();
    if (!isDomainAllowed(parsedUrl.hostname)) return res.status(403).end();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      let response = await fetch(targetUrl, {
        method: "HEAD",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
      });

      if (response.status === 405) {
        response = await fetch(targetUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          redirect: "follow",
        });
      }

      clearTimeout(timeout);

      const finalUrl = response.url || targetUrl;
      const authDetected = isAuthRedirect(finalUrl, targetUrl) || response.status === 401 || response.status === 403;

      if (!authDetected && response.headers.get("content-type")?.includes("text/html")) {
        try {
          const html = await response.text();
          if (detectAuthPage(html, finalUrl)) {
            res.setHeader("X-Auth-Required", "true");
            return res.status(200).end();
          }
        } catch {}
      }

      if (authDetected) {
        res.setHeader("X-Auth-Required", "true");
      }
      res.status(200).end();
    } catch {
      res.status(200).end();
    }
  });

  router.get("/api/proxy", async (req: Request, res: Response) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return res.status(400).json({ error: "Invalid URL" });
    }

    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      return res.status(400).json({ error: "Only HTTP/HTTPS URLs are allowed" });
    }

    if (isPrivateOrLocalhost(parsedUrl.hostname)) {
      return res.status(403).json({ error: "Access to internal addresses is not allowed" });
    }

    if (!isDomainAllowed(parsedUrl.hostname)) {
      return res.status(403).json({ error: "Domain not in allowlist" });
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": req.headers.accept || "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        redirect: "follow",
      });

      clearTimeout(timeout);

      const finalUrl = response.url || targetUrl;
      const contentType = response.headers.get("content-type") || "application/octet-stream";

      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Access-Control-Allow-Origin", "*");

      const authRedirected = isAuthRedirect(finalUrl, targetUrl);
      if (authRedirected || response.status === 401 || response.status === 403) {
        res.setHeader("X-Auth-Required", "true");
      }

      if (contentType.includes("text/html")) {
        let html = await response.text();
        if (html.length > MAX_RESPONSE_SIZE) {
          return res.status(413).json({ error: "Response too large" });
        }

        if (!authRedirected && detectAuthPage(html, finalUrl)) {
          res.setHeader("X-Auth-Required", "true");
        }

        html = sanitizeHtmlForEmbedding(html, finalUrl);

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(html);
      } else if (contentType.includes("text/css")) {
        let css = await response.text();
        const cssUrl = new URL(finalUrl);
        css = rewriteCssUrls(css, cssUrl.origin, cssUrl.pathname);
        res.setHeader("Content-Type", contentType);
        res.send(css);
      } else if (contentType.includes("javascript") || contentType.includes("application/json")) {
        const text = await response.text();
        res.setHeader("Content-Type", contentType);
        res.send(text);
      } else {
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > MAX_RESPONSE_SIZE) {
          return res.status(413).json({ error: "Response too large" });
        }
        res.setHeader("Content-Type", contentType);

        const cacheControl = response.headers.get("cache-control");
        if (cacheControl) {
          res.setHeader("Cache-Control", cacheControl);
        } else if (contentType.includes("image/") || contentType.includes("font/") || contentType.includes("application/font")) {
          res.setHeader("Cache-Control", "public, max-age=86400");
        }

        res.send(buffer);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        return res.status(504).json({ error: "Request timed out" });
      }
      console.error("Proxy error:", err.message);
      res.status(502).json({ error: "Failed to fetch URL", details: err.message });
    }
  });

  return router;
}
