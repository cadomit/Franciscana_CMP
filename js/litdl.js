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
