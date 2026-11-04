import fs from 'node:fs';

const filePath = 'C:/Users/DELL PRO 14/Downloads/GX Fitness Platform Look.html';
const content = fs.readFileSync(filePath, 'utf8');

const manifestMatch = content.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
const templateMatch = content.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);
const pageOrderMatch = content.match(/<script type="__bundler\/page_order">([\s\S]*?)<\/script>/);

console.log('Manifest found:', !!manifestMatch);
console.log('Template found:', !!templateMatch);
console.log('Page order found:', !!pageOrderMatch);

if (templateMatch) {
  let template = JSON.parse(templateMatch[1]);
  fs.writeFileSync('scripts/unpacked_template.html', template);
  console.log('Wrote scripts/unpacked_template.html, length:', template.length);
}
