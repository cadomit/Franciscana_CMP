const { h, gate, ok, fill, badge, more, fmt, link } = GD;
const CW2 = GD.catWord, CC = GD.catCls;

function measure(labs, maxW, xPos) {
  let wmax = 0;
  labs.each(function () { wmax = Math.max(wmax, this.getComputedTextLength()); });
  const ml = Math.min(Math.ceil(wmax) + (xPos || 0) + 10, maxW);
  labs.each(function () {
    let t = this.textContent;
    while (this.getComputedTextLength() > ml - (xPos || 0) - 10 && t.length > 3) { t = t.slice(0, -2); this.textContent = t + '…'; }
  });
  return ml;
}
const legendOf = (items) => h('div', { class: 'gd-legend' }, items.map((i) => h('span', null, h('i', { class: 'gd-sw ' + i.cls }), i.label)));
const pointerTip = (sel, tip, fn) => sel.on('pointermove pointerdown', (ev, d) => { const t = fn(d); tip.show(ev, t[0], t[1]); }).on('pointerleave', () => tip.hide());

/* Horizontal stacked bars (ordinal single-hue steps). */
GD.hstack = (el, cfg) => {
  el.replaceChildren();
  const rows = cfg.rows, cats = [...new Set(rows.map((r) => r[cfg.catKey]))], lab = cfg.label || ((c) => c);
  const tot = new Map(cats.map((c) => [c, d3.sum(rows.filter((r) => r[cfg.catKey] === c), (r) => r.n)]));
  el.append(legendOf(cfg.sers.filter((s) => rows.some((r) => r[cfg.serKey] === s.key)).map((s) => ({ cls: s.cls, label: s.key }))));
  const W = Math.max(260, el.clientWidth);
  const svg = d3.select(el).append('svg').attr('role', 'img').attr('aria-label', cfg.aria).attr('width', '100%');
  const rowH = 30, top = 4, H = top + cats.length * rowH + 24;
  const labs = svg.append('g').selectAll('text').data(cats).join('text').attr('class', 'gd-lbl').text((c) => lab(c));
  const ml = measure(labs, Math.round(W * 0.45));
  labs.attr('x', 0).attr('y', (c, i) => top + i * rowH + rowH / 2 + 4);
  svg.attr('height', H).attr('viewBox', `0 0 ${W} ${H}`);
  const x = d3.scaleLinear().domain([0, d3.max([...tot.values()])]).nice().range([ml, W - 40]);
  const ticks = x.ticks(Math.min(6, Math.max(2, Math.floor((W - ml) / 80)))).filter(Number.isInteger);
  svg.append('g').attr('class', 'gd-grid').selectAll('line').data(ticks).join('line').attr('x1', (d) => x(d)).attr('x2', (d) => x(d)).attr('y1', top).attr('y2', H - 22);
  svg.append('g').selectAll('text').data(ticks).join('text').attr('x', (d) => x(d)).attr('y', H - 7).attr('text-anchor', 'middle').text((d) => d);
  const tip = GD.tip(el), bars = [];
  cats.forEach((c, i) => {
    let acc = 0;
    cfg.sers.forEach((s) => { const r = rows.find((q) => q[cfg.catKey] === c && q[cfg.serKey] === s.key); if (!r) return; bars.push({ c, s, n: r.n, x0: x(acc), x1: x(acc + r.n), y: top + i * rowH + 5 }); acc += r.n; });
    svg.append('text').attr('x', x(acc) + 6).attr('y', top + i * rowH + rowH / 2 + 4).text(acc);
  });
  const sel = svg.append('g').selectAll('rect').data(bars).join('rect').attr('class', (d) => 'gd-seg ' + d.s.cls)
    .attr('x', (d) => d.x0).attr('y', (d) => d.y).attr('width', (d) => Math.max(2, d.x1 - d.x0 - 2)).attr('height', rowH - 14).attr('rx', 3);
  pointerTip(sel, tip, (d) => [lab(d.c) + ' · ' + d.s.key, [d.n + ' ' + cfg.unit].concat(cfg.detail ? cfg.detail(d.c, d.s.key) : [])]);
};

dash.draw('chart_actions', (el) => {
  const g = gate(el, 'actions_by', 'actions', 'evidence_counts'); if (!g) return;
  GD.hstack(el, {
    rows: g[0], catKey: 'line_name', serKey: 'evidence', unit: 'actions',
    sers: [{ key: 'Fewer than 10 records', cls: 's3' }, { key: '10 or more records', cls: 's1' }, { key: 'Not measured', cls: 'dd' }],
    aria: 'Stacked bar chart: number of CMP actions in each strategic line, split by the amount of published evidence.',
    detail: (c, s) => {
      const line = (g[0].find((r) => r.line_name === c) || {}).line;
      const ids = g[1].filter((a) => a.line === line).filter((a) => { const e = g[2].find((x) => x.id === a.id); const k = !e || !e.measured ? 'Not measured' : e.count < 10 ? 'Fewer than 10 records' : '10 or more records'; return k === s; }).map((a) => a.id);
      return ids.length ? [ids.join(', ')] : [];
    }
  });
});

/* Abundance estimates grouped by management unit, log scale. */
dash.draw('chart_abund', (el) => {
  const g = gate(el, 'abundance', 'mus'); if (!g) return;
  const [ab, mus] = g; el.replaceChildren();
  el.append(legendOf([{ cls: 'dot', label: 'Point estimate' }, { cls: 'rng', label: '95% confidence interval or reported range' }]));
  const groups = mus.slice().sort((a, b) => a.order - b.order).map((m) => ({ key: m.mu, title: m.mu + ' · ' + m.name }));
  [...new Set(ab.map((r) => r.mu))].filter((k) => !groups.some((gg) => gg.key === k)).forEach((k) => groups.push({ key: k, title: k }));
  const items = [];
  groups.forEach((gr) => { items.push({ t: 'head', gr }); const s = ab.filter((r) => r.mu === gr.key); if (!s.length) items.push({ t: 'gap', gr }); s.forEach((r) => items.push({ t: 'est', gr, r })); });
  const W = Math.max(280, el.clientWidth), narrow = W < 520;
  const svg = d3.select(el).append('svg').attr('role', 'img').attr('width', '100%').attr('aria-label', 'Range chart of franciscana abundance estimates by study, grouped by management unit from north to south, on a logarithmic scale.');
  let yy = 2; items.forEach((it) => { it.y = yy; it.h = it.t === 'head' ? 26 : 20; yy += it.h; });
  const H = yy + 26; svg.attr('height', H).attr('viewBox', `0 0 ${W} ${H}`);
  const estLabs = svg.append('g').selectAll('text').data(items.filter((i) => i.t === 'est')).join('text').attr('class', 'gd-lbl').attr('x', 12).text((d) => d.r.area);
  const ml = measure(estLabs, Math.round(W * (narrow ? 0.46 : 0.42)), 12);
  estLabs.attr('y', (d) => d.y + d.h / 2 + 4);
  const x = d3.scaleLog().domain([20, 20000]).range([ml, W - 24]);
  const ticks = narrow ? [50, 500, 5000] : [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  svg.append('g').attr('class', 'gd-grid').selectAll('line').data(ticks).join('line').attr('x1', (d) => x(d)).attr('x2', (d) => x(d)).attr('y1', 0).attr('y2', H - 22);
  svg.append('g').selectAll('text').data(ticks).join('text').attr('x', (d) => x(d)).attr('y', H - 7).attr('text-anchor', 'middle').text((d) => d3.format('~s')(d));
  items.filter((i) => i.t === 'head').forEach((it, k) => {
    if (k) svg.append('line').attr('x1', 0).attr('x2', W).attr('y1', it.y + 1).attr('y2', it.y + 1).style('stroke', 'var(--color-border-line)');
    svg.append('text').attr('class', 'gd-head').attr('x', 0).attr('y', it.y + 19).text(it.gr.title);
  });
  items.filter((i) => i.t === 'gap').forEach((it) => svg.append('text').attr('class', 'gd-gap').attr('x', 12).attr('y', it.y + 14).text('No estimate in the sources reviewed'));
  const tip = GD.tip(el), est = items.filter((i) => i.t === 'est'), mk = svg.append('g');
  est.forEach((it) => {
    const r = it.r, cy = it.y + it.h / 2;
    if (r.low !== r.high) mk.append('rect').attr('class', 'gd-ci').attr('x', x(r.low)).attr('y', cy - 3).attr('width', Math.max(4, x(r.high) - x(r.low))).attr('height', 6).attr('rx', 3);
    if (r.point != null) mk.append('circle').attr('class', 'gd-pt').attr('cx', x(r.point)).attr('cy', cy).attr('r', 4.5);
    const txt = r.point != null ? fmt(r.point) : fmt(r.low) + '–' + fmt(r.high);
    const right = x(r.high) < W - 60;
    mk.append('text').attr('x', right ? x(r.high) + 8 : x(r.low) - 8).attr('y', cy + 4).attr('text-anchor', right ? 'start' : 'end').text(txt);
  });
  const hit = svg.append('g').selectAll('rect').data(est).join('rect').attr('class', 'gd-hit').attr('x', 0).attr('width', W).attr('y', (d) => d.y).attr('height', (d) => d.h);
  pointerTip(hit, tip, (d) => [d.r.area + ' (' + d.r.mu + ')', [d.r.point != null ? 'Estimate: ' + fmt(d.r.point) : '', d.r.low !== d.r.high ? 'Interval: ' + fmt(d.r.low) + '–' + fmt(d.r.high) : '', d.r.cv ? 'CV: ' + d.r.cv : '', d.r.method, d.r.source].filter(Boolean)]);
});

/* Conservation status by jurisdiction over time. */
dash.draw('chart_status', (el) => {
  const g = gate(el, 'status'); if (!g) return;
  const st = g[0]; el.replaceChildren();
  const lanes = [
    { label: 'IUCN Red List (global)', f: (r) => r.level === 'Global' },
    { label: 'FMA Ia (independent assessment)', f: (r) => r.level === 'Regional' },
    { label: 'Brazil (national list)', f: (r) => r.level === 'National' && r.jurisdiction === 'Brazil' },
    { label: 'Uruguay', f: (r) => r.level === 'National' && r.jurisdiction === 'Uruguay' },
    { label: 'Argentina', f: (r) => r.level === 'National' && r.jurisdiction === 'Argentina' }
  ];
  lanes.forEach((l) => { l.pts = st.filter(l.f).sort((a, b) => (a.year == null ? 9999 : a.year) - (b.year == null ? 9999 : b.year)); });
  el.append(legendOf(['VU', 'EN', 'CR', 'T'].filter((c) => st.some((r) => r.category === c)).map((c) => ({ cls: CC[c], label: CW2[c] + ' (' + c + ')' }))));
  const W = Math.max(280, el.clientWidth), narrow = W < 520, laneH = 30, top = 4, H = top + lanes.length * laneH + 26;
  const svg = d3.select(el).append('svg').attr('role', 'img').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`)
    .attr('aria-label', 'Timeline of franciscana conservation status assessments by jurisdiction.');
  const labs = svg.append('g').selectAll('text').data(lanes).join('text').attr('class', 'gd-lbl').text((l) => l.label);
  const ml = measure(labs, Math.round(W * 0.4));
  labs.attr('x', 0).attr('y', (l, i) => top + i * laneH + laneH / 2 + 4);
  const hasND = st.some((r) => r.year == null), ndX = W - 26;
  const x = d3.scaleLinear().domain([2005, 2026]).range([ml + 10, W - (hasND ? 62 : 30)]);
  const ticks = narrow ? [2010, 2020] : [2005, 2010, 2015, 2020, 2025];
  svg.append('g').attr('class', 'gd-grid').selectAll('line').data(ticks).join('line').attr('x1', (d) => x(d)).attr('x2', (d) => x(d)).attr('y1', top).attr('y2', H - 22);
  svg.append('g').selectAll('text').data(ticks).join('text').attr('x', (d) => x(d)).attr('y', H - 7).attr('text-anchor', 'middle').text((d) => d);
  if (hasND) svg.append('text').attr('x', ndX).attr('y', H - 7).attr('text-anchor', 'middle').text('n.d.');
  const px = (r) => (r.year == null ? ndX : x(r.year));
  lanes.forEach((l, i) => { const cy = top + i * laneH + laneH / 2; l.pts.forEach((p) => { p.cy = cy; p.lane = l.label; }); const dd = l.pts.filter((p) => p.year != null); if (dd.length > 1) svg.append('path').attr('class', 'gd-ln').attr('d', d3.line().x(px).y((r) => r.cy)(dd)); });
  const pts = lanes.flatMap((l) => l.pts);
  svg.append('g').selectAll('circle').data(pts).join('circle').attr('class', (d) => 'gd-mk ' + (CC[d.category] || 's1')).attr('cx', px).attr('cy', (d) => d.cy).attr('r', narrow ? 6 : 8);
  pts.forEach((p) => svg.append('text').attr('x', px(p) + (narrow ? 9 : 12)).attr('y', p.cy + 4).text(p.category));
  const tip = GD.tip(el);
  const hit = svg.append('g').selectAll('circle').data(pts).join('circle').attr('class', 'gd-hit').attr('cx', px).attr('cy', (d) => d.cy).attr('r', 13);
  pointerTip(hit, tip, (d) => [d.lane + ' · ' + (CW2[d.category] || d.category), ['Year: ' + (d.year == null ? 'not recorded' : d.year), d.criterion ? 'Criteria: ' + d.criterion : '', 'Source: ' + d.source].filter(Boolean)]);
});

/* Records per year: OpenAlex works (bars) and PubMed records (line). */
dash.draw('chart_lit', (el) => {
  const g = gate(el, 'pubmed_years', 'lit_years'); if (!g) return;
  el.replaceChildren();
  const pmc = 'var(--gd-a)';
  const lg = legendOf([{ cls: 's1', label: 'OpenAlex works naming the species (articles, theses, chapters)' }, { cls: 'part', label: 'Current year, incomplete' }]);
  const li = h('span', null, h('i', { class: 'gd-sw' }), 'PubMed records'); li.firstChild.style.background = pmc; li.firstChild.style.height = '3px'; li.firstChild.style.verticalAlign = '3px';
  lg.append(li); el.append(lg);
  const START = 1970;
  const early = d3.sum(g[1].filter((r) => r.year < START), (r) => r.articles) + d3.sum(g[0].filter((r) => r.year < START), (r) => r.records);
  if (early) lg.append(h('span', null, early + ' works before ' + START + ' not shown'));
  const pm = g[0].filter((r) => r.year >= START).sort((a, b) => a.year - b.year), oa = g[1].filter((r) => r.year >= START).sort((a, b) => a.year - b.year);
  const y0 = START, y1 = Math.max(pm[pm.length - 1].year, oa[oa.length - 1].year);
  const years = d3.range(y0, y1 + 1);
  const W = Math.max(280, el.clientWidth), H = W < 520 ? 210 : 250, ml = 28, mr = 10, mt = 8, mb = 24;
  const x = d3.scaleBand().domain(years).range([ml, W - mr]).padding(0.15);
  const y = d3.scaleLinear().domain([0, d3.max([d3.max(oa, (r) => r.articles), d3.max(pm, (r) => r.records)])]).nice().range([H - mb, mt]);
  const svg = d3.select(el).append('svg').attr('role', 'img').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`)
    .attr('aria-label', 'Bar and line chart of OpenAlex works and PubMed records on the franciscana per year of publication.');
  const yt = y.ticks(4);
  svg.append('g').attr('class', 'gd-grid').selectAll('line').data(yt).join('line').attr('x1', ml).attr('x2', W - mr).attr('y1', (d) => y(d)).attr('y2', (d) => y(d));
  svg.append('g').selectAll('text').data(yt).join('text').attr('x', ml - 6).attr('y', (d) => y(d) + 4).attr('text-anchor', 'end').text((d) => d);
  const step = W < 520 ? 20 : 10;
  const xt = years.filter((v) => v % step === 0 || v === y1);
  svg.append('g').selectAll('text').data(xt).join('text').attr('x', (d) => x(d) + x.bandwidth() / 2).attr('y', H - 7).attr('text-anchor', 'middle').text((d) => d);
  svg.append('g').selectAll('rect').data(oa.filter((r) => r.articles > 0)).join('rect').attr('class', (r) => 'gd-lit oa' + (r.partial ? ' part' : ''))
    .attr('x', (r) => x(r.year)).attr('width', x.bandwidth()).attr('y', (r) => y(r.articles)).attr('height', (r) => y(0) - y(r.articles)).attr('rx', 1.5);
  const pmAll = years.map((yr) => ({ year: yr, records: (pm.find((r) => r.year === yr) || {}).records || 0 }));
  svg.append('path').attr('d', d3.line().x((r) => x(r.year) + x.bandwidth() / 2).y((r) => y(r.records))(pmAll)).attr('fill', 'none').attr('stroke-width', 1.8).style('stroke', pmc);
  const tip = GD.tip(el);
  const hit = svg.append('g').selectAll('rect').data(years).join('rect').attr('class', 'gd-hit').attr('x', (d) => x(d)).attr('width', x.step()).attr('y', mt).attr('height', H - mt - mb);
  pointerTip(hit, tip, (yr) => { const o = oa.find((r) => r.year === yr) || {}; const p = pm.find((r) => r.year === yr) || {}; return [String(yr), ['OpenAlex: ' + (o.articles || 0) + (o.partial ? ' (incomplete year)' : ''), 'PubMed: ' + (p.records || 0)]]; });
});

/* Evidence per CMP action. */
dash.draw('chart_evid', (el) => {
  const g = gate(el, 'evidence_counts'); if (!g) return;
  el.replaceChildren();
  const p = dash.params();
  const rows = g[0].filter((r) => r.measured && (!p.e_line || r.line === p.e_line));
  const LC = { RES: 's1', MON: 's2', MIT: 's3', PAC: 's4' };
  el.append(legendOf(Object.entries(GD.LINES).filter(([k]) => rows.some((r) => r.line === k)).map(([k, v]) => ({ cls: LC[k], label: v })).concat([{ cls: 'pmpart', label: 'PubMed part' }, { cls: 'dd', label: 'No record found' }])));
  const W = Math.max(280, el.clientWidth), rowH = 22, top = 4, H = top + rows.length * rowH + 24;
  const svg = d3.select(el).append('svg').attr('role', 'img').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`)
    .attr('aria-label', 'Bar chart of the number of records (PubMed plus OpenAlex) matching the topic of each CMP action; the darker inner bar is the PubMed part and a dashed line marks 10 records.');
  const labs = svg.append('g').selectAll('text').data(rows).join('text').attr('class', 'gd-lbl').text((r) => r.id + ' · ' + r.label);
  const ml = measure(labs, Math.round(W * 0.5));
  labs.attr('x', 0).attr('y', (r, i) => top + i * rowH + rowH / 2 + 4);
  const x = d3.scaleLinear().domain([0, Math.max(10, d3.max(rows, (r) => r.count))]).nice().range([ml, W - 36]);
  const ticks = x.ticks(Math.max(2, Math.floor((W - ml) / 70)));
  svg.append('g').attr('class', 'gd-grid').selectAll('line').data(ticks).join('line').attr('x1', (d) => x(d)).attr('x2', (d) => x(d)).attr('y1', top).attr('y2', H - 22);
  svg.append('g').selectAll('text').data(ticks).join('text').attr('x', (d) => x(d)).attr('y', H - 7).attr('text-anchor', 'middle').text((d) => d);
  svg.append('line').attr('class', 'gd-thr').attr('x1', x(10)).attr('x2', x(10)).attr('y1', top).attr('y2', H - 22);
  svg.append('g').selectAll('rect').data(rows).join('rect').attr('class', (r) => 'gd-bar ' + (r.count === 0 ? 'zero' : LC[r.line]))
    .attr('x', ml).attr('y', (r, i) => top + i * rowH + 4).attr('height', rowH - 8).attr('width', (r) => (r.count === 0 ? 10 : Math.max(2, x(r.count) - ml))).attr('rx', 2);
  svg.append('g').selectAll('rect').data(rows.filter((r) => r.count_pubmed > 0)).join('rect').attr('class', 'gd-bar pmpart')
    .attr('x', ml).attr('y', (r) => top + rows.indexOf(r) * rowH + 8).attr('height', rowH - 16).attr('width', (r) => Math.max(2, x(r.count_pubmed) - ml)).attr('rx', 1);
  svg.append('g').selectAll('text').data(rows).join('text').attr('x', (r) => (r.count === 0 ? ml + 14 : x(r.count) + 5)).attr('y', (r, i) => top + i * rowH + rowH / 2 + 4).text((r) => r.count);
  const tip = GD.tip(el);
  const hit = svg.append('g').selectAll('rect').data(rows).join('rect').attr('class', 'gd-hit').attr('x', 0).attr('width', W).attr('y', (r, i) => top + i * rowH).attr('height', rowH);
  pointerTip(hit, tip, (r) => [r.id + ' · ' + r.topic, [r.count + ' records in all', r.count_pubmed + ' in PubMed · ' + (r.count_oa || 0) + ' added from OpenAlex', 'Topic: ' + r.label]]);
});

/* Filters whose choices come from data. */
GD.select('f_e_line', 'e_line', 'All strategic lines', 'actions', (r) => [...new Set(r.map((a) => a.line))].map((l) => ({ value: l, label: GD.LINES[l] || l })));
GD.select('f_a_line', 'a_line', 'All strategic lines', 'actions', (r) => [...new Set(r.map((a) => a.line))].map((l) => ({ value: l, label: GD.LINES[l] || l })));
GD.select('f_r_action', 'r_action', 'All actions', 'evidence_counts', (r) => r.filter((x) => x.measured).map((x) => ({ value: x.id, label: x.id + ' · ' + x.label })));

const P = () => dash.params();
const blank = (v) => (v ? v : '—');

dash.draw('units_body', (tb) => {
  const g = gate(tb, 'mu_cov'); if (!g) return;
  fill(tb, g[0], [
    { cls: 'nw', f: (r) => r.mu }, { f: (r) => r.country }, { f: (r) => r.range }, { cls: 'num', f: (r) => String(r.n_est) },
    { cls: 'nw', f: (r) => (r.n_est ? (r.low === r.high ? fmt(r.low) : fmt(r.low) + '–' + fmt(r.high)) : badge('No estimate', 'gap')) },
    { cls: 'wide', f: (r) => r.note }
  ]);
});
dash.draw('threat_body', (tb) => {
  const g = gate(tb, 'threat_cov'); if (!g) return;
  fill(tb, g[0], [
    { f: (r) => r.threat }, { f: (r) => r.kind }, { f: (r) => badge(r.role, r.role === 'Main threat' ? 'vh' : '') },
    { cls: 'wide', f: (r) => h('span', null, r.evidence, more('Sources', r.refs)) }, { f: (r) => r.where },
    { cls: 'nw', f: (r) => h('span', null, r.n_actions + ' actions', more('Identifiers', r.action_ids)) }
  ]);
});
dash.draw('actions_body', (tb) => {
  const g = gate(tb, 'actions', 'evidence_counts'); if (!g) return;
  const p = P(), q = String(p.a_q || '').toLowerCase();
  const rows = g[0].filter((r) => (!p.a_line || r.line === p.a_line) && (!q || (r.id + ' ' + r.title + ' ' + r.topic + ' ' + r.region).toLowerCase().includes(q)));
  fill(tb, rows, [
    { cls: 'nw', f: (r) => r.id }, { f: (r) => GD.LINES[r.line] || r.line }, { f: (r) => r.topic }, { cls: 'wide', f: (r) => r.title }, { f: (r) => r.region },
    { cls: 'num', f: (r) => { const e = g[1].find((x) => x.id === r.id); return e && e.measured ? String(e.count) : 'n/m'; } }
  ]);
});
dash.draw('ca_body', (tb) => {
  const g = gate(tb, 'cms_activities'); if (!g) return;
  fill(tb, g[0], [
    { f: (r) => r.activity }, { cls: 'wide', f: (r) => r.result }, { cls: 'nw', f: (r) => r.timeframe }, { f: (r) => r.responsibility },
    { f: (r) => badge(r.funding, r.funded === 'Needed' ? 'warn' : r.funded === 'Identified' ? 'md' : '') }, { cls: 'nw', f: (r) => blank(r.cmp) }
  ]);
});
dash.draw('prog_body', (tb) => {
  const g = gate(tb, 'cms_progress'); if (!g) return;
  fill(tb, g[0], [{ f: (r) => r.activity }, { f: (r) => badge(r.status, 'md') }, { cls: 'wide', f: (r) => r.progress }, { cls: 'wide', f: (r) => r.difficulties }]);
});
dash.draw('instr_body', (tb) => {
  const g = gate(tb, 'instruments'); if (!g) return;
  fill(tb, g[0], [{ cls: 'nw', f: (r) => r.ref }, { cls: 'wide', f: (r) => r.title }, { f: (r) => r.theme }, { f: (r) => r.source }]);
});
dash.draw('status_body', (tb) => {
  const g = gate(tb, 'status'); if (!g) return;
  fill(tb, g[0], [{ f: (r) => r.area }, { cls: 'nw', f: (r) => (r.year == null ? 'n.d.' : String(r.year)) }, { f: (r) => badge(r.category + ' · ' + (CW2[r.category] || ''), CC[r.category] === 's4' ? 'vh' : '') }, { f: (r) => blank(r.criterion) }, { cls: 'wide', f: (r) => r.source }]);
});
dash.draw('states_body', (tb) => {
  const g = gate(tb, 'states'); if (!g) return;
  fill(tb, g[0], [{ cls: 'nw', f: (r) => r.country }, { f: (r) => r.fmas }, { f: (r) => r.iwc }, { f: (r) => r.cms }, { cls: 'wide', f: (r) => r.instruments }]);
});
dash.draw('timeline', (ul) => {
  const g = gate(ul, 'milestones'); if (!g) return;
  ul.replaceChildren(...g[0].map((m) => h('li', { class: m.kind === 'Planned' ? 'plan' : '' }, h('span', { class: 'gd-tl-y', text: String(m.year) }), m.event, ' ', h('span', { class: 'gd-tl-k', text: '(' + m.kind + '; ' + m.source + ')' }))));
});
dash.draw('evid_body', (tb) => {
  const g = gate(tb, 'evidence_counts'); if (!g) return;
  const p = P(); const rows = g[0].filter((r) => !p.e_line || r.line === p.e_line);
  fill(tb, rows, [
    { cls: 'nw', f: (r) => r.id }, { f: (r) => r.topic }, { f: (r) => r.label },
    { cls: 'num', f: (r) => (r.measured ? String(r.count_pubmed) : 'n/m') }, { cls: 'num', f: (r) => (r.measured ? String(r.count_oa || 0) : '') }, { cls: 'num', f: (r) => (r.measured ? String(r.count) : '') },
    { cls: 'wide', f: (r) => (r.rule ? more("Keyword rule", r.rule) : 'Governance or data-access action; not measured by a literature count') }
  ]);
});
dash.draw('rec_body', (tb) => {
  const g = gate(tb, 'pubmed_records', 'evidence_counts'); if (!g) return;
  const p = P(), q = String(p.r_q || '').toLowerCase();
  let rows = g[0];
  if (p.r_action) { const e = g[1].find((x) => x.id === p.r_action); const set = new Set(String((e && e.pmids) || '').split(';')); rows = rows.filter((r) => set.has(String(r.pmid))); }
  if (q) rows = rows.filter((r) => (r.title + ' ' + r.year + ' ' + (r.first_author || '') + ' ' + r.journal).toLowerCase().includes(q));
  fill(tb, rows, [
    { cls: 'nw', f: (r) => (r.year == null ? '' : String(r.year)) }, { cls: 'nw', f: (r) => r.first_author || '' }, { cls: 'wide', f: (r) => r.title || '(title not retrieved)' }, { f: (r) => r.journal },
    { f: (r) => blank(r.actions) }, { cls: 'nw', f: (r) => (r.doi ? link('https://doi.org/' + r.doi, 'DOI') : link('https://pubmed.ncbi.nlm.nih.gov/' + r.pmid + '/', 'PubMed')) }
  ]);
});
dash.draw('rec_count', (el) => {
  const g = gate(el, 'pubmed_records', 'evidence_counts'); if (!g) return;
  const p = P(), q = String(p.r_q || '').toLowerCase(); let rows = g[0];
  if (p.r_action) { const e = g[1].find((x) => x.id === p.r_action); const set = new Set(String((e && e.pmids) || '').split(';')); rows = rows.filter((r) => set.has(String(r.pmid))); }
  if (q) rows = rows.filter((r) => (r.title + ' ' + r.year + ' ' + (r.first_author || '') + ' ' + r.journal).toLowerCase().includes(q));
  el.textContent = 'Showing ' + rows.length + ' of ' + g[0].length + ' records';
});
dash.draw('cited_body', (tb) => {
  const g = gate(tb, 'most_cited'); if (!g) return;
  fill(tb, g[0], [{ cls: 'nw', f: (r) => String(r.year) }, { cls: 'nw', f: (r) => r.first_author || '' }, { cls: 'wide', f: (r) => r.title }, { f: (r) => r.journal }, { cls: 'num', f: (r) => String(r.citations) }, { cls: 'nw', f: (r) => (r.doi ? link(r.doi, 'DOI') : '') }]);
});
dash.draw('pm_body', (tb) => {
  const g = gate(tb, 'pubmed_live'); if (!g) return;
  fill(tb, g[0], [{ cls: 'nw', f: (r) => r.date }, { cls: 'nw', f: (r) => r.first_author || '' }, { cls: 'wide', f: (r) => r.title }, { f: (r) => r.journal }, { cls: 'nw', f: (r) => (r.doi ? link('https://doi.org/' + r.doi, 'DOI') : '') }]);
});
dash.draw('flags_body', (tb) => {
  const g = gate(tb, 'flags'); if (!g) return;
  const ORD = { 'To confirm': 0, Open: 1, Resolved: 2 };
  const rows = g[0].slice().sort((a, b) => (ORD[a.status] ?? 9) - (ORD[b.status] ?? 9));
  fill(tb, rows, [{ cls: 'nw', f: (r) => r.topic }, { cls: 'nw', f: (r) => badge(r.status, r.status === 'Resolved' ? '' : 'md') }, { cls: 'wide', f: (r) => r.issue }, { cls: 'wide', f: (r) => r.action }, { cls: 'wide', f: (r) => r.resolution }]);
});

/* Records added from OpenAlex (not in PubMed). */
GD.select('f_o_action', 'o_action', 'All actions and records', 'evidence_counts', (r) => r.filter((x) => x.measured).map((x) => ({ value: x.id, label: x.id + ' · ' + x.label })));
const oaRows = (rows) => {
  const p = dash.params(), q = String(p.o_q || '').toLowerCase();
  return rows.filter((r) => (!p.o_action || String(r.actions || '').split(', ').includes(p.o_action)) && (!q || (r.title + ' ' + r.year + ' ' + (r.first_author || '') + ' ' + r.source).toLowerCase().includes(q)));
};
dash.draw('oa_body', (tb) => {
  const g = gate(tb, 'oa_records'); if (!g) return;
  fill(tb, oaRows(g[0]), [
    { cls: 'nw', f: (r) => (r.year == null ? '' : String(r.year)) }, { cls: 'nw', f: (r) => r.first_author || '' }, { cls: 'wide', f: (r) => r.title },
    { f: (r) => r.source }, { cls: 'nw', f: (r) => r.type }, { f: (r) => blank(r.actions) }, { cls: 'nw', f: (r) => r.matched_by || '' },
    { cls: 'nw', f: (r) => (r.doi ? link('https://doi.org/' + r.doi, 'DOI') : link('https://openalex.org/' + r.openalex_id, 'OpenAlex')) }
  ]);
});
dash.draw('oa_count', (el) => {
  const g = gate(el, 'oa_records'); if (!g) return;
  el.textContent = 'Showing ' + oaRows(g[0]).length + ' of ' + g[0].length + ' records';
});
