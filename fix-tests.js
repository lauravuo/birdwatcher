const fs = require('fs');
const path = require('path');
const glob = require('glob'); // Need to glob

const dir = './e2e';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.spec.ts'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace hardcoded join codes with dynamic ones
  content = content.replace(/const joinCode = "[^"]+";/g, 'const joinCode = `jc-${Math.random().toString(36).substring(2, 8)}`;');
  
  // Replace clearAllTestData just in case
  content = content.replace(/await clearAllTestData\(\);/g, '');
  
  fs.writeFileSync(filePath, content);
  console.log('Fixed', file);
}
