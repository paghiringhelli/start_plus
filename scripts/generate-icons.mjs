import fs from 'node:fs'
import path from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const outDir = path.join(process.cwd(), 'public', 'icons')
const sizes = [16, 32, 48, 128]

const baseSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e8dd2" />
      <stop offset="100%" stop-color="#167cbc" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0b4f79" flood-opacity="0.35"/>
    </filter>
  </defs>

  <rect x="6" y="6" rx="2" ry="2" width="116" height="116" fill="url(#bg)"/>
  <rect x="6" y="6" rx="2" ry="2" width="116" height="116" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2"/>

  <g filter="url(#shadow)">
    <text
      x="64"
      y="110"
      text-anchor="middle"
      font-family="Bauhaus 93"
      font-size="140"
      font-weight="800"
      letter-spacing="-10"
      fill="#ffffff"
    >+</text>
  </g>
</svg>`

for (const size of sizes) {
  const svg = baseSvg(size)
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
  })

  const pngData = resvg.render().asPng()
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), pngData)
}

console.log('Regenerated clean icons for sizes:', sizes.join(', '))
