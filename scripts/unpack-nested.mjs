import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const inputDir = path.resolve('public/design-reference/html-look');
const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.html'));

for (const file of files) {
  const content = fs.readFileSync(path.join(inputDir, file), 'utf8');
  const templateMatch = content.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);
  const manifestMatch = content.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);

  if (templateMatch) {
    let template = JSON.parse(templateMatch[1]);
    
    // Also unpack manifest assets if any (images, svgs, etc)
    if (manifestMatch) {
      const manifest = JSON.parse(manifestMatch[1]);
      for (const [uuid, entry] of Object.entries(manifest)) {
        const binaryBuffer = Buffer.from(entry.data, 'base64');
        let finalBuffer = binaryBuffer;
        if (entry.compressed) {
          try {
            finalBuffer = zlib.gunzipSync(binaryBuffer);
          } catch {}
        }
        
        let ext = '.bin';
        if (entry.mime.includes('svg')) ext = '.svg';
        else if (entry.mime.includes('png')) ext = '.png';
        else if (entry.mime.includes('jpeg') || entry.mime.includes('jpg')) ext = '.jpg';
        else if (entry.mime.includes('css')) ext = '.css';
        
        const assetName = `asset_${uuid}${ext}`;
        fs.writeFileSync(path.join(inputDir, assetName), finalBuffer);
        
        // In template, replace uuid with assetName
        template = template.replaceAll(uuid, assetName);
      }
    }

    const outputName = file.replace('.html', '_rendered.html');
    fs.writeFileSync(path.join(inputDir, outputName), template);
    console.log(`Extracted template for ${file} -> ${outputName} (${template.length} chars)`);
  }
}
