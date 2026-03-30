// Run: node public/icons/generate-icons.js
// Requires: npm install sharp -g
// Or use https://realfavicongenerator.net/ to generate icons from the SVG
const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
console.log('Icon sizes needed:', sizes.map(s => `icon-${s}.png`).join(', '))
console.log('Use https://realfavicongenerator.net/ with public/icons/icon.svg to generate all sizes')
console.log('Or install sharp: npm i sharp && node this file')

try {
  const sharp = require('sharp')
  const path  = require('path')
  sizes.forEach(size => {
    sharp(path.join(__dirname, 'icon.svg'))
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, `icon-${size}.png`))
      .then(() => console.log(`Generated icon-${size}.png`))
  })
} catch {
  console.log('sharp not available - generate icons manually')
}
