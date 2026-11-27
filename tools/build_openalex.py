"""OpenAlex snapshot for the franciscana dashboard.

Fetches works whose title or abstract name the species, keeps only on-target records, removes those
already in the PubMed set (by PMID, DOI or normalised title), matches the rest to the CMP action
topics used for PubMed (same keyword rules), and writes:
  data/oa_records.json      records added to the PubMed set, with matched actions
  data/oa_year_counts.json  OpenAlex works per year (articles, reviews, chapters, preprints, theses)
  data/evidence_counts.json updated with count_oa and the integrated count
  data/most_cited.json      most-cited works from OpenAlex
Authorship is reduced to the first author's surname followed by "et al." (personal-data protection);
abstracts are used only for topic matching and are not stored.
Run from the repository root: python3 tools/build_openalex.py
"""
import json, os, re, time, unicodedata, urllib.parse, urllib.request, collections, datetime

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DATA = os.path.join(ROOT, 'data')
TODAY = datetime.date.today().isoformat()

def get(url):
    # curl is used because it honours the HTTPS proxy and CA bundle of the environment
    import subprocess
    for k in range(4):
        r = subprocess.run(['curl', '-sS', '-m', '90', url], capture_output=True, text=True)
        if r.returncode == 0:
            try: return json.loads(r.stdout)
            except ValueError: pass
        if k == 3: raise RuntimeError('OpenAlex request failed: ' + (r.stderr or r.stdout)[:200])
        time.sleep(3 * (k + 1))

def abstract(inv):
    if not inv: return ''
    return ' '.join(w for p, w in sorted((p, w) for w, ps in inv.items() for p in ps))

def norm(t):
    t = unicodedata.normalize('NFKD', t or '').encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', t).strip()

COMPOUND = {'Sucunza'}

def first_author(auths):
    if not auths: return ''
    name = ((auths[0].get('author') or {}).get('display_name') or '').strip()
    if not name: return ''
    parts = name.split()
    # compound Iberian surnames: keep the paternal one when it is the known first surname (e.g. Sucunza Perez -> Sucunza)
    sur = parts[-2] if len(parts) > 2 and parts[-2] in COMPOUND else parts[-1]
    return sur + (' et al.' if len(auths) > 1 else '')

# ---- fetch
# "franciscana" alone is stemmed to "franciscan" and returns thousands of unrelated records, so two precise queries are used
FILTERS = ['title_and_abstract.search:Pontoporia|toninha|toninhas', 'title_and_abstract.search:"franciscana dolphin"']
SELECT = 'id,doi,title,publication_year,type,primary_location,cited_by_count,ids,authorships,abstract_inverted_index,language'
works, seen = [], set()
for FILTER in FILTERS:
    page = 1
    while page:
        # page-number paging (cursor paging requires an API key)
        url = 'https://api.openalex.org/works?' + urllib.parse.urlencode({'filter': FILTER, 'select': SELECT, 'per_page': 200, 'page': page})
        d = get(url)
        if 'results' not in d: raise RuntimeError('OpenAlex: ' + json.dumps(d)[:400])
        for w in d['results']:
            if w['id'] not in seen: seen.add(w['id']); works.append(w)
        page = page + 1 if d['results'] and page * 200 < d['meta']['count'] else None
print('fetched', len(works))

ON = re.compile(r'pontoporia|toninha|franciscana', re.I)
DOLPHIN = re.compile(r'dolphin|delf[ií]n|golfinho|cet[aá]ce|cetacean|marine mammal|mam[ií]fero', re.I)
recs = []
for w in works:
    t = w.get('title') or ''
    a = abstract(w.get('abstract_inverted_index'))
    txt = t + ' ' + a
    if not ON.search(txt): continue
    if not re.search(r'pontoporia|toninha', txt, re.I) and not DOLPHIN.search(txt): continue   # "Franciscana" used for other things
    src = ((w.get('primary_location') or {}).get('source') or {}).get('display_name') or ''
    pmid = ((w.get('ids') or {}).get('pmid') or '').rsplit('/', 1)[-1]
    recs.append(dict(openalex_id=w['id'].rsplit('/', 1)[-1], doi=(w.get('doi') or '').replace('https://doi.org/', ''), pmid=pmid,
                     year=w.get('publication_year'), type=w.get('type') or '', title=re.sub(r'\s+', ' ', t).strip(), source=src,
                     citations=w.get('cited_by_count') or 0, first_author=first_author(w.get('authorships')),
                     language=w.get('language') or '', _title=t, _abstract=a))
# drop errata, paratext and duplicate versions (same normalised title: keep the most cited)
KEEP = ('article', 'review', 'book-chapter', 'book', 'dissertation', 'preprint', 'report', 'conference-paper')
recs = [r for r in recs if r['type'] in KEEP or (r['type'] == 'dataset' and 'SALVE' in r['source'] and re.search('Pontoporia', r['title']))]
best = {}
for r in recs:
    k = norm(r['title'])
    if not k: continue
    if k not in best or r['citations'] > best[k]['citations']: best[k] = r
recs = list(best.values())
print('on-target, deduplicated', len(recs))

# ---- year series (all on-target OpenAlex works)
years = collections.Counter(r['year'] for r in recs if r['year'])
cur = datetime.date.today().year
series = [dict(year=y, articles=years.get(y, 0), partial=(y == cur)) for y in range(min(years), max(years) + 1)]
json.dump(series, open(os.path.join(DATA, 'oa_year_counts.json'), 'w'), indent=1)

# ---- dedupe against PubMed
pm = json.load(open(os.path.join(DATA, 'pubmed_records.json')))
pm_ids = {str(r['pmid']) for r in pm}
pm_doi = {(r.get('doi') or '').lower() for r in pm if r.get('doi')}
pm_tit = {norm(r['title']) for r in pm if r.get('title')}
added = [r for r in recs if not (r['pmid'] and r['pmid'] in pm_ids) and not (r['doi'] and r['doi'].lower() in pm_doi) and norm(r['title']) not in pm_tit]
print('not in PubMed', len(added))

# ---- topic matching with the same rules as the PubMed counts
src = open(os.path.join(ROOT, 'tools', 'build_data.py'), encoding='utf-8').read()
block = src[src.index('POP = '):src.index('pm_counts, matched')]
ns = {}
exec(block, ns)
TOPICS = ns['TOPICS']
# Portuguese and Spanish equivalents, matched in titles and abstracts (OpenAlex holds many regional records)
PTES = {
 'RES-1.1': r'estrutura populacional|estructura poblacional|gen[ée]tica|filogeogr|unidades? de manejo|estoques?',
 'MON-1.1': r'pesca|pesquer|emalhe|redes? de|arrasto|arrastre|captura (acidental|incidental)',
 'MON-1.2': r'captura (acidental|incidental)|mortalidade? incidental|mortalidad incidental|capturas acidentais',
 'MON-1.3': r'encalhe|varamiento|varado|carca[cç]a|monitoramento de praia|monitoreo de playa',
 'MON-1.6': r'abund[aâ]ncia|abundancia|densidade|densidad|tamanho populacional|tama[ñn]o poblacional|levantamento a[eé]reo|relevamiento a[eé]reo|sobrevoo',
 'MON-1.7': r'ac[uú]stica passiva|monitoreo ac[uú]stico|drone|vi[eé]s de disponibilidade',
 'MON-1.8': r'remo[cç][aã]o biol[oó]gica|remoci[oó]n biol[oó]gica|sustentabilidade da captura',
 'MON-1.9': r'viabilidade populacional|viabilidad poblacional|modelagem populacional',
 'MON-2.1': r'\bidade\b|\bcrescimento\b|reprodu[cç][aã]o|reproductiv|maturidade|\bdieta\b|h[aá]bitos? alimentar|ecologia alimentar|ecolog[ií]a tr[oó]fica|conte[uú]do estomacal|\bedad\b|crecimiento|madurez|contenido estomacal',
 'MON-2.2': r'contamina|polui[cç]|poluente|merc[uú]rio|metais|metales|organoclor|pl[aá]stico|lixo marinho|residuos|sa[uú]de|doen[cç]a|enfermedad|parasit|patolog|v[ií]rus|bact[ée]ri',
 'MIT-1.1': r'mitiga[cç][aã]o|mitigaci[oó]n|pinger|alarme ac[uú]stico|alarma ac[uú]stica|redu[cç][aã]o d[ao]s? captura|reducci[oó]n de (la )?captura',
 'MIT-2.1': r'[aá]rea protegida|[aá]rea marinha protegida|unidade de conserva|uso de h[aá]bitat|habitat cr[ií]tico|babitonga|albard|rio doce|r[ií]o negro',
 'MIT-2.2': r'[aá]rea protegida|unidade de conserva|plano de manejo|reserva (marinha|natural|de fauna|biol[oó]gica)',
 'MIT-2.3': r'[aá]rea protegida|unidade de conserva|cria[cç][aã]o de (uma )?(nova )?unidade',
 'MIT-2.4': r'socioecon[oô]m|impacto econ[oô]mico',
 'MIT-3.1': r'espinhel|palangre|artes? de pesca alternativ|petrecho|refletor',
 'MIT-3.2': r'socioecon[oô]m|impacto econ[oô]mico',
 'PAC-1.1': r'educa[cç][aã]o ambiental|educaci[oó]n ambiental|conhecimento ecol[oó]gico local|conocimiento ecol[oó]gico local|percep[cç][aã]o|percepci[oó]n|sensibiliza',
}
PTES['RES-1.2'] = PTES['RES-1.1']; PTES['MIT-1.2'] = PTES['MIT-1.1']
ev = json.load(open(os.path.join(DATA, 'evidence_counts.json')))
rows = ev['rows']
for r in added:
    r['actions'] = []
    r['matched_by'] = {}
for row in rows:
    lab, rt, ra = TOPICS[row['id']]
    if not rt:
        row.update(count_oa=None, count=None); continue
    T, A_ = re.compile(rt, re.I), (re.compile(ra, re.I) if ra else None)
    n = 0
    for r in added:
        P_ = re.compile(PTES[row['id']], re.I) if row['id'] in PTES else None
        ht = bool(T.search(r['_title']) or (P_ and P_.search(r['_title'])))
        ha = bool((A_ and A_.search(r['_abstract'])) or (P_ and r['language'] in ('pt', 'es') and P_.search(r['_abstract'])))
        if ht or ha:
            n += 1; r['actions'].append(row['id']); r['matched_by'][row['id']] = 'title and abstract' if ht and ha else 'title' if ht else 'abstract'
    row['count_oa'] = n
    row['count'] = (row['count_pubmed'] or 0) + n
ev['baseline_oa'] = len(added)
ev['retrieved_oa'] = TODAY
ev['note_oa'] = 'OpenAlex records not in PubMed (by PMID, DOI or normalised title), matched with the same topic rules (title; specific phrases in the abstract).'
json.dump(ev, open(os.path.join(DATA, 'evidence_counts.json'), 'w'), ensure_ascii=False, indent=1)

out = []
for r in sorted(added, key=lambda x: (-(x['year'] or 0), x['title'])):
    mb = set(r['matched_by'].values())
    out.append(dict(openalex_id=r['openalex_id'], year=r['year'], first_author=r['first_author'], title=r['title'], source=r['source'],
                    type=r['type'], doi=r['doi'], citations=r['citations'], actions=', '.join(r['actions']),
                    matched_by=('title and abstract' if len(mb) > 1 or 'title and abstract' in mb else (mb.pop() if mb else ''))))
json.dump(out, open(os.path.join(DATA, 'oa_records.json'), 'w'), ensure_ascii=False, indent=1)

top = sorted(recs, key=lambda x: -x['citations'])[:12]
json.dump([dict(year=r['year'], first_author=r['first_author'], title=r['title'], journal=r['source'], citations=r['citations'],
                doi=('https://doi.org/' + r['doi']) if r['doi'] else '', source='OpenAlex', retrieved=TODAY) for r in top],
          open(os.path.join(DATA, 'most_cited.json'), 'w'), ensure_ascii=False, indent=1)
print('added with a topic', sum(1 for r in added if r['actions']), '| most cited', top[0]['citations'])
print({row['id']: (row['count_pubmed'], row.get('count_oa')) for row in rows})
