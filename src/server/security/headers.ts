const NONCE_PATTERN = /^[A-Za-z0-9+/_=-]+$/;

function assertNonce(nonce: string): void {
  if (!nonce || !NONCE_PATTERN.test(nonce)) {
    throw new Error("Content Security Policy nonce is invalid.");
  }
}

export function buildContentSecurityPolicy(
  nonce: string,
  development: boolean,
  secureTransport: boolean,
): string {
  assertNonce(nonce);

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob: https://i.ytimg.com https://*.googleusercontent.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebaseapp.com https://*.web.app",
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://accounts.google.com https://*.firebaseapp.com https://*.web.app",
    "worker-src 'self'",
    "manifest-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(!development && secureTransport ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function buildSecurityHeaders(
  nonce: string,
  development: boolean,
  secureTransport: boolean,
): readonly (readonly [string, string])[] {
  return [
    [
      "Content-Security-Policy",
      buildContentSecurityPolicy(nonce, development, secureTransport),
    ],
    ["Cross-Origin-Opener-Policy", "same-origin-allow-popups"],
    ["Cross-Origin-Resource-Policy", "same-origin"],
    ["Origin-Agent-Cluster", "?1"],
    [
      "Permissions-Policy",
      "autoplay=(), camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    ],
    ["Referrer-Policy", "strict-origin-when-cross-origin"],
    ["X-Content-Type-Options", "nosniff"],
    ["X-DNS-Prefetch-Control", "off"],
    ["X-Frame-Options", "DENY"],
    ["X-Permitted-Cross-Domain-Policies", "none"],
    ...(development || !secureTransport
      ? []
      : ([
          ["Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"],
        ] as const)),
  ];
}
