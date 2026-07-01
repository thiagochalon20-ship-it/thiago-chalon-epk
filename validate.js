const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\Usuario\\.gemini\\antigravity\\scratch\\roma-epk';
const files = ['index.html', 'music.html', 'galeria.html', 'letras.html'];

let allGood = true;

const validLinks = ['/', '/music', '/galeria', '/letras', '/music.html', '/galeria.html', '/letras.html', 'index.html', '#', 'mailto:music@thiagochalon.com', 'https://instagram.com/thiago.chalon', '/galeria-roma-prensa.zip'];

files.forEach(file => {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    
    // Check for Vercel analytics
    if (!content.includes('/_vercel/insights/script.js')) {
        console.log(`[WARN] Missing Vercel analytics in ${file}`);
        allGood = false;
    }
    
    // Check for unclosed tags basic heuristic
    const opens = (content.match(/<div/g) || []).length;
    const closes = (content.match(/<\/div>/g) || []).length;
    if (opens !== closes) {
        console.log(`[ERROR] Mismatched <div> tags in ${file}: ${opens} opens, ${closes} closes`);
        allGood = false;
    }

    // Check internal links
    const hrefRegex = /href="([^"]+)"/g;
    let match;
    while ((match = hrefRegex.exec(content)) !== null) {
        let link = match[1];
        if (link.startsWith('http') || link.startsWith('mailto:') || link.startsWith('#')) continue;
        
        // Remove hash from internal links for checking if file exists
        const linkPath = link.split('#')[0];
        
        if (linkPath && !validLinks.includes(linkPath) && !linkPath.startsWith('img/') && !linkPath.startsWith('js/') && !linkPath.startsWith('css/') && linkPath !== 'style.css' && linkPath !== 'favicon.svg') {
            console.log(`[WARN] Potentially broken or unknown link in ${file}: ${linkPath}`);
            // don't set allGood = false just for this, could be a valid external link or something we missed
        }
    }
});

if (allGood) {
    console.log("All files look good!");
} else {
    console.log("Some issues found.");
}
