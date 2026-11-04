import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

const filePath = 'C:/Users/DELL PRO 14/Downloads/GX Fitness Platform Look.html';
const content = fs.readFileSync(filePath, 'utf8');

const manifestMatch = content.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
const pageOrderMatch = content.match(/<script type="__bundler\/page_order">([\s\S]*?)<\/script>/);

if (!manifestMatch) {
  console.error('No manifest found');
  process.exit(1);
}

const manifest = JSON.parse(manifestMatch[1]);
const pageOrder = pageOrderMatch ? JSON.parse(pageOrderMatch[1]) : [];

const outputDir = path.resolve('public/design-reference/html-look');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`Manifest has ${Object.keys(manifest).length} entries. Page order has ${pageOrder.length} pages.`);

const pageNames = {
  'ba541a5d-bdda-4141-bc32-d0db30b6afdc': 'login-dark.html',
  'f657a71e-a295-4e62-972b-1ef4258e0086': 'login-light.html',
  'e87a4b4e-8485-425f-a158-4449a02fe7bc': 'dashboard-dark.html',
  '5942adfc-4e39-4bfc-b173-8c9bd005fb1d': 'dashboard-light.html',
  'f174b2bd-0f0e-410e-90fc-b36974fee25f': 'members-dark.html',
  'cf1614ab-1647-406e-b8d4-698cf10841a2': 'mobile-dark.html',
  'fa00ab6d-6807-4933-9fba-7576a253729a': 'mobile-light.html',
};

for (const [uuid, entry] of Object.entries(manifest)) {
  const binaryBuffer = Buffer.from(entry.data, 'base64');
  let finalBuffer = binaryBuffer;
  if (entry.compressed) {
    try {
      finalBuffer = zlib.gunzipSync(binaryBuffer);
    } catch (e) {
      console.error(`Failed to decompress ${uuid}:`, e.message);
    }
  }

  const isPage = pageOrder.includes(uuid) || pageNames[uuid];
  let filename = pageNames[uuid] || `${uuid}`;
  if (!pageNames[uuid]) {
    if (entry.mime.includes('html')) filename += '.html';
    else if (entry.mime.includes('svg')) filename += '.svg';
    else if (entry.mime.includes('png')) filename += '.png';
    else if (entry.mime.includes('jpeg') || entry.mime.includes('jpg')) filename += '.jpg';
    else if (entry.mime.includes('font') || entry.mime.includes('woff2')) filename += '.woff2';
    else if (entry.mime.includes('css')) filename += '.css';
  }

  fs.writeFileSync(path.join(outputDir, filename), finalBuffer);
  console.log(`Saved ${filename} (${finalBuffer.length} bytes, mime: ${entry.mime})`);
}

console.log('Done unpacking all assets!');
