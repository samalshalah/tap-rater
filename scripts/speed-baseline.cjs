const fs = require('node:fs');
(async () => {
  const base = process.env.SPEED_BASE_URL || 'https://taprater.com';
  const results = [];
  for (const path of ['/', '/shop', '/product/google-review-stand']) {
    const samples=[]; let html='';
    for (let i=0;i<3;i++) {
      const start=performance.now(); const response=await fetch(base+path);
      const headersMs=performance.now()-start; html=await response.text();
      if(response.status!==200)throw new Error(`${path}: ${response.status}`);
      samples.push({headersMs:Math.round(headersMs),totalMs:Math.round(performance.now()-start),htmlBytes:Buffer.byteLength(html)});
    }
    const scripts=[...new Set([...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>m[1]).filter(s=>s.includes('/_next/')))];
    let scriptBytes=0;for(const src of scripts){const r=await fetch(new URL(src,base));scriptBytes+=(await r.arrayBuffer()).byteLength;}
    results.push({path,samples,initialScriptCount:scripts.length,decodedScriptBytes:scriptBytes});
  }
  fs.writeFileSync(process.argv[2]||'speed-baseline.json',JSON.stringify({base,measuredAt:new Date().toISOString(),results},null,2));
  console.log(JSON.stringify(results));
})();
