---
name: "site-species-matcher"
description: "Match reforestation species to a Philippine/Mindanao site (TerraSpec, Panabo): ranked native species with scores, FAO classes, spacing and cautions; mangrove zonation for intertidal sites."
---

# Site–Species Matcher

Recommend which species to plant on a site and explain why, using site conditions rather than guesswork. The result must be defensible in a thesis defense and reproducible in code. The same site should always get the same ranking. That's why scoring is done by a script and not by eyeballing a table.

## When the output is used

- **Direct question:** "what should we plant in barangay X?" Run the workflow and answer with the report format below.
- **TerraSpec feature work:** the Laravel API, the MySQL `species` seeder, or the Gemini prompt. Use the data table and scoring rules here as the source of truth, and follow "TerraSpec integration" at the end.
- **Thesis writing:** describe the method with the factor weights, margins and class cutoffs defined here, so the paper and the system match.

## Workflow

### 1. Collect site conditions

| Input | Values | If missing |
|---|---|---|
| `elevation_m` | metres above sea level | Ask, or use DEM value if the user has one |
| `rainfall_mm` | mean annual | Use **2,100 mm** for Panabo/Davao del Norte lowland (Type IV climate, roughly 1,800–2,500 mm) and state the assumption. If a species sits near a rain cutoff (bagras, almaciga, white lauan), rerun at 1,800 and 2,500 and mention whether the ranking changes |
| `soil_ph` | 3.5–9 | Leave out and say pH was not scored |
| soil texture / drainage | not a script input | Map it onto `flooding`: heavy clay that stays waterlogged for days after rain counts as at least `occasional`. Free-draining sand and loam need no adjustment. Mention texture in the "why" column |
| `flooding` | `none` · `occasional` (short floods after heavy rain) · `seasonal` (weeks) · `tidal` (daily tides) | Ask; flooding decides a lot in Panabo's flat lowlands |
| `salinity` | `none` · `salt_spray` (beach, above high tide) · `brackish` · `saline` | `none` if well inland |
| `dry_months` | months with < 60 mm rain | Type IV climate → 0 |
| `objective` | `restoration` · `protection` · `riparian` · `coastal` · `production` · `agroforestry` | Default `restoration` and say so |
| `irrigated`, `include_invasive` | booleans | false |

Missing inputs aren't fatal. The script drops those factors and re-weights the rest, and the report must list them so the reader knows the confidence is lower. Ask only for inputs that would change the answer (usually flooding and objective). Don't interrogate the user about every field.

### 2. Route the site

- **Intertidal (`flooding: tidal`) or `salinity: saline`:** use the **Mangrove zonation** section, not the scorer. Mangroves are chosen by position in the tidal zone. Rainfall and pH ranges don't apply.
- **Beach strip above high tide:** use the scorer with `salinity: salt_spray` and `objective: coastal`.
- **Everything else:** use the scorer.

### 3. Score with the script

If `score_species.py` already sits next to this SKILL.md, use it. Otherwise save the code block at the end of this file as `score_species.py` in a scratch folder. Write the site as JSON and run:

```bash
python3 score_species.py site.json          # markdown table
python3 score_species.py site.json --json   # for APIs, seeders, tests
```

How it scores:

- **Numeric factors** (elevation, rainfall, pH):
  - Within the species' range: 1.0 in the central half, easing to 0.85 at the range edges.
  - Outside the range but within the margin: falls linearly to 0.4. Margins are elevation ±150 m, rainfall −250 / +600 mm, pH ±0.5. Excess rain is forgiven more than deficit because most of these species are wet-tropics trees.
  - Beyond the margin: **excluded**. The exception is a rain deficit on an irrigated site, which scores 0.4.
- **Tolerance factors** (flooding, salinity, drought):
  - Species tolerance meets the site level: 1.0.
  - One level short: 0.3, with a caution.
  - More than one level short: excluded.
  - Any salinity shortfall: excluded, because salt kills seedlings outright.
  - A tolerance shortfall also **caps the class**: one shortfall gives S2 at best, two or more give S3 at best. A tree that dislikes the site's flooding shouldn't show as "highly suitable" just because its other factors are perfect.
- **Weights:** elevation 0.20, rainfall 0.20, pH 0.15, flooding 0.20, salinity 0.10, drought 0.15. The score is 0–100.
- **Classes** (same labels as the FAO land suitability framework, so they line up with the land-suitability-mca skill):

  | Class | Score |
  |---|---|
  | S1 highly suitable | ≥ 80 |
  | S2 moderately suitable | 60–79 |
  | S3 marginally suitable | 40–59 |
  | N not suitable | < 40 or excluded |

- **Ranking:** species suited to the objective first, then by score, and at equal score natives and endemics before exotics. So a species with a higher score can appear below one that fits the objective. Say this in the report when it happens, for example: "banalo scores 98 but is listed after narra because it isn't a typical riparian species".
- **Species policy:**
  - Invasive species (mahogany, ipil-ipil) are excluded by default.
  - Exotics are excluded for `restoration`, `protection`, `riparian` and `coastal`. DENR MC 2011-01 reserves degraded forestland and protected areas primarily for premium and indigenous species. DMO 2023-01 tells nurseries to prioritize indigenous and endemic species.
  - Exotics may appear for `production` and `agroforestry`, always flagged.

If Python isn't available, apply the same rules by hand and say you did.

### 4. Interpret, don't just print

The script ranks species one at a time. A good recommendation is a **mix**, so add judgment on top:

- **Pioneer–climax mix.** Climax species (apitong, lauans, yakal, mabolo) need partial shade when young. On open land, plant pioneers first (narra, banaba, kawayan tinik, lumbang, talisay), or interplant, and add climax species as enrichment once there is some canopy. Don't recommend a pure climax planting on bare ground.
- **Diversity.** Recommend 4–8 species from different roles instead of a monoculture of the top scorer.
- **Conservation value.** Yakal (Endangered) and toog (Near Threatened) are worth flagging when they fit, because planting them adds value beyond cover.
- **Panabo specifics:**
  - Bagras and almaciga need ≥ 2,500 mm of rain, so they usually drop out in the lowlands. Almaciga belongs in the western uplands above 150 m if anywhere.
  - Flood-prone flats and riverbanks favor dao, banaba, kawayan tinik, narra and ipil.
  - Kawayan tinik must not go on saline ground.
- **Layout by zone:**
  - **Coastal greenbelt**, shore to inland:
    - front row on the sand: pandan dagat, agoho, malubago, banalo
    - middle belt: talisay, bitaog, botong, bani
    - back belt, where salt spray drops off: ipil, narra, mabolo
  - **Riverbank**, water's edge upward:
    - toe of the bank, where floods last longest: kawayan tinik, malubago, bani
    - mid-bank: banaba, dao
    - top of the bank and beyond, where the ground drains: narra, toog
  - The strip nearest the river is the PD 1067 Art. 51 easement: 3 m urban, 20 m agricultural, 40 m forest. Give its width when recommending a riparian buffer.
- **Density:** trees/ha = 10,000 ÷ (row spacing × in-row spacing). DENR MC 2011-01 uses 2×3, 3×3 or 3×4 m for forest trees and 5×5 to 10×10 m for fruit trees. The script's species spacings follow that.

### 5. Report format

Use this structure for direct answers (skip sections that don't apply):

```
## Species recommendation — <site name / barangay>
**Objective:** … | **Route:** terrestrial / mangrove | **Confidence:** full / reduced (missing: …)

### Site profile
| Factor | Value | Source (measured / DEM / assumed) |

### Recommended species
| # | Species (local, *scientific*) | Status | Role | Score | Class | Spacing (trees/ha) | Why it fits / cautions |

### Suggested planting mix
<pioneers vs. climax, proportions, sequencing, total seedlings for the area if area is known>

### Not recommended
<species excluded and the one-line reason — especially popular species people will ask about, like mahogany>

### Data caveats
<approximate ranges, assumptions made, what field check would firm this up (soil test, flood history)>
```

Keep "why" to one line per species and tie it to the site factor it matched (for example, "tolerates seasonal flooding; pH 6.2 within range").

## Mangrove zonation

For intertidal sites, pick by zone, from seaward to landward:

| Zone | Species | Spacing |
|---|---|---|
| Seaward, low intertidal (flooded every tide, sandy mud) | Api-api (*Avicennia marina*), Pagatpat (*Sonneratia alba*) | 0.5–1 m or clusters of 2–3 on exposed fronts |
| Mid intertidal, creek banks, estuaries (deep soft mud) | Bakauan babae (*Rhizophora mucronata*), Bakauan lalaki (*R. apiculata*); also *Bruguiera cylindrica*, *Ceriops tagal* | ~1×1 m |
| High intertidal, landward | *Bruguiera gymnorrhiza*, *Lumnitzera racemosa*, *Heritiera littoralis* | ~1×1 to 1.5×1.5 m |
| Upstream brackish river banks (low salinity) | Nipa (*Nypa fruticans*) | 1.5–2 m |
| Abandoned fishponds | Species matching the pond's tidal elevation | 1.5–2 m; restore tidal flow first |
| Above high tide (beach forest) | Talisay, Bitaog, Ipil. Switch to the scorer with `salinity: salt_spray` | per scorer |

Rules that prevent the most common failures:

- **No Rhizophora on seaward mudflats or exposed fronts.** Bakauan planted there has high mortality, and seaward-zone planting is where most failed projects happened.
- **Don't plant on seagrass beds or on mudflats that never supported mangroves.** Confirm historical mangrove presence (old imagery, local knowledge) before recommending planting.
- For degraded ponds and cut-over areas, **restoring tidal flow and natural regeneration** often beats planting. Say so when it applies.

## Species data

These ranges are the source of truth. They are compiled from ICRAF Agroforestree profiles, PROSEA, DENR issuances and mangrove rehabilitation manuals, and many pH values are approximate. Rows marked ~ rest on thinner sources, so treat them as provisional. Tolerances run 0 low, 1 moderate, 2 high. For salinity, 1 = salt spray and 2 = brackish. When a user supplies better local data (DENR-ERDB, field trials, their thesis), update the table and note the change.

| Species | Status | Elev m | Rain mm | pH | Flood | Salt | Drought | Role | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Narra *Pterocarpus indicus* | native | 0–600 | 900–2,200 | 5.5–7 | 1 | 1 | 2 | pioneer | N-fixing, adaptable |
| Molave *Vitex parviflora* | native | 0–1,000 | 750–2,600 | 6–8 | 0 | 0 | 2 | pioneer | dry, rocky, limestone |
| Ipil *Intsia bijuga* | native | 0–600 | 1,500–2,500 | 6–8 | 1 | 2 | 1 | intermediate | beach/back-mangrove |
| Dao *Dracontomelon dao* | native | 0–500 | 1,800–2,900 | 5–7 | 2 | 0 | 1 | intermediate | alluvial flats, riparian |
| ~ Mabolo/Kamagong *Diospyros blancoi* | native | 0–800 | 1,500–3,000 | 5.5–7.5 | 0 | 1 | 1 | climax | typhoon-resistant; salt tolerance weakly sourced |
| Apitong *Dipterocarpus grandiflorus* | native | 0–600 | 900–4,000 | 4.5–6.5 | 0 | 0 | 1 | climax | deep well-drained soils |
| White lauan *Shorea contorta* | endemic | 0–800 | 2,000–4,000 | 4.5–6.5 | 0 | 0 | 0 | climax | enrichment |
| Yakal *Shorea astylosa* | endemic, Endangered | 0–500 | 1,800–3,000 | 4.5–6.5 | 0 | 0 | 1 | climax | occurs in Davao |
| Bagras *Eucalyptus deglupta* | native (Mindanao) | 0–1,800 | 2,500–5,000 | 6–7.5 | 1 | 0 | 0 | pioneer | needs high rain |
| Toog *Petersianthus quadrialatus* | native, Near Threatened | 0–400 | 2,000–4,000 | 5–6.5 | 1 | 0 | 0 | intermediate | well-drained riverbanks |
| Lumbang *Aleurites moluccanus* | native | 0–1,200 | 650–4,300 | 5–8 | 0 | 0 | 1 | pioneer | agroforestry |
| Banaba *Lagerstroemia speciosa* | native | 0–1,000 | 1,000–4,000 | 5–7.5 | 2 | 0 | 1 | pioneer | riverbanks, clay |
| Kawayan tinik *Bambusa blumeana* | native | 0–1,000 | 1,200–4,000 | 5–6.5 | 2 | 0 | 1 | pioneer | no saline soils |
| Almaciga *Agathis philippinensis* | native | 150–2,200 | 2,500–5,000 | 4.5–6 | 0 | 0 | 0 | intermediate | uplands only |
| Talisay *Terminalia catappa* | native | 0–800 | 750–3,000 | 5–8.5 | 0 | 1 | 2 | pioneer | beach windbreak |
| Bitaog *Calophyllum inophyllum* | native | 0–500 | 750–5,000 | 5–8 | 1 | 1 | 1 | pioneer | coastal greenbelt |
| ~ Agoho *Casuarina equisetifolia* | native | 0–800 | 700–3,000 | 5–8.5 | 1 | 1 | 2 | pioneer | front-row windbreak, N-fixing |
| ~ Bani *Millettia pinnata* | native | 0–1,000 | 500–2,500 | 5–8.5 | 2 | 2 | 2 | pioneer | coastal and riparian, N-fixing |
| ~ Botong *Barringtonia asiatica* | native | 0–100 | 1,000–4,000 | 6–8.5 | 0 | 1 | 1 | intermediate | beach forest only |
| ~ Banalo *Thespesia populnea* | native | 0–300 | 800–3,000 | 5.5–8.5 | 2 | 2 | 2 | pioneer | beach and estuary margins |
| ~ Malubago *Hibiscus tiliaceus* | native | 0–800 | 900–3,000 | 5–8.5 | 2 | 2 | 1 | pioneer | beach, estuary, river margins |
| ~ Pandan dagat *Pandanus tectorius* | native | 0–300 | 1,000–4,000 | 6–9 | 1 | 1 | 2 | pioneer | dune stabilizer |
| Mahogany *Swietenia macrophylla* | **invasive** | 0–1,500 | 1,600–4,000 | 5–7.5 | 0 | 0 | 1 | — | allelopathic litter suppresses natives |
| Ipil-ipil *Leucaena leucocephala* | **invasive** | 0–1,500 | 650–3,000 | 6–8 | 0 | 0 | 2 | — | forms thickets that block succession |
| Gmelina *Gmelina arborea* | exotic | 0–1,200 | 750–4,500 | 5–8 | 0 | 0 | 0 | — | can spread; fails on poor drainage |
| Mangium *Acacia mangium* | exotic | 0–800 | 1,500–3,000 | 4.5–6.5 | 0 | 0 | 1 | — | can act as a managed nurse crop |
| Falcata *Falcataria moluccana* | exotic | 0–1,200 | 2,000–4,000 | 5–7 | 0 | 0 | 0 | — | gall rust epidemic in Mindanao |

Balete (*Ficus* spp.) is a valuable framework species for wildlife in assisted natural regeneration. It isn't row-planted, so it isn't scored, but it is worth mentioning for restoration objectives.

When someone asks "why not mahogany?", explain plainly. It is widely planted, but it spreads aggressively (about 3,000 seeds per tree), and its leaf litter suppresses native seedlings, narra included. Plantations dominated by mahogany have been documented as low in bird and insect life.

## TerraSpec integration

TerraSpec runs on Laravel, React 19, MapLibre GL, MySQL and Gemini 2.5 Flash. Pair this with the companion **land-suitability-mca** skill: it finds where to plant (S1/S2 land), and this skill decides what. Keep the **decision** deterministic and let the LLM only **explain** it:

1. **MySQL `species` table**, one row per species in the table above: `key`, `local_name`, `scientific_name`, `status` (enum native/endemic/exotic/invasive), `elev_min`, `elev_max`, `rain_min`, `rain_max`, `ph_min`, `ph_max`, `flood_tol`, `salt_tol`, `drought_tol` (tinyint 0–2), `role`, `spacing_row_m`, `spacing_inrow_m`, `objectives` (JSON array), `notes`, `source`. Seed it from the `SPECIES` list in the script so code and data never drift.
2. **Laravel `SpeciesMatcher` service.** Port `score()` from the script one-to-one (same weights, margins, cutoffs, exclusion rules). Test it with a PHPUnit case that runs the sample sites below and compares against the Python output.
3. **API response.** Return the same shape as `--json`: `route`, `objective`, `ranked[]` (species, status, role, score, class, spacing, trees_per_ha, fits_objective, cautions), `excluded[]`, `missing_inputs[]`.
4. **Gemini 2.5 Flash** gets the computed JSON and writes the narrative (why these species, planting mix, caveats). Its instructions must say to recommend only species in the provided list and never change scores or classes. Validate its output server-side by checking that every species it names appears in `ranked[]`. This is what stops invented species or numbers from reaching the PDF report.
5. **MapLibre.** Color site polygons by the class of the top species, or by the number of S1 species, using the same S1/S2/S3/N palette as the suitability map.

### Sample sites for tests

- **Riparian flat:** elevation 25, rain 2,100, pH 6.2, seasonal flooding, no salinity, 0 dry months, objective `riparian`. Expect dao, banaba, kawayan tinik, bani and malubago at the top, narra and toog capped at S2, and dipterocarps excluded for flooding.
- **Coastal greenbelt:** elevation 8, rain 2,100, pH 7.4, no flooding, salt spray, 0 dry months, objective `coastal`. Expect beach species (botong, ipil, talisay, bitaog, agoho, banalo, malubago, pandan dagat, bani) in S1, and dao and molave excluded for salinity.
- **Western upland:** elevation 320, rain 2,300, pH 5.4, no flooding, 0 dry months, objective `production`. Expect dipterocarps and dao high, molave, ipil and bagras excluded on pH, and exotics present but flagged.
- **Intertidal:** `flooding: tidal`. Expect a mangrove route, not a ranking.

## score_species.py

```python
#!/usr/bin/env python3
"""Score reforestation species against a site. Usage:
  python score_species.py site.json            # markdown table
  python score_species.py site.json --json     # machine-readable
site.json keys (all optional except one of elevation_m / rainfall_mm / soil_ph):
  elevation_m, rainfall_mm, soil_ph,
  flooding: none|occasional|seasonal|tidal,
  salinity: none|salt_spray|brackish|saline,
  dry_months: int (months with < 60 mm rain),
  objective: restoration|protection|riparian|coastal|production|agroforestry,
  irrigated: bool, include_invasive: bool
"""
import json, sys

# status: native | endemic | exotic | invasive ; rows marked ~ in the SKILL.md table are approximate
# flood/salt/drought tolerance: 0 low, 1 moderate, 2 high  (salt: 0 none, 1 salt spray, 2 brackish)
SPECIES = [
 # key, local, scientific, status, elev, rain, ph, flood, salt, drought, role, spacing_m, uses, objectives it suits
 ("narra","Narra","Pterocarpus indicus","native",(0,600),(900,2200),(5.5,7.0),1,1,2,"pioneer",(3,3),"timber, N-fixing, urban, riparian","restoration riparian production"),
 ("molave","Molave","Vitex parviflora","native",(0,1000),(750,2600),(6.0,8.0),0,0,2,"pioneer",(2,2),"timber, dry/limestone sites","restoration protection production"),
 ("ipil","Ipil","Intsia bijuga","native",(0,600),(1500,2500),(6.0,8.0),1,2,1,"intermediate",(3,4),"heavy timber, coastal buffer","coastal production restoration"),
 ("dao","Dao","Dracontomelon dao","native",(0,500),(1800,2900),(5.0,7.0),2,0,1,"intermediate",(3,3),"timber, fruit, riparian","riparian restoration production"),
 ("mabolo","Mabolo/Kamagong","Diospyros blancoi","native",(0,800),(1500,3000),(5.5,7.5),0,1,1,"climax",(4,4),"ebony, fruit","restoration agroforestry"),
 ("apitong","Apitong","Dipterocarpus grandiflorus","native",(0,600),(900,4000),(4.5,6.5),0,0,1,"climax",(3,4),"timber, watershed","restoration protection production"),
 ("white_lauan","White lauan","Shorea contorta","endemic",(0,800),(2000,4000),(4.5,6.5),0,0,0,"climax",(3,3),"timber (enrichment planting)","restoration production"),
 ("yakal","Yakal","Shorea astylosa","endemic",(0,500),(1800,3000),(4.5,6.5),0,0,1,"climax",(3,3),"premium hardwood; Endangered","restoration production"),
 ("bagras","Bagras","Eucalyptus deglupta","native",(0,1800),(2500,5000),(6.0,7.5),1,0,0,"pioneer",(3,3),"pulp, sawlog","production"),
 ("toog","Toog","Petersianthus quadrialatus","native",(0,400),(2000,4000),(5.0,6.5),1,0,0,"intermediate",(3,3),"construction timber; Near Threatened","restoration riparian"),
 ("lumbang","Lumbang","Aleurites moluccanus","native",(0,1200),(650,4300),(5.0,8.0),0,0,1,"pioneer",(6,6),"oil, agroforestry","agroforestry restoration"),
 ("banaba","Banaba","Lagerstroemia speciosa","native",(0,1000),(1000,4000),(5.0,7.5),2,0,1,"pioneer",(3,3),"medicinal, ornamental, riparian","riparian restoration"),
 ("kawayan_tinik","Kawayan tinik","Bambusa blumeana","native",(0,1000),(1200,4000),(5.0,6.5),2,0,1,"pioneer",(5,5),"bank stabilization, construction","riparian protection production"),
 ("almaciga","Almaciga","Agathis philippinensis","native",(150,2200),(2500,5000),(4.5,6.0),0,0,0,"intermediate",(3,3),"resin, timber (enrichment)","restoration protection"),
 ("talisay","Talisay","Terminalia catappa","native",(0,800),(750,3000),(5.0,8.5),0,1,2,"pioneer",(4,4),"beach windbreak, shade","coastal"),
 ("bitaog","Bitaog","Calophyllum inophyllum","native",(0,500),(750,5000),(5.0,8.0),1,1,1,"pioneer",(2,3),"coastal greenbelt, timber, oil","coastal restoration"),
 ("agoho","Agoho","Casuarina equisetifolia","native",(0,800),(700,3000),(5.0,8.5),1,1,2,"pioneer",(2,2),"beach windbreak, N-fixing","coastal"),
 ("bani","Bani","Millettia pinnata","native",(0,1000),(500,2500),(5.0,8.5),2,2,2,"pioneer",(3,3),"coastal & riparian buffer, N-fixing","coastal riparian"),
 ("botong","Botong","Barringtonia asiatica","native",(0,100),(1000,4000),(6.0,8.5),0,1,1,"intermediate",(4,4),"beach forest","coastal"),
 ("banalo","Banalo","Thespesia populnea","native",(0,300),(800,3000),(5.5,8.5),2,2,2,"pioneer",(3,3),"beach & estuary margins","coastal"),
 ("malubago","Malubago","Hibiscus tiliaceus","native",(0,800),(900,3000),(5.0,8.5),2,2,1,"pioneer",(3,3),"beach, estuary & river margins","coastal riparian"),
 ("pandan_dagat","Pandan dagat","Pandanus tectorius","native",(0,300),(1000,4000),(6.0,9.0),1,1,2,"pioneer",(2,2),"front-row dune stabilizer","coastal"),
 ("mahogany","Mahogany","Swietenia macrophylla","invasive",(0,1500),(1600,4000),(5.0,7.5),0,0,1,"intermediate",(3,3),"timber","production"),
 ("ipil_ipil","Ipil-ipil","Leucaena leucocephala","invasive",(0,1500),(650,3000),(6.0,8.0),0,0,2,"pioneer",(2,2),"fodder, fuelwood","agroforestry"),
 ("gmelina","Gmelina","Gmelina arborea","exotic",(0,1200),(750,4500),(5.0,8.0),0,0,0,"pioneer",(3,3),"pulp, light timber","production"),
 ("mangium","Mangium","Acacia mangium","exotic",(0,800),(1500,3000),(4.5,6.5),0,0,1,"pioneer",(3,3),"pulp; possible nurse crop","production"),
 ("falcata","Falcata","Falcataria moluccana","exotic",(0,1200),(2000,4000),(5.0,7.0),0,0,0,"pioneer",(3,3),"light timber; gall rust risk in Mindanao","production"),
]

FLOOD = {"none":0,"occasional":1,"seasonal":2}
SALT = {"none":0,"salt_spray":1,"brackish":2}
WEIGHTS = {"elevation":0.20,"rainfall":0.20,"ph":0.15,"flooding":0.20,"salinity":0.10,"drought":0.15}
MARGIN = {"elevation":150,"rain_deficit":250,"rain_excess":600,"ph":0.5}
RESTORE = {"restoration","protection","riparian","coastal"}

def ranged(v, lo, hi, m_lo, m_hi):
    """1.0 inside range; linear to 0.4 at margin; None = hard fail beyond margin."""
    if lo <= v <= hi:
        # 1.0 in the central half of the range, easing to 0.85 at the edges
        q = (hi - lo) / 4
        edge = min(v - lo, hi - v)
        return (1.0 if q == 0 or edge >= q else round(0.85 + 0.15 * edge / q, 2)), None
    d, m = (lo - v, m_lo) if v < lo else (v - hi, m_hi)
    if d <= m: return round(1 - 0.6 * d / m, 2), f"{'below' if v < lo else 'above'} range {lo}–{hi}"
    return None, f"{'below' if v < lo else 'above'} range {lo}–{hi} by more than margin"

def tol(site_level, tolerance, name, fatal_if_short=False):
    gap = site_level - tolerance
    if gap <= 0: return 1.0, None
    if gap == 1 and not fatal_if_short: return 0.3, f"{name} tolerance one level short"
    return None, f"{name} exceeds tolerance"

def score(site):
    if site.get("flooding") == "tidal" or site.get("salinity") == "saline":
        return {"route":"mangrove","message":"Intertidal/saline site: use the mangrove zonation table, not this scorer."}
    dry = site.get("dry_months")
    drought_lvl = None if dry is None else (0 if dry == 0 else 1 if dry <= 3 else 2)
    obj = site.get("objective", "restoration")
    out, excluded = [], []
    for (key, local, sci, status, elev, rain, ph, fl, sa, dr, role, sp, uses, objs) in SPECIES:
        if status == "invasive" and not site.get("include_invasive"):
            excluded.append({"species":f"{local} ({sci})","reason":"invasive in PH; excluded by default"}); continue
        if status == "exotic" and obj in RESTORE:
            excluded.append({"species":f"{local} ({sci})","reason":f"exotic; DENR NGP reserves restoration/protection areas for indigenous species"}); continue
        parts, notes, fail = {}, [], None
        checks = []
        if "elevation_m" in site: checks.append(("elevation", ranged(site["elevation_m"], *elev, MARGIN["elevation"], MARGIN["elevation"])))
        if "rainfall_mm" in site:
            r = ranged(site["rainfall_mm"], *rain, MARGIN["rain_deficit"], MARGIN["rain_excess"])
            if r[0] is None and site["rainfall_mm"] < rain[0] and site.get("irrigated"): r = (0.4, "rain deficit offset by irrigation")
            checks.append(("rainfall", r))
        if "soil_ph" in site: checks.append(("ph", ranged(site["soil_ph"], *ph, MARGIN["ph"], MARGIN["ph"])))
        if "flooding" in site: checks.append(("flooding", tol(FLOOD[site["flooding"]], fl, "flooding")))
        if "salinity" in site: checks.append(("salinity", tol(SALT[site["salinity"]], sa, "salinity", fatal_if_short=True)))
        if drought_lvl is not None: checks.append(("drought", tol(drought_lvl, dr, "drought")))
        for name, (s, note) in checks:
            if s is None: fail = f"{name}: {note}"; break
            parts[name] = s
            if note: notes.append(f"{name}: {note}")
        if fail:
            excluded.append({"species":f"{local} ({sci})","reason":fail}); continue
        wsum = sum(WEIGHTS[k] for k in parts)
        sc = round(100 * sum(WEIGHTS[k]*v for k, v in parts.items()) / wsum) if wsum else 0
        cls = "S1" if sc >= 80 else "S2" if sc >= 60 else "S3" if sc >= 40 else "N"
        short = sum(1 for n in notes if "tolerance one level short" in n)
        order = ["S1","S2","S3","N"]
        if short:  # a tolerance shortfall caps the class: one → S2 at best, two or more → S3 at best
            cls = order[max(order.index(cls), min(short, 2))]
        fits = obj in objs.split() or (obj == "protection" and "restoration" in objs.split())
        if role == "climax": notes.append("needs partial shade when young: enrichment planting or after pioneers")
        if status == "exotic": notes.append("exotic: production/agroforestry only")
        if status == "invasive": notes.append("INVASIVE: do not plant near natural forest")
        out.append({"key":key,"species":f"{local} ({sci})","status":status,"role":role,"score":sc,"class":cls,
                    "spacing":f"{sp[0]}×{sp[1]} m","trees_per_ha":round(10000/(sp[0]*sp[1])),"uses":uses,
                    "fits_objective":fits,"factors_used":len(parts),"cautions":notes})
    rank = {"endemic":0,"native":0,"exotic":1,"invasive":2}
    out.sort(key=lambda x: (not x["fits_objective"], -x["score"], rank[x["status"]]))
    return {"route":"terrestrial","objective":obj,"ranked":out,"excluded":excluded,
            "missing_inputs":[k for k in ("elevation_m","rainfall_mm","soil_ph","flooding","salinity","dry_months") if k not in site]}

if __name__ == "__main__":
    site = json.load(open(sys.argv[1]))
    res = score(site)
    if "--json" in sys.argv or res["route"] != "terrestrial":
        print(json.dumps(res, indent=2, ensure_ascii=False)); sys.exit()
    print(f"Objective: {res['objective']} | missing inputs: {', '.join(res['missing_inputs']) or 'none'}\n")
    print("| # | Species | Status | Role | Fits objective | Score | Class | Spacing (trees/ha) | Cautions |\n|---|---|---|---|---|---|---|---|---|")
    for i, r in enumerate(res["ranked"], 1):
        print(f"| {i} | {r['species']} | {r['status']} | {r['role']} | {'yes' if r['fits_objective'] else 'no'} | {r['score']} | {r['class']} | {r['spacing']} ({r['trees_per_ha']}) | {'; '.join(r['cautions']) or '—'} |")
    print("\nExcluded:")
    for e in res["excluded"]: print(f"- {e['species']}: {e['reason']}")
```