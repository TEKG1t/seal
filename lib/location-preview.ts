export function getLocationPreviewUri(
  latitude: number,
  longitude: number,
  zoom = 15,
) {
  const normalizedZoom = Math.max(1, Math.min(19, Math.floor(zoom)));
  const gridSize = Math.max(26, 84 - normalizedZoom * 3);
  const roadShift =
    (Math.abs(latitude * 1000) + Math.abs(longitude * 1000)) % 40;
  const diagonalShift = ((latitude + longitude) * 100) % 60;
  const coords = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#eef4ea" />
          <stop offset="100%" stop-color="#dfe8dc" />
        </linearGradient>
        <pattern id="grid" width="${gridSize}" height="${gridSize}" patternUnits="userSpaceOnUse">
          <path d="M ${gridSize} 0 L 0 0 0 ${gridSize}" fill="none" stroke="#b9c7ae" stroke-width="1" opacity="0.42" />
        </pattern>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#0c1320" flood-opacity="0.2" />
        </filter>
      </defs>
      <rect width="600" height="400" fill="url(#bg)" />
      <rect width="600" height="400" fill="url(#grid)" opacity="0.9" />

      <path d="M0 74 C 84 38, 164 98, 248 66 S 402 118, 506 84 S 576 100, 600 74 L 600 0 L 0 0 Z" fill="#d2e3c9" opacity="0.88" />
      <path d="M0 320 C 92 282, 168 338, 256 302 S 420 344, 512 296 S 566 282, 600 300 L 600 400 L 0 400 Z" fill="#cad8c7" opacity="0.95" />
      <path d="M58 ${88 + roadShift / 2} C 138 ${54 + roadShift / 3}, 214 ${126 + roadShift / 4}, 302 ${92 + roadShift / 5} S 454 ${122 + roadShift / 4}, 562 ${88 + roadShift / 6}" fill="none" stroke="#f8f7f2" stroke-width="28" stroke-linecap="round" opacity="0.96" />
      <path d="M58 ${88 + roadShift / 2} C 138 ${54 + roadShift / 3}, 214 ${126 + roadShift / 4}, 302 ${92 + roadShift / 5} S 454 ${122 + roadShift / 4}, 562 ${88 + roadShift / 6}" fill="none" stroke="#c9b08a" stroke-width="14" stroke-linecap="round" opacity="0.72" />

      <path d="M82 ${298 - diagonalShift / 6} C 156 ${270 - diagonalShift / 8}, 248 ${330 - diagonalShift / 10}, 320 ${302 - diagonalShift / 12} S 476 ${266 - diagonalShift / 14}, 546 ${292 - diagonalShift / 16}" fill="none" stroke="#f9f8f4" stroke-width="24" stroke-linecap="round" opacity="0.94" />
      <path d="M82 ${298 - diagonalShift / 6} C 156 ${270 - diagonalShift / 8}, 248 ${330 - diagonalShift / 10}, 320 ${302 - diagonalShift / 12} S 476 ${266 - diagonalShift / 14}, 546 ${292 - diagonalShift / 16}" fill="none" stroke="#d4b98e" stroke-width="12" stroke-linecap="round" opacity="0.7" />

      <path d="M136 0 C 124 54, 132 112, 118 164 S 112 264, 134 400" fill="none" stroke="#f7f5ef" stroke-width="18" stroke-linecap="round" opacity="0.94" />
      <path d="M136 0 C 124 54, 132 112, 118 164 S 112 264, 134 400" fill="none" stroke="#c7a980" stroke-width="8" stroke-linecap="round" opacity="0.72" />

      <rect x="366" y="48" width="150" height="88" rx="18" fill="#b9d8c0" opacity="0.9" />
      <rect x="388" y="68" width="48" height="28" rx="8" fill="#8cc39d" opacity="0.82" />
      <rect x="446" y="78" width="46" height="18" rx="6" fill="#8cc39d" opacity="0.82" />
      <rect x="414" y="106" width="72" height="16" rx="5" fill="#8cc39d" opacity="0.82" />

      <path d="M0 ${178 + normalizedZoom} C 94 ${146 + normalizedZoom / 2}, 160 ${176 + normalizedZoom / 3}, 240 ${160 + normalizedZoom / 4} S 380 ${116 + normalizedZoom / 4}, 600 ${142 + normalizedZoom / 5}" fill="none" stroke="#8dc7e8" stroke-width="22" stroke-linecap="round" opacity="0.88" />
      <path d="M0 ${178 + normalizedZoom} C 94 ${146 + normalizedZoom / 2}, 160 ${176 + normalizedZoom / 3}, 240 ${160 + normalizedZoom / 4} S 380 ${116 + normalizedZoom / 4}, 600 ${142 + normalizedZoom / 5}" fill="none" stroke="#67a8ca" stroke-width="10" stroke-linecap="round" opacity="0.95" />

      <g filter="url(#shadow)">
        <path d="M300 158c-18 0-32 14-32 32 0 24 32 54 32 54s32-30 32-54c0-18-14-32-32-32z" fill="#ef4444" stroke="#ffffff" stroke-width="6" />
        <circle cx="300" cy="190" r="11" fill="#ffffff" opacity="0.96" />
        <circle cx="300" cy="190" r="44" fill="none" stroke="#ef4444" stroke-width="4" opacity="0.35" />
      </g>

      <rect x="24" y="24" width="260" height="90" rx="16" fill="rgba(255,255,255,0.86)" stroke="#97a78c" />
      <text x="42" y="56" fill="#203028" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700">Map Preview</text>
      <text x="42" y="84" fill="#5f6e60" font-family="Arial, Helvetica, sans-serif" font-size="14">${coords}</text>
      <text x="42" y="104" fill="#5f6e60" font-family="Arial, Helvetica, sans-serif" font-size="14">Zoom ${normalizedZoom}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
