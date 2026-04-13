const fs = require('fs');
let s = fs.readFileSync('public/css/style.css', 'utf8');

// Replacement 1: About slide frame adjustments to remove fixed aspect ratio & black background
const regexFrame = /\.about-slide-frame\s*\{[^}]*?\}/s;
const frameMatch = s.match(regexFrame);
if (frameMatch) {
  let frameCss = frameMatch[0];
  frameCss = frameCss.replace(/\s*aspect-ratio:\s*16\s*\/\s*9;/g, '');
  frameCss = frameCss.replace(/\s*background:\s*#000;/g, '\n  background: transparent;');
  // Add flex to neatly center images if they are smaller than container
  frameCss = frameCss.substring(0, frameCss.length - 1) + '  display: flex;\n  align-items: center;\n  justify-content: center;\n}';
  s = s.replace(regexFrame, frameCss);
}

// Replacement 2: About slide img adjustments to NOT stretch to 100% height, but keep ratio
const regexImg = /\.about-slide-img\s*\{[^}]*?\}/g;
s = s.replace(regexImg, (match) => {
  let imgCss = match;
  imgCss = imgCss.replace(/\s*height:\s*100%;/g, '\n  height: auto;\n  max-height: 80vh;');
  // make max-width 100% so it doesn't overflow
  imgCss = imgCss.replace(/\s*width:\s*100%;/g, '\n  width: 100%;');
  // keep object-fit: contain just in case it hits max-height
  imgCss = imgCss.replace(/object-fit:\s*scale-down;/g, 'object-fit: contain;');
  return imgCss;
});

fs.writeFileSync('public/css/style.css', s, 'utf8');
console.log('CSS dynamically perfectly updated.');
