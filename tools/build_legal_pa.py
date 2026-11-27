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
