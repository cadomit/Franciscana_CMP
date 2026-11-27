/* Small graphics for the "At a glance" cards. */
(() => {
  const { gate, h } = GD;
  const svgOf = (el, H, aria) => { el.replaceChildren(); const W = Math.max(240, el.clientWidth); return [d3.select(el).append('svg').attr('role', 'img').attr('aria-label', aria).attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`), W]; };

  dash.draw('ov_status_viz', (el) => {
    const g = gate(el, 'status'); if (!g) return;
    const cats = ['VU', 'EN', 'CR'];
    const lanes = [['IUCN', (r) => r.level === 'Global'], ['FMA Ia', (r) => r.level === 'Regional'], ['Brazil', (r) => r.level === 'National' && r.jurisdiction === 'Brazil']];
    const [svg, W] = svgOf(el, 92, 'Latest category in the IUCN Red List, the independent FMA Ia assessment and the Brazilian national list, on a scale from Vulnerable to Critically Endangered.');
    const x = d3.scalePoint().domain(cats).range([70, W - 20]);
    cats.forEach((c) => svg.append('text').attr('class', 'ov-tick').attr('x', x(c)).attr('y', 88).attr('text-anchor', 'middle').text(c));
    const tip = GD.tip(el);
    lanes.forEach(([lab, f], i) => {
      const y = 12 + i * 24;
      svg.append('line').attr('class', 'ov-axis').attr('x1', x('VU')).attr('x2', x('CR')).attr('y1', y).attr('y2', y);
      svg.append('text').attr('class', 'ov-tick').attr('x', 0).attr('y', y + 4).text(lab);
      const last = g[0].filter(f).filter((r) => r.year != null).sort((a, b) => b.year - a.year)[0];
      if (!last || !cats.includes(last.category)) return;
      const c = svg.append('circle').attr('class', 'gd-mk ' + GD.catCls[last.category] + (i === 0 ? ' ov-global' : '')).attr('cx', x(last.category)).attr('cy', y).attr('r', 7);
      c.on('pointermove pointerdown', (ev) => tip.show(ev, lab + ' · ' + GD.catWord[last.category], [String(last.year), last.source])).on('pointerleave', () => tip.hide());
    });
  });

  dash.draw('ov_mu_viz', (el) => {
    const g = gate(el, 'mu_cov'); if (!g) return;
    const rows = g[0], n = rows.length;
    const [svg, W] = svgOf(el, 58, 'One square per management unit, north to south; filled squares have at least one abundance estimate, dashed ones have none.');
    const s = Math.min(26, (W - 4) / n - 4);
    const tip = GD.tip(el);
    rows.forEach((r, i) => {
      const x0 = 2 + i * (s + 4);
      const rc = svg.append('rect').attr('class', 'ov-sq ' + (r.n_est ? (r.n_est > 1 ? 's3' : 's2') + ' gd-seg' : 'none')).attr('x', x0).attr('y', 4).attr('width', s).attr('height', s).attr('rx', 3);
      svg.append('text').attr('class', 'ov-tick').attr('x', x0 + s / 2).attr('y', s + 18).attr('text-anchor', 'middle').text(r.mu.replace('FMA ', '').replace('II Babitonga', 'Bab.'));
      rc.on('pointermove pointerdown', (ev) => tip.show(ev, r.mu + ' · ' + r.name, [r.n_est ? r.n_est + ' estimate(s), latest ' + r.latest : 'No estimate in the sources reviewed'])).on('pointerleave', () => tip.hide());
    });
  });

  dash.draw('ov_thr_list', (ul) => {
    const g = gate(ul, 'threats'); if (!g) return;
    ul.replaceChildren(...g[0].filter((t) => t.role === 'Main threat').concat(g[0].filter((t) => t.role !== 'Main threat').slice(0, 2)).map((t) => h('li', null, h('span', { class: 'ov-li-t', text: t.threat }), h('span', { class: 'ov-li-k', text: t.role + ' · ' + t.where }))));
  });

  dash.draw('ov_act_viz', (el) => {
    const g = gate(el, 'actions', 'evidence_counts'); if (!g) return;
    const lines = Object.keys(GD.LINES).filter((l) => g[0].some((a) => a.line === l));
    const [svg, W] = svgOf(el, lines.length * 24 + 4, 'Dots for each CMP action by strategic line; an orange outline marks actions with fewer than 10 records (PubMed + OpenAlex), hollow dots are not measured.');
    const tip = GD.tip(el);
    lines.forEach((l, i) => {
      const y = 12 + i * 24;
      svg.append('text').attr('class', 'ov-tick').attr('x', 0).attr('y', y + 4).text(l);
      g[0].filter((a) => a.line === l).forEach((a, k) => {
        const e = g[1].find((x) => x.id === a.id) || {};
        const cx = 44 + k * 22; if (cx > W - 8) return;
        const c = svg.append('circle').attr('cx', cx).attr('cy', y).attr('r', 8).attr('class', !e.measured ? 'ov-hollow' : 'gd-seg s2' + (e.count < 10 ? ' ov-low' : ''));
        c.on('pointermove pointerdown', (ev) => tip.show(ev, a.id + ' · ' + a.topic, [a.title, e.measured ? e.count + ' records (PubMed + OpenAlex)' : 'Not measured by a literature count'])).on('pointerleave', () => tip.hide());
      });
    });
  });

  dash.draw('ov_ca_viz', (el) => {
    const g = gate(el, 'cms_activities'); if (!g) return;
    const rows = g[0];
    const [svg, W] = svgOf(el, 34, 'One square per activity of the renewed CMS Concerted Action; outlined squares still need funds.');
    const s = Math.min(22, (W - 4) / rows.length - 4);
    const tip = GD.tip(el);
    rows.forEach((r, i) => {
      const rc = svg.append('rect').attr('x', 2 + i * (s + 4)).attr('y', 4).attr('width', s).attr('height', s).attr('rx', 3).attr('class', r.funded === 'Needed' ? 'ov-empty' : 'gd-seg s3');
      rc.on('pointermove pointerdown', (ev) => tip.show(ev, r.activity, [r.timeframe + ' · ' + r.funding])).on('pointerleave', () => tip.hide());
    });
  });

  dash.draw('ov_lit_viz', (el) => {
    const g = gate(el, 'pubmed_years'); if (!g) return;
    const rows = g[0].filter((r) => r.year >= 2000).sort((a, b) => a.year - b.year);
    const [svg, W] = svgOf(el, 60, 'Sparkline of PubMed records on the franciscana per year since 2000.');
    const x = d3.scaleBand().domain(rows.map((r) => r.year)).range([0, W]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(rows, (r) => r.records)]).range([46, 4]);
    const tip = GD.tip(el);
    svg.append('g').selectAll('rect').data(rows).join('rect').attr('class', (r) => 'gd-lit' + (r.partial ? ' part' : '')).attr('x', (r) => x(r.year)).attr('width', x.bandwidth()).attr('y', (r) => y(r.records)).attr('height', (r) => 46 - y(r.records))
      .on('pointermove pointerdown', (ev, r) => tip.show(ev, String(r.year), [r.records + ' records' + (r.partial ? ' (incomplete)' : '')])).on('pointerleave', () => tip.hide());
    svg.append('text').attr('class', 'ov-tick').attr('x', 0).attr('y', 58).text(rows[0].year);
    svg.append('text').attr('class', 'ov-tick').attr('x', W).attr('y', 58).attr('text-anchor', 'end').text(rows[rows.length - 1].year);
  });
})();
