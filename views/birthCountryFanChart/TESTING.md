# Verification — 28 September 2026

Upstream baseline: `wikitree/wikitree-dynamic-tree` main, commit `ad6f056` (shallow checkout).
Working branch: `birth-country-fan-chart`. Changes remain uncommitted.

## Automated checks

- **58 Node tests passed**, 0 failed. Includes common/historic location names, overseas disambiguation,
  UK-only inference independent of the optional toggle, recursive missing-location inference, per-slot
  provenance, 50/25/12.5% weights, repeated profiles, negative private IDs, full/surname/off labels,
  all branch shares summing to 100% at depths 4–8, API errors, paging offsets and stale responses.
- `node --check`: view, country model and `index.js` passed.
- Python AST syntax check: local development server passed.
- `git diff --check`: passed.
- `integration.patch`: `git apply --check` passed against the clean upstream checkout.
  This patch is already applied in the working folder.

## Real API and integrated browser checks

Playwright-controlled Chromium, using the actual Tree Apps registry and `WikiTreeAPI.getPeople`.
A local public-request bridge forwarded the unchanged helper's calls to `https://api.wikitree.com/api.php`.
No mocked responses in these checks.

| Profile     | Ancestor depth | API profiles | Occupied genealogical slots | Result                                                 |
| ----------- | -------------: | -----------: | --------------------------: | ------------------------------------------------------ |
| Swift-1107  |              7 |           40 |                          40 | Loaded; shares total 100%                              |
| Churchill-1 |              4 |           29 |                          29 | Loaded; shares total 100%                              |
| Stuart-1    |              8 |          307 |                         489 | Loaded; pedigree collapse preserved; shares total 100% |

Also passed:

- Rendering all 31, 255 and 511 slots at 4, 7 and 8 ancestor generations respectively.
- Changing depth reloads API data; existing data clears during loading.
- Inference reduces eligible Unknown share; name-off mode removes all SVG labels.
- Large chart size scrolls within the chart area.
- Controls, legend and percentages do not intersect the chart at 1600px or 390px viewport widths.
- Switching from this chart to the existing Ahnentafel app and back cleans up DOM, host class and both
  listener controllers, then creates exactly one new chart.
- Narrow layout allows scrolling to the complete ancestry-share panel.

`Burns-2` returned `Ancestor/Descendant permission denied.` and the chart displayed the API error.
This is why the documented example uses `Stuart-1`.

## Fixture browser checks

The interactive fixture uses the real framework View class with a fixture-only `getPeople` response.
Thirteen assertions passed: slot count; always-on UK inference; 50% Ireland / 25% England / 25% Other
when filled; surname and off modes; dimming with unchanged shares; missing-slot tooltip with provenance
and branch share; tooltip viewport bounds; Escape; keyboard focus; correct WikiTree popup on Enter;
and close while awaiting an API response (no stale DOM restoration).

The decorative switch initially intercepted direct checkbox clicks. Adding `pointer-events: none` to
the switch graphic fixed it; the same browser check then passed.

## Remaining deployment checks

Authenticated private-profile access and upload to the WikiTree Apps Server were not performed.
The app uses the existing credential-bearing API wrapper in production; private/redacted model handling
is covered with fixtures. Test actual access via **Apps Login** on Apps Server with a profile your account
can view. The local public-only bridge deliberately does not support login.

Country rules are a finite normaliser, not a geocoder. Unrecognised single location names remain Unknown.
Additional regional aliases can be added to `countryModel.js` with regression cases.

The upstream external `wikibits.js` reports `stylepath is not defined` locally; it did not block chart
loading or the existing Ahnentafel view. No shared framework/library files were changed to suppress it.

Screenshots are local development artifacts under `output/playwright/`, excluded from the upstream patch.

## Expanded country palette follow-up

The palette now assigns a stable colour to every recognised country, retaining the original Scotland,
England and Ireland colours. Wales, France, Germany and other countries have separate legend entries,
percentage contributions and tooltip labels. Prussia and the Holy Roman Empire retain historical labels.
Country recognition reuses the existing `oneNameTrees/location_data.js` catalogue with native names and aliases.

**81 Node tests pass**, including distinct colours for all catalogue countries, bright/dark label contrast,
non-English aliases, historical-country names, foreign-state disambiguation, named-country inference and shares.
Fixture expectations now use Wales for the Welsh 25% branch rather than Other.

Expanded-palette browser checks passed on the real `Stuart-1` tree: named modern/historical legend entries,
unique displayed fills, dynamic country dimming surviving inference, unchanged shares after dimming,
France in the tooltip, France/Germany in the share panel, shares totalling 100%, and no panel overlap.
The 13 fixture browser checks passed again with the new Welsh category. The user's existing in-app chart
was refreshed and its expanded legend verified, preserving the selected inference setting.

## Withheld names follow-up

**84 Node tests pass**. New cases distinguish nameless public placeholders from actual privacy settings,
preserve API-derived names, and avoid treating `BirthNamePrivate` as a privacy flag.

Real anonymous API and in-app browser checks:

- `Glasgow-933`: 168 ancestor records returned, including negative-ID placeholders whose returned privacy
  is Public. Names now show **Name withheld** in both name modes. The tooltip reports **Withheld by API**
  for the WikiTree ID and **Public** for the returned privacy setting. The local anonymous-access note appears.
- `Glasgow-936`: a direct request returns John Clarkson Glasgow II with privacy Public. Starting the chart
  there loads 36 records, displays his name and clears the access note.
- `getAncestors` returns the same masking from the restricted root; it is deprecated and not a solution.

These changes correct misleading labels. They cannot recover names omitted from the API response.
Authenticated Apps Server access remains untested; the local bridge intentionally forwards no credentials.

## Hover years follow-up

Removed the privacy setting from tooltips and stopped requesting the unused privacy field.
Tooltips now show birth and death years, preserving about/before/after qualifiers and decade-only values.
Unavailable years display Unknown; unknown ancestor slots do not show a dates row.

**84 Node tests pass**, including precise years, year-only dates, zero/absent dates, decade-only dates and
date uncertainty. In the real in-app `Stuart-1` chart, Alan Stewart's tooltip showed
**Born: about 1410 · Died: 1439**, with no privacy line. Existing surname and inference selections were preserved.

## Geographic grouping follow-up

**91 Node tests pass**. New coverage includes all 196 catalogue-country mappings; regional conventions
and geographically assigned territories; broad historical labels; separate Other/Unknown; UK-only
geographic resolution; weighted shares with repeated ancestors; preserved inference; every branch totalling
100% at depths 4, 7 and 8; and distinct colours within both geographic modes.

Real `Stuart-1` in-app browser checks: Country/Continent/Region dropdown; changed wedge colours, legend and
shares; country/location/years retained in tooltips; regional dimming with unchanged percentages; and
saved group selection. The region tooltip for Alan Stewart shows Scotland, Northern Europe and the same
birth/death years. Names and inference selections are preserved.

## Presentation redesign follow-up

**91 Node tests still pass**; view syntax and whitespace checks pass.

The chart now has a profile heading and life years, compact controls, quiet panels, and help toggles
instead of permanent explanation paragraphs. The shared WikiTree navigation retains its original
styles. Long country legends wrap below the chart.

In-app browser verification:

- Region explanation is hidden initially, opens with its info toggle, and closes with Escape.
- Screenshot view hides controls and help, fits a previously large chart and resets the shares to the
  whole tree. Escape restores editing and the previous 1600px chart size.
- Real `Stuart-1` layout checked with 8 generations and names off. Profile title and years are present;
  successful API load counts are not visible. Current user settings were preserved.
- At 390px width the chart toolbar uses two columns, panels stack,
  and the help popover fits horizontally within the viewport. The temporary viewport override was cleared.
- All 28 legend entries in the depth-8 Country view remain visible without a scrolling colour key.
- Switching to Ahnentafel exits screenshot view and removes the chart host class.

### Shared-page correction

Removed the shared navigation/page style overrides and the entire names-unavailable notice, including
its rendering logic. The chart presentation remains scoped to the app; screenshot view temporarily
hides navigation only while explicitly enabled.

Verified the refreshed `Stuart-1` page shows the original WikiTree logo, Tree App selector, ID field,
yellow GO button and Apps Login. The notice elements are absent. All 91 tests and syntax/whitespace
checks pass; the current generation/name/group settings are preserved.

## Contribution guide review

The supplied guide matches the repository's `docs/contributing.md`. Reviewed the view lifecycle,
metadata/URL parameters, head includes, registry entry, module/global naming, API integration and CORS
approach. Corrected seven files with Prettier using the root `.prettierrc`, and named presentation/loading
booleans with `is` prefixes. Shared framework code and ordinary navigation styling remain unchanged.

External checks still pending: deployment to an Apps Server test directory and authenticated access to
a permitted private profile. The branch exists locally; `origin` is upstream, so contribution should be
submitted through the user's GitHub fork. No upload, account change or pull request was performed.

Review verification: all 91 Node tests pass; all view/test JavaScript and `index.js` pass syntax checks.
Prettier reports all new JavaScript, CSS, HTML and Markdown formatted correctly. All 17 relative imports
resolve with exact filename casing, and the integration patch matches the root includes/registry changes.
Browser fixture loaded successfully; Screenshot view hides controls and Escape restores controls and
removes its body class. The temporary test tab was closed.

## Redirected-profile follow-up

Added five regression tests before implementing redirect support. The old loader failed the successful
redirect, surname-key spelling, redirect pagination and missing-target error tests. The complete suite
now passes **96 tests**. Tests use the documented `Hofmeyr-85` to `Hofmeijer-7` response pattern from
PR #417, covering both numeric and WikiTree IDs, canonical root/parent slots, space/underscore keys,
continuation-page keys and offsets, invalid IDs and missing targets. Existing permission-error and
stale-request tests continue to pass.

The implementation is confined to the birthplace view's API loader. Shared API/framework code and
profile-privacy behaviour are unchanged.

## Fork setup

Created the `glasgowm148/wikitree-dynamic-tree` GitHub fork of `wikitree/wikitree-dynamic-tree`.
The local checkout uses `origin` for the fork and `upstream` for the WikiTree repository.
The feature branch is `birth-country-fan-chart`. Hosted Apps Server and authenticated private-profile
verification remain pending while the account request is awaiting a response.
