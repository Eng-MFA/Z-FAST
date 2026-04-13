const fs = require('fs');
let s = fs.readFileSync('public/css/style.css', 'utf8');

s = s.replace(/background:\s*var\(--dark-3\);\s*\r?\n\s*box-shadow/g, 'background: #000;\n  box-shadow');
s = s.replace(/object-fit:\s*contain;/g, 'object-fit: scale-down;');

fs.writeFileSync('public/css/style.css', s, 'utf8');
console.log('CSS updated successfully.');
