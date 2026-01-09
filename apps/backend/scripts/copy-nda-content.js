const fs = require('node:fs');
const path = require('node:path');

const srcDir = path.resolve(__dirname, '..', 'src', 'nda', 'content');
const destDir = path.resolve(__dirname, '..', 'dist', 'nda', 'content');

if (!fs.existsSync(srcDir)) {
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });

for (const entry of fs.readdirSync(srcDir)) {
  const srcPath = path.join(srcDir, entry);
  const destPath = path.join(destDir, entry);
  if (fs.statSync(srcPath).isFile()) {
    fs.copyFileSync(srcPath, destPath);
  }
}
