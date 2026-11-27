# Guia para replicar o dashboard de CMP para outras espécies de cetáceos

Este guia documenta **todo o código** do dashboard *Franciscana / toninha (Pontoporia blainvillei) — CMP evidence and assessment* e explica como adaptá-lo a outra espécie (por exemplo, boto-cinza *Sotalia guianensis*, golfinho-nariz-de-garrafa *Tursiops* spp., baleia-franca-austral *Eubalaena australis*, boto-vermelho *Inia geoffrensis*).

Dashboard preparado pelo Laboratório de Ecologia e Conservação, Universidade Federal do Paraná (UFPR), Brasil. Código e compilações de dados sob CC0 1.0; a fotografia de capa (© Federico Sucunza) **não** é CC0 e deve ser substituída.

---

## 1. Visão geral

O dashboard é um **site estático**: um `index.html`, folhas de estilo, alguns arquivos JavaScript e arquivos de dados em JSON. Não há servidor, banco de dados, chave de API ou conexão com qualquer serviço de IA. A única chamada feita em tempo real é à API pública do PubMed (NCBI E-utilities), para a tabela de registros mais recentes; se ela falhar, a página usa a cópia salva.

```
index.html            página (seções, textos, tabelas e marcações data-draw)
css/tokens.css        cores e fontes (tema claro e escuro)
css/app.css           estilos do layout, cards, gráficos e tabelas
js/vendor/d3.min.js   D3 v7.9.0 (baixar de https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js)
js/dash-runtime.js    mini-runtime: carrega os JSON, roda cálculos e redesenha
js/app.js             cálculos (KPIs, cobertura, estatísticas) e utilitários GD
js/draw.js            gráficos e tabelas principais
js/map.js             mapa da distribuição
js/sci.js             leitura da cópia do SciSpace
js/overview.js        cartões "At a glance"
js/legal.js           áreas protegidas e instrumentos legais
js/litdl.js           download da literatura em CSV e PDF (gerados no navegador)
data/*.json           todos os números, textos de tabela e camadas do mapa
tools/*.py, *.js      scripts que geraram os arquivos de data/
assets/               fotografia de capa
```

### Como funciona a página

1. Cada elemento que mostra dados tem um atributo `data-draw="nome"` e, opcionalmente, `data-source="fonte"` e `data-field`.
2. `js/dash-runtime.js` define o objeto global `dash` com:
   - `dash.data(nome)`: devolve o conteúdo de uma fonte (arquivo JSON listado em `SOURCES`, um *loader* ou um *calc*);
   - `dash.calc(nome, {deps, fn})`: cálculo derivado de outras fontes;
   - `dash.loader(nome, fn)`: fonte carregada por código (ex.: PubMed ao vivo);
   - `dash.draw(nome, fn | {mount, update})`: função que desenha no elemento `[data-draw="nome"]`;
   - `dash.params()` / `dash.setParams({...})`: estado dos filtros (selects e buscas com `data-param`).
3. Quando um dado ou parâmetro muda, o runtime redesenha tudo no próximo quadro de animação.

Para visualizar localmente: `python3 -m http.server` na pasta do projeto e abrir <http://localhost:8000> (abrir o `index.html` direto do disco não funciona, porque o navegador bloqueia `fetch` de arquivos locais).

---

## 2. Passo a passo para outra espécie

### 2.1 Defina a espécie e os termos de busca

Liste o nome científico, sinônimos e nomes populares em português, espanhol e inglês. Esses termos aparecem em quatro lugares:

| Onde | O que mudar |
|---|---|
| `js/dash-runtime.js` → `PUBMED_TERM` | busca no PubMed, ex.: `Sotalia guianensis[tiab] OR "Guiana dolphin"[tiab] OR boto-cinza[tiab]` |
| `js/sci.js` → filtro `/pontoporia\|franciscana\|toninha/i` | regex que mantém só registros da espécie |
| `tools/build_openalex.py` → `FILTERS`, `ON`, `DOLPHIN` | filtros do OpenAlex (`title_and_abstract.search:...`) e regex de checagem |
| `tools/build_legal_pa.py` (docstring e checagem) | termos procurados nos textos legais |

Cuidado com nomes ambíguos: "franciscana" também é usado para outras coisas, por isso o script exige `Pontoporia`/`toninha` ou a expressão "franciscana dolphin". Faça o mesmo para nomes como "boto" ou "tucuxi".

### 2.2 Unidades de manejo e abundância

- `data/management_units.json`: uma linha por unidade de manejo (FMA para a toninha; para outras espécies, estoques, populações ou áreas do plano). Campos: `order, mu, country, name, range, note, src`.
- `data/abundance.json`: uma linha por estimativa. Campos: `mu, area, year, point, low, high, cv, method, source, doi`. `point` pode ser `null` quando só há intervalo.

Textos e rótulos específicos da toninha que devem ser trocados em `js/draw.js`, `js/overview.js` e `js/legal.js`: "FMA Ia", "FMA", "PAN Toninha", `aria-label` que citam "franciscana".

### 2.3 Plano de conservação (CMP), ameaças e ações

- `data/actions.json` (`id, line, topic, title, region, source`): ações do plano (IWC CMP, PAN do ICMBio, plano nacional etc.). Os códigos (`RES-1.1`, `MON-1.3`, `MIT-1.1`…) são usados para cruzar com a literatura.
- `data/threats.json` (`threat, kind, role, evidence, where, actions, refs`): o campo `actions` lista os códigos de ação separados por `; `.
- `data/cms_activities.json`, `data/cms_progress.json`, `data/instruments.json`, `data/milestones.json`, `data/range_states.json`: acordos internacionais, marcos e países da distribuição. Se a espécie não tiver Ação Concertada da CMS, remova as seções `#cms` do `index.html`.

### 2.4 Status de conservação

`data/status_history.json` (`level, jurisdiction, area, year, category, criterion, source`), com `level` = `Global` (IUCN), `Regional` ou `National`. As faixas do gráfico de status estão em `js/overview.js` (`lanes`) e `js/draw.js` (`chart_status`).

### 2.5 Mapa

`data/basemap_countries.json` é gerado por `tools/mkmap.js` (precisa de `world-atlas@2.0.2` e `topojson-client@3.1.0` em `tools/geo/`). Troque o conjunto `keep` (países) e a caixa de recorte (`c[0] > -72 && c[0] < -30 && c[1] > -47 && c[1] < -12`). `data/map_layers.json` contém a área de ocorrência e os locais citados (GeoJSON simplificado + `places`); a projeção e a extensão estão em `js/map.js`.

### 2.6 Literatura e evidências por ação

1. **PubMed.** `tools/build_data.py` lê `tools/data/pm_all.json` (metadados do PubMed: `pmid, year, title, journal, doi, abstract, kw, mesh`, mais `first_author` já reduzido a sobrenome + et al.) e gera `pubmed_records.json`, `pubmed_year_counts.json` e `evidence_counts.json`. O dicionário `TOPICS` associa cada ação a regras de palavras-chave (título/keywords/MeSH) e de frases no resumo. Reescreva as regras para as ações da nova espécie. O arquivo `pm_all.json` pode ser obtido com a E-utilities (`esearch` + `efetch`) usando o mesmo termo de `PUBMED_TERM`.
2. **OpenAlex.** `python3 tools/build_openalex.py` (raiz do repositório) busca obras, remove as que já estão no PubMed (PMID, DOI ou título normalizado), aplica as mesmas regras de tópico (com equivalentes em português e espanhol) e grava `oa_records.json`, `oa_year_counts.json`, `most_cited.json` e atualiza `evidence_counts.json`. Usa `curl` e paginação por `page=` (não precisa de chave).
3. **SciSpace (opcional).** `data/scispace_snapshot.json` é uma cópia datada de resultados de busca; pode ser removida junto com a tabela correspondente.

### 2.7 Áreas protegidas e instrumentos legais

`tools/build_legal_pa.py` grava `protected_areas.json` e `legal_instruments.json`. Cada linha registra o documento lido (`checked`, `verification`, `url`) e se o texto oficial cita a espécie. **Seja criterioso:** marque `read` só quando o texto oficial foi baixado e pesquisado; use `secondary` quando a informação vem de fonte secundária, e `act_verified=false` quando o ato de criação não foi conferido.

### 2.8 Notas editoriais

`data/editorial_flags.json` (`topic, status, issue, action, resolution`) documenta lacunas e conflitos entre fontes. Mantenha essa tabela: ela informa o leitor sobre o que não pôde ser verificado.

---

## 3. Proteção de dados pessoais (LGPD, Lei nº 13.709/2018)

- Nas listas de literatura, nos downloads e nos arquivos de dados, a autoria aparece **apenas como o sobrenome do primeiro autor seguido de "et al."** (ou só o sobrenome, se houver um único autor). Citações de trabalhos com dois autores no texto mantêm os dois sobrenomes.
- Não armazene nomes completos, afiliações, e-mails ou ORCID. Os scripts já reduzem a autoria (`first_author`) e descartam os resumos depois do cruzamento de tópicos.
- Os downloads (CSV e PDF) são montados no navegador do leitor (`js/litdl.js`) e contêm só registros bibliográficos; nada é enviado a servidores.
- Antes de publicar, procure e-mails no repositório:
  `grep -rIlE "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}" --exclude-dir=.git .`

---

## 4. Publicação no GitHub Pages

1. Crie um repositório e envie os arquivos para a branch `main`.
2. Em *Settings → Pages*, escolha *Deploy from a branch*, a branch `main` e a pasta `/ (root)`.
3. O site fica em `https://<usuário>.github.io/<repositório>/`.

Para atualizar, edite ou substitua os arquivos em `data/` mantendo os mesmos nomes de campo e faça commit; a página se redesenha a partir dos novos arquivos.

---

## 5. Esquema dos arquivos de dados

A tabela abaixo lista os campos de cada arquivo em `data/` (gerada a partir dos arquivos do repositório).


| Arquivo | Tipo | Registros | Campos |
|---|---|---|---|
| `data/abundance.json` | lista | 14 | `mu`, `area`, `year`, `point`, `low`, `high`, `cv`, `method`, `source`, `doi` |
| `data/actions.json` | lista | 24 | `id`, `line`, `topic`, `title`, `region`, `source` |
| `data/basemap_countries.json` | objeto | 6 | `type`, `features`; cada item: `type`, `properties`, `geometry` |
| `data/cms_activities.json` | lista | 12 | `activity`, `result`, `timeframe`, `responsibility`, `funding`, `funded`, `cmp` |
| `data/cms_progress.json` | lista | 3 | `activity`, `status`, `progress`, `difficulties` |
| `data/editorial_flags.json` | lista | 11 | `topic`, `status`, `issue`, `action`, `resolution` |
| `data/evidence_counts.json` | objeto | 24 | `retrieved`, `baseline`, `query`, `rows`, `baseline_oa`, `retrieved_oa`, `note_oa`; cada item: `id`, `line`, `topic`, `label`, `rule`, `count_pubmed`, `measured`, `pmids`, `count_oa`, `count` |
| `data/instruments.json` | lista | 18 | `body`, `ref`, `title`, `theme`, `source` |
| `data/legal_instruments.json` | lista | 18 | `country`, `level`, `instrument`, `date`, `year`, `kind`, `says`, `category`, `status`, `verification`, `url` |
| `data/management_units.json` | lista | 11 | `order`, `mu`, `country`, `name`, `range`, `note`, `src` |
| `data/map_layers.json` | objeto | 1 | `type`, `features`, `places`; cada item: `type`, `properties`, `geometry` |
| `data/milestones.json` | lista | 16 | `year`, `kind`, `event`, `source` |
| `data/most_cited.json` | lista | 12 | `year`, `first_author`, `title`, `journal`, `citations`, `doi`, `source`, `retrieved` |
| `data/oa_records.json` | lista | 423 | `openalex_id`, `year`, `first_author`, `title`, `source`, `type`, `doi`, `citations`, `actions`, `matched_by` |
| `data/oa_year_counts.json` | lista | 160 | `year`, `articles`, `partial` |
| `data/protected_areas.json` | lista | 23 | `country`, `name`, `category`, `jurisdiction`, `act`, `year`, `fma`, `citation`, `evidence`, `checked`, `verification`, `url`, `status`, `act_verified` |
| `data/pubmed_records.json` | lista | 130 | `pmid`, `year`, `title`, `journal`, `doi`, `actions`, `first_author` |
| `data/pubmed_year_counts.json` | lista | 56 | `year`, `records`, `partial` |
| `data/range_states.json` | lista | 3 | `country`, `fmas`, `iwc`, `cms`, `instruments` |
| `data/scispace_snapshot.json` | objeto | 100 | `retrieved`, `query`, `results`; cada item: `title`, `text`, `url` |
| `data/status_history.json` | lista | 9 | `level`, `jurisdiction`, `area`, `year`, `category`, `criterion`, `source` |
| `data/threats.json` | lista | 8 | `threat`, `kind`, `role`, `evidence`, `where`, `actions`, `refs` |

---

## 6. Código completo

O código abaixo é cópia exata dos arquivos do repositório. `js/vendor/d3.min.js` não é reproduzido: baixe D3 v7.9.0 em <https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js> (licença ISC). `tools/patch_html_openalex.py` foi uma correção pontual do `index.html` e serve apenas como exemplo.

### 6.1 Página

#### `index.html`

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Franciscana CMP Dashboard</title>
<meta name="description" content="Evidence and assessment dashboard supporting the IWC Conservation Management Plan for the franciscana dolphin (toninha), Pontoporia blainvillei.">
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/app.css">
</head>
<body>
<main id="dash-root">
<div class="gd" id="top">

<header class="gd-head gd-hero">
  <div class="gd-hero-text">
  <p class="gd-kicker">Conservation Management Plan · <i>Pontoporia blainvillei</i></p>
  <h1 class="gd-title" id="title">Franciscana dolphin (toninha): evidence and assessment dashboard</h1>
  <p class="gd-lede" id="lede">The franciscana, known in Brazil as toninha, is assessed as <b data-draw="g_cat" data-source="kpi" data-field="global_cat" data-row="0">—</b> globally (IUCN, <span data-draw="g_year" data-source="kpi" data-field="global_year" data-row="0">—</span>) and as <b data-draw="n_cat" data-source="kpi" data-field="national_cat" data-row="0">—</b> in Brazil (<span data-draw="n_year" data-source="kpi" data-field="national_year" data-row="0">—</span>). Abundance estimates were found for <b data-draw="l_est" data-source="kpi" data-field="n_mus_est" data-row="0">—</b> of its <span data-draw="l_mus" data-source="kpi" data-field="n_mus" data-row="0">—</span> management areas; the IWC plan lists <b data-draw="l_act" data-source="kpi" data-field="n_actions" data-row="0">—</b> actions, and <b data-draw="l_need" data-source="kpi" data-field="n_ca_needed" data-row="0">—</b> of the <span data-draw="l_ca" data-source="kpi" data-field="n_ca" data-row="0">—</span> activities of the renewed CMS Concerted Action still need funds.</p>
  <div class="gd-hero-badge"><span class="gd-aka">Franciscana</span><span class="gd-aka">Toninha (Brazil)</span><span class="gd-aka">Franciscana / delfín del Plata (Argentina, Uruguay)</span><span class="gd-aka">La Plata dolphin</span></div>
  </div>
  <figure class="gd-hero-fig" id="cover-photo">
    <img class="gd-hero-img gd-hero-photo" src="assets/franciscanas_sucunza.jpg" alt="Aerial view of five franciscanas (Pontoporia blainvillei) swimming at the surface of dark blue water; their long, slender beaks are clearly visible." width="1200" height="800">
    <figcaption class="gd-hero-cap">Franciscanas, <i>Pontoporia blainvillei</i>, seen from the air. Photo: Federico Sucunza.</figcaption>
  </figure>
</header>

<nav class="gd-nav" aria-label="Sections">
  <a href="#overview" data-go="overview">At a glance</a>
  <a href="#units" data-go="units">Population</a>
  <a href="#range" data-go="range">Range map</a>
  <a href="#threats" data-go="threats">Threats</a>
  <a href="#actions" data-go="actions">Action plan</a>
  <a href="#cms" data-go="cms">CMS Concerted Action</a>
  <a href="#status" data-go="status">Conservation status</a>
  <a href="#process" data-go="process">Range states and process</a>
  <a href="#protected-areas" data-go="protected-areas">Protected areas</a>
  <a href="#legal" data-go="legal">Legal instruments</a>
  <a href="#literature" data-go="literature">Literature</a>
  <a href="#evidence" data-go="evidence">Evidence by action</a>
  <a href="#updating" data-go="updating">Updating</a>
  <a href="#notes" data-go="notes">Editorial notes</a>
  <a href="#references" data-go="references">References</a>
</nav>

<section class="gd-sec" id="overview">
  <h2 class="gd-h2">At a glance</h2>
  <p class="gd-sub">A graphical summary of the sections below. Each panel opens the section it summarises; point at a mark for details.</p>
  <div class="ov-grid">
    <div class="ov-card" data-go="status" role="link" tabindex="0" aria-label="Open the conservation status section">
      <p class="ov-k">Conservation status</p>
      <p class="ov-big"><span data-draw="ov_g" data-source="kpi" data-field="global_cat" data-row="0">—</span> <span class="ov-arrow">→</span> <span data-draw="ov_n" data-source="kpi" data-field="national_cat" data-row="0">—</span></p>
      <p class="ov-s">IUCN global category, then Brazil's national list. The FMA Ia population was assessed independently as Endangered.</p>
      <div class="gd-chart ov-viz" data-draw="ov_status_viz" data-source="status" id="ov-status"></div>
    </div>
    <div class="ov-card" data-go="units" role="link" tabindex="0" aria-label="Open the population section">
      <p class="ov-k">Management areas</p>
      <p class="ov-big"><span data-draw="ov_est" data-source="kpi" data-field="n_mus_est" data-row="0">—</span><span class="ov-of"> of <span data-draw="ov_mus" data-source="kpi" data-field="n_mus" data-row="0">—</span></span></p>
      <p class="ov-s">Franciscana Management Areas (FMAs) have an abundance estimate in the sources reviewed; dashed squares have none.</p>
      <div class="gd-chart ov-viz" data-draw="ov_mu_viz" data-source="mu_cov" id="ov-units"></div>
    </div>
    <div class="ov-card" data-go="threats" role="link" tabindex="0" aria-label="Open the threats section">
      <p class="ov-k">Threats</p>
      <p class="ov-s">Bycatch in gillnets is the main threat throughout the range; mortality exceeds sustainable limits in every area assessed.</p>
      <ul class="ov-list" data-draw="ov_thr_list" data-source="threats" id="ov-threat-list"></ul>
    </div>
    <div class="ov-card" data-go="actions" role="link" tabindex="0" aria-label="Open the action plan section">
      <p class="ov-k">IWC CMP actions</p>
      <p class="ov-big"><span data-draw="ov_act" data-source="kpi" data-field="n_actions" data-row="0">—</span></p>
      <p class="ov-s">actions in four strategic lines; <span data-draw="ov_low" data-source="evid_stats" data-field="n_low" data-row="0">—</span> of those measured have fewer than 10 PubMed records (orange outline).</p>
      <div class="gd-chart ov-viz" data-draw="ov_act_viz" data-source="actions evidence_counts" id="ov-actions"></div>
    </div>
    <div class="ov-card" data-go="cms" role="link" tabindex="0" aria-label="Open the CMS Concerted Action section">
      <p class="ov-k">CMS Concerted Action 2026–2029</p>
      <p class="ov-big"><span data-draw="ov_need" data-source="ca_stats" data-field="needed" data-row="0">—</span><span class="ov-of"> of <span data-draw="ov_ca" data-source="ca_stats" data-field="n" data-row="0">—</span></span></p>
      <p class="ov-s">planned activities are stated as needing funds (outlined squares).</p>
      <div class="gd-chart ov-viz" data-draw="ov_ca_viz" data-source="cms_activities" id="ov-ca"></div>
    </div>
    <div class="ov-card" data-go="literature" role="link" tabindex="0" aria-label="Open the literature section">
      <p class="ov-k">Literature (PubMed)</p>
      <p class="ov-big"><span data-draw="ov_lit" data-source="lit_stats" data-field="total" data-row="0">—</span></p>
      <p class="ov-s">records name the species; bars show records per year since 2000.</p>
      <div class="gd-chart ov-viz" data-draw="ov_lit_viz" data-source="pubmed_years" id="ov-lit"></div>
    </div>
  </div>
</section>

<section class="gd-sec" id="units">
  <h2 class="gd-h2">Population structure and abundance</h2>
  <p class="gd-sub">Eleven management units are recognised by the IWC Scientific Committee: ten subdivisions of the four original Franciscana Management Areas plus Babitonga Bay (Cunha et al. 2020; IWC 2023). The northern population (FMA Ia) belongs to the subspecies <i>P. b. pukusi</i>; the rest are <i>P. b. blainvillei</i>. Study-level abundance estimates are shown on a logarithmic scale.</p>
  <div class="gd-card">
    <div class="gd-chart" id="abundance-chart" data-draw="chart_abund" data-source="abundance mus">—</div>
    <p class="gd-note">Horizontal axis: estimated number of individuals (logarithmic scale). Estimates differ in method, survey area and year and must not be summed. Units with no estimate in the sources reviewed: <span data-draw="gap_list" data-source="kpi" data-field="gap_mus" data-row="0">—</span>. Values for FMA Ib, Babitonga and FMA III marked “national assessment” are compiled in the SALVE/ICMBio assessment (Sucunza et al. 2025), whose summary does not name the original surveys.</p>
  </div>
  <h3 class="gd-h3">Management units and evidence coverage</h3>
  <div class="gd-wrap">
    <table class="gd-table" id="units-table" data-source="mu_cov" data-row-key="mu">
      <thead><tr><th data-field="mu">Unit</th><th data-field="country">Country</th><th data-field="range">Range</th><th data-field="n_est">Estimates</th><th>Values reported</th><th data-field="note">Remarks</th></tr></thead>
      <tbody data-draw="units_body"></tbody>
    </table>
  </div>
</section>

<section class="gd-sec" id="range">
  <h2 class="gd-h2">Range and places named in the plan</h2>
  <p class="gd-sub">The franciscana lives in coastal waters, mostly inside the 30–50 m isobath, from Itaúnas (18°25′S, Espírito Santo) to the north coast of the San Matías Gulf (42°10′S, Argentina). Numbered markers show places named in the CMP actions and the CMS documents.</p>
  <div class="gd-legend" id="range-legend">
    <span><i class="gd-sw rng"></i>Approximate coastal range (Itaúnas to San Matías Gulf)</span>
    <span><i class="gd-sw dot"></i>Locality named in the plan</span>
    <span><i class="gd-sw rs"></i>Range state</span>
  </div>
  <div class="gd-chart gd-map" id="range-map" data-draw="range_map" data-source="map_base map_layers"></div>
  <p class="gd-note">Coastline and borders: Natural Earth 1:50m. The range line follows the mainland coast between the two limits and does not show gaps within it, such as the gaps between FMAs Ia, Ib and IIa. Marker positions are approximate. IMMA boundaries are not shown, because the IUCN IMMA dataset was not available in this session.</p>
  <div class="gd-wrap">
    <table class="gd-table" id="places-table">
      <thead><tr><th>No.</th><th>Place</th><th>Relevance</th></tr></thead>
      <tbody data-draw="places_body" data-source="map_layers"></tbody>
    </table>
  </div>
</section>

<section class="gd-sec" id="threats">
  <h2 class="gd-h2">Threats</h2>
  <p class="gd-sub">Threats as described in the CMS Concerted Action and the 2021 synthesis by Secchi et al., with the CMP actions that address each one. The link between threats and actions is proposed here and is not stated in the plan.</p>
  <div class="gd-wrap">
    <table class="gd-table" id="threats-table" data-source="threat_cov" data-row-key="threat">
      <thead><tr><th data-field="threat">Threat</th><th data-field="kind">Type</th><th data-field="role">Standing</th><th data-field="evidence">Evidence of impact</th><th data-field="where">Areas</th><th data-field="n_actions">Linked actions</th></tr></thead>
      <tbody data-draw="threat_body"></tbody>
    </table>
  </div>
  <p class="gd-note">No threat scoring forms (IUCN–CMP overall or fisheries forms) were available for the franciscana; if they exist, they can be added as in the Guiana dolphin dashboard.</p>
</section>

<section class="gd-sec" id="actions">
  <h2 class="gd-h2">IWC Conservation Management Plan: actions</h2>
  <p class="gd-sub">The IWC adopted the Franciscana CMP in 2016, its first for a small cetacean. Its actions, as reproduced in CMS Concerted Action 14.5 (2024) for the 2022–2026 update, fall into four strategic lines. That list gives regions but not priorities, years or budgets. Bars are split by the amount of indexed evidence for each action.</p>
  <div class="gd-card">
    <div class="gd-chart" id="actions-chart" data-draw="chart_actions" data-source="actions_by actions evidence_counts">—</div>
  </div>
  <div class="gd-controls">
    <label>Strategic line <select class="dash-select" data-draw="f_a_line" data-source="actions" aria-label="Filter actions by strategic line"></select></label>
    <label>Search <input class="gd-input" type="search" data-param="a_q" placeholder="Identifier, topic or title" aria-label="Search actions by identifier, topic or title"></label>
  </div>
  <div class="gd-wrap">
    <table class="gd-table" id="actions-table" data-source="actions" data-row-key="id">
      <thead><tr><th data-field="id">Action</th><th data-field="line">Strategic line</th><th data-field="topic">Topic</th><th data-field="title">Description</th><th data-field="region">Region</th><th>PubMed records</th></tr></thead>
      <tbody data-draw="actions_body"></tbody>
    </table>
  </div>
  <p class="gd-note">n/m = not measured by a literature count (cooperation, vessel monitoring and diplomatic actions).</p>
</section>

<section class="gd-sec" id="cms">
  <h2 class="gd-h2">CMS Concerted Action for the franciscana</h2>
  <p class="gd-sub">Argentina, Brazil and Uruguay proposed a Concerted Action under the Convention on Migratory Species, adopted at COP14 (Samarkand, February 2024) and renewed at COP15 (Campo Grande, March 2026) for 2026–2029. It is designed to complement the IWC CMP. The estimated cost for the three years is USD 500,000–800,000.</p>
  <p class="gd-p">The renewed Concerted Action lists <b data-draw="c_n" data-source="ca_stats" data-field="n" data-row="0">—</b> activities; <b data-draw="c_need" data-source="ca_stats" data-field="needed" data-row="0">—</b> are stated as needing funds and <b data-draw="c_id" data-source="ca_stats" data-field="identified" data-row="0">—</b> has a funding source identified.</p>
  <h3 class="gd-h3">Planned activities, 2026–2029</h3>
  <div class="gd-wrap">
    <table class="gd-table" id="ca-table" data-source="cms_activities" data-row-key="activity">
      <thead><tr><th data-field="activity">Activity</th><th data-field="result">Expected result</th><th data-field="timeframe">Time frame</th><th data-field="responsibility">Responsibility</th><th data-field="funding">Funding</th><th data-field="cmp">Related CMP actions</th></tr></thead>
      <tbody data-draw="ca_body"></tbody>
    </table>
  </div>
  <p class="gd-note">Related CMP actions are a correspondence proposed here and are not stated in the CMS document.</p>
  <h3 class="gd-h3">Implementation report to COP15 (October 2025)</h3>
  <div class="gd-wrap">
    <table class="gd-table" id="progress-table" data-source="cms_progress" data-row-key="activity">
      <thead><tr><th data-field="activity">Activity</th><th data-field="status">Status</th><th data-field="progress">Progress</th><th data-field="difficulties">Difficulties</th></tr></thead>
      <tbody data-draw="prog_body"></tbody>
    </table>
  </div>
  <h3 class="gd-h3">CMS resolutions addressing the main threats</h3>
  <p class="gd-note">Resolutions named in the renewal proposal (and, for aquatic wild meat, in the 2024 Concerted Action) as addressing the threats to the species.</p>
  <div class="gd-wrap">
    <table class="gd-table" id="instruments-table" data-source="instruments" data-row-key="ref,title">
      <thead><tr><th data-field="ref">Reference</th><th data-field="title">Title</th><th data-field="theme">Theme</th><th data-field="source">Cited in</th></tr></thead>
      <tbody data-draw="instr_body"></tbody>
    </table>
  </div>
</section>

<section class="gd-sec" id="status">
  <h2 class="gd-h2">Conservation status</h2>
  <p class="gd-sub">Global IUCN assessments, an independent assessment of the FMA Ia population and the national lists of the range states. The species is listed in Appendices I and II of the CMS. Where a category could not be confirmed it is shown as T.</p>
  <div class="gd-card">
    <div class="gd-chart" id="status-chart" data-draw="chart_status" data-source="status">—</div>
    <p class="gd-note">n.d. = year not recorded in the source. Lines join successive assessments within the same jurisdiction.</p>
  </div>
  <div class="gd-wrap">
    <table class="gd-table" id="status-table" data-source="status">
      <thead><tr><th>Jurisdiction</th><th>Year</th><th>Category</th><th>Criteria</th><th>Source</th></tr></thead>
      <tbody data-draw="status_body"></tbody>
    </table>
  </div>
</section>

<section class="gd-sec" id="process">
  <h2 class="gd-h2">Range states and process</h2>
  <p class="gd-sub">The three range states, their FMAs, their relationship to the IWC and CMS and the national instruments relevant to the species, followed by the main steps of the CMP and Concerted Action process.</p>
  <div class="gd-wrap">
    <table class="gd-table" id="states-table" data-source="states" data-row-key="country">
      <thead><tr><th data-field="country">Country</th><th data-field="fmas">FMAs</th><th data-field="iwc">IWC</th><th data-field="cms">CMS</th><th data-field="instruments">Relevant instruments</th></tr></thead>
      <tbody data-draw="states_body"></tbody>
    </table>
  </div>
  <h3 class="gd-h3">Milestones, 2003–2029</h3>
  <ul class="gd-tl" id="timeline" data-draw="timeline" data-source="milestones"></ul>
  <p class="gd-note">Hollow markers denote planned steps.</p>
</section>

<section class="gd-sec" id="protected-areas">
  <h2 class="gd-h2">Protected areas within the franciscana’s range</h2>
  <p class="gd-sub">Protected areas (and one proposed area) in Brazil, Uruguay and Argentina that overlap the species’ coastal range, and whether their official documents name the franciscana or toninha. For each area, the creation act and, where available, the management plan or related official documents were downloaded and searched for “toninha”, “franciscana”, “Pontoporia”, “delfín del Plata” and “delfín de río”. Where an official text could not be retrieved, this is stated and the evidence is marked as secondary.</p>
  <p class="gd-p">Of <b data-draw="pa_n" data-source="pa_stats" data-field="n_pa" data-row="0">—</b> areas reviewed (<span data-draw="pa_created" data-source="pa_stats" data-field="n_created" data-row="0">—</span> created), the species is named in an official document for <b data-draw="pa_official" data-source="pa_stats" data-field="n_official" data-row="0">—</b>: in the creation act or its official announcement for <b data-draw="pa_act" data-source="pa_stats" data-field="n_act" data-row="0">—</b> (the Albardão national park and APA, created in March 2026), and otherwise in management plans, official area documents or the PAN Toninha. For <b data-draw="pa_none" data-source="pa_stats" data-field="n_none" data-row="0">—</b>, the acts checked do not name it at all. Creation decrees rarely name species: in Uruguay none of the decrees checked does, although the franciscana occurs in these areas.</p>
  <div class="gd-card">
    <div class="gd-chart" id="pa-chart" data-draw="chart_pa" data-source="pa_by">—</div>
  </div>
  <div class="gd-controls">
    <label>Country <select class="dash-select" data-draw="f_pa_country" data-source="protected_areas" aria-label="Filter protected areas by country"></select></label>
    <label>Evidence <select class="dash-select" data-draw="f_pa_cit" data-source="protected_areas" aria-label="Filter protected areas by where the species is named"></select></label>
  </div>
  <div class="gd-wrap">
    <table class="gd-table" id="pa-table" data-source="protected_areas" data-row-key="name">
      <thead><tr><th data-field="country">Country</th><th data-field="name">Protected area</th><th data-field="category">Category</th><th data-field="act">Creation act</th><th data-field="fma">FMA</th><th data-field="citation">Species named in</th><th data-field="evidence">Evidence</th><th data-field="verification">Verification</th></tr></thead>
      <tbody data-draw="pa_body"></tbody>
    </table>
  </div>
  <p class="gd-note">The list is not exhaustive: it covers areas named in the PAN Toninha, the CMS documents, the national species sheets and protected-area databases, and areas such as other coastal APAs, estuaries and municipal reserves may also overlap the range. “Act not checked” marks creation acts recorded from reference sources without reading the official text. Overlap is stated from the documents and the species’ range, not from a spatial analysis; a GIS overlay of the FMA boundaries with the national protected-area databases (CNUC, SNAP, SIFAP) would quantify it. The IUCN IMMA dataset, still to be supplied, would add the Important Marine Mammal Areas.</p>
</section>

<section class="gd-sec" id="legal">
  <h2 class="gd-h2">Legal instruments that name the species</h2>
  <p class="gd-sub">Laws, decrees, ordinances, resolutions and plans in Brazil, Argentina and Uruguay that name Pontoporia blainvillei or its common names (toninha, franciscana, delfín del Plata, delfín de río), with what each says about the species. Each entry gives the date, its current status where known, and whether the official text was read.</p>
  <p class="gd-p">The table lists <b data-draw="lg_n" data-source="pa_stats" data-field="n_legal" data-row="0">—</b> national, state, provincial or departmental instruments; the official text was read for <b data-draw="lg_read" data-source="pa_stats" data-field="n_legal_read" data-row="0">—</b>. Argentina has the only species-specific laws found: Río Negro declared the franciscana a protected species (2010) and Buenos Aires a natural monument (2017). In Brazil the species is named in threatened-species lists, the two cycles of the PAN Toninha and the Albardão creation; no law or decree naming it was found in Uruguay, where it appears in a departmental protected-area plan and in technical priority lists.</p>
  <div class="gd-card">
    <div class="gd-chart" id="legal-chart" data-draw="chart_legal" data-source="legal_instruments">—</div>
  </div>
  <div class="gd-controls">
    <label>Country <select class="dash-select" data-draw="f_lg_country" data-source="legal_instruments" aria-label="Filter legal instruments by country"></select></label>
  </div>
  <div class="gd-wrap">
    <table class="gd-table" id="legal-table" data-source="legal_instruments" data-row-key="instrument">
      <thead><tr><th data-field="country">Country</th><th data-field="level">Level</th><th data-field="instrument">Instrument</th><th data-field="date">Date</th><th data-field="kind">Type</th><th data-field="says">What it says about the species</th><th data-field="category">Category</th><th data-field="status">Status</th><th data-field="verification">Verification</th></tr></thead>
      <tbody data-draw="legal_body"></tbody>
    </table>
  </div>
  <p class="gd-note">Not found: a federal law creating the “Dia Nacional da Toninha” (1 October is observed since 2019 by decision of a PAN workshop, not by law); a 3rd cycle of the PAN Toninha after September 2024; a regulation of Buenos Aires Ley 14.992. Not verified: whether IN MPA/MMA 12/2012 names the species, and the state lists of Paraná, Santa Catarina and Rio de Janeiro. Threatened-species lists of other Brazilian states and the Uruguayan red list should be added once their texts are checked.</p>
</section>

<section class="gd-sec" id="literature">
  <h2 class="gd-h2">Scientific literature</h2>
  <p class="gd-sub">PubMed was searched for Pontoporia, franciscana dolphin(s), franciscanas, toninha and toninhas in titles and abstracts. PubMed indexes few regional and Portuguese- or Spanish-language journals, so PubMed counts are a lower bound. OpenAlex, an open index that also covers regional journals, theses and book chapters, is shown alongside, as is SciSpace.</p>
  <p class="gd-p">OpenAlex lists <b data-draw="o_total" data-source="lit_stats" data-field="oa_total" data-row="0">—</b> works naming the species since <span data-draw="o_first" data-source="lit_stats" data-field="oa_first" data-row="0">—</span>, with a peak of <b data-draw="o_peak_n" data-source="lit_stats" data-field="oa_peak_n" data-row="0">—</b> in <span data-draw="o_peak_year" data-source="lit_stats" data-field="oa_peak_year" data-row="0">—</span>. PubMed lists <b data-draw="p_total" data-source="lit_stats" data-field="total" data-row="0">—</b> records since <span data-draw="p_first" data-source="lit_stats" data-field="first_year" data-row="0">—</span>, <b data-draw="p_2011" data-source="lit_stats" data-field="since2011" data-row="0">—</b> of them from 2011 onwards. The peak was <b data-draw="p_peak_n" data-source="lit_stats" data-field="peak_n" data-row="0">—</b> in <span data-draw="p_peak_year" data-source="lit_stats" data-field="peak_year" data-row="0">—</span>; <b data-draw="p_last_n" data-source="lit_stats" data-field="last_n" data-row="0">—</b> appeared in <span data-draw="p_last_year" data-source="lit_stats" data-field="last_year" data-row="0">—</span> and <b data-draw="p_part_n" data-source="lit_stats" data-field="partial_n" data-row="0">—</b> so far in <span data-draw="p_part_year" data-source="lit_stats" data-field="partial_year" data-row="0">—</span>.</p>
  <div class="gd-card">
    <div class="gd-chart" id="literature-chart" data-draw="chart_lit" data-source="pubmed_years lit_years">—</div>
  </div>

  <div class="gd-card gd-dl" id="literature-download">
    <h3 class="gd-h3 ov-flow-h">Download the literature lists</h3>
    <div class="gd-controls">
      <label>List <select class="dash-select" data-lit-which aria-label="Choose the literature list to download">
        <option value="all">All lists</option>
        <option value="records">PubMed records behind the evidence counts</option>
        <option value="recent">Most recent PubMed records</option>
        <option value="scispace">SciSpace records</option>
        <option value="openalex">OpenAlex records not in PubMed</option>
        <option value="cited">Most-cited works</option>
      </select></label>
      <button type="button" class="gd-more" data-lit-dl="csv">CSV</button>
      <button type="button" class="gd-more" data-lit-dl="pdf">PDF</button>
      <span class="gd-note" data-draw="lit_dl" data-source="pubmed_live scispace_live most_cited pubmed_records" aria-live="polite"></span>
    </div>
    <p class="gd-note">Personal-data protection (LGPD, Lei nº 13.709/2018): in these tables and downloads each publication is identified by year, title, journal and DOI or PubMed link, and authorship is shown only as the first author’s surname followed by “et al.”. Full author names, affiliations, e-mail addresses and other personal data are not stored or exported. The downloads list bibliographic records only; they do not include the articles themselves, which remain with their publishers.</p>
  </div>

  <h3 class="gd-h3">Most recent PubMed records (live)</h3>
  <p class="gd-note">Retrieved live from the PubMed E-utilities API (NCBI) each time the page is opened.</p>
  <div class="gd-wrap">
    <table class="gd-table" id="pubmed-table" data-source="pubmed_live" data-row-key="title">
      <thead><tr><th data-field="date">Date</th><th data-field="first_author">First author</th><th data-field="title">Title</th><th data-field="journal">Journal</th><th>Link</th></tr></thead>
      <tbody data-draw="pm_body"></tbody>
    </table>
  </div>

  <h3 class="gd-h3">Recent records from SciSpace (snapshot of 15 November 2026)</h3>
  <p class="gd-note">A snapshot of a SciSpace search run on 15 November 2026: up to one hundred of the newest records since 2015 for a question on franciscana conservation, abundance and threats. Only records naming Pontoporia, the franciscana or the toninha are kept. Records from 2025 onwards are listed; earlier ones open on request or by choosing a year. Themes come from keywords and are an aid to browsing, not a classification.</p>
  <div class="gd-controls">
    <label>Year <select class="dash-select" data-draw="f_sci_year" data-source="scispace_live" aria-label="Filter SciSpace records by year"></select></label>
    <label>Theme <select class="dash-select" data-draw="f_sci_theme" data-source="scispace_live" aria-label="Filter SciSpace records by theme"></select></label>
    <span class="gd-note" data-draw="sci_count" data-source="scispace_live">—</span>
  </div>
  <div class="gd-wrap">
    <table class="gd-table" id="scispace-table" data-source="scispace_live" data-row-key="title">
      <thead><tr><th data-field="year">Year</th><th data-field="first_author">First author</th><th data-field="title">Title</th><th data-field="venue">Venue</th><th data-field="theme">Theme</th><th data-field="citations">Citations</th><th>Link</th></tr></thead>
      <tbody data-draw="sci_body"></tbody>
    </table>
  </div>
  <button type="button" class="gd-more" data-draw="sci_more" data-source="scispace_live" aria-controls="scispace-table"></button>

  <h3 class="gd-h3">Most-cited works</h3>
  <p class="gd-note">The most-cited works in the OpenAlex snapshot of 27 November 2026; citation counts are those of OpenAlex. This file can be replaced by a Scopus or Web of Science export.</p>
  <div class="gd-wrap">
    <table class="gd-table" id="cited-table" data-source="most_cited" data-row-key="title">
      <thead><tr><th data-field="year">Year</th><th data-field="first_author">First author</th><th data-field="title">Title</th><th data-field="journal">Journal</th><th data-field="citations">Citations</th><th>Link</th></tr></thead>
      <tbody data-draw="cited_body"></tbody>
    </table>
  </div>
</section>

<section class="gd-sec" id="evidence">
  <h2 class="gd-h2">Evidence available for each CMP action</h2>
  <p class="gd-sub">The number of records naming the species that match a topic defined for each CMP action. PubMed (snapshot of 15 November 2026) and OpenAlex (27 November 2026) are combined so that each document is counted once: OpenAlex records already in PubMed (same PMID, DOI or title) are not added. Topics are matched from keywords in the title (and, for PubMed, author keywords and MeSH terms), from specific phrases in the abstract, and, for OpenAlex records in Portuguese or Spanish, from the equivalent terms in those languages. The records behind each count are listed below.</p>
  <p class="gd-p">Counting each document once, <b data-draw="e_base" data-source="evid_stats" data-field="baseline" data-row="0">—</b> records name the species: <b data-draw="e_basepm" data-source="evid_stats" data-field="base_pm" data-row="0">—</b> in PubMed and a further <b data-draw="e_baseoa" data-source="evid_stats" data-field="base_oa" data-row="0">—</b> in OpenAlex only. The topics of <b data-draw="e_nmeas" data-source="evid_stats" data-field="n_meas" data-row="0">—</b> of the <b data-draw="e_nact" data-source="evid_stats" data-field="n_actions" data-row="0">—</b> actions can be matched. Evidence ranges from <b data-draw="e_lo_n" data-source="evid_stats" data-field="lo_n" data-row="0">—</b> records (<span data-draw="e_lo_id" data-source="evid_stats" data-field="lo_id" data-row="0">—</span>) to <b data-draw="e_hi_n" data-source="evid_stats" data-field="hi_n" data-row="0">—</b> (<span data-draw="e_hi_id" data-source="evid_stats" data-field="hi_id" data-row="0">—</span>). <b data-draw="e_nlow" data-source="evid_stats" data-field="n_low" data-row="0">—</b> actions have fewer than 10 records and <b data-draw="e_nzero" data-source="evid_stats" data-field="n_zero" data-row="0">—</b> have none: <span data-draw="e_lowids" data-source="evid_stats" data-field="low_ids" data-row="0">—</span>. On PubMed alone the number under 10 was <b data-draw="e_nlowpm" data-source="evid_stats" data-field="n_low_pm" data-row="0">—</b>: OpenAlex adds the regional journals and theses where much of the work on bycatch, strandings and mitigation trials is published. Evidence from IWC papers and grey literature is still not counted.</p>
  <div class="gd-controls">
    <label>Strategic line <select class="dash-select" data-draw="f_e_line" data-source="actions" aria-label="Filter the evidence by strategic line"></select></label>
  </div>
  <div class="gd-card">
    <div class="gd-chart" id="evidence-chart" data-draw="chart_evid" data-source="evidence_counts">—</div>
  </div>
  <div class="gd-wrap">
    <table class="gd-table" id="evidence-table" data-source="evidence_counts" data-row-key="id">
      <thead><tr><th data-field="id">Action</th><th data-field="topic">Topic</th><th data-field="label">Evidence topic</th><th data-field="count_pubmed">PubMed</th><th data-field="count_oa">Added from OpenAlex</th><th data-field="count">Integrated</th><th data-field="rule">Rule</th></tr></thead>
      <tbody data-draw="evid_body"></tbody>
    </table>
  </div>
  <p class="gd-note">OpenAlex records were kept when their title or abstract names Pontoporia, the toninha or the franciscana dolphin; errata, datasets (other than the SALVE assessment), software and reference entries were excluded, and duplicate versions of the same work were merged. Author names in OpenAlex are not always in surname order, so a few first-author entries may show a given name. A record may match several topics, so counts overlap and must not be added. Keyword rules are a heuristic for review by the CMP coordinators, not a manual classification. Actions RES-2.1, MON-1.4, MON-1.5 and PAC-2.1 are not measured. A low count is a gap in indexed evidence, not an absence of knowledge.</p>

  <div class="gd-card gd-dl" id="evidence-download">
    <h3 class="gd-h3 ov-flow-h">Download the publications matched to an action</h3>
    <div class="gd-controls">
      <label>Action <select class="dash-select" data-draw="f_d_action" data-source="evidence_counts" aria-label="Choose the CMP action whose publications to download"></select></label>
      <button type="button" class="gd-more" data-evid-dl="csv">CSV</button>
      <button type="button" class="gd-more" data-evid-dl="pdf">PDF</button>
      <span class="gd-note" data-draw="evid_dl_count" data-source="pubmed_records oa_records" aria-live="polite"></span>
      <span class="gd-note" data-draw="evid_dl" data-source="pubmed_records oa_records evidence_counts" aria-live="polite"></span>
    </div>
    <p class="gd-note">The file lists the PubMed records and the OpenAlex records (not in PubMed) whose title or abstract matches the action’s topic, with year, first author’s surname followed by “et al.”, title, journal or source, all matched actions and a DOI, PubMed or OpenAlex link. It is a bibliography of the evidence counted here, not the articles themselves; matching is by keywords and should be checked before citing.</p>
  </div>

  <h3 class="gd-h3">Records behind the counts</h3>
  <div class="gd-controls">
    <label>Action <select class="dash-select" data-draw="f_r_action" data-source="evidence_counts" aria-label="Show the records matched to one action"></select></label>
    <label>Search <input class="gd-input" type="search" data-param="r_q" placeholder="Title word, author or year" aria-label="Search the PubMed records"></label>
    <span class="gd-note" data-draw="rec_count" data-source="pubmed_records">—</span>
  </div>
  <div class="gd-wrap">
    <table class="gd-table" id="records-table" data-source="pubmed_records" data-row-key="pmid">
      <thead><tr><th data-field="year">Year</th><th data-field="first_author">First author</th><th data-field="title">Title</th><th data-field="journal">Journal</th><th data-field="actions">Matched actions</th><th>Link</th></tr></thead>
      <tbody data-draw="rec_body"></tbody>
    </table>
  </div>

  <h3 class="gd-h3">Records added from OpenAlex (not in PubMed)</h3>
  <p class="gd-note">OpenAlex works that name the species and are not in PubMed, with the actions each was matched to and whether the match rests on the title, the abstract or both. Regional and Portuguese- or Spanish-language journals and theses make up most of them. Records matched to no topic count only towards the total.</p>
  <div class="gd-controls">
    <label>Action <select class="dash-select" data-draw="f_o_action" data-source="evidence_counts" aria-label="Show the OpenAlex records matched to one action"></select></label>
    <label>Search <input class="gd-input" type="search" data-param="o_q" placeholder="Title word, author, source or year" aria-label="Search the OpenAlex records"></label>
    <span class="gd-note" data-draw="oa_count" data-source="oa_records">—</span>
  </div>
  <div class="gd-wrap">
    <table class="gd-table" id="oa-table" data-source="oa_records" data-row-key="openalex_id">
      <thead><tr><th data-field="year">Year</th><th data-field="first_author">First author</th><th data-field="title">Title</th><th data-field="source">Source</th><th data-field="type">Type</th><th data-field="actions">Matched actions</th><th data-field="matched_by">Matched on</th><th>Link</th></tr></thead>
      <tbody data-draw="oa_body"></tbody>
    </table>
  </div>
</section>

<section class="gd-sec" id="updating">
  <h2 class="gd-h2">Updating the evidence base</h2>
  <p class="gd-sub">The page reads its data from the JSON files in the repository’s <code>data/</code> folder; only the most recent PubMed records are fetched live.</p>
  <div class="gd-card">
    <ol class="gd-steps">
      <li><b>IWC CMP and assessment documents.</b> When the IWC Comprehensive Assessment (from 2026) or a revised CMP action table is available, it is transcribed into the data files; the actions, priorities and abundance files are then replaced and the page redraws.</li>
      <li><b>Direct replacement of a data file.</b> Edit or replace a file in <code>data/</code>, keeping the same field names, and commit; the page redraws from the new file.</li>
      <li><b>PubMed and SciSpace.</b> The PubMed recent-records table is live; the SciSpace table, the annual series and the counts per action are dated snapshots, regenerated with the scripts in <code>tools/</code>.</li>
      <li><b>OpenAlex, Scopus and Web of Science.</b> The OpenAlex snapshot (records per year, most-cited works and records added to the counts) can be rerun at any time; it is deduplicated against PubMed by PMID, DOI and title. Scopus and Web of Science exports can replace the most-cited file.</li>
      <li><b>IMMAs and the PAN Toninha.</b> Supplying the IUCN IMMA dataset and the 2nd-cycle PAN Toninha objectives would add the IMMA map and a PAN evidence table, as in the Guiana dolphin dashboard.</li>
    </ol>
  </div>
</section>

<section class="gd-sec" id="notes">
  <h2 class="gd-h2">Editorial and consistency notes</h2>
  <p class="gd-sub">Points where sources differ or data are missing, with what has been applied in this dashboard.</p>
  <div class="gd-wrap">
    <table class="gd-table" id="flags-table" data-source="flags" data-row-key="topic">
      <thead><tr><th data-field="topic">Topic</th><th data-field="status">Status</th><th data-field="issue">Observation</th><th data-field="action">Action needed</th><th data-field="resolution">In the dashboard</th></tr></thead>
      <tbody data-draw="flags_body"></tbody>
    </table>
  </div>
  <details class="gd-note" id="provenance">
    <summary>Data provenance and conventions</summary>
    <p>Management units, actions, threats, activities and milestones were transcribed from UNEP/CMS/Concerted Action 14.5 (2024), its COP15 revision (2026) and COP15 documents Doc.31.2.8 and Doc.31.3.7. Abundance figures come from the abstracts of the cited papers, retrieved through SciSpace, and are reproduced as reported without harmonisation. National listings are as cited in those documents. The literature series and evidence counts are a PubMed snapshot of 15 November 2026. Each source is listed under Sources with its date and basis.</p>
  </details>
</section>

<section class="gd-sec gd-refs" id="references">
  <h2 class="gd-h2">References and credits</h2>
  <div class="gd-credit" id="credits">
    <p><b>Dashboard prepared by the Laboratório de Ecologia e Conservação, Universidade Federal do Paraná, Paraná, Brazil.</b></p>
    <p>Suggested citation: Laboratório de Ecologia e Conservação, Universidade Federal do Paraná (2026). <i>Franciscana dolphin (toninha): evidence and assessment dashboard</i>. Supporting the IWC Conservation Management Plan for <i>Pontoporia blainvillei</i>.</p>
    <p>Cover photograph: Federico Sucunza.</p>
  </div>
  <h3 class="gd-h3">Data sources</h3>
  <ul class="gd-refs-list" id="data-sources">
    <li>UNEP/CMS (2024). Concerted Action for the Franciscana Dolphin (<i>Pontoporia blainvillei</i>). UNEP/CMS/Concerted Action 14.5, adopted at COP14, Samarkand. Includes the IWC CMP actions for 2022–2026.</li>
    <li>UNEP/CMS (2026). Concerted Action 14.5 (Rev.COP15), adopted at COP15, Campo Grande, March 2026.</li>
    <li>Argentina, Brazil and Uruguay (2025). Report on the implementation of the Concerted Action for the franciscana dolphin. UNEP/CMS/COP15/Doc.31.2.8.</li>
    <li>Argentina, Brazil and Uruguay (2025). Proposal for the renewal of the Concerted Action for the franciscana dolphin. UNEP/CMS/COP15/Doc.31.3.7.</li>
    <li>Secchi et al. (2021). A synthesis of the ecology, human-related threats and conservation perspectives for the endangered franciscana dolphin. <i>Frontiers in Marine Science</i> 8: 617956.</li>
    <li>Sucunza et al. (2023). Distribution, population size and IUCN Red Listing of an isolated population of the threatened franciscana. <i>Endangered Species Research</i>. doi:10.3354/esr01262.</li>
    <li>Crespo et al. (2026). Abundance estimation of franciscana dolphins by means of aerial surveys in Buenos Aires province, Argentina. <i>Mastozoología Neotropical</i>. doi:10.31687/saremmn.26.33.02.07.e1297.</li>
    <li>Danilewicz et al. (2010). Abundance estimate for a threatened population of franciscana dolphins in southern coastal Brazil. <i>J. Mar. Biol. Assoc. UK</i> 90: 1649–1657.</li>
    <li>Secchi et al. (2001). A first estimate of franciscana abundance off southern Brazil. <i>J. Cetacean Res. Manage.</i> 3: 95–100.</li>
    <li>Cremer &amp; Simões-Lopes (2008). Distribution, abundance and density estimates of franciscanas in Babitonga Bay, southern Brazil. <i>Revista Brasileira de Zoologia</i> 25: 397–402.</li>
    <li>Cunha et al. (2014). Population structure of the endangered franciscana dolphin: reassessing management units. <i>PLOS ONE</i> 9: e85633; Cunha et al. (2020) as cited in CMS CA 14.5.</li>
    <li>Brazil, Ministério do Meio Ambiente: Portaria MMA nº 444/2014 and nº 148/2022 (national list of threatened species); ICMBio Portarias nº 91/2010 and nº 655/2019 (PAN Toninha).</li>
    <li>Sucunza et al. (2020). Distribution, habitat use, and abundance of the endangered franciscana in southeastern and southern Brazil. <i>Marine Mammal Science</i>. doi:10.1111/mms.12650.</li>
    <li>Sucunza et al. (2025). Ficha de <i>Pontoporia blainvillei</i>. Sistema de Avaliação do Risco de Extinção da Biodiversidade (SALVE), ICMBio. doi:10.37002/salve.ficha.14512.3.</li>
    <li>Priem et al. (2022). OpenAlex: a fully-open index of scholarly works, authors, venues, institutions, and concepts. arXiv:2205.01833 (openalex.org).</li>
    <li>Natural Earth (1:50m cultural vectors, world-atlas 2.0.2), public domain, naturalearthdata.com.</li>
    <li>PubMed, National Center for Biotechnology Information, U.S. National Library of Medicine (pubmed.ncbi.nlm.nih.gov).</li>
    <li>SciSpace (scispace.com), scholarly search used for abundance abstracts, the recent-records table and citation counts.</li>
  </ul>
</section>

<p class="gd-foot">Hover over or touch a chart mark for details. The data behind every figure are the JSON files in the <code>data/</code> folder of the <a href="https://github.com/cadomit/Franciscana_CMP" target="_blank" rel="noopener noreferrer">GitHub repository</a>.</p>
</div>
</main>
<script src="js/vendor/d3.min.js"></script>
<script src="js/dash-runtime.js"></script>
<script src="js/app.js"></script>
<script src="js/draw.js"></script>
<script src="js/map.js"></script>
<script src="js/sci.js"></script>
<script src="js/overview.js"></script>
<script src="js/legal.js"></script>
<script src="js/litdl.js"></script>
</body>
</html>
```

### 6.2 Estilos

#### `css/tokens.css`

```css
/* Design tokens used by css/app.css and the page scripts, with light and dark themes. */
:root {
  --color-fg: #1f2328;
  --color-fg-muted: #5f6670;
  --color-bg: #ffffff;
  --color-panel: #f6f7f8;
  --color-border-line: #dfe2e6;
  --color-ok: #2e7d4f;
  --color-warn: #b8700f;
  --color-bad: #c0392b;
  --dash-c1: #2f6f9f;
  --dash-c2: #c7803a;
  --dash-c3: #4f9a72;
  --cds-text-secondary: #5f6670;
  --cds-chart-grid: #e6e8eb;
  --cds-chart-axis: #c9cdd2;
  --cds-chart-reference: #8a9099;
  --cds-surface-popover: #ffffff;
  --cds-border: #dfe2e6;
  --cds-shadow-popover: 0 4px 14px rgba(0, 0, 0, .16);
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-serif: Georgia, "Times New Roman", serif;
  --cds-font-size-caption: 12px;
  --cds-font-size-body: 14px;
  --cds-font-size-heading: 17px;
  --cds-font-size-title: 24px;
  --cds-font-weight-medium: 500;
  --cds-gap-xs: 4px; --cds-gap-sm: 8px; --cds-gap-md: 12px; --cds-gap-lg: 20px; --cds-gap-xl: 28px;
  --cds-pad-xs: 4px; --cds-pad-sm: 8px; --cds-pad-md: 12px; --cds-pad-lg: 16px; --cds-pad-xl: 24px;
  --cds-radius: 8px;
}
@media (prefers-color-scheme: dark) {
  :root {
    --color-fg: #e6e8eb;
    --color-fg-muted: #a3a9b2;
    --color-bg: #15181c;
    --color-panel: #1d2126;
    --color-border-line: #30353c;
    --color-warn: #e0a24a;
    --color-bad: #e7766a;
    --dash-c1: #6fa8d6;
    --dash-c2: #e0a463;
    --dash-c3: #7cc29c;
    --cds-text-secondary: #a3a9b2;
    --cds-chart-grid: #2a2f35;
    --cds-chart-axis: #3a4048;
    --cds-chart-reference: #8a9099;
    --cds-surface-popover: #23282e;
    --cds-border: #30353c;
    --cds-shadow-popover: 0 4px 14px rgba(0, 0, 0, .5);
  }
}
html { background: var(--color-bg); color-scheme: light dark; }
body { margin: 0; background: var(--color-bg); color: var(--color-fg); }
#dash-root { padding: 16px; }
#dash-root .gd-select, #dash-root .dash-select { font: inherit; font-size: var(--cds-font-size-caption); padding: 4px 8px; border-radius: var(--cds-radius); border: 1px solid var(--color-border-line); background-color: var(--color-bg); color: var(--color-fg); max-width: 100%; }
#dash-root a { color: var(--dash-c1); }
#dash-root code { font-size: .92em; }
```

#### `css/app.css`

```css
.gd{--gd-a:#3b6ea5;font-family:var(--font-sans);color:var(--color-fg);font-size:var(--cds-font-size-body);line-height:1.5;max-width:1120px;margin:0 auto}
.gd *{box-sizing:border-box}
.s3{--c:color-mix(in srgb,var(--gd-a) 88%,var(--color-bg))}
.s2{--c:color-mix(in srgb,var(--gd-a) 56%,var(--color-bg))}
.s1{--c:color-mix(in srgb,var(--gd-a) 28%,var(--color-bg))}
.gd-head{padding:var(--cds-pad-md) 0 var(--cds-pad-sm)}
.gd-kicker{margin:0;color:var(--color-fg-muted);font-size:var(--cds-font-size-caption);letter-spacing:.06em;text-transform:uppercase}
.gd-title{margin:4px 0 8px;font-family:var(--font-serif);font-weight:400;font-size:clamp(24px,4vw,34px);line-height:1.15}
.gd-lede{margin:0;max-width:80ch;font-size:var(--cds-font-size-heading)}
.gd-lede b{font-weight:600;font-variant-numeric:tabular-nums}
.gd-nav{position:sticky;top:0;z-index:5;display:flex;gap:4px;flex-wrap:wrap;padding:8px 0;margin:12px 0 4px;background:var(--color-bg);border-bottom:1px solid var(--color-border-line)}
.gd-nav a{padding:4px 10px;border-radius:999px;color:var(--color-fg-muted);text-decoration:none;font-size:var(--cds-font-size-caption);cursor:pointer}
.gd-nav a:hover{background:var(--color-panel);color:var(--color-fg)}
.gd-sec{padding:var(--cds-pad-lg) 0 var(--cds-pad-md);scroll-margin-top:56px}
.gd-h2{margin:0 0 4px;font-family:var(--font-serif);font-weight:400;font-size:var(--cds-font-size-title)}
.gd-sub{margin:0 0 var(--cds-gap-md);max-width:84ch;color:var(--color-fg-muted)}
.gd-h3{margin:var(--cds-gap-lg) 0 6px;font-size:var(--cds-font-size-body);font-weight:600}
.gd-note{margin:6px 0 0;color:var(--color-fg-muted);font-size:var(--cds-font-size-caption);max-width:92ch}
.gd-p{margin:6px 0;max-width:84ch}
.gd-p b{font-weight:600;font-variant-numeric:tabular-nums}
.gd-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:var(--cds-gap-sm);margin:var(--cds-gap-md) 0}
.gd-tile{background:var(--color-panel);border:1px solid var(--color-border-line);border-radius:var(--cds-radius);padding:var(--cds-pad-md)}
.gd-tile-v{font-family:var(--font-serif);font-size:30px;line-height:1.1;font-variant-numeric:tabular-nums}
.gd-tile-l{margin-top:4px;color:var(--color-fg-muted);font-size:var(--cds-font-size-caption)}
.gd-card{background:var(--color-panel);border:1px solid var(--color-border-line);border-radius:var(--cds-radius);padding:var(--cds-pad-lg);margin:var(--cds-gap-sm) 0}
.gd-chart{position:relative;min-height:60px;width:100%}
.gd-chart svg{display:block;overflow:visible}
.gd-chart svg text{font-family:var(--font-sans);fill:var(--cds-text-secondary,var(--color-fg-muted));font-size:12px}
.gd-chart svg text.gd-lbl{fill:var(--color-fg)}
.gd-chart svg text.gd-head{fill:var(--color-fg);font-weight:600}
.gd-chart svg text.gd-gap{font-style:italic}
.gd-chart svg .gd-grid line{stroke:var(--cds-chart-grid,var(--color-border-line))}
.gd-chart svg .gd-axis path,.gd-chart svg .gd-axis line{stroke:var(--cds-chart-axis,var(--color-border-line))}
.gd-seg{fill:var(--c)}
.gd-seg.part{fill:color-mix(in srgb,var(--gd-a) 22%,var(--color-bg));stroke:var(--gd-a);stroke-dasharray:3 2}
.gd-mk{fill:var(--c);stroke:var(--color-bg);stroke-width:2}
.gd-mk.dd{fill:var(--color-bg);stroke:var(--color-fg-muted);stroke-dasharray:2 2}
.gd-ln{stroke:var(--cds-chart-axis,var(--color-border-line));stroke-width:1.5;fill:none}
.gd-rng{fill:var(--gd-a)}
.gd-hit{fill:transparent}
.gd-tip{position:absolute;z-index:4;pointer-events:none;max-width:300px;padding:8px 10px;border-radius:var(--cds-radius);background:var(--cds-surface-popover,var(--color-panel));border:1px solid var(--cds-border,var(--color-border-line));box-shadow:var(--cds-shadow-popover,0 4px 14px rgba(0,0,0,.18));font-size:12px;color:var(--cds-text-secondary,var(--color-fg-muted))}
.gd-tip-h{color:var(--color-fg);font-weight:600;margin-bottom:2px}
.gd-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin:0 0 6px;font-size:var(--cds-font-size-caption);color:var(--color-fg-muted)}
.gd-sw{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:5px;vertical-align:-1px;background:var(--c)}
.gd-sw.dd{background:var(--color-bg);border:1px dashed var(--color-fg-muted)}
.gd-sw.part{background:color-mix(in srgb,var(--gd-a) 22%,var(--color-bg));border:1px dashed var(--gd-a)}
.gd-controls{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin:8px 0}
.gd-input{font:inherit;font-size:var(--cds-font-size-caption);padding:4px 8px;border-radius:var(--cds-radius);border:1px solid var(--color-border-line);background:var(--color-bg);color:var(--color-fg);min-width:180px}
.gd-wrap{overflow-x:auto}
.gd-table{width:100%;border-collapse:collapse;font-size:var(--cds-font-size-caption)}
.gd-table th{text-align:left;font-weight:600;color:var(--color-fg-muted);padding:6px 8px;border-bottom:1px solid var(--color-border-line);white-space:nowrap}
.gd-table td{padding:6px 8px;border-bottom:1px solid var(--color-border-line);vertical-align:top}
.gd-table td.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.gd-table td.nw{white-space:nowrap}
.gd-table td.wide{min-width:260px}
.gd-table td.gd-empty{color:var(--color-fg-muted);text-align:center;padding:16px}
.gd-badge{display:inline-block;padding:1px 8px;border-radius:999px;font-size:11px;border:1px solid var(--color-border-line);white-space:nowrap}
.gd-badge.vh{background:color-mix(in srgb,var(--gd-a) 88%,var(--color-bg));color:var(--color-bg);border-color:transparent}
.gd-badge.hi{background:color-mix(in srgb,var(--gd-a) 56%,var(--color-bg));border-color:transparent;color:var(--color-fg)}
.gd-badge.md{background:color-mix(in srgb,var(--gd-a) 22%,var(--color-bg));border-color:transparent;color:var(--color-fg)}
.gd-badge.warn{border-color:var(--color-warn);color:var(--color-warn)}
.gd-badge.gap{border-color:var(--color-bad);color:var(--color-bad)}
.gd-table details summary{cursor:pointer;color:var(--color-fg-muted)}
.gd-table details p{margin:4px 0 0;max-width:60ch;white-space:normal}
.gd-steps{margin:0;padding-left:1.2em}
.gd-steps li{margin:8px 0;max-width:86ch}
.gd-tl{list-style:none;margin:0;padding:0;border-left:2px solid var(--color-border-line)}
.gd-tl li{position:relative;padding:0 0 10px 14px}
.gd-tl li::before{content:"";position:absolute;left:-6px;top:6px;width:10px;height:10px;border-radius:50%;background:var(--gd-a)}
.gd-tl li.plan::before{background:var(--color-bg);border:2px solid var(--gd-a)}
.gd-tl-y{font-weight:600;font-variant-numeric:tabular-nums;margin-right:8px}
.gd-tl-k{color:var(--color-fg-muted);font-size:var(--cds-font-size-caption)}
.gd-foot{margin:var(--cds-gap-lg) 0;color:var(--color-fg-muted);font-size:var(--cds-font-size-caption)}
[data-dash-source-state=refreshing]{opacity:.5}
@media (max-width:520px){.gd-tile-v{font-size:26px}.gd-card{padding:var(--cds-pad-md)}}
.gd-map{min-height:320px;max-width:760px}
.gd-map .gd-sea{fill:color-mix(in srgb,var(--gd-a) 6%,var(--color-bg))}
.gd-map .gd-grat{fill:none;stroke:var(--cds-chart-grid,var(--color-border-line));stroke-width:.5}
.gd-map .gd-land{fill:color-mix(in srgb,var(--color-fg) 7%,var(--color-bg));stroke:var(--color-border-line);stroke-width:.6}
.gd-map .gd-land.rs{fill:color-mix(in srgb,var(--color-fg) 13%,var(--color-bg))}
.gd-map .gd-range{fill:none;stroke:color-mix(in srgb,var(--gd-a) 45%,var(--color-bg));stroke-width:5;stroke-linejoin:round;stroke-linecap:round}
.gd-map .gd-span{fill:none;stroke:var(--gd-a);stroke-width:5;stroke-linejoin:round;stroke-linecap:round}
.gd-map .gd-imma circle{fill:var(--gd-a);stroke:var(--color-bg);stroke-width:1.5;cursor:pointer}
.gd-map .gd-imma text{fill:var(--color-bg);font-size:11px;font-weight:600;pointer-events:none}
.gd-map svg text.gd-sea-lbl{font-style:italic;fill:var(--color-fg-muted)}
.gd-sw.rng{background:color-mix(in srgb,var(--gd-a) 45%,var(--color-bg));height:5px;vertical-align:2px}
.gd-sw.spn{background:var(--gd-a);height:5px;vertical-align:2px}
.gd-sw.dot{background:var(--gd-a);border-radius:50%}
.gd-sw.rs{background:color-mix(in srgb,var(--color-fg) 13%,var(--color-bg));border:1px solid var(--color-border-line)}
.gd-warn-note{border-left:3px solid var(--color-warn);padding-left:8px}
.gd-map .gd-lead{stroke:var(--color-fg-muted);stroke-width:1}
.gd-map .gd-anchor{fill:var(--color-fg)}
.gd-map svg{overflow:hidden}
.gd-controls label{max-width:100%;min-width:0}.gd-controls .dash-select{max-width:100%}
.ov-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:var(--cds-gap-sm)}
.ov-card{background:var(--color-panel);border:1px solid var(--color-border-line);border-radius:var(--cds-radius);padding:var(--cds-pad-md);cursor:pointer;display:flex;flex-direction:column;gap:2px;min-width:0}
.ov-card:hover,.ov-card:focus-visible{border-color:var(--gd-a);outline:none}
.ov-k{margin:0;color:var(--color-fg-muted);font-size:var(--cds-font-size-caption);letter-spacing:.05em;text-transform:uppercase}
.ov-big{margin:0;font-family:var(--font-serif);font-size:32px;line-height:1.1;font-variant-numeric:tabular-nums}
.ov-of{font-size:18px;color:var(--color-fg-muted)}
.ov-arrow{color:var(--color-fg-muted);font-size:22px}
.ov-s{margin:0 0 6px;color:var(--color-fg-muted);font-size:var(--cds-font-size-caption)}
.ov-viz{min-height:40px;margin-top:auto}
.gd-chart svg text.ov-tick{font-size:10px}
.ov-axis{stroke:var(--cds-chart-axis,var(--color-border-line));stroke-width:1}
.gd-mk.ov-global{stroke:var(--color-fg);stroke-width:1.5}
.ov-empty{fill:none;stroke:var(--color-fg-muted);stroke-dasharray:2 2}
.ov-hollow{fill:var(--color-bg);stroke:var(--gd-a);stroke-width:1.5}
.ov-flowcard{margin-top:var(--cds-gap-md)}
.ov-flow-h{margin-top:0}
.ov-flow{min-height:200px;margin-top:8px}
.ov-link{fill:none;stroke:color-mix(in srgb,var(--gd-a) 35%,var(--color-bg));stroke-width:1.2;transition:stroke .15s}
.ov-link.on{stroke:var(--gd-a);stroke-width:2}
.ov-threat rect{fill:var(--color-bg);stroke:var(--color-border-line)}
.ov-threat{cursor:default}
.gd-chart svg text.ov-vh{font-weight:600}
.gd-seg.ov-low{stroke:var(--color-warn);stroke-width:1.5}
.ov-thr{stroke:var(--cds-chart-reference,var(--color-fg-muted));stroke-dasharray:3 3}
@media (prefers-reduced-motion: reduce){.ov-link{transition:none}}
.ov-dot{fill:color-mix(in srgb,var(--gd-a) 45%,var(--color-bg))}
.ov-dot.on{fill:var(--gd-a)}
.ov-col{stroke:var(--cds-chart-grid,var(--color-border-line))}
.gd-chart svg text.ov-n{font-size:11px;font-weight:600;fill:var(--color-fg);pointer-events:none}
.gd-chart svg text.ov-n.inv{fill:var(--color-bg)}
.ov-list{list-style:none;margin:2px 0 4px;padding:0;display:flex;flex-direction:column;gap:4px}
.ov-list li{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 8px;padding:3px 0 3px 8px;border-left:3px solid var(--gd-a);font-size:var(--cds-font-size-caption)}
.ov-li-t{color:var(--color-fg);font-weight:600}
.ov-li-k{color:var(--color-fg-muted)}
.ov-mini{margin:6px 0 0;color:var(--color-fg-muted);font-size:10px;text-transform:uppercase;letter-spacing:.05em}
.gd-chart svg text.ov-rowlbl{font-size:11px}
.ov-lowkey{fill:none;stroke:var(--color-warn);stroke-width:1.5}
.gd-map .gd-immapoly{fill:color-mix(in srgb,var(--gd-a) 22%,transparent);stroke:var(--gd-a);stroke-width:1;stroke-linejoin:round;cursor:pointer}
.gd-map .gd-immapoly.on{fill:color-mix(in srgb,var(--gd-a) 45%,transparent);stroke-width:2}
.gd-sw.imp{background:color-mix(in srgb,var(--gd-a) 22%,var(--color-bg));border:1px solid var(--gd-a)}
.gd-mk.tu{fill:color-mix(in srgb,var(--gd-a) 45%,var(--color-bg));stroke:var(--gd-a);stroke-width:1.5;stroke-dasharray:2 1.5}
.gd-sw.tu{background:color-mix(in srgb,var(--gd-a) 45%,var(--color-bg));border:1px dashed var(--gd-a)}
.gd-more{margin:8px 0 0;font:inherit;font-size:var(--cds-font-size-caption);color:var(--gd-a);background:var(--color-panel);border:1px solid var(--color-border-line);border-radius:999px;padding:4px 12px;cursor:pointer}
.gd-more:hover{border-color:var(--gd-a)}
.gd-hero{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:var(--cds-gap-xl);align-items:center}
.gd-hero-fig{margin:0;min-width:0}
.gd-hero-img{display:block;width:100%;height:auto;aspect-ratio:580/310;object-fit:cover;border-radius:var(--cds-radius);border:1px solid var(--color-border-line)}
.gd-hero-cap{margin-top:4px;color:var(--color-fg-muted);font-size:var(--cds-font-size-caption)}
@media (max-width:720px){.gd-hero{grid-template-columns:1fr;gap:var(--cds-gap-md)}.gd-hero-fig{order:-1}}
.gd-credit{background:var(--color-panel);border:1px solid var(--color-border-line);border-left:3px solid var(--gd-a);border-radius:var(--cds-radius);padding:var(--cds-pad-md) var(--cds-pad-lg);max-width:84ch}
.gd-credit p{margin:4px 0}
.gd-refs-list{margin:4px 0 0;padding-left:18px;font-size:var(--cds-font-size-caption);max-width:110ch}
.gd-refs-list li{margin:3px 0}
.gd-refs-cols{columns:2 320px;column-gap:var(--cds-gap-xl)}
.gd-refs-cols li{break-inside:avoid}
.gd-ref-k{color:var(--color-fg-muted)}
.s4{--c:color-mix(in srgb,var(--gd-a) 100%,var(--color-fg) 30%)}
.gd-mk.s4{fill:color-mix(in srgb,var(--gd-a) 70%,var(--color-fg))}
.gd-sw.s4{background:color-mix(in srgb,var(--gd-a) 70%,var(--color-fg))}
.gd-map .gd-place circle{fill:var(--gd-a);stroke:var(--color-bg);stroke-width:1.5;cursor:pointer}
.gd-map .gd-place text{fill:var(--color-bg);font-size:10px;font-weight:600;pointer-events:none}
.gd-chart svg .gd-thr{stroke:var(--cds-chart-reference,var(--color-fg-muted));stroke-dasharray:3 3}
.gd-chart svg .gd-pt{fill:var(--gd-a);stroke:var(--color-bg);stroke-width:1.5}
.gd-chart svg .gd-ci{fill:color-mix(in srgb,var(--gd-a) 35%,var(--color-bg))}
.gd-chart svg .gd-bar{fill:var(--c)}
.gd-chart svg .gd-bar.zero{fill:none;stroke:var(--color-bad);stroke-dasharray:2 2}
.gd-chart svg .gd-lit{fill:color-mix(in srgb,var(--gd-a) 70%,var(--color-bg))}
.gd-chart svg .gd-lit.part{fill:var(--color-bg);stroke:var(--gd-a);stroke-dasharray:2 2}
.gd-hero-badge{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.gd-aka{display:inline-block;padding:2px 10px;border-radius:999px;background:var(--color-panel);border:1px solid var(--color-border-line);font-size:var(--cds-font-size-caption);color:var(--color-fg-muted)}
.gd-hero-art{display:block;width:100%;height:auto;max-height:240px}
.gd-hero-art .body{fill:color-mix(in srgb,var(--gd-a) 55%,var(--color-bg))}
.gd-hero-art .belly{fill:color-mix(in srgb,var(--gd-a) 20%,var(--color-bg))}
.gd-hero-art .wave{fill:none;stroke:color-mix(in srgb,var(--gd-a) 30%,var(--color-bg));stroke-width:2}
.gd-hero-art .eye{fill:var(--color-fg)}
.ov-sq{stroke:var(--color-bg);stroke-width:2}
.ov-sq.none{fill:none;stroke:var(--color-bad);stroke-dasharray:2 2;stroke-width:1.2}
.gd-seg.dd{fill:var(--color-bg);stroke:var(--color-fg-muted);stroke-dasharray:2 2}

.gd-hero-img.gd-hero-photo{aspect-ratio:3/2;object-fit:cover}

.gd-chart svg .gd-lit.oa{fill:color-mix(in srgb,var(--gd-a) 30%,var(--color-bg))}
.gd-chart svg .gd-lit.oa.part{fill:var(--color-bg);stroke:color-mix(in srgb,var(--gd-a) 50%,var(--color-bg));stroke-dasharray:2 2}
.gd-chart svg .gd-bar.pmpart{fill:color-mix(in srgb,var(--color-fg) 55%,transparent)}
.gd-sw.pmpart{background:color-mix(in srgb,var(--color-fg) 55%,transparent);height:6px;vertical-align:1px}
```

### 6.3 JavaScript

#### `js/dash-runtime.js`

```javascript
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
```

#### `js/app.js`

```javascript
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
```

#### `js/draw.js`

```javascript
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
```

#### `js/map.js`

```javascript
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
```

#### `js/sci.js`

```javascript
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
```

#### `js/overview.js`

```javascript
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
```

#### `js/legal.js`

```javascript
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
```

#### `js/litdl.js`

```javascript
/* Download the literature tables as CSV or PDF.
   Only the first author's surname is kept, followed by "et al."; no other author or personal data
   (full names, affiliations, e-mails) is included (LGPD, Lei nº 13.709/2018).
   Files are built in the browser and saved directly; nothing is sent to any server. */
(() => {
  const COLS = ['list', 'year', 'date', 'first_author', 'title', 'venue', 'citations', 'theme', 'actions', 'link'];
  const HEAD = ['List', 'Year', 'Date', 'First author (et al.)', 'Title', 'Journal or venue', 'Citations', 'Theme', 'Matched CMP actions', 'Link'];
  const doiLink = (d) => (!d ? '' : /^https?:/.test(d) ? d : 'https://doi.org/' + d);
  const rowsNow = (which) => {
    const pm = GD.ok('pubmed_live') || [], sc = GD.ok('scispace_live') || [], mc = GD.ok('most_cited') || [], pr = GD.ok('pubmed_records') || [], oa = GD.ok('oa_records') || [];
    const lists = {
      recent: pm.map((r) => ({ list: 'PubMed (most recent)', year: String(r.date || '').slice(0, 4), date: r.date || '', first_author: r.first_author || '', title: r.title || '', venue: r.journal || '', citations: '', theme: '', actions: '', link: doiLink(r.doi) || (r.pmid ? 'https://pubmed.ncbi.nlm.nih.gov/' + r.pmid + '/' : '') })),
      scispace: sc.map((r) => ({ list: 'SciSpace (since 2015)', year: r.year == null ? '' : String(r.year), date: '', first_author: r.first_author || '', title: r.title || '', venue: r.venue || '', citations: r.citations ? String(r.citations) : '', theme: r.theme || '', actions: '', link: r.url || '' })),
      cited: mc.map((r) => ({ list: 'Most-cited works (OpenAlex)', year: r.year == null ? '' : String(r.year), date: '', first_author: r.first_author || '', title: r.title || '', venue: r.journal || '', citations: String(r.citations == null ? '' : r.citations), theme: '', actions: '', link: doiLink(r.doi) })),
      records: pr.filter((r) => r.title).map((r) => ({ list: 'PubMed records behind the evidence counts', year: r.year == null ? '' : String(r.year), date: '', first_author: r.first_author || '', title: r.title || '', venue: r.journal || '', citations: '', theme: '', actions: r.actions || '', link: doiLink(r.doi) || 'https://pubmed.ncbi.nlm.nih.gov/' + r.pmid + '/' }))
    };
    lists.openalex = oa.map((r) => ({ list: 'OpenAlex records not in PubMed', year: r.year == null ? '' : String(r.year), date: '', first_author: r.first_author || '', title: r.title || '', venue: r.source || '', citations: r.citations ? String(r.citations) : '', theme: r.type || '', actions: r.actions || '', link: r.doi ? 'https://doi.org/' + r.doi : 'https://openalex.org/' + r.openalex_id }));
    return which === 'all' ? [...lists.recent, ...lists.scispace, ...lists.cited, ...lists.records, ...lists.openalex] : lists[which] || [];
  };
  const today = () => new Date().toISOString().slice(0, 10);
  const NOTE = 'Only the first author\'s surname is shown, followed by "et al."; no other author or personal data is included (LGPD, Lei 13.709/2018). Use the DOI or PubMed link to consult each publication.';

  const toCSV = (rows) => {
    const q = (v) => { const s = String(v == null ? '' : v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return '﻿' + [HEAD.map(q).join(','), ...rows.map((r) => COLS.map((c) => q(r[c])).join(','))].join('\r\n') + '\r\n';
  };

  // Minimal PDF writer: A4 landscape, Helvetica (WinAnsi), text wrapped by estimated width.
  const toPDF = (rows, title) => {
    const W = 842, H = 595, M = 36, FS = 8.5, LH = 11;
    const latin = (s) => String(s == null ? '' : s).replace(/[‐-―]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...').replace(/[^\x20-\xFF]/g, '?');
    const esc = (s) => latin(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const cw = FS * 0.5;
    const wrap = (s, width) => {
      const out = []; let line = ''; const maxC = Math.max(4, Math.floor(width / cw)); const words = [];
      latin(s).split(/\s+/).forEach((w) => { while (w.length > maxC) { words.push(w.slice(0, maxC)); w = w.slice(maxC); } words.push(w); });
      words.forEach((w) => { const t = line ? line + ' ' + w : w; if (t.length * cw > width && line) { out.push(line); line = w; } else line = t; });
      if (line) out.push(line); return out.length ? out : [''];
    };
    const colX = [M, M + 40, M + 150, M + 450, M + 600];
    const colW = [34, 104, 292, 144, W - M - (M + 600)];
    const pages = []; let ops = [], y = H - M;
    const text = (x, yy, s, bold, size) => ops.push('BT /' + (bold ? 'F2' : 'F1') + ' ' + (size || FS) + ' Tf ' + x + ' ' + yy.toFixed(1) + ' Td (' + esc(s) + ') Tj ET');
    const newPage = () => { if (ops.length) pages.push(ops.join('\n')); ops = []; y = H - M; };
    const header = () => { ['Year', 'First author', 'Title', 'Journal or venue', 'Link'].forEach((h, i) => text(colX[i], y, h, true)); y -= LH + 2; };
    text(M, y, title, true, 10); y -= LH * 1.4;
    text(M, y, NOTE, false, 7.5); y -= LH * 1.4;
    let current = null;
    rows.forEach((r) => {
      if (r.list !== current) { current = r.list; if (y < M + LH * 4) newPage(); y -= 4; text(M, y, current, true); y -= LH + 2; header(); }
      const extra = [r.citations ? r.citations + ' cit.' : '', r.actions ? 'Actions: ' + r.actions : ''].filter(Boolean).join(' · ');
      const cells = [r.year || r.date, r.first_author, r.title, r.venue + (extra ? ' (' + extra + ')' : ''), r.link].map((v, i) => wrap(v, colW[i]));
      const n = Math.max(...cells.map((c) => c.length));
      if (y - n * LH < M) { newPage(); text(M, y, current + ' (continued)', true); y -= LH + 2; header(); }
      cells.forEach((c, i) => c.forEach((ln, k) => text(colX[i], y - k * LH, ln)));
      y -= n * LH + 3;
    });
    newPage();
    const objs = [];
    objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    const kids = [];
    pages.forEach((content, i) => {
      const pn = 5 + i * 2, cn = pn + 1; kids.push(pn + ' 0 R');
      const body = content + '\nBT /F1 7 Tf ' + M + ' 18 Td (' + esc('Page ' + (i + 1) + ' of ' + pages.length) + ') Tj ET';
      objs[pn] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + cn + ' 0 R >>';
      objs[cn] = '<< /Length ' + body.length + ' >>\nstream\n' + body + '\nendstream';
    });
    objs[2] = '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + pages.length + ' >>';
    let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const offs = [];
    for (let i = 1; i < objs.length; i++) { offs[i] = out.length; out += i + ' 0 obj\n' + objs[i] + '\nendobj\n'; }
    const xref = out.length;
    out += 'xref\n0 ' + objs.length + '\n0000000000 65535 f \n' + offs.slice(1).map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
    out += 'trailer\n<< /Size ' + objs.length + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
    return bytes;
  };

  const LABEL = { all: 'all literature lists', recent: 'most recent PubMed records', scispace: 'SciSpace records', cited: 'most-cited works', records: 'PubMed records behind the counts', openalex: 'OpenAlex records not in PubMed' };

  // Publications matched to one CMP action (PubMed records behind the counts plus OpenAlex records not in PubMed).
  const hasAction = (r, id) => String(r.actions || '').split(',').map((x) => x.trim()).includes(id);
  const actionRows = (id) => {
    if (!id) return [];
    const pr = GD.ok('pubmed_records') || [], oa = GD.ok('oa_records') || [];
    return [
      ...pr.filter((r) => r.title && hasAction(r, id)).map((r) => ({ list: 'PubMed', year: r.year == null ? '' : String(r.year), date: '', first_author: r.first_author || '', title: r.title || '', venue: r.journal || '', citations: '', theme: '', actions: r.actions || '', link: doiLink(r.doi) || 'https://pubmed.ncbi.nlm.nih.gov/' + r.pmid + '/' })),
      ...oa.filter((r) => hasAction(r, id)).map((r) => ({ list: 'OpenAlex (not in PubMed)', year: r.year == null ? '' : String(r.year), date: '', first_author: r.first_author || '', title: r.title || '', venue: r.source || '', citations: r.citations ? String(r.citations) : '', theme: r.type || '', actions: r.actions || '', link: r.doi ? 'https://doi.org/' + r.doi : 'https://openalex.org/' + r.openalex_id }))
    ].sort((x, y) => (x.list === y.list ? 0 : x.list === 'PubMed' ? -1 : 1) || (Number(y.year) || 0) - (Number(x.year) || 0));
  };
  const actionLabel = (id) => { const e = (GD.ok('evidence_counts') || []).find((x) => x.id === id); return e ? id + ' (' + e.label + ')' : id; };

  // One downloader per control group; the file is built locally and saved by the browser.
  const downloader = (drawName, btnSel, job) => dash.draw(drawName, {
    mount(el) {
      const btns = [...document.querySelectorAll(btnSel)];
      const say = (msg) => { el.textContent = msg; };
      const saveDirect = (name, data, type) => {
        const url = URL.createObjectURL(new Blob([data], { type }));
        const a = document.createElement('a'); a.href = url; a.download = name; a.style.display = 'none';
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
      };
      const go = (kind) => {
        const j = job();
        if (j.error) { say(j.error); return; }
        if (!j.rows.length) { say(j.empty || 'These records have not loaded yet.'); return; }
        const name = j.name + '-' + today() + '.' + kind;
        const data = kind === 'csv' ? toCSV(j.rows) : toPDF(j.rows, j.title + ', exported ' + today());
        say('Preparing ' + kind.toUpperCase() + '…');
        saveDirect(name, data, kind === 'csv' ? 'text/csv;charset=utf-8' : 'application/pdf');
        say('Saved ' + j.rows.length + ' records.');
      };
      btns.forEach((b) => { b.disabled = false; b.addEventListener('click', () => go(b.dataset.litDl || b.dataset.evidDl)); });
      return {};
    },
    update() {}
  });

  downloader('lit_dl', '[data-lit-dl]', () => {
    const sel = document.querySelector('[data-lit-which]');
    const which = (sel && sel.value) || 'all';
    return { rows: rowsNow(which), name: 'franciscana-literature-' + which, title: 'Franciscana (Pontoporia blainvillei): ' + LABEL[which] };
  });
  downloader('evid_dl', '[data-evid-dl]', () => {
    const id = dash.params().d_action;
    if (!id) return { error: 'Choose an action first.' };
    return { rows: actionRows(id), name: 'franciscana-publications-' + id, title: 'Franciscana (Pontoporia blainvillei): publications matched to ' + actionLabel(id), empty: 'No publication is matched to ' + id + '.' };
  });

  GD.select('f_d_action', 'd_action', 'Choose an action…', 'evidence_counts', (r) => r.filter((x) => x.measured).map((x) => ({ value: x.id, label: x.id + ' · ' + x.label + ' (' + x.count + ')' })));
  dash.draw('evid_dl_count', (el) => {
    const id = dash.params().d_action;
    if (!id) { el.textContent = ''; return; }
    if (!GD.ok('pubmed_records') || !GD.ok('oa_records')) { el.textContent = '—'; return; }
    const rows = actionRows(id), npm = rows.filter((r) => r.list === 'PubMed').length;
    el.textContent = rows.length + ' publications: ' + npm + ' from PubMed and ' + (rows.length - npm) + ' from OpenAlex.';
  });
})();
```

### 6.4 Scripts de construção dos dados

#### `tools/build_data.py`

```python
"""Builds the data files of the franciscana (toninha) dashboard from transcribed sources."""
import json, os, re, collections

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
os.makedirs(OUT, exist_ok=True)
def dump(name, obj):
    with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)

CA145 = 'CMS Concerted Action 14.5 (2024)'
# ---------------------------------------------------------------- management units
mus = [
 dict(order=1, mu='FMA Ia', country='Brazil', name='Espírito Santo', range='Northern Espírito Santo, from Itaúnas (18°25′S); summer distribution between Conceição da Barra and Santa Cruz', note='Northernmost, demographically isolated population; part of the subspecies P. b. pukusi. High-density area near the Doce River mouth.', src='Sucunza et al. (2023); CMS COP15 Doc.31.3.7'),
 dict(order=2, mu='FMA Ib', country='Brazil', name='Northern Rio de Janeiro', range='Northern Rio de Janeiro (about 21°18′S–22°25′S)', note='Separated from FMA Ia by a distribution gap; genetically distinct (Cunha et al. 2014).', src='Di Beneditto & Ramos; Cunha et al. (2014)'),
 dict(order=3, mu='FMA IIa', country='Brazil', name='Rio de Janeiro (south) and northern São Paulo', range='Northern limit at Ilha Grande Bay, possibly Jaconé (22°56′S); northern São Paulo coast', note='Strandings recorded within the former gap between Macaé and Ilha Grande (Azevedo et al. 2026).', src='Azevedo et al. (2026); Ballabio et al. (2025)'),
 dict(order=4, mu='FMA IIb', country='Brazil', name='Southern São Paulo, Paraná and Santa Catarina', range='Southern São Paulo to Santa Catarina (limits as in Cunha et al. 2020)', note='Includes the Paraná coast. Limits between IIa and IIb follow Cunha et al. (2014, 2020).', src='Cunha et al. (2014, 2020)'),
 dict(order=5, mu='FMA II Babitonga', country='Brazil', name='Babitonga Bay', range='Babitonga Bay, northern Santa Catarina (26°02′–26°28′S)', note='The only population resident year-round in an estuary; recognised as a distinct management unit.', src='Cremer & Simões-Lopes (2008); ' + CA145),
 dict(order=6, mu='FMA III', country='Brazil; Uruguay', name='Rio Grande do Sul and Uruguay', range='Rio Grande do Sul (Brazil) and Uruguay, including the Río de la Plata estuary', note='Highest bycatch levels recorded; population structure within the Río de la Plata to be redefined (RES-1.1).', src='Secchi et al. (2003); ' + CA145),
 dict(order=7, mu='FMA IVa', country='Argentina', name='Argentina, FMA IVa', range='Argentina (limits as in Cunha et al. 2020)', note='No abundance survey reported; Samborombón Bay not yet flown (CMS COP15 Doc.31.3.7).', src='Cunha et al. (2020); CMS COP15 Doc.31.2.8'),
 dict(order=8, mu='FMA IVb', country='Argentina', name='Argentina, FMA IVb', range='Buenos Aires Province (limits as in Cunha et al. 2020)', note='Surveyed from the air in 2019–2022 (Crespo et al. 2026).', src='Crespo et al. (2026)'),
 dict(order=9, mu='FMA IVc', country='Argentina', name='Argentina, FMA IVc', range='Buenos Aires Province (limits as in Cunha et al. 2020)', note='Surveyed from the air in 2019–2022 (Crespo et al. 2026).', src='Crespo et al. (2026)'),
 dict(order=10, mu='FMA IVd', country='Argentina', name='Argentina, FMA IVd', range='Southern Buenos Aires (limits as in Cunha et al. 2020)', note='Area from Claromecó to Bahía Blanca not yet surveyed (CMS COP15 Doc.31.3.7).', src='CMS COP15 Doc.31.3.7'),
 dict(order=11, mu='FMA IVe', country='Argentina', name='Argentina, FMA IVe', range='Southern limit at the north coast of San Matías Gulf (42°10′S), including the Río Negro estuary', note='Río Negro estuary proposed as a conservation area (MIT 2.1).', src=CA145),
]
dump('management_units.json', mus)

# ---------------------------------------------------------------- abundance
ab = [
 dict(mu='FMA Ia', area='Espírito Santo coast, aerial survey (Mar 2018)', year=2018, point=1183, low=1183, high=1183, cv='0.76', method='Line-transect aerial survey, corrected for visibility and group-size bias', source='Sucunza et al. (2023), Endangered Species Research', doi='10.3354/esr01262'),
 dict(mu='FMA Ia', area='Espírito Santo coast, passive acoustics', year=2025, point=None, low=1150, high=1300, cv='', method='Passive acoustic density estimation (dissertation)', source='Mura (2025), MSc dissertation', doi=''),
 dict(mu='FMA II Babitonga', area='Babitonga Bay, boat surveys (2000–2003)', year=2003, point=50, low=50, high=50, cv='', method='Line-transect boat surveys with distance sampling', source='Cremer & Simões-Lopes (2008), Revista Brasileira de Zoologia', doi='10.1590/S0101-81752008000300003'),
 dict(mu='FMA III', area='Rio Grande do Sul, small study area (Mar 1996)', year=1996, point=286, low=225, high=364, cv='', method='Aerial survey of 435 km², corrected for submerged animals', source='Secchi et al. (2001), J. Cetacean Res. Manage.', doi=''),
 dict(mu='FMA III', area='Rio Grande do Sul, surveyed area (Feb 2004)', year=2004, point=6839, low=3709, high=12594, cv='0.32', method='Line-transect aerial survey of 13,341 km², g(0) = 0.304', source='Danilewicz et al. (2010), J. Mar. Biol. Assoc. UK', doi='10.1017/S0025315409991482'),
 dict(mu='FMA IVb', area='Buenos Aires coast, aerial survey (2019–2022)', year=2022, point=11070, low=11070, high=11070, cv='', method='Aerial surveys to the 30 m isobath', source='Crespo et al. (2026), Mastozoología Neotropical', doi='10.31687/saremmn.26.33.02.07.e1297'),
 dict(mu='FMA IVc', area='Buenos Aires coast, aerial survey (2019–2022)', year=2022, point=3309, low=3309, high=3309, cv='', method='Aerial surveys to the 30 m isobath', source='Crespo et al. (2026), Mastozoología Neotropical', doi='10.31687/saremmn.26.33.02.07.e1297'),
 dict(mu='FMA IV (southern area)', area='Southern area of Argentina, 2004 estimate cited by Crespo et al. (2026)', year=2004, point=5896, low=5896, high=5896, cv='', method='Aerial survey; the FMA it belongs to is not stated in the abstract', source='Crespo et al. (2026), citing the 2004 survey', doi='10.31687/saremmn.26.33.02.07.e1297'),
]
dump('abundance.json', ab)

# ---------------------------------------------------------------- CMP actions (as listed in CMS CA 14.5)
A = lambda i, line, topic, title, region: dict(id=i, line=line, topic=topic, title=title, region=region, source='IWC CMP actions as listed in UNEP/CMS/Concerted Action 14.5')
actions = [
 A('RES-1.1', 'RES', 'Population structure', 'Redefine the structure and limits of the population', 'FMA IIb; FMA III, mostly in the Río de la Plata estuary; FMA IV'),
 A('RES-1.2', 'RES', 'Population structure', 'Redefine the population structure and stock limits', 'All FMAs except Ia and Ib'),
 A('RES-2.1', 'RES', 'Cooperation', 'Memoranda of understanding between universities and research institutes of Argentina, Brazil and Uruguay to establish common research programmes', 'All FMAs'),
 A('MON-1.1', 'MON', 'Fisheries monitoring', 'Continue to monitor fisheries for probable bycatch, including gear, season, fishing zones and effort', 'All FMAs'),
 A('MON-1.2', 'MON', 'Bycatch estimation', 'Estimate bycatch in all fisheries using on-board observer programmes, whenever possible', 'All FMAs'),
 A('MON-1.3', 'MON', 'Stranding monitoring', 'Monitor beaches to quantify stranded franciscanas and estimate bycatch', 'All FMAs'),
 A('MON-1.4', 'MON', 'Vessel monitoring', 'Strengthen vessel monitoring of the industrial fleet and develop it for the artisanal fleet', 'All FMAs'),
 A('MON-1.5', 'MON', 'Vessel monitoring', 'Provide access to vessel-monitoring data for research and management', 'All FMAs'),
 A('MON-1.6', 'MON', 'Abundance and trends', 'Estimate abundance and population trends', 'FMA Ia, Ib; IIa, IIb, II Babitonga; III; IVa–IVe'),
 A('MON-1.7', 'MON', 'Abundance and trends', 'Evaluate alternative methods for estimating abundance and population trends', 'All FMAs'),
 A('MON-1.8', 'MON', 'Removal limits', 'Define the maximum permitted fishing-related deaths (for example PBR, MALFIRM)', 'All FMAs'),
 A('MON-1.9', 'MON', 'Population viability', 'Population viability analysis (PVA) model', 'All FMAs'),
 A('MON-2.1', 'MON', 'Life history', 'Monitor beaches for stranded franciscanas to estimate biological parameters', 'All FMAs'),
 A('MON-2.2', 'MON', 'Health and pollution', 'Continue assessment of health and pollutant load', 'All FMAs'),
 A('MIT-1.1', 'MIT', 'Bycatch reduction', 'Develop strategies to evaluate or implement bycatch reduction; meetings with decision makers on monitoring and mitigation', 'FMA Ia, Ib; IIa, IIb, II Babitonga; III; IVa–IVe'),
 A('MIT-1.2', 'MIT', 'Bycatch reduction', 'Increase measures applied to reduce bycatch in priority areas and no-capture zones', 'All FMAs'),
 A('MIT-2.1', 'MIT', 'Protected areas', 'Strengthen the case for conservation areas at the Doce River, Babitonga Bay, Albardão and the Río Negro estuary', 'FMA Ia; II Babitonga; III; IVe'),
 A('MIT-2.2', 'MIT', 'Protected areas', 'Set up and implement management plans for existing marine protected areas, with actions for the franciscana', 'All FMAs'),
 A('MIT-2.3', 'MIT', 'Protected areas', 'Explore and encourage the creation of new protected areas throughout the range', 'All FMAs'),
 A('MIT-2.4', 'MIT', 'Socio-economics', 'Evaluate the socio-economic impact on fisheries of bycatch mitigation measures', 'All FMAs'),
 A('MIT-3.1', 'MIT', 'Alternative gear', 'Evaluate and monitor the replacement of gillnets by lower-impact alternative fishing gear', 'All FMAs'),
 A('MIT-3.2', 'MIT', 'Socio-economics', 'Evaluate the socio-economic impact of implementing mitigation measures', 'All FMAs'),
 A('PAC-1.1', 'PAC', 'Public awareness', 'Continue awareness campaigns on the franciscana and its conservation problems', 'All FMAs'),
 A('PAC-2.1', 'PAC', 'International cooperation', 'Raise the franciscana within CMS and the joint technical commission for the Argentina–Uruguay maritime front', 'All FMAs'),
]
dump('actions.json', actions)

# ---------------------------------------------------------------- threats
threats = [
 dict(threat='Bycatch in gillnets', kind='Fisheries', role='Main threat', evidence='Bottom-set gillnets are by far the greatest threat, in artisanal and industrial fisheries throughout the range. Fishing-related mortality ranges from about 100 (FMA I) to more than 1,000 a year (FMA III), from about 2 to more than 5 times the PBR-based sustainable limit.', where='All FMAs; highest in FMA III', actions='MON-1.1; MON-1.2; MON-1.3; MON-1.8; MIT-1.1; MIT-1.2; MIT-3.1', refs='Secchi et al. (2021); CMS CA 14.5'),
 dict(threat='Bycatch in trawl fisheries', kind='Fisheries', role='Other threat', evidence='Occasional captures in coastal and industrial bottom trawls, including the Río de la Plata.', where='FMA III; FMA IV', actions='MON-1.1; MON-1.2; MIT-1.2', refs='Cappozzo et al. (2007); Franco-Trecu et al. (2019)'),
 dict(threat='Chemical pollution', kind='Pollution', role='Other threat', evidence='Organochlorines, PBDEs, dechloranes, pyrethroids, UV filters, mercury, cadmium and other trace elements recorded in tissues across the range.', where='All FMAs', actions='MON-2.2', refs='Alonso et al. (2012); Leonel et al. (2010, 2014); Dorneles et al. (2007, 2013)'),
 dict(threat='Marine debris', kind='Pollution', role='Other threat', evidence='Plastic ingestion documented in Argentina and Brazil.', where='FMA I; FMA IV', actions='MON-2.2', refs='Denuncio et al. (2011); Di Beneditto & Ramos (2014)'),
 dict(threat='Habitat degradation and mining waste', kind='Habitat', role='Other threat', evidence='The 2015 Doce River mining dam collapse affected the habitat of the isolated FMA Ia population.', where='FMA Ia', actions='MIT-2.1; MON-2.2', refs='Barreto et al. (2024, 2026)'),
 dict(threat='Underwater noise and coastal development', kind='Habitat', role='Other threat', evidence='Ports, dredging and vessel traffic in Babitonga Bay; proposed offshore wind farm areas overlap franciscana habitat in southern Brazil.', where='II Babitonga; FMA III', actions='MIT-2.2; MIT-2.3', refs='Paitach et al. (2023); Ribeiro et al. (2026)'),
 dict(threat='Depletion of prey and climate change', kind='Ecosystem', role='Other threat', evidence='Listed among the other threats in the 2021 synthesis; impacts not quantified.', where='All FMAs', actions='MON-1.9', refs='Secchi et al. (2021)'),
 dict(threat='Use of carcasses', kind='Direct use', role='Other threat', evidence='Historical use of bycaught animals as bait, food or oil (Atafona, Rio Grande do Sul, Paraná, Uruguay; "mushame" in Argentina). No intentional kills reported.', where='FMA Ib; FMA IIb; FMA III; FMA IV', actions='PAC-1.1', refs='CMS CA 14.5; Di Beneditto & Ramos (2001)'),
]
dump('threats.json', threats)

# ---------------------------------------------------------------- status
st = [
 dict(level='Global', jurisdiction='IUCN', area='Global', year=2008, category='VU', criterion='', source='Reeves et al. (2008), IUCN Red List'),
 dict(level='Global', jurisdiction='IUCN', area='Global', year=2017, category='VU', criterion='', source='Zerbini et al. (2017), IUCN Red List'),
 dict(level='Regional', jurisdiction='FMA Ia', area='FMA Ia (independent assessment)', year=2023, category='EN', criterion='C2a(ii)', source='Sucunza et al. (2023), proposed listing; not an official Red List entry'),
 dict(level='National', jurisdiction='Brazil', area='Brazil', year=2014, category='CR', criterion='', source='Portaria MMA nº 444/2014'),
 dict(level='National', jurisdiction='Brazil', area='Brazil', year=2022, category='CR', criterion='', source='Portaria MMA nº 148/2022'),
 dict(level='National', jurisdiction='Uruguay', area='Uruguay', year=2013, category='T', criterion='', source='Priority species for conservation (Soutullo et al. 2013); national category not confirmed'),
 dict(level='National', jurisdiction='Argentina', area='Argentina', year=None, category='T', criterion='', source='Included in the national list of species in need of protection (CMS COP15 Doc.31.2.8); category not confirmed'),
]
dump('status_history.json', st)

# ---------------------------------------------------------------- range states
states = [
 dict(country='Brazil', fmas='Ia, Ib, IIa, IIb, II Babitonga, III', iwc='Member', cms='Party; proponent of CA 14.5', instruments='National list: Critically Endangered (Portaria MMA 444/2014; 148/2022). PAN Toninha, 1st cycle (Portaria ICMBio 91/2010) and 2nd cycle (Portaria ICMBio 655/2019). Fisheries regulations in areas of high bycatch (Secchi et al. 2021).'),
 dict(country='Uruguay', fmas='III', iwc='Member', cms='Party; proponent of CA 14.5', instruments='Priority species for conservation (Soutullo et al. 2013); National System of Protected Areas, e.g. Cabo Polonio National Park (Nin et al. 2010).'),
 dict(country='Argentina', fmas='IVa, IVb, IVc, IVd, IVe', iwc='Member', cms='Party; proponent of CA 14.5', instruments='National Action Plan to reduce interactions of marine mammals with fisheries (named in the IWC CMP); species in the national list of species in need of protection (CMS COP15 Doc.31.2.8).'),
]
dump('range_states.json', states)

# ---------------------------------------------------------------- milestones
ms = [
 dict(year=2003, kind='Done', event='Four Franciscana Management Areas (FMA I–IV) proposed', source='Secchi et al. (2003)'),
 dict(year=2010, kind='Done', event='PAN Toninha, 1st cycle, approved: avoid population decline between Espírito Santo and Rio Grande do Sul (7 goals)', source='Portaria ICMBio 91/2010'),
 dict(year=2014, kind='Done', event='Listed as Critically Endangered in Brazil', source='Portaria MMA 444/2014'),
 dict(year=2016, kind='Done', event='IWC adopts the Franciscana CMP, the first CMP for a small cetacean', source='IWC'),
 dict(year=2017, kind='Done', event='IUCN Red List: Vulnerable', source='Zerbini et al. (2017)'),
 dict(year=2019, kind='Done', event='PAN Toninha, 2nd cycle, approved', source='Portaria ICMBio 655/2019'),
 dict(year=2020, kind='Done', event='Eleven management units proposed (ten FMA subdivisions and Babitonga Bay)', source='Cunha et al. (2020)'),
 dict(year=2022, kind='Done', event='National list update keeps the species as Critically Endangered', source='Portaria MMA 148/2022'),
 dict(year=2023, kind='Done', event='IWC Scientific Committee recognises the 11 FMAs as units for assessment', source='IWC (2023)'),
 dict(year=2024, kind='Done', event='CMS COP14 (Samarkand) adopts Concerted Action 14.5 for the franciscana', source='UNEP/CMS/Concerted Action 14.5'),
 dict(year=2025, kind='Done', event='International workshop to prepare the IWC assessment (July; 45 participants)', source='CMS COP15 Doc.31.2.8'),
 dict(year=2026, kind='Done', event='CMS COP15 (Campo Grande, March) renews the Concerted Action for 2026–2029', source='UNEP/CMS/Concerted Action 14.5 (Rev.COP15)'),
 dict(year=2026, kind='Planned', event='IWC Comprehensive Assessment begins with FMAs Ia, Ib, IIa, IIb and III; aerial surveys of FMAs IVa–IVe; bycatch mitigation workshop with the IWC', source='CMS COP15 Doc.31.2.8; Doc.31.3.7'),
 dict(year=2027, kind='Planned', event='Bycatch mitigation action plan; regional workshop on standardised monitoring; awareness campaigns', source='CMS COP15 Doc.31.3.7'),
 dict(year=2028, kind='Planned', event='Endorsement of assessments and recommendations to improve the CMP (2026 and 2028); pilot mitigation in at least three priority sites', source='CMS COP15 Doc.31.2.8; Doc.31.3.7'),
 dict(year=2029, kind='Planned', event='Final assessment of the Concerted Action and consolidated regional report (by March)', source='CMS COP15 Doc.31.3.7'),
]
dump('milestones.json', ms)

# ---------------------------------------------------------------- CMS concerted action activities 2026–2029
ca = [
 dict(activity='Bycatch mitigation workshop', result='Guidelines for mitigation devices and good fishing practices', timeframe='8 months', responsibility='Argentina, Brazil and Uruguay', funding='CBI, CMS', funded='Identified', cmp='MIT-1.1; MIT-3.1'),
 dict(activity='Action plan to mitigate bycatch', result='Pilot locations, local coordinators, measures to test and work schedule defined', timeframe='3 months', responsibility='Argentina, Brazil and Uruguay', funding='Funds needed', funded='Needed', cmp='MIT-1.1; MIT-1.2'),
 dict(activity='Methodologies and monitoring workshop', result='Guidelines for standardised monitoring and data analysis across the range', timeframe='8 months', responsibility='Argentina, Brazil and Uruguay', funding='Funds needed', funded='Needed', cmp='MON-1.1; MON-1.3; MON-1.7'),
 dict(activity='Aerial surveys in FMAs IVa–IVe (Argentina)', result='Abundance estimates for FMAs IVa, IVb, IVc, IVd and IVe', timeframe='1 year', responsibility='Argentina', funding='Funds needed', funded='Needed', cmp='MON-1.6'),
 dict(activity='Awareness campaigns', result='Information on the species, its status and good practices; printed and audiovisual materials', timeframe='3 years', responsibility='Argentina, Brazil and Uruguay', funding='Funds needed', funded='Needed', cmp='PAC-1.1'),
 dict(activity='Pilot implementation of bycatch mitigation', result='Effectiveness and feasibility of mitigation evaluated; proposal to expand to other sites', timeframe='2 years', responsibility='Argentina, Brazil and Uruguay', funding='Funds needed', funded='Needed', cmp='MIT-1.2; MIT-3.1; MIT-3.2'),
 dict(activity='Publication and evaluation of mitigation results', result='Reports presented at IWC and CMS scientific meetings', timeframe='1 year', responsibility='Argentina, Brazil and Uruguay', funding='Not stated', funded='Not stated', cmp='MIT-1.1'),
 dict(activity='Review of the bycatch action plan', result='Plan updated from the pilot results', timeframe='1 year', responsibility='Argentina, Brazil and Uruguay', funding='Funds needed', funded='Needed', cmp='MIT-1.1'),
 dict(activity='Cooperation with multilateral organisations', result='Network established and joint actions defined', timeframe='3 years', responsibility='Argentina, Brazil and Uruguay', funding='Funds needed', funded='Needed', cmp='RES-2.1; PAC-2.1'),
 dict(activity='Evaluation of the final impact', result='Integrated analysis of all actions; new concerted action if necessary', timeframe='3 years', responsibility='Argentina, Brazil and Uruguay', funding='Funds needed', funded='Needed', cmp=''),
 dict(activity='Consolidated regional report', result='Guidelines for long-term actions in the three countries', timeframe='3 years', responsibility='Argentina, Brazil and Uruguay', funding='Funds needed', funded='Needed', cmp=''),
 dict(activity='Integration into national strategies', result='Guidelines to integrate results into national conservation plans for the franciscana', timeframe='3 years', responsibility='Argentina, Brazil and Uruguay', funding='Funds needed', funded='Needed', cmp=''),
]
dump('cms_activities.json', ca)

prog = [
 dict(activity='1. Development of the national conservation plan', status='Partial', progress='IWC Scientific Committee agreed a draft plan to assess all populations; assessment starts at the 2026 meeting.', difficulties='Insufficient funding and logistics; no abundance estimates for the Argentine FMAs (IVa–IVe); bycatch estimates outdated, especially in Argentina.'),
 dict(activity='2. Strengthening national and regional capacities', status='Partial', progress='International workshop in July 2025 with 45 participants; data received to start the IWC Comprehensive Assessment.', difficulties='Lack of funds; remaining workshops planned for the second and third quarters of 2026.'),
 dict(activity='3. Addressing bycatch and other mitigation problems', status='Partial', progress='Updated mortality, strandings and bycatch information; fishers and researchers collaborating on mitigation in some FMAs.', difficulties='Weak enforcement in some FMAs; limited funds to extend mitigation trials; timing depends on national policies.'),
]
dump('cms_progress.json', prog)

# ---------------------------------------------------------------- CMS resolutions named in Doc.31.3.7
R = lambda ref, title, theme: dict(body='CMS', ref=ref, title=title, theme=theme, source='CMS COP15 Doc.31.3.7')
instr = [
 R('Res. 14.1', 'Samarkand Strategic Plan for Migratory Species 2024–2032', 'Strategy'),
 R('Res. 14.3', 'Engagement in CBD processes including the Global Biodiversity Framework', 'Strategy'),
 R('Res. 14.4', 'State of the World’s Migratory Species', 'Strategy'),
 R('Res. 14.5', 'Reducing the risk of vessel strikes for marine megafauna', 'Vessels'),
 R('Res. 14.6', 'Deep-seabed mineral exploitation activities and migratory species', 'Habitat'),
 R('Res. 14.9', 'Conservation priorities for cetaceans', 'Cetaceans'),
 R('Res. 14.16', 'Ecological connectivity', 'Habitat'),
 R('Res. 12.22', 'Bycatch', 'Bycatch'),
 R('Res. 10.4 / 12.20', 'Management of marine debris', 'Pollution'),
 R('Res. 11.30', 'Management of marine debris', 'Pollution'),
 R('Res. 12.14', 'Adverse impacts of anthropogenic noise on cetaceans and other migratory species', 'Noise'),
 R('Res. 10.14', 'Bycatch of CMS-listed species in gillnet fisheries', 'Bycatch'),
 R('Res. 10.15', 'Global Programme of Work for Cetaceans', 'Cetaceans'),
 R('Res. 10.19', 'Migratory species conservation in the light of climate change', 'Climate'),
 R('Res. 11.26', 'Programme of Work on Climate Change and Migratory Species', 'Climate'),
 R('Res. 10.24', 'Further steps to abate underwater noise pollution for the protection of cetaceans and other migratory species', 'Noise'),
 R('Res. 11.10', 'Synergies and partnerships', 'Strategy'),
 dict(body='CMS', ref='Res. 12.15', title='Aquatic wild meat', theme='Direct use', source='CMS Concerted Action 14.5 (2024)'),
]
dump('instruments.json', instr)

# ---------------------------------------------------------------- PubMed snapshot
pm = json.load(open(os.path.join(OUT, 'pm_all.json')))
years = collections.Counter(r['year'] for r in pm if r['year'])
ys = sorted(years)
series = [dict(year=y, records=years.get(y, 0), partial=(y == 2026)) for y in range(ys[0], ys[-1] + 1)]
dump('pubmed_year_counts.json', series)

# Topic rules for each CMP action. "t" is matched against title, author keywords and MeSH terms;
# "a" (specific phrases only) is also matched against the abstract.
POP = r'population structure|phylogeograph|management unit|\bstocks?\b|genetic (structure|diversity|differentiation)|mitochondrial|microsatellite'
MITI = r'pinger|acoustic (alarm|deterrent|warning)|bycatch (mitigation|reduction)|mitigat\w* (the )?by-?catch|reduc\w* (the )?by-?catch'
PA = r'protected area|marine reserve|\bmpa\b|conservation unit'
SOC = r'socio-?econom|livelihood'
TOPICS = {
 'RES-1.1': ('Population structure', POP + r'|genetic', POP),
 'RES-1.2': ('Population structure', POP + r'|genetic', POP),
 'RES-2.1': (None, None, None),
 'MON-1.1': ('Fisheries interactions', r'fisher|gillnet|trawl|by-?catch|incidental|entangle', r'gillnet fisher|fishing effort|fishery interaction|interaction with fisher'),
 'MON-1.2': ('Bycatch estimation', r'by-?catch|incidental (capture|catch|mortality)|entangle', r'bycatch (rate|estimate)|estimated bycatch|annual bycatch|incidental mortality (rate|estimate)|bpue|cpue'),
 'MON-1.3': ('Strandings', r'strand|carcass', r'beach (survey|monitoring)|stranding (network|pattern|record|monitoring)|carcass'),
 'MON-1.4': (None, None, None),
 'MON-1.5': (None, None, None),
 'MON-1.6': ('Abundance and trends', r'abundance|population size|population trend|aerial survey', r'abundance estimate|population size|aerial survey|line.transect|distance sampling'),
 'MON-1.7': ('Survey methods', r'passive acoustic|availability bias|visibility bias|drone|aerial survey', r'passive acoustic|availability bias|visibility bias|drone survey|unmanned aerial'),
 'MON-1.8': ('Removal limits', r'potential biological removal|\bpbr\b|sustainab', r'potential biological removal|\bpbr\b|sustainable (mortality|removal)'),
 'MON-1.9': ('Population viability', r'viability|population model|population dynamics|extinction risk', r'population viability|population model|extinction risk'),
 'MON-2.1': ('Life history', r'\bage\b|growth|reproduct|maturity|life history|diet|feeding|stomach content|prey|ontogen', r'age estimat|growth layer|sexual maturity|reproductive parameter|stomach content'),
 'MON-2.2': ('Health and pollution', r'pollut|contamin|mercury|metal|cadmium|organochlor|\bpcbs?\b|pbde|pesticide|plastic|debris|toxic|trace element|health|disease|pathogen|parasit|virus|bacteri|lesion|patholog|toxoplasm|mycoplasm', None),
 'MIT-1.1': ('Bycatch mitigation', MITI, MITI),
 'MIT-1.2': ('Bycatch mitigation', MITI, MITI),
 'MIT-2.1': ('Protected areas and named sites', PA + r'|doce river|babitonga|albard|r[ií]o negro', PA + r'|babitonga bay|doce river'),
 'MIT-2.2': ('Protected areas', PA + r'|management plan', PA),
 'MIT-2.3': ('Protected areas', PA, PA),
 'MIT-2.4': ('Socio-economics', SOC, SOC),
 'MIT-3.1': ('Alternative gear', r'longline|alternative (gear|fishing)|gear modification|reflective|stiffened', r'bottom longline|alternative gear|gear modification|acoustically reflective'),
 'MIT-3.2': ('Socio-economics', SOC, SOC),
 'PAC-1.1': ('Public awareness and knowledge', r'awareness|education|outreach|perception|ecological knowledge', r'local ecological knowledge|environmental education|public awareness'),
 'PAC-2.1': (None, None, None),
}
pm_counts, matched = [], collections.defaultdict(list)
for a in actions:
    lab, rt, ra = TOPICS[a['id']]
    if not rt:
        pm_counts.append(dict(id=a['id'], line=a['line'], topic=a['topic'], label='Not measured by a literature count', rule='', count_pubmed=None, measured=False))
        continue
    T, A_ = re.compile(rt, re.I), re.compile(ra, re.I) if ra else None
    hits = [r for r in pm if T.search(' '.join([r['title'], ' '.join(r['mesh']), ' '.join(r['kw'])])) or (A_ and A_.search(r['abstract']))]
    for r in hits: matched[r['pmid']].append(a['id'])
    rule = 'Title, keywords or MeSH: ' + rt.replace('|', ' | ') + ('. Abstract: ' + ra.replace('|', ' | ') if ra else '. Abstract not used.')
    pm_counts.append(dict(id=a['id'], line=a['line'], topic=a['topic'], label=lab, rule=rule, count_pubmed=len(hits), measured=True, pmids=';'.join(r['pmid'] for r in hits)))
dump('evidence_counts.json', dict(retrieved='2026-11-15', baseline=len(pm), query='Pontoporia[tiab] OR "franciscana dolphin"[tiab] OR "franciscana dolphins"[tiab] OR franciscanas[tiab] OR toninha[tiab] OR toninhas[tiab]', rows=pm_counts))
print({r['id']: r['count_pubmed'] for r in pm_counts})

# records list (small) for the most-cited table substitute and record browser
recs = [dict(pmid=r['pmid'], year=r['year'], first_author=r.get('first_author', ''), title=r['title'], journal=r['journal'], doi=r['doi'], actions=', '.join(matched.get(r['pmid'], []))) for r in sorted(pm, key=lambda x: -(x['year'] or 0))]
dump('pubmed_records.json', recs)

# most-cited (SciSpace citation counts from searches made on 15 Nov 2026)
cited = [
 dict(year=2003, first_author='Secchi et al.', title='Applying the phylogeographic concept to identify franciscana dolphin stocks: implications to meet management objectives', journal='J. Cetacean Res. Manage.', citations=151, doi=''),
 dict(year=2010, first_author='Mendez et al.', title='Isolation by environmental distance in mobile marine species: molecular ecology of franciscana dolphins at their southern range', journal='Molecular Ecology', citations=144, doi=''),
 dict(year=2014, first_author='Cunha et al.', title='Population structure of the endangered franciscana dolphin (Pontoporia blainvillei): reassessing management units', journal='PLOS ONE', citations=100, doi='https://doi.org/10.1371/journal.pone.0085633'),
 dict(year=2002, first_author='Ott et al.', title='Report of the working group on fishery interactions', journal='Latin American Journal of Aquatic Mammals', citations=99, doi=''),
 dict(year=2001, first_author='Secchi et al.', title='A first estimate of franciscana (Pontoporia blainvillei) abundance off southern Brazil', journal='J. Cetacean Res. Manage.', citations=77, doi=''),
 dict(year=2008, first_author='Mendez et al.', title='Conservation genetics of the franciscana dolphin in Northern Argentina: population structure, by-catch impacts, and management implications', journal='Conservation Genetics', citations=74, doi=''),
 dict(year=2009, first_author='Danilewicz et al.', title='Habitat use patterns of franciscana dolphins (Pontoporia blainvillei) off southern Brazil in relation to water depth', journal='J. Mar. Biol. Assoc. UK', citations=68, doi=''),
 dict(year=2009, first_author='Crespo et al.', title='Abundance and distribution of endangered Franciscana dolphins in Argentine waters and conservation implications', journal='Marine Mammal Science', citations=65, doi='https://doi.org/10.1111/J.1748-7692.2009.00313.X'),
]
for c in cited: c.update(source='SciSpace', retrieved='2026-11-15')
dump('most_cited.json', cited)

flags = [
 dict(topic='Abundance in Argentina', status='To confirm', issue='The CMS implementation report (Oct 2025) states that no abundance estimates exist for FMAs IVa–IVe; Crespo et al. (2026, published Mar 2026) report estimates for FMA IVb (11,070) and IVc (3,309).', action='Confirm with the IWC Scientific Committee which Argentine estimates will enter the Comprehensive Assessment.', resolution='Both estimates are shown under FMA IVb and IVc; FMAs IVa, IVd and IVe are shown without estimates.'),
 dict(topic='Estimates for FMA Ib, IIa and IIb', status='Open', issue='Estimates for these areas are presented in IWC Scientific Committee papers (e.g. Zerbini et al. 2010, SC/62/SM7, for FMA II), which could not be retrieved: the IWC website and archive refused automated access.', action='Supply the IWC papers or the 2022 book-chapter review of franciscana abundance estimates so the values can be transcribed.', resolution='These units appear as without an estimate in the sources reviewed.'),
 dict(topic='2004 southern Argentina estimate', status='To confirm', issue='Crespo et al. (2026) cite 5,896 dolphins estimated in 2004 for the “southern area” without naming the FMA in the abstract.', action='Assign the estimate to its FMA from the full paper.', resolution='Shown as a separate group, FMA IV (southern area).'),
 dict(topic='Number of management units', status='Resolved', issue='Secchi et al. (2021) refer to five recognised units, whereas CMS CA 14.5 and the IWC (2023) refer to 11 FMAs (Cunha et al. 2020).', action='None.', resolution='The dashboard uses the 11 units recognised by the IWC Scientific Committee.'),
 dict(topic='CMP action priorities', status='Open', issue='The action list reproduced in CMS CA 14.5 gives regions but no priorities, budgets or years for each action.', action='Supply the current CMP action table from the IWC.', resolution='Actions are shown by strategic line without priority.'),
 dict(topic='IMMAs', status='Open', issue='The IUCN IMMA dataset could not be retrieved in this session (the e-Atlas refused access), so IMMAs that include the franciscana are not mapped.', action='Supply the IUCN IMMA dataset (as was done for the Guiana dolphin dashboard).', resolution='The map shows the species’ range and the localities named in CMP actions only.'),
 dict(topic='National categories in Argentina and Uruguay', status='To confirm', issue='The CMS report states the species is on the national protection lists of all three range states, but the categories for Argentina and Uruguay were not found in the sources reviewed.', action='Add the categories and references.', resolution='Shown as T (listed, category not confirmed).'),
 dict(topic='IUCN criteria', status='To confirm', issue='The criteria of the 2008 and 2017 IUCN assessments were not available in the sources reviewed.', action='Add the criteria from the Red List entries.', resolution='Shown without criteria.'),
 dict(topic='PAN Toninha, 2nd cycle', status='Open', issue='The specific objectives of the 2nd-cycle national action plan (Portaria ICMBio 655/2019) could not be retrieved.', action='Supply the ordinance or the executive summary so that objectives can be matched to the literature, as for the Guiana dolphin PAN.', resolution='Only the ordinance is listed.'),
 dict(topic='Literature coverage', status='Open', issue='The OpenAlex snapshot could not be taken (the free daily quota was used up), and PubMed does not index the term “toninha” in titles or abstracts, so Portuguese- and Spanish-language literature is under-represented.', action='Request a new OpenAlex snapshot, or attach a Scopus or Web of Science export.', resolution='Counts are PubMed only and are lower bounds.'),
 dict(topic='Subspecies', status='Resolved', issue='The CMS COP15 documents name two subspecies, P. b. blainvillei and P. b. pukusi (FMA Ia).', action='None.', resolution='Mentioned in the management unit notes.'),
]
dump('editorial_flags.json', flags)
print('ok')
```

#### `tools/build_openalex.py`

```python
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
```

#### `tools/build_legal_pa.py`

```python
"""Builds data/protected_areas.json and data/legal_instruments.json for the franciscana dashboard.

Every row was checked against the document named in `checked`, on 26 November 2026:
'read' means the official text (or official document) was downloaded and searched for
"toninha", "franciscana", "Pontoporia", "delfín del Plata" and "delfín de río";
'secondary' means the statement rests on a secondary source (search result, NGO database
or academic work) because the official text could not be retrieved.
"""
import json, os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')

C_ACT = 'Named in the creation act or official announcement'
C_PLAN = 'Named in a management plan or official area document'
C_PAN = 'Named in a national action plan (PAN Toninha)'
C_SEC = 'Named only in secondary sources'
C_NO = 'Not named in the acts checked'

def pa(country, name, category, jurisdiction, act, year, fma, citation, evidence, checked, verification, url, status='Created'):
    return dict(country=country, name=name, category=category, jurisdiction=jurisdiction, act=act, year=year, fma=fma,
                citation=citation, evidence=evidence, checked=checked, verification=verification, url=url, status=status)

pas = [
 # ---------------- Brazil
 pa('Brazil', 'Parque Nacional do Albardão', 'National park (full protection), marine', 'Federal (ICMBio)', 'Decreto nº 12.868, de 6 de março de 2026', 2026, 'FMA III',
    C_ACT, 'ICMBio announcement of the decree: “Entre elas, destaca-se a toninha (Pontoporia blainvillei), a espécie de golfinho mais ameaçada do Atlântico Sul Ocidental”. About 1,004,480 ha; Santa Vitória do Palmar (RS). The technical study calls the area “um hotspot de captura incidental de toninha”.',
    'ICMBio news release of 6 Mar 2026 (read); ICMBio technical study and proposal (read). The decree text itself could not be retrieved (Planalto refused automated access).', 'Read (official documents); decree text not read',
    'https://www.gov.br/icmbio/pt-br/assuntos/noticias/ultimas-noticias/governo-do-brasil-avanca-na-protecao-da-biodiversidade-marinha-com-criacao-de-novas-unidades-de-conservacao-no-rs-1'),
 pa('Brazil', 'APA do Albardão', 'Environmental protection area (sustainable use), coastal', 'Federal (ICMBio)', 'Decreto nº 12.868, de 6 de março de 2026', 2026, 'FMA III',
    C_ACT, 'Created with the national park; about 56,000 ha, designed to regulate artisanal fishing and coastal use. The same announcement names the toninha as the leading threatened species of the area.',
    'ICMBio news release (read); decree text not retrieved.', 'Read (official documents); decree text not read',
    'https://www.gov.br/icmbio/pt-br/assuntos/noticias/ultimas-noticias/governo-do-brasil-avanca-na-protecao-da-biodiversidade-marinha-com-criacao-de-novas-unidades-de-conservacao-no-rs-1'),
 pa('Brazil', 'APA Marinha do Litoral Centro', 'Marine environmental protection area (sustainable use)', 'São Paulo State (Fundação Florestal)', 'Decreto Estadual nº 53.526, de 8 de outubro de 2008', 2008, 'FMA II',
    C_PLAN, 'Management plan: “espécies ameaçadas, como a toninha (Pontoporia blainvillei)” use its islands and waters as ecological corridors.',
    'Management plan (read). Creation decree not checked.', 'Read (management plan)',
    'https://sigam.ambiente.sp.gov.br/sigam3/repositorio/524/documentos/PM%20APAM%20Centro.pdf'),
 pa('Brazil', 'APA Marinha do Litoral Sul', 'Marine environmental protection area (sustainable use)', 'São Paulo State (Fundação Florestal)', 'Decreto Estadual nº 53.527, de 8 de outubro de 2008', 2008, 'FMA II',
    C_PLAN, 'Technical diagnosis for the management plan: “Em destaque na região do litoral sul encontram-se o boto-cinza (Sotalia guianenses) e a toninha (Pontoporia blainvillei)”. The creation decree does not name the species.',
    'Creation decree (read: no mention); aquatic-mammal diagnosis of the management plan (read).', 'Read',
    'https://sigam.ambiente.sp.gov.br/sigam3/Repositorio/511/Documentos/APAM_LS/3.2.1.4.1_MBio_Mastofauna%20Aquatica_APAMLS_OK.pdf'),
 pa('Brazil', 'APA Marinha do Litoral Norte', 'Marine environmental protection area (sustainable use)', 'São Paulo State (Fundação Florestal)', 'Decreto Estadual nº 53.525, de 8 de outubro de 2008; plano de manejo pelo Decreto nº 66.823/2022', 2008, 'FMA IIa',
    C_NO, 'Neither the creation decree nor the decree approving the management plan names the species.',
    'Decreto 53.525/2008 and Decreto 66.823/2022 (both read). The full management plan was not checked.', 'Read',
    'https://www.al.sp.gov.br/repositorio/legislacao/decreto/2022/decreto-66823-07.06.2022.html'),
 pa('Brazil', 'APA da Baleia Franca', 'Environmental protection area (sustainable use), coastal-marine', 'Federal (ICMBio)', 'Decreto federal de 14 de setembro de 2000', 2000, 'FMA IIb',
    C_PAN, 'PAN Toninha (1st cycle) action: gillnet exclusion areas “com especial atenção às imediações do Farol de Santa Marta - APA da Baleia Franca”. ICMBio also lists a document “Biologia e conservação da toninha – APA da Baleia Franca” among the APA files (link no longer available).',
    'PAN Toninha 1st-cycle executive summary (read).', 'Read (PAN); APA document not available',
    'https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade/pan/pan-toninha/1-ciclo/pan-toninha-sumario.pdf'),
 pa('Brazil', 'Estação Ecológica de Tupiniquins', 'Ecological station (full protection), insular-marine', 'Federal (ICMBio)', 'Decreto nº 92.964/1986', 1986, 'FMA IIb',
    C_PAN, 'PAN Toninha (1st cycle): gillnet exclusion areas around the “entorno da ESEC de Tupiniquins”.', 'PAN 1st-cycle summary (read). Creation act not checked.', 'Read (PAN)',
    'https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade/pan/pan-toninha/1-ciclo/pan-toninha-sumario.pdf'),
 pa('Brazil', 'Estação Ecológica Tupinambás', 'Ecological station (full protection), insular-marine', 'Federal (ICMBio)', 'Decreto nº 94.656/1987', 1987, 'FMA IIa',
    C_PAN, 'PAN Toninha (1st cycle): gillnet exclusion areas near “Ilha da Moela e ESEC Tupinambás - SP”.', 'PAN 1st-cycle summary (read). Creation act not checked.', 'Read (PAN)',
    'https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade/pan/pan-toninha/1-ciclo/pan-toninha-sumario.pdf'),
 pa('Brazil', 'Parque Nacional Marinho das Ilhas dos Currais', 'National park (full protection), marine', 'Federal (ICMBio)', 'Lei nº 12.829/2013', 2013, 'FMA IIb',
    C_PAN, 'PAN Toninha (1st cycle), written before the park existed: gillnet exclusion areas at the “Arquipélago de Currais - PR”.', 'PAN 1st-cycle summary (read). Creation act not checked.', 'Read (PAN)',
    'https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade/pan/pan-toninha/1-ciclo/pan-toninha-sumario.pdf'),
 pa('Brazil', 'Refúgio de Vida Silvestre da Ilha dos Lobos', 'Wildlife refuge (full protection), insular-marine', 'Federal (ICMBio)', 'Decreto nº 88.463/1983 (as Reserva Ecológica); recategorised 2005', 1983, 'FMA III',
    C_PAN, 'PAN Toninha (1st cycle): gillnet exclusion areas in the “entorno do REVIS da Ilha dos Lobos”, Torres (RS).', 'PAN 1st-cycle summary (read). Creation act not checked.', 'Read (PAN)',
    'https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade/pan/pan-toninha/1-ciclo/pan-toninha-sumario.pdf'),
 pa('Brazil', 'Parque Estadual de Itapeva', 'State park (full protection), coastal', 'Rio Grande do Sul State', 'Decreto Estadual nº 42.009/2002', 2002, 'FMA III',
    C_PAN, 'PAN Toninha (1st cycle): gillnet exclusion areas around the “Parque Estadual de Itapeva”.', 'PAN 1st-cycle summary (read). Creation act not checked.', 'Read (PAN)',
    'https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade/pan/pan-toninha/1-ciclo/pan-toninha-sumario.pdf'),
 pa('Brazil', 'Parque Nacional da Restinga de Jurubatiba', 'National park (full protection), coastal', 'Federal (ICMBio)', 'Decreto federal de 29 de abril de 1998', 1998, 'FMA Ib',
    C_PAN, 'PAN Toninha (1st cycle): gillnet exclusion areas in Macaé, Carapebus and Quissamã, “entorno do Parque Nacional de Jurubatiba”. The park is terrestrial; its coastal waters are outside it.', 'PAN 1st-cycle summary (read).', 'Read (PAN)',
    'https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade/pan/pan-toninha/1-ciclo/pan-toninha-sumario.pdf'),
 pa('Brazil', 'APA Costa das Algas', 'Environmental protection area (sustainable use), marine', 'Federal (ICMBio)', 'Decreto federal de 17 de junho de 2010', 2010, 'FMA Ia',
    C_SEC, 'Within the range of the isolated FMA Ia population, south of the Doce River mouth. A municipal coastal diagnosis (Aracruz) lists the toninha in the area, citing ICMBio (2023).',
    'Aracruz coastal-management diagnosis (search result only); management plan not checked.', 'Secondary',
    'https://aracruz.es.gov.br/storage/48113/Diagn%C3%B3stico-Projeto-Orla-Aracruz-F.pdf'),
 pa('Brazil', 'Refúgio de Vida Silvestre de Santa Cruz', 'Wildlife refuge (full protection), marine', 'Federal (ICMBio)', 'Decreto federal de 17 de junho de 2010', 2010, 'FMA Ia',
    C_SEC, 'Inside the APA Costa das Algas, on the Aracruz coast; same evidence as the APA.', 'Aracruz diagnosis (search result only).', 'Secondary',
    'https://aracruz.es.gov.br/storage/48113/Diagn%C3%B3stico-Projeto-Orla-Aracruz-F.pdf'),
 pa('Brazil', 'APA de Anhatomirim', 'Environmental protection area (sustainable use), marine', 'Federal (ICMBio)', 'Decreto nº 528/1992', 1992, 'FMA IIb',
    C_SEC, 'An academic study (UFSC) notes that the APA protects an area often used by the toninha and questions its current boundaries.', 'UFSC dissertation (search result only).', 'Secondary',
    'https://repositorio.ufsc.br/bitstream/handle/123456789/177604/NEVES_Andre_TCC.pdf.pdf?sequence=1'),
 pa('Brazil', 'Reserva de Fauna da Baía da Babitonga (proposed)', 'Fauna reserve (sustainable use) — not created', 'Federal (proposal)', 'Public consultation in 2007; not created', None, 'FMA II Babitonga',
    C_PAN, 'PAN Toninha (1st cycle) action “Atuar junto à Casa Civil, MMA e ICMBio para a criação das unidades de conservação: Reserva de Fauna da Baía da Babitonga (SC) e Albardão (RS)” — status “Iniciado”. Albardão has since been created; Babitonga has not.',
    'PAN 1st-cycle summary (read); 2007 MMA/ICMBio consultation notice (search result).', 'Read (PAN)',
    'https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade/pan/pan-toninha/1-ciclo/pan-toninha-sumario.pdf', status='Proposed'),
 # ---------------- Uruguay
 pa('Uruguay', 'Parque Nacional Cabo Polonio', 'National park (SNAP), marine-coastal', 'National (Ministerio de Ambiente)', 'Decreto Nº 337/009, de 20 de julio de 2009', 2009, 'FMA III',
    C_PLAN, 'The SNAP entry project lists the franciscana among marine mammals of the area and names its “captura incidental” in artisanal nets as an impact; the official site sheet describes it as a priority, threatened species. The creation decree does not name it.',
    'Decreto 337/009 (read: no mention); SNAP entry project (2009) and OAN site sheet (read).', 'Read',
    'https://www.gub.uy/ministerio-ambiente/sites/ministerio-ambiente/files/documentos/publicaciones/CaboPolonio-ProyectoingresoSNAPmayo2009_1_1.pdf'),
 pa('Uruguay', 'Paisaje Protegido Laguna de Rocha', 'Protected landscape (SNAP), coastal lagoon', 'National (Ministerio de Ambiente)', 'Decreto Nº 61/010, de 18 de febrero de 2010', 2010, 'FMA III',
    C_SEC, 'The management plan reportedly lists quantifying franciscana bycatch as pending. The creation decree does not name the species.',
    'Decreto 61/010 (read: no mention); management plan (search result only — host not reachable).', 'Decree read; plan secondary',
    'https://sig.rocha.gub.uy/opendata/AreasProtegidas/Plan%20de%20Manejo%20Laguna%20de%20Rocha.%20Res.%20Ministerial-1.pdf'),
 pa('Uruguay', 'Laguna Garzón', 'Habitat/species management area (SNAP), lagoon and marine', 'National (Ministerio de Ambiente)', 'Decreto Nº 341/014 (21 Nov 2014), amended by Decreto Nº 388/014', 2014, 'FMA III',
    C_NO, 'Neither the creation decree nor the 2007 entry proposal names the franciscana. The national species sheet reportedly records it as present.',
    'Decreto 341/014 and entry proposal (read: no mention); species sheet (search result).', 'Read',
    'https://impo.com.uy/bases/decretos/341-2014'),
 pa('Uruguay', 'Cerro Verde e Islas de la Coronilla', 'Habitat/species management area (SNAP), coastal-marine', 'National (Ministerio de Ambiente)', 'Decreto Nº 285/011', 2011, 'FMA III',
    C_NO, 'The creation decree does not name the franciscana. The national species sheet reportedly records it as present.',
    'Decreto 285/011 (read: no mention); species sheet (search result).', 'Read',
    'https://www.impo.com.uy/bases/decretos/285-2011'),
 # ---------------- Argentina
 pa('Argentina', 'Bahía de Samborombón (reservas integrales, de objetivo definido y refugio de vida silvestre)', 'Provincial reserves and wildlife refuge; Ramsar site', 'Buenos Aires Province', 'Ley Provincial Nº 12.016 (29 Oct 1997); plan de manejo aprobado por Decreto 1174/2022', 1997, 'FMA IV',
    C_SEC, 'AMP Argentina: “Sus aguas son de gran relevancia para especies que allí habitan, tales como el delfín franciscana”. The decree approving the management plan does not name the species in its text (the plan annex was not checked). Samborombón is also where Argentina’s observer data on franciscana bycatch come from (PAN-Mamíferos).',
    'Decreto 1174/2022 (read: no mention in the decree text); AMP Argentina database (read).', 'Read (decree); species mention secondary',
    'https://ampargentina.org/areas/bahia-samborombon/'),
 pa('Argentina', 'Reserva Natural de Uso Múltiple Bahía San Blas', 'Provincial multiple-use reserve', 'Buenos Aires Province', 'Ley Provincial Nº 12.788 (2001), replacing Ley 10.492/1987', 2001, 'FMA IVe',
    C_SEC, 'AMP Argentina: “Las aguas someras de estas bahías son sitio de reproducción del delfín franciscana”. A 2008 management-plan proposal (not approved) lists the species.',
    'AMP Argentina database (read); 2008 plan proposal (search result).', 'Secondary',
    'https://ampargentina.org/areas/bahia-san-blas'),
 pa('Argentina', 'Reserva Natural Bahía Blanca, Bahía Falsa y Bahía Verde', 'Provincial multiple-use reserve', 'Buenos Aires Province', 'Ley Provincial Nº 12.101 (7 Apr 1998)', 1998, 'FMA IVd',
    C_SEC, 'AMP Argentina: “Entre las especies más destacadas se encuentra la gaviota de Olrog y el delfín franciscana”. No management plan.', 'AMP Argentina database (read).', 'Secondary',
    'https://ampargentina.org/areas/bahia-blanca-bahia-falsa-y-bahia-verde/'),
]

# Creation acts recorded from reference knowledge, not checked against the official text in this review.
UNVERIFIED_ACTS = {'APA da Baleia Franca', 'Estação Ecológica de Tupiniquins', 'Estação Ecológica Tupinambás',
                   'Parque Nacional Marinho das Ilhas dos Currais', 'Refúgio de Vida Silvestre da Ilha dos Lobos',
                   'Parque Estadual de Itapeva', 'Parque Nacional da Restinga de Jurubatiba', 'APA Costa das Algas',
                   'Refúgio de Vida Silvestre de Santa Cruz', 'APA de Anhatomirim', 'APA Marinha do Litoral Centro'}
for r in pas:
    r['act_verified'] = r['name'] not in UNVERIFIED_ACTS
    if not r['act_verified']:
        r['checked'] += ' The creation act shown was not checked against the official text.'

L = lambda country, level, instrument, date, year, kind, says, category, status, verification, url: dict(
    country=country, level=level, instrument=instrument, date=date, year=year, kind=kind, says=says,
    category=category, status=status, verification=verification, url=url)

legal = [
 # ---------------- Brazil, federal
 L('Brazil', 'Federal', 'Portaria MMA nº 444', '17 Dec 2014', 2014, 'Threatened-species list', 'National list of threatened mammals; toninha listed.', 'CR', 'Replaced', 'Cited by Portaria ICMBio 655/2019 (read)', 'https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade/pan/pan-toninha/2-ciclo/pan-toninha-portaria-aprovacao.pdf'),
 L('Brazil', 'Federal', 'Portaria MMA nº 148', '7 Jun 2022', 2022, 'Threatened-species list', 'Updated the annexes of Portarias 443, 444 and 445/2014; toninha kept as Critically Endangered.', 'CR', 'Replaced', 'Secondary (official PDF no longer at the cited address)', 'https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade/pan/pan-toninha'),
 L('Brazil', 'Federal', 'Portaria MMA nº 1.704', '16 Jun 2026 (DOU 17 Jun 2026)', 2026, 'Threatened-species list', 'Current national list: “Mamíferos Mammalia Artiodactyla Pontoporiidae Pontoporia blainvillei CR”.', 'CR', 'In force', 'Read', 'https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade/pan/saiba-mais/documentos-e-downloads/10-portaria-mma-no-1-704-de-16-de-junho-de-2026.pdf'),
 L('Brazil', 'Federal', 'Portaria ICMBio nº 91 (PAN Toninha, 1st cycle)', '27 Aug 2010', 2010, 'National action plan', 'Approves the 1st cycle of the PAN Toninha (2010–2015): avoid population decline between Espírito Santo and Rio Grande do Sul; seven goals.', '', 'Expired (2015)', 'Read (executive summary)', 'https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade/pan/pan-toninha/1-ciclo/pan-toninha-sumario.pdf'),
 L('Brazil', 'Federal', 'Portaria ICMBio nº 655 (PAN Toninha, 2nd cycle)', '4 Nov 2019 (DOU 29 Nov 2019)', 2019, 'National action plan', 'Approves the 2nd cycle: “evitar o declínio populacional da toninha em todas as áreas de manejo”, with eight specific objectives (bycatch in gillnets, shared fisheries management, habitat, critical areas, awareness, policy integration, data, research by FMA).', 'CR', 'Expired (Sep 2024); no 3rd cycle published on the ICMBio page', 'Read', 'https://www.gov.br/icmbio/pt-br/assuntos/biodiversidade/pan/pan-toninha/2-ciclo/pan-toninha-portaria-aprovacao.pdf'),
 L('Brazil', 'Federal', 'Decreto nº 12.868', '6 Mar 2026', 2026, 'Protected-area creation', 'Creates the Parque Nacional do Albardão (about 1,004,480 ha) and the APA do Albardão (Santa Vitória do Palmar, RS). The ICMBio announcement names the toninha as the leading threatened species protected.', '', 'In force; challenged by PDL 112/2026 in the Senate', 'Announcement read; decree text not retrieved', 'https://www.gov.br/icmbio/pt-br/assuntos/noticias/ultimas-noticias/governo-do-brasil-avanca-na-protecao-da-biodiversidade-marinha-com-criacao-de-novas-unidades-de-conservacao-no-rs-1'),
 L('Brazil', 'Federal', 'Instrução Normativa Interministerial MPA/MMA nº 12', '22 Aug 2012', 2012, 'Fisheries regulation', 'Gillnet rules for SE and S Brazil (closed season 15 Jul–15 Oct in Área 1; no motorised gillnetting within 1 nautical mile). Often cited as the main bycatch-relevant rule for the toninha; whether its text names the species was not verified.', '', 'In force', 'Not verified (text not retrieved)', 'https://assiste.icmbio.gov.br/esectamoios/images/stories/in_inter_mpa_mma_12_2012_redesemalhe_se_s.pdf'),
 # ---------------- Brazil, states
 L('Brazil', 'State (SP)', 'Decreto Estadual nº 63.853', '27 Nov 2018', 2018, 'Threatened-species list', 'São Paulo fauna list: “Pontoporia blainvillei (Gervais & d’Orbogny, 1844) toninha EN”.', 'EN', 'In force', 'Read', 'https://sigam.ambiente.sp.gov.br/sigam3/repositorio/573/documentos/Decreto_Estadual_63853_2018.pdf'),
 L('Brazil', 'State (RS)', 'Decreto Estadual nº 51.797', '8 Sep 2014', 2014, 'Threatened-species list', 'Rio Grande do Sul list of threatened fauna; toninha listed as CR (the 2002 list, Decreto 41.672, had it as VU).', 'CR', 'In force', 'Secondary (Fauna Digital RS, UFRGS)', 'https://www.ufrgs.br/faunadigitalrs/mamiferos/ordem-cetartiodactyla/familia-pontoporidae/toninha-pontoporia-blainvillei/'),
 L('Brazil', 'State (ES)', 'Decreto nº 1.499-R', '13 Jun 2005', 2005, 'Threatened-species list', 'Espírito Santo list of threatened fauna; toninha listed as “Em Perigo” (IEMA).', 'EN', 'Not verified whether revised', 'Secondary (IEMA page, search result)', 'https://iema.es.gov.br/fauna_lista'),
 # ---------------- Argentina
 L('Argentina', 'National', 'Resolución CFP Nº 11/2015 (PAN-Mamíferos)', '3 Dec 2015', 2015, 'National action plan (fisheries)', 'Approves the National Action Plan to reduce interactions of marine mammals with fisheries; the plan has a section “Captura incidental de franciscana” (observer data from Bahía Samborombón–San Clemente del Tuyú and Cabo San Antonio). The resolution text itself does not name the species.', '', 'In force', 'Read (resolution and plan)', 'https://www.argentina.gob.ar/sites/default/files/2021/09/pan_mamiferos.pdf'),
 L('Argentina', 'National', 'Resolución Nº 316/2021 (RESOL-2021-316-APN-MAD)', '22 Sep 2021', 2021, 'Threatened-species list', 'National classification of native mammals: “Pontoporiidae 201 Pontoporia blainvillei Franciscana Amenazada”. Repeals Resolución 1030/2004.', 'Amenazada (VU A3cd in the SAREM 2019 categorisation)', 'In force', 'Read', 'https://www.argentina.gob.ar/normativa/nacional/norma-354496/texto'),
 L('Argentina', 'Provincial (Río Negro)', 'Ley M Nº 4.567', 'Sanctioned 29 Jul 2010; B.O. 2 Sep 2010', 2010, 'Species protection law', '“Se declara al Delfín Franciscana (Pontoporia blainvillei) especie protegida en la Provincia de Río Negro.” Prohibits hunting, capture, harassment and any action that harms the species or its habitat.', 'Especie protegida', 'In force', 'Read', 'https://faolex.fao.org/docs/pdf/arg117515.pdf'),
 L('Argentina', 'Provincial (Buenos Aires)', 'Ley Nº 14.992', 'Sanctioned 30 Nov 2017', 2017, 'Natural monument', '“Declárase Monumento Natural a la ‘Franciscana’ o ‘Delfín de Río’ (Pontoporia blainvillei), en todo el ámbito de la Provincia de Buenos Aires.” To be regulated under Ley 10.907.', 'Monumento Natural', 'In force (regulation not found)', 'Read', 'https://normas.gba.gob.ar/documentos/VwvdwCWB.html'),
 # ---------------- Uruguay
 L('Uruguay', 'Departmental (Canelones)', 'Plan Sectorial “Sistema Departamental de Áreas Protegidas” (Resolución 14/00753)', '27 Jan 2014 (Diario Oficial 31 Mar 2014)', 2014, 'Land-use / protected-area plan', 'Names the “franciscana”, Pontoporia blainvillei, among four species of genetic interest that “precisan de medidas de manejo y protección”.', '', 'Advance published for consultation', 'Read', 'https://impo.com.uy/diariooficial/2014/03/31/documentos.pdf'),
 L('Uruguay', 'National', 'Priority species for the SNAP (Soutullo et al. 2013)', '2013', 2013, 'Technical priority list (not a legal act)', 'Listed as “Especie prioritaria SNAP amenazada”; no decree or law naming the franciscana was found.', 'Priority, threatened', 'Technical reference', 'Secondary (Ministerio de Ambiente species sheet, search result)', 'https://www.ambiente.gub.uy/especies/especie/P_blainvil/'),
 # ---------------- International (shared)
 L('International', 'CMS', 'CMS Appendices I and II', '', None, 'Convention listing', 'The franciscana is listed in Appendices I and II of the Convention on Migratory Species (Argentina, Brazil and Uruguay are Parties).', '', 'In force', 'Read (CMS documents)', 'https://www.cms.int/sites/default/files/document/2025-11/cms_cop15_doc.31.3.7_ca_franciscana-dolphin_e_0.pdf'),
 L('International', 'CMS', 'Concerted Action 14.5 (COP14) and its revision (COP15)', 'Feb 2024; Mar 2026', 2024, 'Concerted action', 'Joint action of Argentina, Brazil and Uruguay; renewed for 2026–2029.', '', 'In force', 'Read', 'https://www.cms.int/sites/default/files/document/2026-06/cms_cop15_ca.14.5_rev.cop15_franciscana-dolphin_f.pdf'),
]

with open(os.path.join(OUT, 'protected_areas.json'), 'w', encoding='utf-8') as f: json.dump(pas, f, ensure_ascii=False, indent=1)
with open(os.path.join(OUT, 'legal_instruments.json'), 'w', encoding='utf-8') as f: json.dump(legal, f, ensure_ascii=False, indent=1)
print(len(pas), len(legal))
```

#### `tools/mkmap.js`

```javascript
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
```

#### `tools/patch_html_openalex.py`

```python
"""One-off patch: adds the OpenAlex snapshot and the new abundance sources to a page file (index.html)."""
import sys

E = lambda k, f: f'<b data-draw="{k}" data-source="evid_stats" data-field="{f}" data-row="0">—</b>'
L = lambda k, f, tag='b': f'<{tag} data-draw="{k}" data-source="lit_stats" data-field="{f}" data-row="0">—</{tag}>'

R = [
 ('so these counts are a lower bound; SciSpace is shown alongside for wider coverage.</p>',
  'so PubMed counts are a lower bound. OpenAlex, an open index that also covers regional journals, theses and book chapters, is shown alongside, as is SciSpace.</p>'),
 ('<p class="gd-p">PubMed lists <b data-draw="p_total"',
  '<p class="gd-p">OpenAlex lists ' + L('o_total', 'oa_total') + ' works naming the species since ' + L('o_first', 'oa_first', 'span') + ', with a peak of ' + L('o_peak_n', 'oa_peak_n') + ' in ' + L('o_peak_year', 'oa_peak_year', 'span') + '. PubMed lists <b data-draw="p_total"'),
 ('data-draw="chart_lit" data-source="pubmed_years">', 'data-draw="chart_lit" data-source="pubmed_years lit_years">'),
 ('<p class="gd-note">Among the records returned by SciSpace searches on 15 November 2026; citation counts are those of SciSpace. This file can be replaced by a Scopus or Web of Science export.</p>',
  '<p class="gd-note">The most-cited works in the OpenAlex snapshot of 27 November 2026; citation counts are those of OpenAlex. This file can be replaced by a Scopus or Web of Science export.</p>'),
 ('<p class="gd-sub">The number of PubMed records naming the species that match a topic defined for each CMP action, from keywords in the title, author keywords and MeSH terms, and from specific phrases in the abstract. The snapshot was taken on 15 November 2026; the records behind each count are listed below.</p>',
  '<p class="gd-sub">The number of records naming the species that match a topic defined for each CMP action. PubMed (snapshot of 15 November 2026) and OpenAlex (27 November 2026) are combined so that each document is counted once: OpenAlex records already in PubMed (same PMID, DOI or title) are not added. Topics are matched from keywords in the title (and, for PubMed, author keywords and MeSH terms), from specific phrases in the abstract, and, for OpenAlex records in Portuguese or Spanish, from the equivalent terms in those languages. The records behind each count are listed below.</p>'),
 ('<p class="gd-p">Of <b data-draw="e_base" data-source="evid_stats" data-field="baseline" data-row="0">—</b> PubMed records on the species, the topics of',
  '<p class="gd-p">Counting each document once, ' + E('e_base', 'baseline') + ' records name the species: ' + E('e_basepm', 'base_pm') + ' in PubMed and a further ' + E('e_baseoa', 'base_oa') + ' in OpenAlex only. The topics of'),
 ('have none: <span data-draw="e_lowids" data-source="evid_stats" data-field="low_ids" data-row="0">—</span>. Evidence on bycatch mitigation (such as pinger, longline and net-reflector trials) is published mainly in regional journals and IWC papers that PubMed does not index.</p>',
  'have none: <span data-draw="e_lowids" data-source="evid_stats" data-field="low_ids" data-row="0">—</span>. On PubMed alone the number under 10 was ' + E('e_nlowpm', 'n_low_pm') + ': OpenAlex adds the regional journals and theses where much of the work on bycatch, strandings and mitigation trials is published. Evidence from IWC papers and grey literature is still not counted.</p>'),
 ('<th data-field="count_pubmed">PubMed records</th><th data-field="rule">Rule</th>',
  '<th data-field="count_pubmed">PubMed</th><th data-field="count_oa">Added from OpenAlex</th><th data-field="count">Integrated</th><th data-field="rule">Rule</th>'),
 ('<p class="gd-note">A record may match several topics, so counts overlap and must not be added.',
  '<p class="gd-note">OpenAlex records were kept when their title or abstract names Pontoporia, the toninha or the franciscana dolphin; errata, datasets (other than the SALVE assessment), software and reference entries were excluded, and duplicate versions of the same work were merged. Author names in OpenAlex are not always in surname order, so a few first-author entries may show a given name. A record may match several topics, so counts overlap and must not be added.'),
 ('''      <tbody data-draw="rec_body"></tbody>
    </table>
  </div>
</section>''',
  '''      <tbody data-draw="rec_body"></tbody>
    </table>
  </div>

  <h3 class="gd-h3">Records added from OpenAlex (not in PubMed)</h3>
  <p class="gd-note">OpenAlex works that name the species and are not in PubMed, with the actions each was matched to and whether the match rests on the title, the abstract or both. Regional and Portuguese- or Spanish-language journals and theses make up most of them. Records matched to no topic count only towards the total.</p>
  <div class="gd-controls">
    <label>Action <select class="dash-select" data-draw="f_o_action" data-source="evidence_counts" aria-label="Show the OpenAlex records matched to one action"></select></label>
    <label>Search <input class="gd-input" type="search" data-param="o_q" placeholder="Title word, author, source or year" aria-label="Search the OpenAlex records"></label>
    <span class="gd-note" data-draw="oa_count" data-source="oa_records">—</span>
  </div>
  <div class="gd-wrap">
    <table class="gd-table" id="oa-table" data-source="oa_records" data-row-key="openalex_id">
      <thead><tr><th data-field="year">Year</th><th data-field="first_author">First author</th><th data-field="title">Title</th><th data-field="source">Source</th><th data-field="type">Type</th><th data-field="actions">Matched actions</th><th data-field="matched_by">Matched on</th><th>Link</th></tr></thead>
      <tbody data-draw="oa_body"></tbody>
    </table>
  </div>
</section>'''),
 ('<option value="cited">Most-cited works</option>', '<option value="openalex">OpenAlex records not in PubMed</option>\n        <option value="cited">Most-cited works</option>'),
 ('<li><b>OpenAlex, Scopus and Web of Science.</b> An OpenAlex snapshot can be added when its quota allows, deduplicated against PubMed by identifier. Scopus and Web of Science exports can replace the most-cited file.</li>',
  '<li><b>OpenAlex, Scopus and Web of Science.</b> The OpenAlex snapshot (records per year, most-cited works and records added to the counts) can be rerun at any time; it is deduplicated against PubMed by PMID, DOI and title. Scopus and Web of Science exports can replace the most-cited file.</li>'),
 ('Estimates for some of these exist in IWC Scientific Committee papers that could not be retrieved; see the editorial notes.',
  'Values for FMA Ib, Babitonga and FMA III marked “national assessment” are compiled in the SALVE/ICMBio assessment (Sucunza et al. 2025), whose summary does not name the original surveys.'),
]
REFS = '''    <li>Sucunza et al. (2020). Distribution, habitat use, and abundance of the endangered franciscana in southeastern and southern Brazil. <i>Marine Mammal Science</i>. doi:10.1111/mms.12650.</li>
    <li>Sucunza et al. (2025). Ficha de <i>Pontoporia blainvillei</i>. Sistema de Avaliação do Risco de Extinção da Biodiversidade (SALVE), ICMBio. doi:10.37002/salve.ficha.14512.3.</li>
    <li>Priem et al. (2022). OpenAlex: a fully-open index of scholarly works, authors, venues, institutions, and concepts. arXiv:2205.01833 (openalex.org).</li>
'''

s = open(sys.argv[1], encoding='utf-8').read()
for a, b in R:
    assert a in s, a[:80]
    s = s.replace(a, b, 1)
anchor = '    <li>Natural Earth (1:50m'
assert anchor in s
s = s.replace(anchor, REFS + anchor, 1)
open(sys.argv[1], 'w', encoding='utf-8').write(s)
print('patched', sys.argv[1])
```

