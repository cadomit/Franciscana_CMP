/* Protected areas that overlap the franciscana's range, and legal instruments that name it. */
(() => {
  const { h, gate, fill, badge, more, link } = GD;
  const CIT = [
    ['Named in the creation act or official announcement', 's4'],
    ['Named in a management plan or official area document', 's3'],
    ['Named in a national action plan (PAN Toninha)', 's2'],
    ['Named only in secondary sources', 's1'],
    ['Not named in the acts checked', 'dd']
  ];
  const CIT_SHORT = {
    'Named in the creation act or official announcement': 'Creation act / announcement',
    'Named in a management plan or official area document': 'Management plan / area document',
    'Named in a national action plan (PAN Toninha)': 'PAN Toninha',
    'Named only in secondary sources': 'Secondary sources only',
    'Not named in the acts checked': 'Not named'
  };
  const COUNTRIES = ['Brazil', 'Uruguay', 'Argentina'];

  dash.calc('pa_by', {
    inputs: ['protected_areas'],
    title: 'Protected areas by country and where the species is named',
    description: 'Number of protected areas (created or proposed) in each country, split by the kind of document that names the franciscana.',
    fn: (pas) => {
      const out = [];
      COUNTRIES.forEach((c) => CIT.forEach(([k]) => {
        const n = pas.filter((r) => r.country === c && r.citation === k).length;
        if (n) out.push({ country: c, citation: k, n });
      }));
      return out;
    }
  });
  dash.calc('pa_stats', {
    inputs: ['protected_areas', 'legal_instruments'],
    title: 'Protected-area and legal indicators',
    description: 'Counts of protected areas, of those whose official documents name the species, and of legal instruments that name it.',
    fn: (pas, legal) => {
      const official = pas.filter((r) => /creation act|management plan|national action plan/.test(r.citation));
      return [{
        n_pa: pas.length,
        n_created: pas.filter((r) => r.status === 'Created').length,
        n_official: official.length,
        n_act: pas.filter((r) => r.citation === CIT[0][0]).length,
        n_none: pas.filter((r) => r.citation === CIT[4][0]).length,
        n_legal: legal.filter((r) => r.country !== 'International').length,
        n_legal_read: legal.filter((r) => r.country !== 'International' && /^Read/.test(r.verification)).length,
        n_lists: legal.filter((r) => r.kind === 'Threatened-species list').length
      }];
    }
  });

  [['pa_n', 'n_pa'], ['pa_created', 'n_created'], ['pa_official', 'n_official'], ['pa_act', 'n_act'], ['pa_none', 'n_none'], ['lg_n', 'n_legal'], ['lg_read', 'n_legal_read']]
    .forEach(([name, field]) => dash.draw(name, (el) => {
      const d = dash.data('pa_stats');
      el.textContent = d.status === 'ok' && d.data && d.data[0] ? String(d.data[0][field]) : '—';
    }));

  dash.draw('chart_pa', (el) => {
    const g = gate(el, 'pa_by'); if (!g) return;
    GD.hstack(el, {
      rows: g[0], catKey: 'country', serKey: 'citation', unit: 'protected areas', label: (c) => c,
      sers: CIT.map(([key, cls]) => ({ key, cls })),
      aria: 'Stacked bar chart: protected areas overlapping the franciscana range in Brazil, Uruguay and Argentina, by the kind of document that names the species.'
    });
  });

  GD.select('f_pa_country', 'pa_country', 'All countries', 'protected_areas', () => COUNTRIES);
  GD.select('f_pa_cit', 'pa_cit', 'All evidence types', 'protected_areas', (rows) => CIT.map(([k]) => k).filter((k) => rows.some((r) => r.citation === k)).map((k) => ({ value: k, label: CIT_SHORT[k] })));
  GD.select('f_lg_country', 'lg_country', 'All countries', 'legal_instruments', (rows) => [...new Set(rows.map((r) => r.country))]);

  dash.draw('pa_body', (tb) => {
    const g = gate(tb, 'protected_areas'); if (!g) return;
    const p = dash.params();
    const rows = g[0].filter((r) => (!p.pa_country || r.country === p.pa_country) && (!p.pa_cit || r.citation === p.pa_cit));
    const cls = Object.fromEntries(CIT);
    fill(tb, rows, [
      { cls: 'nw', f: (r) => r.country },
      { cls: 'wide', f: (r) => h('span', null, link(r.url, r.name), r.status !== 'Created' ? h('span', null, ' ', badge(r.status, 'warn')) : null) },
      { f: (r) => r.category },
      { f: (r) => h('span', null, r.act, r.act_verified === false ? h('span', null, ' ', badge('act not checked', 'warn')) : null) },
      { cls: 'nw', f: (r) => r.fma },
      { f: (r) => badge(CIT_SHORT[r.citation] || r.citation, { s4: 'vh', s3: 'hi', s2: 'md', s1: '', dd: 'gap' }[cls[r.citation]] || '') },
      { cls: 'wide', f: (r) => h('span', null, r.evidence, more('Documents checked', r.checked)) },
      { f: (r) => r.verification }
    ]);
  });

  dash.draw('chart_legal', (el) => {
    const g = gate(el, 'legal_instruments'); if (!g) return;
    el.replaceChildren();
    const rows = g[0].filter((r) => r.year != null);
    const lanes = ['Brazil', 'Argentina', 'Uruguay', 'International'].filter((c) => rows.some((r) => r.country === c));
    const LV = [['National or federal', 's4', (r) => /^(Federal|National)$/.test(r.level)], ['State, provincial or departmental', 's2', (r) => /^(State|Provincial|Departmental)/.test(r.level)], ['International', 's1', () => true]];
    const lvOf = (r) => LV.find((l) => l[2](r));
    el.append(h('div', { class: 'gd-legend' }, LV.map((l) => h('span', null, h('i', { class: 'gd-sw ' + l[1] }), l[0]))));
    const W = Math.max(280, el.clientWidth), narrow = W < 520, laneH = 44, top = 6, H = top + lanes.length * laneH + 26;
    const svg = d3.select(el).append('svg').attr('role', 'img').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`)
      .attr('aria-label', 'Timeline of legal instruments naming the franciscana, by country and year.');
    const ml = narrow ? 74 : 96;
    const x = d3.scaleLinear().domain([2004, 2027]).range([ml + 8, W - 16]);
    const ticks = narrow ? [2005, 2015, 2025] : [2005, 2010, 2015, 2020, 2025];
    svg.append('g').attr('class', 'gd-grid').selectAll('line').data(ticks).join('line').attr('x1', (d) => x(d)).attr('x2', (d) => x(d)).attr('y1', top).attr('y2', H - 22);
    svg.append('g').selectAll('text').data(ticks).join('text').attr('x', (d) => x(d)).attr('y', H - 7).attr('text-anchor', 'middle').text((d) => d);
    svg.append('g').selectAll('text').data(lanes).join('text').attr('class', 'gd-lbl').attr('x', 0).attr('y', (l, i) => top + i * laneH + laneH / 2 + 4).text((l) => l);
    const pts = [];
    lanes.forEach((l, i) => {
      const lr = rows.filter((r) => r.country === l).sort((a, b) => a.year - b.year);
      const seen = {};
      lr.forEach((r) => { const k = seen[r.year] = (seen[r.year] || 0) + 1; pts.push({ r, cx: x(r.year), cy: top + i * laneH + laneH / 2 + (k - 1) * 9 - 6 }); });
    });
    const tip = GD.tip(el);
    svg.append('g').selectAll('circle').data(pts).join('circle').attr('class', (d) => 'gd-mk ' + lvOf(d.r)[1]).attr('cx', (d) => d.cx).attr('cy', (d) => d.cy).attr('r', narrow ? 5 : 6);
    svg.append('g').selectAll('circle').data(pts).join('circle').attr('class', 'gd-hit').attr('cx', (d) => d.cx).attr('cy', (d) => d.cy).attr('r', 11)
      .on('pointermove pointerdown', (ev, d) => tip.show(ev, d.r.instrument, [d.r.date + ' · ' + d.r.level, d.r.kind, d.r.category ? 'Category: ' + d.r.category : '', d.r.status].filter(Boolean)))
      .on('pointerleave', () => tip.hide());
  });

  dash.draw('legal_body', (tb) => {
    const g = gate(tb, 'legal_instruments'); if (!g) return;
    const p = dash.params();
    const rows = g[0].filter((r) => !p.lg_country || r.country === p.lg_country);
    fill(tb, rows, [
      { cls: 'nw', f: (r) => r.country }, { f: (r) => r.level }, { cls: 'wide', f: (r) => link(r.url, r.instrument) }, { cls: 'nw', f: (r) => r.date },
      { f: (r) => r.kind }, { cls: 'wide', f: (r) => r.says }, { f: (r) => (r.category ? badge(r.category, r.category === 'CR' ? 'vh' : '') : '—') },
      { f: (r) => r.status }, { f: (r) => r.verification }
    ]);
  });
})();
