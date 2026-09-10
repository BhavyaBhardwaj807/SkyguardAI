const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, 'src');

function fixImports(dir) {
  fs.readdirSync(dir).forEach(f => {
    let p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      fixImports(p);
    } else if (p.endsWith('.jsx') || p.endsWith('.js')) {
      let content = fs.readFileSync(p, 'utf8');
      
      // We will replace all instances of import from "../something" or "../../something" etc
      // Instead of guessing how many levels, let's use path aliases or correct relative paths.
      // Since Next.js has `@/` alias natively if configured, we could configure jsconfig.json.
      // But let's just fix the relative paths.
      // Wait, we know all components are in `src/components`, `src/api`, `src/theme`, `src/sockets`.
      // So if an import is from any depth containing these, we can rewrite it relative to `src`.
      
      let relativeToSrc = path.relative(path.dirname(p), srcDir);
      // Make sure it starts with `.` or `..`
      if (!relativeToSrc.startsWith('.')) relativeToSrc = './' + relativeToSrc;
      // Convert to posix
      relativeToSrc = relativeToSrc.replace(/\\/g, '/');
      
      // Let's blindly replace `../../../../../` or any combination with the correct prefix, BUT only if it ends up matching our folders
      
      let newContent = content.replace(/(from\s+["'])(?:\.\.\/)+((?:components|api|theme|sockets)\/.*?)(["'])/g, `$1${relativeToSrc}/$2$3`);
      
      // also handle imports without from (e.g. import "../../theme/tokens.css")
      newContent = newContent.replace(/(import\s+["'])(?:\.\.\/)+((?:theme)\/.*?)(["'])/g, `$1${relativeToSrc}/$2$3`);
      
      if (content !== newContent) {
        fs.writeFileSync(p, newContent);
        console.log("Fixed", p);
      }
    }
  });
}

fixImports('./src/app');
