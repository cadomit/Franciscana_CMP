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
