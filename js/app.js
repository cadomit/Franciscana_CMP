const gdRoot = document.querySelector('.gd');
if (gdRoot) gdRoot.style.setProperty('--gd-a', dash.colors[0]);
const GD = window.GD = {};

GD.ok = (id) => { const d = dash.data(id); return d.status === 'ok' && Array.isArray(d.data) ? d.data : null; };
GD.gate = (el, ...ids) => {
  const out = [];
  for (const id of ids) {
    const d = dash.data(id);
    if (d.status === 'ok' && d.data != null) { out.push(d.data); continue; }
    if (['TBODY', 'SELECT', 'UL', 'OL'].includes(el.tagName)) el.replaceChildren();
    else el.textContent = d.status === 'error' ? 'Failed to load' : '—';
    return null;
  }
  return out;
};
GD.h = (tag, props, ...kids) => {
  const e = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v);
  }
  for (const k of kids.flat()) { if (k == null) continue; e.append(k.nodeType ? k : document.createTextNode(String(k))); }
  return e;
};
GD.badge = (text, cls) => GD.h('span', { class: 'gd-badge ' + (cls || ''), text });
GD.fmt = d3.format(',d');
GD.tip = (box) => {
  const t = document.createElement('div'); t.className = 'gd-tip'; t.hidden = true; box.appendChild(t);
  return {
    show(ev, title, lines) {
      t.replaceChildren(GD.h('div', { class: 'gd-tip-h', text: title }), ...(lines || []).map((l) => GD.h('div', { text: l })));
      t.hidden = false;
      const b = box.getBoundingClientRect(); const w = t.offsetWidth, hh = t.offsetHeight;
      let x = ev.clientX - b.left + 12, y = ev.clientY - b.top + 14;
      if (x + w > box.clientWidth) x = Math.max(0, ev.clientX - b.left - w - 12);
      if (y + hh > box.clientHeight) y = Math.max(0, ev.clientY - b.top - hh - 10);
      t.style.left = x + 'px'; t.style.top = y + 'px';
    },
    hide() { t.hidden = true; }
  };
};
GD.fill = (tbody, rows, cols) => {
  tbody.replaceChildren();
  if (!rows.length) { tbody.append(GD.h('tr', null, GD.h('td', { class: 'gd-empty', colspan: cols.length, text: 'No records match the current selection.' }))); return; }
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    cols.forEach((c) => { const td = document.createElement('td'); if (c.cls) td.className = c.cls; const v = c.f(r); if (v != null && v !== '') td.append(v.nodeType ? v : document.createTextNode(String(v))); tr.append(td); });
    tbody.append(tr);
  });
};
GD.more = (summary, text) => text ? GD.h('details', null, GD.h('summary', { text: summary }), GD.h('p', { text })) : null;
GD.link = (href, text) => (/^https?:\/\//.test(href) ? GD.h('a', { href, target: '_blank', rel: 'noopener noreferrer', text }) : text);
GD.catWord = { DD: 'Data Deficient', NT: 'Near Threatened', VU: 'Vulnerable', EN: 'Endangered', CR: 'Critically Endangered', T: 'Listed, category not confirmed' };
GD.catCls = { DD: 'dd', NT: 's1', VU: 's2', EN: 's3', CR: 's4', T: 'tu' };
GD.LINES = { RES: 'Research', MON: 'Monitoring', MIT: 'Mitigation', PAC: 'Public awareness and cooperation' };
GD.select = (name, param, allLabel, src, vals) => dash.draw(name, (sel) => {
  const rows = GD.ok(src) || [];
  sel.replaceChildren(new Option(allLabel, ''), ...vals(rows).map((v) => (typeof v === 'string' ? new Option(v, v) : new Option(v.label, v.value))));
  sel.value = dash.params()[param] || '';
  sel.onchange = () => dash.setParams({ [param]: sel.value || null });
});

dash.loader('evidence_counts', {
  description: 'Reads the evidence snapshot: one row per CMP action with its topic rule, the PubMed records matched, the OpenAlex records added (not in PubMed) and the integrated count; searches, dates and totals go to the notes.',
  fn: ({ answer }) => {
    const a = typeof answer === 'string' ? JSON.parse(answer) : answer;
    const rows = (a.rows || []).map((r) => ({ id: r.id, line: r.line, topic: r.topic, label: r.label, measured: r.measured, count_pubmed: r.count_pubmed, count_oa: r.count_oa == null ? null : r.count_oa, count: r.count == null ? r.count_pubmed : r.count, rule: r.rule, pmids: r.pmids || '' }));
    return { data: rows, columns: ['id', 'line', 'topic', 'label', 'measured', 'count_pubmed', 'count_oa', 'count', 'rule', 'pmids'], meta: [{ label: 'PubMed search', value: String(a.query || '') }, { label: 'PubMed retrieved', value: String(a.retrieved || '') }, { label: 'PubMed records naming the species', value: String(a.baseline || '') }, { label: 'OpenAlex records added (not in PubMed)', value: String(a.baseline_oa == null ? '' : a.baseline_oa) }, { label: 'OpenAlex retrieved', value: String(a.retrieved_oa || '') }] };
  }
});

dash.loader('pubmed_live', {
  description: 'Fetches the title, journal, date and DOI of each PubMed record returned by the search; only the first author’s surname is kept, followed by “et al.”, for personal-data protection.',
  fn: async ({ answer, call }) => {
    const ids = (answer && answer.pmids) || [];
    const meta = [{ label: 'PubMed query as translated', value: String((answer && answer.query_translation) || '') }, { label: 'Records matching (all years)', value: String((answer && answer.total_count) != null ? answer.total_count : '') }];
    const columns = ['pmid', 'date', 'first_author', 'title', 'journal', 'doi'];
    if (!ids.length) return { data: [], columns, meta };
    const res = await call('get_article_metadata', { pmids: ids });
    const arts = (res && res.articles) || [];
    const mon = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const data = arts.map((a) => {
      const d = a.publication_date || {}; const aus = a.authors || []; const au = aus[0] || {};
      const m = /^[A-Za-z]{3}/.test(String(d.month || '')) ? String(mon.indexOf(String(d.month).slice(0, 3).toLowerCase()) + 1).padStart(2, '0') : d.month && String(d.month).padStart(2, '0');
      return {
        pmid: String((a.identifiers || {}).pmid || ''),
        date: [d.year, m, d.day && String(d.day).padStart(2, '0')].filter(Boolean).join('-'),
        first_author: au.last_name ? au.last_name + (aus.length > 1 ? ' et al.' : '') : '',
        title: String(a.title || '').replace(/\s+/g, ' ').trim(),
        journal: String((a.journal && a.journal.title) || ''),
        doi: String((a.identifiers || {}).doi || '')
      };
    }).sort((x, y) => (y.date > x.date ? 1 : y.date < x.date ? -1 : 0));
    return { data, columns, meta };
  }
});

dash.calc('kpi', {
  inputs: ['status', 'mus', 'abundance', 'actions', 'cms_activities'],
  title: 'Headline indicators',
  description: 'Latest global and Brazilian categories, management units with an abundance estimate, number of CMP actions and Concerted Action activities still needing funds.',
  fn: (status, mus, abundance, actions, activities) => {
    const withEst = new Set(abundance.map((r) => r.mu));
    const gaps = mus.filter((m) => !withEst.has(m.mu)).map((m) => m.mu);
    const latest = (lvl, j) => status.filter((r) => r.level === lvl && (!j || r.jurisdiction === j) && r.year != null).sort((a, b) => b.year - a.year)[0] || {};
    const g = latest('Global'), n = latest('National', 'Brazil');
    return [{
      global_cat: g.category, global_year: g.year, national_cat: n.category, national_year: n.year,
      n_mus: mus.length, n_mus_est: mus.length - gaps.length, gap_mus: gaps.join(', '),
      n_actions: actions.length, n_ca: activities.length, n_ca_needed: activities.filter((a) => a.funded === 'Needed').length
    }];
  }
});

dash.calc('mu_cov', {
  inputs: ['mus', 'abundance'],
  title: 'Abundance evidence by management unit',
  description: 'Number of abundance estimates and the lowest and highest values reported for each management unit.',
  fn: (mus, abundance) => mus.slice().sort((a, b) => a.order - b.order).map((m) => {
    const s = abundance.filter((r) => r.mu === m.mu);
    return { mu: m.mu, name: m.name, country: m.country, range: m.range, note: m.note, order: m.order, n_est: s.length, low: s.length ? d3.min(s, (r) => r.low) : null, high: s.length ? d3.max(s, (r) => r.high) : null, latest: s.length ? d3.max(s, (r) => r.year) : null };
  })
});

dash.calc('actions_by', {
  inputs: ['actions', 'evidence_counts'],
  title: 'Actions by strategic line',
  description: 'Number of CMP actions in each strategic line, split by whether the published evidence (PubMed plus OpenAlex) is fewer than 10 records, 10 or more, or not measured by a literature count.',
  fn: (actions, evidence) => {
    const out = [];
    const cls = (a) => { const e = evidence.find((x) => x.id === a.id); if (!e || !e.measured) return 'Not measured'; return e.count < 10 ? 'Fewer than 10 records' : '10 or more records'; };
    Object.entries(GD.LINES).forEach(([l, name]) => ['Fewer than 10 records', '10 or more records', 'Not measured'].forEach((s) => {
      const n = actions.filter((a) => a.line === l && cls(a) === s).length;
      if (n) out.push({ line: l, line_name: name, evidence: s, n });
    }));
    return out;
  }
});

dash.calc('threat_cov', {
  inputs: ['threats', 'actions'],
  title: 'Action coverage of threats',
  description: 'For each threat, the CMP actions linked to it in this dashboard and how many of them exist in the action list.',
  fn: (threats, actions) => threats.map((t) => {
    const ids = String(t.actions || '').split(';').map((s) => s.trim()).filter(Boolean);
    return { threat: t.threat, kind: t.kind, role: t.role, evidence: t.evidence, where: t.where, refs: t.refs, n_actions: ids.filter((id) => actions.some((a) => a.id === id)).length, action_ids: ids.join(', ') };
  })
});

dash.calc('evid_stats', {
  inputs: ['evidence_counts', 'pubmed_records', 'oa_records'],
  title: 'Evidence indicators',
  description: 'Records naming the species (PubMed plus OpenAlex records not in PubMed), actions measured by a literature count, the weakest and strongest evidenced actions and those under 10 records in the integrated count (and on PubMed alone).',
  fn: (evidence, records, oa) => {
    const m = evidence.filter((r) => r.measured);
    const lo = m.slice().sort((a, b) => a.count - b.count)[0] || {};
    const hi = m.slice().sort((a, b) => b.count - a.count)[0] || {};
    const low = m.filter((r) => r.count < 10);
    return [{ baseline: records.length + oa.length, base_pm: records.length, base_oa: oa.length, n_actions: evidence.length, n_meas: m.length, lo_id: lo.id, lo_n: lo.count, hi_id: hi.id, hi_n: hi.count, n_low: low.length, n_low_pm: m.filter((r) => r.count_pubmed < 10).length, n_zero: m.filter((r) => r.count === 0).length, low_ids: low.map((r) => r.id).join(', ') }];
  }
});

dash.calc('lit_stats', {
  inputs: ['pubmed_years', 'lit_years'],
  title: 'Literature indicators',
  description: 'Total PubMed and OpenAlex records, first year, peak year and the latest complete and current-year counts; the current year is excluded from the peak.',
  fn: (pm, oa) => {
    const o = oa.slice().sort((a, b) => a.year - b.year);
    const ofull = o.filter((r) => !r.partial);
    const opk = ofull.length ? ofull.reduce((a, b) => (b.articles > a.articles ? b : a)) : {};
    const p = pm.slice().sort((a, b) => a.year - b.year);
    const full = p.filter((r) => !r.partial);
    const pk = full.reduce((a, b) => (b.records > a.records ? b : a));
    const first = p.find((r) => r.records > 0) || {};
    const part = p.find((r) => r.partial) || {};
    const since2011 = d3.sum(p.filter((r) => r.year >= 2011), (r) => r.records);
    return [{ oa_total: d3.sum(o, (r) => r.articles), oa_first: (o.find((r) => r.articles > 0) || {}).year, oa_peak_year: opk.year, oa_peak_n: opk.articles, total: d3.sum(p, (r) => r.records), first_year: first.year, peak_year: pk.year, peak_n: pk.records, last_year: full[full.length - 1].year, last_n: full[full.length - 1].records, partial_year: part.year, partial_n: part.records, since2011 }];
  }
});

dash.calc('ca_stats', {
  inputs: ['cms_activities'],
  title: 'Concerted Action activities and funding',
  description: 'Number of activities of the renewed CMS Concerted Action, and of those stated as needing funds.',
  fn: (a) => [{ n: a.length, needed: a.filter((r) => r.funded === 'Needed').length, identified: a.filter((r) => r.funded === 'Identified').length }]
});

/* Sentence and tile values, each bound to one marked cell. */
const CW = GD.catWord;
[
  ['kpi', {
    g_cat: (r) => CW[r.global_cat] || r.global_cat, g_year: (r) => String(r.global_year),
    n_cat: (r) => CW[r.national_cat] || r.national_cat, n_year: (r) => String(r.national_year),
    l_est: (r) => r.n_mus_est, l_mus: (r) => r.n_mus, l_act: (r) => r.n_actions, l_ca: (r) => r.n_ca, l_need: (r) => r.n_ca_needed,
    ov_g: (r) => r.global_cat, ov_n: (r) => r.national_cat, ov_est: (r) => r.n_mus_est, ov_mus: (r) => r.n_mus, ov_act: (r) => r.n_actions,
    gap_list: (r) => r.gap_mus || 'none'
  }],
  ['lit_stats', {
    p_total: (r) => GD.fmt(r.total), p_first: (r) => r.first_year, p_peak_year: (r) => r.peak_year, p_peak_n: (r) => r.peak_n,
    p_last_year: (r) => r.last_year, p_last_n: (r) => r.last_n, p_part_year: (r) => r.partial_year, p_part_n: (r) => r.partial_n, p_2011: (r) => r.since2011,
    ov_lit: (r) => GD.fmt(r.total), o_total: (r) => GD.fmt(r.oa_total), o_first: (r) => r.oa_first, o_peak_year: (r) => r.oa_peak_year, o_peak_n: (r) => r.oa_peak_n
  }],
  ['evid_stats', {
    e_base: (r) => r.baseline, e_basepm: (r) => r.base_pm, e_baseoa: (r) => r.base_oa, e_nlowpm: (r) => r.n_low_pm, e_nact: (r) => r.n_actions, e_nmeas: (r) => r.n_meas, e_lo_id: (r) => r.lo_id, e_lo_n: (r) => r.lo_n, e_hi_id: (r) => r.hi_id, e_hi_n: (r) => r.hi_n,
    e_nlow: (r) => r.n_low, e_nzero: (r) => r.n_zero, e_lowids: (r) => r.low_ids || 'none', ov_low: (r) => r.n_low
  }],
  ['ca_stats', { c_n: (r) => r.n, c_need: (r) => r.needed, c_id: (r) => r.identified, ov_ca: (r) => r.n, ov_need: (r) => r.needed }]
].forEach(([id, map]) => Object.entries(map).forEach(([name, f]) => dash.draw(name, (el) => {
  const d = dash.data(id);
  el.textContent = d.status === 'ok' && d.data && d.data[0] ? String(f(d.data[0])) : '—';
})));

/* Navigation and free-text filters listen only. */
const gdReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('[data-go]').forEach((a) => {
  const go = (e) => { e.preventDefault(); const t = document.getElementById(a.dataset.go); if (t) { t.scrollIntoView({ behavior: gdReduce ? 'auto' : 'smooth', block: 'start' }); dash.setLink(a.dataset.go); } };
  a.addEventListener('click', go);
  a.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') go(e); });
});
document.querySelectorAll('input[data-param]').forEach((i) => i.addEventListener('input', () => dash.setParams({ [i.dataset.param]: i.value || null })));
if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView({ block: 'start' }), 300); }
