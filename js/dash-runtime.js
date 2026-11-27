/*
 * Minimal stand-alone runtime for the Franciscana CMP dashboard.
 * It provides the small `dash` API the page scripts use (data, calc, loader, draw,
 * params, colors) so the same scripts run as a static site, e.g. on GitHub Pages.
 * Data come from the JSON files in /data; the latest PubMed records are fetched
 * live from the NCBI E-utilities API in the reader's browser.
 */
(function () {
  const SOURCES = {
    mus: 'data/management_units.json',
    abundance: 'data/abundance.json',
    actions: 'data/actions.json',
    threats: 'data/threats.json',
    status: 'data/status_history.json',
    states: 'data/range_states.json',
    milestones: 'data/milestones.json',
    cms_activities: 'data/cms_activities.json',
    cms_progress: 'data/cms_progress.json',
    instruments: 'data/instruments.json',
    pubmed_years: 'data/pubmed_year_counts.json',
    evidence_counts: 'data/evidence_counts.json',
    pubmed_records: 'data/pubmed_records.json',
    most_cited: 'data/most_cited.json',
    flags: 'data/editorial_flags.json',
    map_base: 'data/basemap_countries.json',
    map_layers: 'data/map_layers.json',
    scispace_live: 'data/scispace_snapshot.json',
    lit_years: 'data/oa_year_counts.json',
    oa_records: 'data/oa_records.json',
    protected_areas: 'data/protected_areas.json',
    legal_instruments: 'data/legal_instruments.json'
  };
  const PUBMED_TERM = 'Pontoporia[tiab] OR "franciscana dolphin"[tiab] OR "franciscana dolphins"[tiab] OR franciscanas[tiab] OR toninha[tiab] OR toninhas[tiab]';

  const loaders = {}, calcs = {}, draws = {}, store = {};
  let params = {}, scheduled = false;

  const css = getComputedStyle(document.documentElement);
  const colors = ['--dash-c1', '--dash-c2', '--dash-c3'].map((v) => css.getPropertyValue(v).trim() || '#3b6ea5');

  function schedule() {
    if (scheduled) return; scheduled = true;
    requestAnimationFrame(() => { scheduled = false; redraw(); });
  }
  function redraw() {
    document.querySelectorAll('[data-draw]').forEach((el) => {
      const f = draws[el.dataset.draw]; if (!f) return;
      try { f(el); } catch (e) { console.error('Drawing ' + el.dataset.draw + ' failed:', e); }
    });
  }

  async function pubmedLive() {
    const base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
    const s = await fetch(base + 'esearch.fcgi?db=pubmed&retmode=json&sort=pub_date&retmax=10&term=' + encodeURIComponent(PUBMED_TERM)).then((r) => r.json());
    const ids = (s.esearchresult && s.esearchresult.idlist) || [];
    if (!ids.length) return [];
    const m = await fetch(base + 'esummary.fcgi?db=pubmed&retmode=json&id=' + ids.join(',')).then((r) => r.json());
    const res = m.result || {};
    return ids.map((id) => {
      const a = res[id] || {};
      const doi = ((a.articleids || []).find((x) => x.idtype === 'doi') || {}).value || '';
      const d = new Date(a.sortpubdate || a.pubdate || '');
      return {
        pmid: id,
        date: isNaN(d) ? String(a.pubdate || '') : d.toISOString().slice(0, 10),
        title: String(a.title || '').replace(/\s+/g, ' ').trim(),
        first_author: (() => { const au = a.authors || []; const n = String((au[0] || {}).name || '').trim(); if (!n) return ''; const parts = n.split(/\s+/); const sur = parts.length > 1 && /^[A-Z]{1,3}$/.test(parts[parts.length - 1]) ? parts.slice(0, -1).join(' ') : n; return sur + (au.length > 1 ? ' et al.' : ''); })(),
        journal: a.fulljournalname || a.source || '',
        doi
      };
    });
  }

  async function load(id) {
    store[id] = { status: 'loading', data: [] };
    try {
      let data;
      if (id === 'pubmed_live') {
        try { data = await pubmedLive(); }
        catch (e) {
          // NCBI unreachable: fall back to the ten newest records of the dated snapshot.
          console.warn('PubMed E-utilities unreachable; showing the snapshot instead.', e);
          const snap = await fetch(SOURCES.pubmed_records).then((r) => r.json());
          data = snap.filter((r) => r.title).slice(0, 10).map((r) => ({ pmid: r.pmid, date: String(r.year) + ' (snapshot)', first_author: r.first_author, title: r.title, journal: r.journal, doi: r.doi }));
        }
      }
      else {
        const answer = await fetch(SOURCES[id]).then((r) => { if (!r.ok) throw new Error(r.status + ' ' + r.statusText); return r.json(); });
        if (loaders[id]) {
          const out = await loaders[id].fn({ answer, items: [answer], call: async () => ({}), args: {}, read: {} });
          data = Array.isArray(out) ? out : out.data;
        } else data = answer;
      }
      store[id] = { status: 'ok', data };
    } catch (e) {
      console.error('Source ' + id + ' failed:', e);
      store[id] = { status: 'error', data: [], message: String(e.message || e) };
    }
    schedule();
  }

  window.dash = {
    colors,
    loader(id, o) { loaders[id] = o; },
    calc(id, o) { calcs[id] = o; },
    draw(name, f) {
      if (typeof f === 'function') { draws[name] = f; schedule(); }
      else if (f && typeof f.mount === 'function') {
        // {mount, update}: mount once per element, then update on each redraw.
        const made = new WeakMap();
        draws[name] = (el) => {
          if (!made.has(el)) { el.replaceChildren(); made.set(el, f.mount(el) || {}); }
          if (typeof f.update === 'function') f.update(el, made.get(el));
        };
        schedule();
      } else schedule();
    },
    data(id) {
      if (calcs[id]) {
        const c = calcs[id];
        const ins = c.inputs.map((i) => dash.data(i));
        if (ins.some((d) => d.status === 'error')) return { status: 'error', data: null };
        if (ins.some((d) => d.status !== 'ok')) return { status: 'loading', data: null };
        try { return { status: 'ok', data: c.fn(...ins.map((d) => (Array.isArray(d.data) ? d.data : []))) }; }
        catch (e) { console.error('Calculation ' + id + ' failed:', e); return { status: 'error', data: null }; }
      }
      if (!store[id]) { if (SOURCES[id] || id === 'pubmed_live') load(id); else return { status: 'missing', data: [] }; }
      return store[id];
    },
    onData(f) { f(); },
    params() { return params; },
    setParams(p) { Object.entries(p).forEach(([k, v]) => { if (v == null || v === '') delete params[k]; else params[k] = v; }); schedule(); },
    resetParams() { params = {}; schedule(); },
    setLink(name) { history.replaceState(null, '', '#' + name); },
    refresh(id) { delete store[id]; schedule(); }
  };
  window.addEventListener('resize', schedule);
})();
