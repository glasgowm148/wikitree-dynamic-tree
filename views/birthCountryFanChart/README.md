# Birth Country Fan Chart

Listed as **Fan Chart: Birth Country** beside **Fan Chart**, with registry ID `fanChartBirthCountry`;
API app ID `BirthCountryFanChart`. Existing `birthCountryFan` links and saved view selections migrate to the new ID.
Plain JavaScript modules, CSS and SVG; no framework, installation or build step.
Merged-profile redirects in API results resolve to the canonical profile ID; paged loads continue with
that ID. Failed requests and missing redirect targets still show an error.

## Launch locally with the real API

From the repository root:

```sh
python3 views/birthCountryFanChart/dev_server.py
```

Open:

<http://127.0.0.1:8765/#name=Stuart-1&view=fanChartBirthCountry&generations=7&infer=0&names=full>

Other public test IDs: `Swift-1107` (Jonathan Swift, Ireland), `Churchill-1` (John Churchill, England).
Enter any accessible WikiTree ID in the main ID field and click **GO**.

The development server serves the actual Tree Apps index and injects a local `API_URL` only into its response.
The view calls the unchanged `WikiTreeAPI.getPeople` helper. The local POST bridge forwards public requests
to the real WikiTree API, avoiding browser CORS restrictions. It binds only to `127.0.0.1`, forwards no
cookies or login tokens, and supports only `getPerson` / `getPeople`. Use `--port 8766` if the port is busy.
Stop with Ctrl+C. A plain static server also works for fixture testing, but real API requests may fail CORS.

The browser needs internet access for Tree Apps' existing external scripts/styles. The upstream
`wikibits.js` script currently reports `stylepath is not defined` locally; this also occurs in the upstream
page and did not prevent the new view from loading.

## Test on the WikiTree Apps Server

Upload this checkout to your existing Apps Server test directory, including `index.html`, `index.js`,
`WikiTreeAPI.js`, `tree.js`, the shared libraries and `views/birthCountryFanChart/`.
Do not upload `.git`, local browser output or the development server script. If updating an existing current
Tree Apps checkout, copy the app folder and add its module/stylesheet includes and registry entry
from this branch’s `index.html` and `index.js`.

Open `https://apps.wikitree.com/apps/YOUR-DIRECTORY/` with:

```text
#name=Stuart-1&view=fanChartBirthCountry&generations=7&infer=0&names=full
```

Select **Birth Country Fan Chart**, enter a WikiTree ID, click **GO**. Public profiles require no login.
For permitted private profiles, use the framework's **Apps Login** on Apps Server; the production API wrapper
retains its normal credential handling. The API determines which data is accessible. Redacted profiles use
API-derived private names and retain their negative internal IDs; no artificial WikiTree links are created.
The API can withhold a public ancestor's name and ID when the tree starts at a restricted profile.
Nameless placeholders display **Name withheld**, not **Private**.
**BirthNamePrivate** is a derived name field, not evidence of a private profile.
Apps API login is separate from signing into the WikiTree website;
the anonymous local bridge cannot use that login. Use Apps Login on Apps Server for family details your
account can access.

No Apps Server upload or authenticated private-profile test was performed in this workspace.
An Apps Server account/test directory and a permitted private profile are needed for that final check.

## Controls and behaviour

- **Group by:** Country (default), Continent, or Region. Changes chart colours, legend and whole-tree/branch
  shares without reloading the API. Tooltips retain the recorded location and resolved country.
- **Ancestor generations:** 4–8 (parents are generation 1; root is shown separately); default 7.
  At depth 8 there are at most 511 slots including the root, below the API's 1000-related-profile page limit.
- **Names:** full names, surname at birth (current surname fallback), or off. Long chart labels are truncated;
  tooltips retain the full API-derived name. No labels are generated in off mode.
- **Fill unknowns from child:** recursively fills genuinely missing birth locations and absent ancestor slots
  from the nearest known descendant on that slot's path to the root. Does not overwrite unrecognised recorded text.
- The chart automatically fits the available space.
- **Screenshot view:** hides the Tree Apps navigation, chart controls and help buttons, fits the chart,
  and resets the share panel to the whole tree. Press Escape to return, or hover/focus the screenshot
  button to exit. This mode is temporary and is not saved in the URL.
- A profile heading includes name, life years and a compact settings summary. Colour-key explanations,
  geographic classification and share methodology are available through the small **i** toggles.
  Successful load counts stay
  available to screen readers without adding visible chart text.
- **Legend:** every recognised country has a distinct, stable colour. Scotland stays blue, England red and Ireland (including Northern Ireland) green. Wales is gold; Other grey; Unknown white.
  Only countries present in the tree appear in the legend. Country buttons dim matching wedges without changing percentage calculations. The share panel lists nonzero contributions.
- Options sit in a compact toolbar above the chart, the colour legend sits on the right, and the share panel sits below the chart.
  Longer country lists wrap below the chart so the complete colour key remains visible.
  Narrow screens stack panels. Dashed wedge outlines and tooltip provenance mark inferred values.
- Wedges show full name, WikiTree ID, birth and death years, original birth location, resolved country, explicit/inferred/unresolved
  status and the branch's ancestral birth-country share. Missing slots also have hover information.
  Years preserve recorded about/before/after qualifiers and decade-only values; unavailable years show Unknown.
  Named profiles open WikiTree in a new tab on click or Enter/Space. Escape dismisses the tooltip.
- `close()` removes the app DOM and host class, aborts all app listeners, and invalidates pending responses.
  It also exits screenshot view when switching Tree Apps, and cleans up when reinitialised for another profile.
  The standard WikiTree navigation and page styles are preserved.

Accepted shareable hash parameters: `generations=4..8`, `infer=0|1`, `names=full|surname|off`,
`group=country|continent|region`.
Settings persist in app-specific local storage. URL parameters override saved settings.

## Geographic grouping

Modern countries and areas use a bundled snapshot of the [UN M49 geographic scheme](https://unstats.un.org/unsd/methodology/m49/),
retrieved 28 September 2026. Regions use the most specific geographic level, including Northern/Western/
Eastern/Southern Europe, Central/Eastern/Southern/South-eastern/Western Asia, the African regions,
Northern America, Central America, Caribbean, South America, and the Pacific regions.

Continent mode uses Africa, Asia, Europe, North America, South America, Oceania and Antarctica. This adapts
M49's Americas into North and South America; Caribbean and Central America belong to North America.
UK constituent countries and Ireland are Northern Europe. Russia is Eastern Europe; Turkey and Cyprus
are Western Asia. Territories follow their geographic location, e.g. French Guiana is South America.
Taiwan uses Eastern Asia, as a geographic extension for the existing catalogue.

Historical extensions cover common recorded states. Prussia and the Holy Roman Empire group into Europe,
with **Europe (region unspecified)** in Region mode because they span modern regions. Unassigned
historical places remain Other. This is geographic grouping of recorded birthplaces, not an ethnic label
or reconstruction of historical borders. All 196 names in the existing modern-country catalogue have mappings.

Grouping follows resolved/inferred country values and preserves slot weights and inference provenance.
A recorded UK-only location can be assigned to Europe/Northern Europe even when its constituent country
is unresolved. Genuinely missing places remain Unknown. Every group has a stable colour; dimming groups
does not affect shares. Switching back to Country restores the individual country categories.

## Country normalisation

`countryModel.js` reuses `Utils.settingsStyleLocation(location, "Country")` as a parsing hint and applies
case/accent/punctuation normalisation, home-country names, historic county names and common cities.
The normaliser also reuses the existing `views/oneNameTrees/location_data.js` country catalogue, native names, aliases and historical-country names, supplemented by all 277 country/area labels in `geographyData.js`.
It recognises selected historical/native variants, country suffixes without commas, parenthetical country annotations and contextual US/Canadian state/province abbreviations. A recognised historical label takes priority over its modern annotation. Recognised countries and territories retain their own categories. Foreign country/region suffixes take precedence over ambiguous British place names, e.g. London, Ontario,
Canada resolves to Canada. Wales and Welsh counties resolve to Wales. Historical labels such as Prussia and the Holy Roman Empire stay separate; Unknown single place names remain
Unknown; the normaliser is deliberately a finite rule set, not a worldwide geocoder.

United Kingdom / UK / Great Britain is an internal unresolved value, never a legend or share category.
A UK-only slot inherits Scotland, England or Ireland from the nearest child with a specific country,
even with the optional missing-location toggle off. It cannot inherit an unsupported UK constituent country from a child born elsewhere, such as France. UK-only inference remains restricted to Scotland, England and Ireland. The original location and
source slot remain available separately from the inferred display country. The same repeated profile
can therefore receive different inferred countries in different genealogical slots.

## Ancestral birth-country share

This is a genealogical slot measure, not ethnicity or a genetic estimate.
Each parent branch has half the root's weight; each grandparent has one quarter; each great-grandparent
has one eighth. Only terminal slots at the selected depth represent countries, so intermediate generations
are not added together. Missing branches contribute their full remaining weight to Unknown, unless the
optional inference fills them. Known ancestors with missing parents do not automatically stand in for
those parents when the toggle is off. Root birth country is excluded from the ancestry share, except as
an inference source when enabled.

Pedigree collapse preserves every occurrence; no calculation uses a unique-profile count. The share
of a hovered branch is relative to that branch (its weights total 100%). Every model share totals 100%;
formatted display values can differ by a few hundredths of a percentage point from rounding.

## Checks

Use Node.js 22.7 or newer (automatic detection of the repository’s ES modules).

```sh
node --test views/birthCountryFanChart/tests/*.test.mjs
node --check views/birthCountryFanChart/countryModel.js
node --check views/birthCountryFanChart/countryColours.js
node --check views/birthCountryFanChart/BirthCountryFanChartView.js
node --check index.js
npx prettier --check "views/birthCountryFanChart/**/*.{js,mjs,css,html,md}"
```

Open <http://127.0.0.1:8765/views/birthCountryFanChart/tests/fixture.html> for a small interactive fixture.
It covers Scotland, Ireland, England, UK-only, Wales, missing profiles and pedigree collapse.

Browser checklist:

1. Test `Stuart-1`, `Swift-1107` and `Churchill-1` on the integrated page without login.
2. Change depths 4 and 8; check complete chart and shares totalling approximately 100%.
3. Toggle inference; check Unknown decreases only for eligible missing values, with dashed outlines.
4. Switch all name modes; hover a wedge and a missing slot. Check tooltip location/provenance/branch shares.
5. Click a profile (and activate via keyboard); confirm its WikiTree page opens.
6. Toggle country dimming; confirm shares remain unchanged. Check chart fit and a narrow viewport.
7. Switch to another Tree App and back; check old tooltip, listeners and host class disappear.
8. On Apps Server, login and repeat with a permitted private profile. Confirm redacted names have no fake links.

See `TESTING.md` for the actual verification results.

## Contribution checklist

Reviewed against `docs/contributing.md` and `docs/codestyle.md`.

- View code and styles live in `views/birthCountryFanChart/`. File naming follows the existing Tree Apps convention.
- `meta()`, `init()` and `close()` implement the framework contract; URL options are declared in `meta().params`.
- The module and stylesheet are included in the root HTML head; `index.js` registers the view.
- Shared framework files, API authentication and normal WikiTree navigation styles are unchanged.
- Screenshot mode restores its temporary global state on exit or when switching views. App listeners and stale responses are cleaned up.
- New JavaScript, CSS, HTML and Markdown follow the repository's Prettier configuration. No runtime dependencies or build step are added.
- Local real-API tests use the loopback public-data bridge; authenticated access needs testing on Apps Server.
- Work is on the `birth-country-fan-chart` branch. Use `origin` for your GitHub fork and `upstream` for the WikiTree repository; submit a pull request from this feature branch to upstream `main`.

Apps Server deployment, authenticated/private-profile verification and a pull request are still outstanding.
The guide permits local development; hosting and community announcements are optional sharing steps.

## Acknowledgements

The **About this chart and credits** info button acknowledges the original Fan Chart tree app:

- Original author: [Greg Clarke](https://www.wikitree.com/wiki/Clarke-11007).
- Additional programming: [Jonathan Duke](https://www.wikitree.com/wiki/Duke-5773).
- Assistance and code borrowed from: Rob Pavey, Kay Knight, Riel Smit and Ian Beacall.

These roles reproduce the original Fan Chart's acknowledgements in `views/fanChart/FanChartView.js`.
The Birth Country Fan Chart has its own SVG renderer and country/share model. It uses the shared Tree
Apps framework and API wrapper, `views/shared/Utils.js`, and the country catalogue in
`views/oneNameTrees/location_data.js`; thanks also to those contributors. The repository's existing
MIT license and copyright notice remain included.

Redirected-profile handling follows [udjeni's Fan Chart improvement in PR #417](https://github.com/wikitree/wikitree-dynamic-tree/commit/9adf3eb1c8c0d6de2d5e90acf3c172e30557fc6f),
adapted locally in `countryModel.js`. This does not require changes to shared framework files.
