/* Keyword-based themes: the title is tested first, then the abstract excerpt. First match wins. */
const SCI_THEMES = [
  ['Fisheries and bycatch', /bycatch|by-catch|fisher|gillnet|\bnets?\b|entangle|incidental (capture|mortality)|fishing|pinger|longline/i],
  ['Pollution and contaminants', /contamin|pollut|mercury|metal|pcb|organochlor|persistent organic|pesticide|plastic|debris|toxic|trace element|pbde/i],
  ['Health and disease', /health|disease|pathogen|parasit|virus|morbilli|lesion|necropsy|toxoplasm|infect|immun|bacteri|patholog/i],
  ['Population, genetics and life history', /genetic|genom|population structure|phylogeo|abundance|density|survival|photo-ident|life history|reproduc|growth|\bage\b|taxonom|subspecies|mitochond|demograph|strand/i],
  ['Acoustics and disturbance', /acoustic|sound|noise|echoloc|click|vessel|boat|wind farm|disturb/i],
  ['Habitat, ecology and behaviour', /habitat|distribution|movement|forag|feeding|diet|behavio|estuar|\bbay\b|ecolog|occurrence|climate|spatial|plume/i]
];
const SCI_OTHER = 'General or other';
const sciTheme = (title, text) => {
  for (const src of [String(title || ''), String(text || '')]) for (const [name, re] of SCI_THEMES) if (re.test(src)) return name;
  return SCI_OTHER;
};

dash.loader('scispace_live', {
  description: 'Reads the SciSpace search results and extracts year, venue, citations, title and the first author’s surname followed by “et al.” (no other author data is kept, for personal-data protection); only records that name Pontoporia, the franciscana or the toninha are kept. A keyword-based theme is assigned from the title, then from the abstract excerpt.',
  fn: ({ answer }) => {
    let res = answer;
    if (typeof res === 'string') { try { res = JSON.parse(res); } catch (e) { res = {}; } }
    const list = (res && res.results) || [];
    const types = /^(Journal Article|Book Chapter|Dataset|Preprint|Review|Conference Paper|Book|Thesis|Dissertation|Posted Content|Repository)$/i;
    const seen = new Set();
    const data = list.filter((r) => /pontoporia|franciscana|toninha/i.test((r.title || '') + ' ' + (r.text || ''))).map((r) => {
      const head = String(r.text || '').split('\n')[0].split(' · ').map((s) => s.trim());
      const cite = head.find((s) => /^\d+\s+citations?$/i.test(s));
      const venue = head.slice(2).find((s) => s && !/citations?$/i.test(s) && !types.test(s)) || '';
      const title = String(r.title || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      const names = String(head[1] || '').split(',').map((s) => s.trim()).filter(Boolean);
      const first = (names[0] || '').replace(/\s+et al\.?$/i, '').trim();
      const fa = first ? first.split(/\s+/).pop() + (names.length > 1 || /et al/i.test(names[0]) ? ' et al.' : '') : '';
      return { year: Number(head[0]) || null, first_author: fa, title, venue, citations: cite ? Number(cite.match(/\d+/)[0]) : 0, theme: sciTheme(title, r.text), url: String(r.url || '').split('?')[0] };
    }).filter((r) => { const k = r.title.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => (b.year || 0) - (a.year || 0));
    return { data, columns: ['year', 'first_author', 'title', 'venue', 'citations', 'theme', 'url'], meta: [{ label: 'Records returned by SciSpace', value: String(list.length) }, { label: 'Records naming the species (deduplicated by title)', value: String(data.length) }] };
  }
});

GD.select('f_sci_year', 'sci_year', 'All years', 'scispace_live', (rows) => [...new Set(rows.map((r) => r.year).filter(Boolean))].sort((a, b) => b - a).map(String));
GD.select('f_sci_theme', 'sci_theme', 'All themes', 'scispace_live', (rows) => [...SCI_THEMES.map((t) => t[0]), SCI_OTHER].filter((t) => rows.some((r) => r.theme === t)));

const SCI_RECENT_FROM = 2025;
const sciFiltered = (rows) => { const p = dash.params(); return rows.filter((r) => (!p.sci_year || String(r.year) === String(p.sci_year)) && (!p.sci_theme || r.theme === p.sci_theme)); };
const sciShowAll = () => { const p = dash.params(); return !!(p.sci_all || p.sci_year); };
const sciRows = (rows) => sciFiltered(rows).filter((r) => sciShowAll() || (r.year || 0) >= SCI_RECENT_FROM);
dash.draw('sci_body', (el) => {
  const g = GD.gate(el, 'scispace_live'); if (!g) return;
  GD.fill(el, sciRows(g[0]), [
    { cls: 'nw', f: (r) => r.year || 'n.d.' }, { cls: 'nw', f: (r) => r.first_author || '' }, { cls: 'wide', f: (r) => r.title }, { f: (r) => r.venue },
    { f: (r) => GD.badge(r.theme, '') }, { cls: 'num', f: (r) => (r.citations ? GD.fmt(r.citations) : '') },
    { cls: 'nw', f: (r) => (r.url ? GD.h('a', { href: r.url, target: '_blank', rel: 'noopener noreferrer', text: 'SciSpace' }) : '') }
  ]);
});
dash.draw('sci_count', (el) => { const g = GD.gate(el, 'scispace_live'); if (!g) return; el.textContent = 'Showing ' + sciRows(g[0]).length + ' of ' + g[0].length + ' records'; });
dash.draw('sci_more', (btn) => {
  const g = GD.ok('scispace_live');
  if (!g) { btn.style.display = 'none'; return; }
  const p = dash.params(); const older = sciFiltered(g).filter((r) => (r.year || 0) < SCI_RECENT_FROM).length;
  btn.style.display = p.sci_year || older === 0 ? 'none' : '';
  btn.textContent = p.sci_all ? 'Hide earlier records' : 'Show ' + older + ' earlier records (before ' + SCI_RECENT_FROM + ')';
  btn.setAttribute('aria-expanded', p.sci_all ? 'true' : 'false');
  btn.onclick = () => dash.setParams({ sci_all: p.sci_all ? null : true });
});
