# Franciscana_CMP

This dashboard provides data visualizations for the Franciscana CMP, along with other information that supports conservation efforts.

It is an evidence and assessment dashboard supporting the IWC Conservation Management Plan (CMP) for the franciscana dolphin, or toninha (*Pontoporia blainvillei*). It covers:

- the 11 Franciscana Management Areas (FMAs) and published abundance estimates;
- the species' range and the places named in the plan;
- threats and the CMP actions that address them;
- the CMS Concerted Action for 2026–2029 and its implementation report;
- conservation status (IUCN, the FMA Ia assessment and national lists);
- range states and milestones, 2003–2029;
- the scientific literature (PubMed and SciSpace);
- PubMed evidence for each CMP action;
- protected areas within the range in Brazil, Uruguay and Argentina, and whether their official documents name the species;
- legal instruments (laws, decrees, ordinances, resolutions, plans) that name *Pontoporia blainvillei* or its common names;
- editorial notes on gaps and conflicts between sources.

## Viewing it

The site is static, so no build step is needed.

- **GitHub Pages:** under *Settings → Pages*, choose *Deploy from a branch*, then the branch and the `/ (root)` folder.
- **Locally:** run `python3 -m http.server` in the repository folder and open <http://localhost:8000>. Opening `index.html` straight from disk does not work, because browsers block `fetch` of local files.

## How it works

| Path | Content |
|---|---|
| `index.html` | The page. |
| `css/` | Design tokens (light and dark themes) and the page styles. |
| `js/dash-runtime.js` | A small runtime that loads the data files, runs the calculations and redraws the charts and tables. |
| `js/app.js`, `draw.js`, `map.js`, `sci.js`, `overview.js`, `legal.js`, `litdl.js` | Calculations, charts, map, tables and the "At a glance" cards. |
| `js/vendor/d3.min.js` | D3 v7.9.0 (ISC licence, see `d3.LICENSE`). |
| `data/*.json` | Every figure, chart and table on the page comes from these files. |
| `tools/` | The scripts that built the data files, and the PubMed metadata snapshot they used. |

The **Most recent PubMed records** table is fetched live from the NCBI E-utilities API each time the page opens. If NCBI cannot be reached, the table shows the newest records of the snapshot instead.

Everything else is a dated snapshot of 15 November 2026: the SciSpace records, the PubMed counts and the evidence per action.

To update the dashboard, edit or replace the files in `data/`, keeping the same field names. `tools/build_data.py` writes its output to `tools/data/` and reads `pm_all.json` from that folder. Copy `tools/pubmed_metadata_snapshot.json` there as `pm_all.json` before running it. `tools/build_legal_pa.py` writes `data/protected_areas.json` and `data/legal_instruments.json`; each row records which documents were read. `tools/mkmap.js` needs the npm packages `world-atlas@2.0.2` and `topojson-client@3.1.0`.

## Personal-data protection (LGPD)

In the literature tables, the downloads (CSV and PDF) and the data files, each publication is identified by year, title, journal and DOI or PubMed link. In the literature lists, authorship is shown only as the first author's surname followed by "et al." (or the surname alone for single-author works); citations of two-author works elsewhere on the page keep both surnames. Full author names, affiliations, e-mail addresses and other personal data are not stored or exported (Lei nº 13.709/2018). The downloads list bibliographic records only, not the articles themselves.

## Sources

The main sources are:

- UNEP/CMS Concerted Action 14.5 (2024) and its COP15 revision (2026);
- the CMS COP15 documents Doc.31.2.8 and Doc.31.3.7;
- the published papers cited on the page;
- Brazil's national red list and the PAN Toninha ordinances;
- Natural Earth (public domain);
- PubMed and SciSpace.

See the *References and credits* section of the page and the *Editorial notes* table for known gaps. The gaps include: abundance estimates for FMAs Ib, IIa and IIb, IMMA boundaries, CMP action priorities, and the 2nd-cycle PAN Toninha objectives.

Dashboard prepared by the Laboratório de Ecologia e Conservação, Universidade Federal do Paraná, Brazil.

## Licence

Code and data compilations are released under CC0 1.0 (see `LICENSE`).

**Exception:** the cover photograph `assets/franciscanas_sucunza.jpg` is © Federico Sucunza. It is **not** covered by CC0 and is used with credit; contact the author for any reuse.
