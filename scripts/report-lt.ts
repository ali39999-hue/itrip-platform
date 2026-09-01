import fs from 'fs';
import path from 'path';

function findFilesWithLt(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!fullPath.includes('node_modules') && !fullPath.includes('.next')) {
        findFilesWithLt(fullPath, fileList);
      }
    } else if (/\.(ts|tsx)$/.test(file)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (/\blt\(/.test(content)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

const list = findFilesWithLt(path.resolve(process.cwd(), 'src'));
console.log(`Found ${list.length} files containing lt():`);
list.forEach((f) => console.log(' - ' + path.relative(process.cwd(), f)));
