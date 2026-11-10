# How to use TerraSpec

Source: the TerraSpec system itself (its screens and features). Cite as [TerraSpec guide].

## Who can use what
- The public can use every screen except Reports and Admin. Click "LGU Admin" at the top right to sign in as City Planning and Development Office (CPDO) staff.
- Staff accounts are admin or planner. Both can open Reports and Admin; only an admin manages user accounts. A new or reset account must change its password at first sign-in.

## Dashboard
- Shows the top suitability scores, the best land use per barangay, environmental restrictions, mangrove species, a map overview and recent AI questions. "Open Map" and "Open Chat" lead to the Map Viewer and the AI Assistant.

## Map Viewer
- Layers panel (left; on a phone it starts folded, tap "Layers" to open it): choose the basemap (Street, Satellite, Light) and the view (Zoning, Flood, Landslide, Suitability, Reforestation), and switch layers on or off: zoning ordinance, suitability, landslide hazard, flood hazard, barangay names, mangrove sites. Click a legend entry to hide or show that class.
- Search (top bar): type a barangay name and pick it to fly to it.
- Click any point on the map to see its barangay, zoning class, mangrove site details if any, and the barangay's suitability scores; "View barangay profile" opens its profile.
- Ask the map (bar at the top): type a plain-language question such as "agricultural land in very high flood areas in Dapco"; the AI turns it into map filters and runs a zoning query. The x button hides the bar; "Ask the map" brings it back.
- Zoning query (button at the bottom, or a preset: Residential, Commercial, Mangrove, Built-up zones in flood): pick zoning classes, barangays (empty = all 40), a hazard condition (all land in the zone, very high flood only, high landslide only, or outside both) and an optional minimum area, then "Run query". It shows the total hectares, the number of barangays and a breakdown by zone and by barangay; click a barangay to zoom to it, and "CSV" downloads the result.
- Minimum area hides result rows (one zoning class in one barangay) smaller than the number of hectares typed; leave it empty to see every row.

## Suitability
- Choose a land use: commercial, residential, industrial, agricultural or reforestation. TerraSpec ranks the barangays with the AHP-Weighted Linear Combination (AHP-WLC) after removing constrained land, and shows each barangay's score, suitability level and criteria breakdown.
- Method comparison compares AHP-WLC with AHP-TOPSIS, EWM-WLC and EWM-TOPSIS (rank shift, same level, shared top 5). Sensitivity analysis shows how the ranking changes when a criterion's weight changes.
- The report button opens a printable Land Suitability Analysis Report.

## Barangay Profiles
- Pick a barangay to see its land use and zoning, usable land, hazard flags (flood, landslide, liquefaction), environmental restrictions, soil types, suitability by land use and its mangrove reforestation sites. "Show on map" opens it in the Map Viewer.

## Environmental
- Barangays with high flood, landslide and liquefaction susceptibility, the environmental restrictions with their barangays, hazards per barangay in hectares, and the CLUP sub-watersheds. "Export Report" downloads a PDF.

## Reforestation
- Select a barangay to see its zone parameters (elevation, salinity, soil), restrictions and the matched mangrove species; a reforestation plan PDF can be generated. The mangrove sites section lists the rehabilitated, adopted and proposed sites and checks TerraSpec's results against them.

## AI Assistant
- Ask questions in plain language. Conversations are saved in this browser only, not on the server; pin, rename or delete them. A guest's "Chat ID" (Copy Chat ID) reopens that guest's saved conversations later in the same browser. The NLP Inspector shows the detected intent, the barangays and land uses found in the question, and a live AHP-WLC result.

## Reports (staff only)
- Report Builder: choose a report type, a barangay or all barangays (city-wide), a land use and the sections to include, then "Generate PDF". Report Archive lists past reports; each can be generated again with current data.

## Admin (staff only)
- Edit barangay (zone) data, environmental restrictions and mangrove species. Set the AHP criteria weights with the pairwise comparison matrix (Saaty scale); TerraSpec checks the consistency ratio before the weights can be applied. Admins also manage user accounts.
