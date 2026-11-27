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
