const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}
const files = walk('app');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content.replace(/\.(map|filter|reduce|some|every|find|forEach)\(([a-zA-Z])\s*=>/g, '.$1(($2: any) =>');
  if (newContent !== content) {
    fs.writeFileSync(file, newContent);
    console.log('Updated ' + file);
  }
});
