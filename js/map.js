/* Range map: Natural Earth countries, the approximate coastal range and localities named in the CMP actions. */
(() => {
  const { h, fill } = GD;
  const EXTENT = { type: 'MultiPoint', coordinates: [[-66, -43], [-37, -17.5]] };
  const RS = new Set(['Brazil', 'Uruguay', 'Argentina']);
  dash.draw('range_map', (el) => {
    const base = dash.data('map_base'), lay = dash.data('map_layers');
    if ([base, lay].some((x) => x.status !== 'ok' || !x.data || !x.data.features)) { el.textContent = [base, lay].some((x) => x.status === 'error') ? 'Failed to load' : '—'; return; }
    el.replaceChildren();
    const W = Math.max(280, el.clientWidth), H = Math.round(Math.min(W * 1.15, 720));
    const proj = d3.geoMercator().fitExtent([[8, 8], [W - 8, H - 8]], EXTENT);
    const path = d3.geoPath(proj);
    const places = lay.data.places || [];
    const svg = d3.select(el).append('svg').attr('role', 'img').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`)
      .attr('aria-label', 'Map of the south-western Atlantic coast from Espírito Santo, Brazil, to the San Matías Gulf, Argentina, showing the approximate coastal range of the franciscana and ' + places.length + ' numbered localities named in the conservation plan.');
    svg.append('defs').append('clipPath').attr('id', 'fr-map-clip').append('rect').attr('width', W).attr('height', H).attr('rx', 6);
    const root = svg.append('g').attr('clip-path', 'url(#fr-map-clip)');
    root.append('rect').attr('class', 'gd-sea').attr('width', W).attr('height', H);
    root.append('path').attr('class', 'gd-grat').attr('d', path(d3.geoGraticule().extent([[-75, -50], [-30, -10]]).step([5, 5])()));
    root.append('g').selectAll('path').data(base.data.features).join('path').attr('class', (d) => 'gd-land' + (RS.has(d.properties.name) ? ' rs' : '')).attr('d', path);
    root.append('g').selectAll('path').data(lay.data.features.filter((f) => f.properties.kind === 'range')).join('path').attr('class', 'gd-range').attr('d', path);
    const r = W < 480 ? 8 : 10;
    const pts = places.map((d) => { const p = proj([d.lon, d.lat]); return { d, ax: p[0], ay: p[1], x: p[0] + r * 1.6, y: p[1] }; });
    const sim = d3.forceSimulation(pts).stop().force('x', d3.forceX((p) => p.ax + r * 1.8).strength(0.3)).force('y', d3.forceY((p) => p.ay).strength(0.3)).force('c', d3.forceCollide(r + 2));
    for (let i = 0; i < 200; i++) sim.tick();
    pts.forEach((p) => { p.x = Math.max(r + 2, Math.min(W - r - 2, p.x)); p.y = Math.max(r + 2, Math.min(H - r - 2, p.y)); });
    root.append('g').selectAll('line').data(pts).join('line').attr('class', 'gd-lead').attr('x1', (p) => p.ax).attr('y1', (p) => p.ay).attr('x2', (p) => p.x).attr('y2', (p) => p.y);
    root.append('g').selectAll('circle').data(pts).join('circle').attr('class', 'gd-anchor').attr('cx', (p) => p.ax).attr('cy', (p) => p.ay).attr('r', 2);
    const mk = root.append('g').selectAll('g').data(pts).join('g').attr('class', 'gd-place').attr('transform', (p) => `translate(${p.x},${p.y})`);
    mk.append('circle').attr('r', r);
    mk.append('text').attr('text-anchor', 'middle').attr('dy', '0.35em').text((p) => p.d.no);
    const tip = GD.tip(el);
    mk.on('pointermove pointerdown', (ev, p) => tip.show(ev, p.d.no + '. ' + p.d.name, [p.d.note])).on('pointerleave', () => tip.hide());
    const hints = [['Atlantic Ocean', -42, -35], ['BRAZIL', -50, -21], ['URUGUAY', -55.8, -32.7], ['ARGENTINA', -63, -36]];
    root.append('g').selectAll('text').data(hints).join('text').attr('class', 'gd-sea-lbl').attr('text-anchor', 'middle').attr('x', (d) => proj([d[1], d[2]])[0]).attr('y', (d) => proj([d[1], d[2]])[1]).text((d) => d[0]);
  });
  dash.draw('places_body', (tb) => {
    const g = dash.data('map_layers');
    if (g.status !== 'ok' || !g.data || !g.data.places) { tb.replaceChildren(); return; }
    fill(tb, g.data.places, [{ cls: 'num', f: (r) => r.no }, { f: (r) => r.name }, { cls: 'wide', f: (r) => r.note }]);
  });
})();
