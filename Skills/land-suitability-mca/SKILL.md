---
name: "land-suitability-mca"
description: "GIS land suitability MCA for reforestation (TerraSpec, Panabo): criteria, constraints, AHP weights with consistency ratio, weighted overlay to S1/S2/S3/N, sensitivity, Laravel/MySQL build, thesis write-up."
---

# Land Suitability MCA (AHP + weighted overlay)

Decide *where* reforestation is suitable, in a way that is transparent, reproducible and defensible in front of a thesis panel. The site-species-matcher skill then decides *what to plant* on the S1 and S2 areas.

The analysis has six stages. Keep each one explicit, because panels and advisers ask about every one:

1. Goal and study area
2. Constraints (exclusions) and legal priority zones
3. Criteria and reclassification to a common 1–4 scale
4. AHP weights with a consistency check
5. Weighted overlay into FAO classes
6. Sensitivity analysis and validation

The numbers come from the two scripts at the end of this file (`ahp.py`, `overlay.py`). If they already sit next to this SKILL.md, use those. Otherwise save the code blocks to a scratch folder. Run them rather than doing the matrix math by hand. A hand-computed eigenvector is a common source of wrong CRs in theses.

## 1. Goal and study area

State the goal in one sentence, because it decides how criteria are scored. For example: "identify land in Panabo City suitable and in need of reforestation with native species." "Suitable for tree growth" and "priority for reforestation" rank the same land differently (flat fertile cropland is good for trees but a poor reforestation target). Decide which one the system means and keep it consistent.

Define the analysis unit:

- **Grid cells** (for example 30 m, matching the DEM or Landsat) give the finest detail.
- **Parcels or barangay polygons** match how the LGU and DENR act.

TerraSpec's vector map works well with a grid clipped to barangay boundaries, with results summarized per barangay.

## 2. Constraints and legal priority zones

**Constraints** are yes/no exclusions. They are classed N whatever their score, and must never be averaged into the score:

- built-up areas, roads, water bodies
- existing closed forest (already forested; protect it, don't plant it)
- intertidal areas, which go to mangrove assessment in site-species-matcher instead of the terrestrial MCA
- anything else the user's data or adviser says to exclude

**Priority zones** are areas the law already sets aside for forest cover or buffers. Flag them in a separate column. Don't let them change the score, so the map can show "suitable" and "legally mandated" separately:

- **PD 705, Sec. 15:** public land with 18% slope or more can't be classified alienable and disposable, and forest land with 50% slope or more can't be classified as grazing land. Slope ≥ 18% is therefore a strong forest-land indicator, and ≥ 50% a protection indicator.
- **PD 1067 (Water Code), Art. 51:** a public-use easement along riverbanks and shores of 3 m in urban areas, 20 m in agricultural areas and 40 m in forest areas. These are natural riparian planting strips.
- **PD 705, Sec. 16** (as amended) lists coastal mangrove and swamp strips and other areas needed for forest purposes. Check the widths in the current text before quoting them in the thesis.
- **Protected areas (NIPAS / E-NIPAS):** planting follows the management plan approved by the Protected Area Management Board (PAMB). Flag these, don't auto-score them.

Configure these as `priority` entries in `config.json`. A slope rule like `{"name": "pd705_slope18", "column": "slope", "min": 18}` needs no extra column. Easements and protected areas need a 0/1 column computed in preprocessing by buffering rivers or intersecting the protected area boundary. If a cell is much wider than the easement (a 20 m strip inside a 100 m cell), split the cells along the buffer first. Otherwise the whole cell gets flagged and the priority area is overstated.

Legal priority is not the same as physical suitability. A 60% slope is legally forest land but hard to plant, so assisted natural regeneration may beat planting there. Say this in the report when it applies.

## 3. Criteria and reclassification

Use 5–8 criteria. Fewer can't be defended. More makes pairwise comparison unwieldy (n = 8 already needs 28 judgments) and inflates the CR. Every criterion needs:

- a data source (dataset, year, resolution)
- a reason, backed by a citation or a stated rationale
- a reclassification to **1–4** (4 = S1, 3 = S2, 2 = S3, 1 = N)

Starting defaults for reforestation in lowland Davao del Norte follow. Present them as defaults to be justified or adjusted with the adviser, never as settled fact:

| Criterion | Source (typical) | 4 | 3 | 2 | 1 | Why |
|---|---|---|---|---|---|---|
| Land cover | NAMRIA land cover / Sentinel-2 classification | grassland, barren, shrubland | open/degraded forest (enrichment) | cropland | banana/commercial plantation | Degraded open land is the main target; tenure conflicts lower the rest |
| Slope (%) | DEM (NAMRIA IfSAR, DREAM/Phil-LiDAR, or SRTM 30 m) | 18–50 | 8–18 or > 50 | 0–8 | — | Erosion control and PD 705; > 50% is hard to plant. No slope class is 1 because no slope makes reforestation pointless on its own; flat land scores low because it is usually needed for farming |
| Soil type/texture | BSWM soil map | loam, clay loam | clay, sandy loam | sand | very poorly drained | Root development and drainage |
| Distance to river (m) | NAMRIA hydrography / DEM-derived | < 40 | 40–100 | 100–500 | > 500 | Riparian protection and moisture |
| Distance to road (m) | OSM / DPWH | < 500 | 500–1,000 | 1,000–2,000 | > 2,000 | Seedling hauling, maintenance, monitoring |
| Flood susceptibility | MGB geohazard maps | low | moderate | high | very high (unless flood-tolerant species) | Seedling survival |
| Elevation (m) | DEM | include only if it varies meaningfully in the study area | | | | |

**Drop criteria that barely vary.** Rainfall is almost uniform across Panabo (Type IV climate), so as a criterion it takes weight while telling nothing apart. Mention it in the site description instead. The same goes for elevation on the flat eastern side.

Every category that appears in the data needs a rule. `overlay.py` warns about values with no rule (typos, new NAMRIA classes) and treats them as missing, so fix the warning instead of ignoring it.

**Watch for double counting.** Slope and flood susceptibility are correlated, and so are land cover and NDVI. Using both of a pair quietly doubles its influence. Keep one, or give the second a clearly lower weight and say why.

## 4. AHP weights

Build the pairwise matrix with Saaty's 1–9 scale:

| Value | Meaning |
|---|---|
| 1 | equal importance |
| 3 | moderate importance |
| 5 | strong importance |
| 7 | very strong importance |
| 9 | extreme importance |
| 2, 4, 6, 8 | in-between values |
| reciprocals (1/3, 1/5, …) | the reverse comparison |

Only the upper triangle needs judgments: n(n−1)/2 of them. Get them from the user, their adviser, or a documented expert survey. For several experts, combine each cell with the **geometric mean** (never the arithmetic mean) before running AHP. If the user asks you to propose judgments, say plainly that they are your proposal to be confirmed and cited.

Run the AHP script:

```bash
python3 ahp.py ahp.json                          # prints matrix, weights, λmax, CI, RI, CR; saves ahp_result.json
python3 ahp.py ahp.json --diagnose               # also lists the judgments most at odds with the weights
python3 ahp.py textbook.json --out check.json    # use --out for test runs so they don't overwrite the real weights
```

- **Weights:** the principal eigenvector.
- **Consistency index:** CI = (λmax − n)/(n − 1).
- **Consistency ratio:** CR = CI / RI, with Saaty's random index RI:

  | n | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
  |---|---|---|---|---|---|---|---|---|
  | RI | 0.58 | 0.90 | 1.12 | 1.24 | 1.32 | 1.41 | 1.45 | 1.49 |

- **Acceptable:** CR < 0.10. If it's higher, don't tweak numbers at random. Use `--diagnose` to find the judgments that contradict the rest, take them back to whoever made them with the suggested value, and rerun. Report the final matrix and CR in the thesis, not a CR "fixed" by editing the weights directly.

Sanity check: the textbook matrix [[1,3,5],[1/3,1,3],[1/5,1/3,1]] should give about 0.637 / 0.258 / 0.105 with CR ≈ 0.033. If an implementation (PHP port, spreadsheet) doesn't reproduce that, it's wrong.

## 5. Weighted overlay and classes

Score = Σ (weightᵢ × reclassified valueᵢ), which falls between 1 and 4. Constraints force N. Default class cutoffs split the scale into four equal bands:

| Class | Score |
|---|---|
| S1 highly suitable | ≥ 3.25 |
| S2 moderately suitable | 2.50–3.25 |
| S3 marginally suitable | 1.75–2.50 |
| N not suitable | < 1.75 or constrained |

Natural breaks or quantiles are alternatives, but state which you used, because cutoffs move a lot of area between classes.

```bash
python3 overlay.py parcels.csv config.json --out suitability_results.csv
```

- `parcels.csv` holds one row per cell or parcel: `id`, `area_ha`, the raw criterion columns, and 0/1 constraint and priority columns.
- `config.json` holds the reclass rules, the weights (or `"weights_file": "ahp_result.json"`), the constraints, the priority flags and optional cutoffs. The script's docstring shows the format.
- Output:
  - a class per unit, with `missing: …` noted where a criterion had no data (the unit is scored on the remaining weights, which the report should mention)
  - area and share per class, with **N (constraint)** and **N (score)** kept separate, since "excluded by rule" and "scored poorly" mean different things on a map
  - area per priority zone, and how much of it is S1/S2
  - a sensitivity table

Compute `area_ha` in a projected CRS (UTM zone 51N, EPSG:32651, for Davao). Never compute it from degrees in EPSG:4326.

## 6. Sensitivity and validation

- **Sensitivity.** The script moves each weight by ±10% and ±20%, rescales the others so they still sum to 1, and reports the share of area that changes class. The table shows both area and number of units. Under about 5% of area suggests the result is robust to that weight. With small samples, where one unit is more than 5% of the area, judge by units instead and say the sample is small. Large shifts mean that criterion's weight needs the strongest justification in the defense.
- **Validation.** Compare classes against something independent, such as existing successful plantation or NGP sites, recent natural regrowth, or field-checked points. Report the share falling in S1/S2. Even a small check answers the "how do you know it's right?" question every panel asks.

## Report format

For a direct analysis, or for the thesis. In the usual Philippine capstone layout, criteria, the matrix and the method go in Chapter 3 (Methodology), and classes, areas, sensitivity and validation go in Chapter 4 (Results):

```
### Criteria and reclassification  — table: criterion, source, classes 1–4, rationale
### Pairwise comparison matrix     — full n×n matrix (fractions), weights column
### Consistency                    — λmax, CI, RI, CR, verdict
### Suitability classes            — class, area (ha), % of study area (N split into constraint / score); map legend S1–N
### Legal priority zones           — area flagged per law, overlap with S1/S2
### Sensitivity                    — the ±10/20% table and one sentence of interpretation
### Validation                     — method, result, limitations
```

## TerraSpec implementation (Laravel · MySQL · React 19 / MapLibre)

Do heavy raster work (slope from the DEM, distance surfaces, zonal statistics per cell) **once in preprocessing** with QGIS, GDAL or Python. Store the results as plain attribute columns. MySQL spatial functions are fine for storage and lookups, but they aren't a raster engine.

**Tables:**

- `criteria` (key, label, source, unit, type range|category)
- `criterion_classes` (criterion_id, min, max or category, score 1–4)
- `weight_sets` (name, matrix JSON, weights JSON, lambda_max, ci, cr, created_by, is_active). Keep every weight set so results are traceable.
- `analysis_units` (geometry, barangay_id, area_ha, one column per criterion, constraint and priority flags)
- `suitability_results` (unit_id, weight_set_id, score, class, n_type constraint|score, priority, note)

**`SuitabilityService`:**

- Port `overlay.py`'s `run()` exactly.
- Put the AHP in its own `AhpCalculator` using power iteration, as in `ahp.py`.
- Add a PHPUnit test that asserts the textbook matrix gives weights 0.637/0.258/0.105 and CR 0.033 (±0.001).
- **Refuse to activate a weight set with CR ≥ 0.10.** Enforce this in the controller, not only in the UI.

**MySQL gotchas:**

- With SRID 4326, MySQL 8 reads WKT in **latitude-longitude** order by default. Use `ST_GeomFromText(wkt, 4326, 'axis-order=long-lat')`.
- Round-trip a known point (for example Panabo City Hall) to confirm coordinates don't come out swapped on the map.

**MapLibre:**

- Serve GeoJSON of units with `class` and `priority`.
- Style with a `match` expression on `class`, one fixed color each for S1, S2, S3 and N, used identically in the legend, the DomPDF report and the thesis figures.
- Add a hatched or outlined layer for priority zones.

**Gemini** may write the narrative for a barangay's result from the computed numbers. It must never produce weights, classes or areas. Validate that any numbers it quotes match the stored results.

## ahp.py

```python
#!/usr/bin/env python3
"""AHP weights + consistency check. Usage: python ahp.py ahp.json [--out weights.json] [--diagnose]
Default output: <input name>_result.json (e.g. ahp.json → ahp_result.json)
ahp.json: {"criteria": ["slope","landcover",...],
           "matrix": [[1,"3","5"],["1/3",1,3],...]}          # full matrix, or
           "pairs": {"slope>landcover": 3, "landcover>soil": "1/2", ...}  # upper triangle only
"""
import json, sys
from fractions import Fraction

RI = {1:0, 2:0, 3:0.58, 4:0.90, 5:1.12, 6:1.24, 7:1.32, 8:1.41, 9:1.45, 10:1.49}  # Saaty
SCALE = [1/9,1/8,1/7,1/6,1/5,1/4,1/3,1/2,1,2,3,4,5,6,7,8,9]

def num(x): return float(Fraction(str(x)))

def build(cfg):
    c = cfg["criteria"]; n = len(c)
    if "matrix" in cfg:
        A = [[num(v) for v in row] for row in cfg["matrix"]]
    else:
        A = [[1.0]*n for _ in range(n)]
        for k, v in cfg["pairs"].items():
            a, b = k.split(">"); i, j = c.index(a.strip()), c.index(b.strip())
            A[i][j] = num(v); A[j][i] = 1 / num(v)
    for i in range(n):
        for j in range(n):
            if abs(A[i][j] * A[j][i] - 1) > 1e-6:
                sys.exit(f"Matrix not reciprocal at ({c[i]},{c[j]}): {A[i][j]} vs {A[j][i]}")
    return c, A

def ahp(A, iters=1000):
    n = len(A); w = [1/n]*n
    for _ in range(iters):  # power iteration → principal eigenvector
        v = [sum(A[i][j]*w[j] for j in range(n)) for i in range(n)]
        s = sum(v); v = [x/s for x in v]
        if max(abs(a-b) for a, b in zip(v, w)) < 1e-12: w = v; break
        w = v
    lam = sum(sum(A[i][j]*w[j] for j in range(n)) / w[i] for i in range(n)) / n
    ci = (lam - n) / (n - 1) if n > 2 else 0.0
    cr = ci / RI[n] if RI.get(n) else 0.0
    return w, lam, ci, cr

def worst_pairs(c, A, w, k=3):
    out = []
    n = len(A)
    for i in range(n):
        for j in range(i+1, n):
            implied = w[i]/w[j]
            dev = max(A[i][j]/implied, implied/A[i][j])
            nearest = min(SCALE, key=lambda s: abs(s - implied) if implied >= 1 else abs(1/s - 1/implied))
            out.append((dev, c[i], c[j], A[i][j], implied, nearest))
    return sorted(out, reverse=True)[:k]

def fmt(x): return str(Fraction(x).limit_denominator(9)) if x < 1 else f"{x:g}"

if __name__ == "__main__":
    cfg = json.load(open(sys.argv[1]))
    c, A = build(cfg)
    w, lam, ci, cr = ahp(A)
    n = len(c)
    print("| Criterion | " + " | ".join(c) + " | Weight |\n|---|" + "---|"*(n+1))
    for i in range(n):
        print(f"| {c[i]} | " + " | ".join(fmt(A[i][j]) for j in range(n)) + f" | {w[i]:.4f} |")
    print(f"\nn = {n}, λmax = {lam:.4f}, CI = {ci:.4f}, RI = {RI.get(n)}, CR = {cr:.4f} → "
          + ("CONSISTENT (CR < 0.10)" if cr < 0.10 else "INCONSISTENT (CR ≥ 0.10): revise judgments"))
    if cr >= 0.10 or "--diagnose" in sys.argv:
        print("\nMost inconsistent judgments (given vs. implied by weights):")
        for dev, a, b, given, implied, near in worst_pairs(c, A, w):
            print(f"- {a} vs {b}: given {fmt(given)}, weights imply {implied:.2f} → try {fmt(near)} (off by ×{dev:.2f})")
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else sys.argv[1].rsplit(".", 1)[0] + "_result.json"
    json.dump({"criteria": c, "weights": dict(zip(c, [round(x, 4) for x in w])),
               "lambda_max": round(lam, 4), "CI": round(ci, 4), "CR": round(cr, 4)},
              open(out, "w"), indent=2)
    print(f"\nSaved {out}")
```

## overlay.py

```python
#!/usr/bin/env python3
"""Weighted overlay + FAO classes + sensitivity. Usage:
  python overlay.py parcels.csv config.json [--out results.csv]
parcels.csv: one row per parcel/grid cell: id, area_ha, <raw criterion columns>, <constraint columns>
config.json: {
  "weights": {"slope": 0.3, ...}   or  "weights_file": "ahp_result.json",
  "criteria": {
     "slope":     {"type": "range", "classes": [[0,8,2],[8,18,3],[18,50,4],[50,999,3]]},   # [min, max) → score 1–4
     "landcover": {"type": "category", "classes": {"grassland":4, "shrubland":4, "cropland":2}}
  },
  "constraints": ["is_builtup", "is_water"],       # 0/1 column truthy → excluded (N, constraint)
  "priority": ["in_river_easement",                # 0/1 column, or a rule on a numeric column:
               {"name": "pd705_slope18", "column": "slope", "min": 18},
               {"name": "pd705_slope50", "column": "slope", "min": 50}],
  "thresholds": {"S1": 3.25, "S2": 2.5, "S3": 1.75}
}
"""
import csv, json, sys

UNMAPPED = {}  # (criterion, value) -> count; reported so typos/new classes don't silently drop out

def reclass(v, rule):
    if v in ("", None): return None
    if rule["type"] == "category":
        key = str(v).strip().lower()
        s = rule["classes"].get(key)
        if s is None: UNMAPPED[(rule.get("_name"), key)] = UNMAPPED.get((rule.get("_name"), key), 0) + 1
        return s
    x = float(v)
    for lo, hi, s in rule["classes"]:
        if lo <= x < hi: return s
    UNMAPPED[(rule.get("_name"), x)] = UNMAPPED.get((rule.get("_name"), x), 0) + 1
    return None

def truthy(v): return str(v).strip().lower() in ("1", "true", "yes", "y")

def hits(r, items):
    """Names of constraint/priority items that apply to row r (0/1 column or numeric rule)."""
    out = []
    for it in items:
        if isinstance(it, str):
            if truthy(r.get(it, "")): out.append(it)
            continue
        v = r.get(it["column"], "")
        if v in ("", None): continue
        x = float(v)
        if x >= it.get("min", float("-inf")) and x < it.get("max", float("inf")): out.append(it["name"])
    return out

def classify(s, t):
    return "S1" if s >= t["S1"] else "S2" if s >= t["S2"] else "S3" if s >= t["S3"] else "N"

def run(rows, cfg, weights):
    t = cfg.get("thresholds", {"S1": 3.25, "S2": 2.5, "S3": 1.75})
    out = []
    for r in rows:
        res = {"id": r["id"], "area_ha": float(r.get("area_ha") or 0)}
        hit = hits(r, cfg.get("constraints", []))
        res["priority"] = ";".join(hits(r, cfg.get("priority", [])))
        if hit:
            res.update(score="", cls="N", n_type="constraint", note="excluded: " + ";".join(hit)); out.append(res); continue
        num = den = 0.0; missing = []
        for name, rule in cfg["criteria"].items():
            s = reclass(r.get(name), rule)
            if s is None: missing.append(name); continue
            num += weights[name] * s; den += weights[name]
        if den == 0:
            res.update(score="", cls="", n_type="", note="no criterion data"); out.append(res); continue
        sc = num / den
        cls = classify(sc, t)
        res.update(score=round(sc, 3), cls=cls, n_type="score" if cls == "N" else "",
                   note=("missing: " + ";".join(missing)) if missing else "")
        out.append(res)
    return out

def summary(out):
    tot = sum(r["area_ha"] for r in out) or 1
    agg = {}
    for r in out:
        k = (r["cls"] + (f" ({r['n_type']})" if r["cls"] == "N" else "")) if r["cls"] else "unscored"
        agg[k] = agg.get(k, 0) + r["area_ha"]
    return {k: (round(v, 2), round(100 * v / tot, 1)) for k, v in sorted(agg.items())}

def perturb(weights, name, pct):
    w = dict(weights); w[name] = max(0.0, w[name] * (1 + pct))
    rest = sum(v for k, v in weights.items() if k != name)
    scale = (1 - w[name]) / rest if rest else 0
    for k in w:
        if k != name: w[k] = weights[k] * scale
    return w

if __name__ == "__main__":
    rows = list(csv.DictReader(open(sys.argv[1], newline="", encoding="utf-8-sig")))
    cfg = json.load(open(sys.argv[2]))
    for k, rule in cfg["criteria"].items(): rule["_name"] = k
    weights = cfg.get("weights") or json.load(open(cfg["weights_file"]))["weights"]
    miss = set(cfg["criteria"]) - set(weights)
    if miss: sys.exit(f"No weight for: {miss}")
    s = sum(weights[k] for k in cfg["criteria"]); weights = {k: weights[k] / s for k in cfg["criteria"]}
    base = run(rows, cfg, weights)
    outp = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else "suitability_results.csv"
    with open(outp, "w", newline="", encoding="utf-8") as f:
        wr = csv.DictWriter(f, fieldnames=["id", "area_ha", "score", "cls", "n_type", "priority", "note"]); wr.writeheader(); wr.writerows(base)
    print(f"Saved {outp}\n\n| Class | Area (ha) | Share |\n|---|---|---|")
    for k, (ha, pc) in summary(base).items(): print(f"| {k} | {ha} | {pc}% |")
    if UNMAPPED:
        print("\nWARNING: values with no reclass rule were treated as missing data. Fix the config or the data:", file=sys.stderr)
        for (crit, val), n in sorted(UNMAPPED.items(), key=lambda x: -x[1]): print(f"  - {crit}: {val!r} ({n} units)", file=sys.stderr)
    pr = {}
    for r in base:
        for p in filter(None, r["priority"].split(";")): pr[p] = pr.get(p, 0) + r["area_ha"]
    if pr:
        print("\n| Priority zone | Area (ha) | of which S1/S2 (ha) |\n|---|---|---|")
        for p, ha in pr.items():
            good = sum(r["area_ha"] for r in base if p in r["priority"].split(";") and r["cls"] in ("S1", "S2"))
            print(f"| {p} | {round(ha, 2)} | {round(good, 2)} |")
    print("\nSensitivity: share of area (and number of units) changing class when one weight moves, others rescaled:")
    print("| Criterion | −20% | −10% | +10% | +20% |\n|---|---|---|---|---|")
    tot = sum(r["area_ha"] for r in base) or 1
    for name in cfg["criteria"]:
        cells = []
        for pct in (-0.2, -0.1, 0.1, 0.2):
            alt = run(rows, cfg, perturb(weights, name, pct))
            flips = [a for a, b in zip(base, alt) if a["cls"] != b["cls"]]
            cells.append(f"{100 * sum(a['area_ha'] for a in flips) / tot:.1f}% ({len(flips)})")
        print(f"| {name} | " + " | ".join(cells) + " |")
```