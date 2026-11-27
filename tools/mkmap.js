const tj = require('./geo/topojson-client-3.1.0/dist/topojson-client.js');
const fs = require('fs');
const w = JSON.parse(fs.readFileSync('./geo/world-atlas-2.0.2/countries-50m.json'));
const fc = tj.feature(w, w.objects.countries);
const keep = new Set(['Argentina','Brazil','Uruguay','Paraguay','Chile','Bolivia']);
const r2 = (c) => [Math.round(c[0]*100)/100, Math.round(c[1]*100)/100];
const clipRing = (ring) => ring.map(r2).filter((c,i,a)=> i===0 || c[0]!==a[i-1][0] || c[1]!==a[i-1][1]);
const feats = fc.features.filter(f => keep.has(f.properties.name)).map(f => {
  const g = f.geometry; const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  // keep polygons that touch the display box
  const inBox = (p) => p[0].some(c => c[0] > -72 && c[0] < -30 && c[1] > -47 && c[1] < -12);
  const ps = polys.filter(inBox).map(p => p.map(clipRing));
  return { type: 'Feature', properties: { name: f.properties.name }, geometry: { type: 'MultiPolygon', coordinates: ps } };
});
fs.writeFileSync('data/basemap_countries.json', JSON.stringify({ type: 'FeatureCollection', features: feats }));
// range line: mainland coast between 18.42S and 42.17S
const land = tj.feature(w, w.objects.land);
let best = [];
land.features.forEach(f => (f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).forEach(p => {
  const ring = p[0]; let run = [];
  const flush = () => { if (run.length > best.length) best = run; run = []; };
  for (const c of ring.concat(ring)) { if (c[1] <= -18.42 && c[1] >= -42.17 && c[0] > -66 && c[0] < -38) run.push(r2(c)); else flush(); }
  flush();
}));
// dedupe the doubled loop
const seen = new Set(); best = best.filter(c => { const k = c.join(); if (seen.has(k)) return false; seen.add(k); return true; });
const places = [
 ['Itaúnas (northern limit)', -39.72, -18.42, 'Northern limit of the species'],
 ['Doce River mouth', -39.81, -19.65, 'Proposed conservation area (MIT-2.1); FMA Ia'],
 ['Ilha Grande Bay', -44.25, -23.1, 'Northern limit of FMA II (Azevedo et al. 2026)'],
 ['Babitonga Bay', -48.65, -26.2, 'Proposed conservation area (MIT-2.1); resident estuarine population'],
 ['Albardão', -52.75, -33.2, 'Proposed conservation area (MIT-2.1); FMA III'],
 ['Río de la Plata', -56.2, -34.95, 'Estuary; population limits to be redefined (RES-1.1)'],
 ['Samborombón Bay', -57.2, -35.9, 'Not yet surveyed (CMS COP15)'],
 ['Bahía Blanca', -62.1, -38.95, 'Claromecó to Bahía Blanca not yet surveyed'],
 ['Río Negro estuary', -62.8, -41.03, 'Proposed conservation area (MIT-2.1); FMA IVe'],
 ['San Matías Gulf (southern limit)', -64.3, -41.2, 'Southern limit of the species (42°10′S)']
].map(([name, lon, lat, note], i) => ({ no: i+1, name, lon, lat, note }));
fs.writeFileSync('data/map_layers.json', JSON.stringify({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { kind: 'range' }, geometry: { type: 'LineString', coordinates: best } }], places }));
console.log(feats.length, best.length, best[0], best[best.length-1], fs.statSync('data/basemap_countries.json').size);
