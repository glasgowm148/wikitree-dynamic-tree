import {
    buildCountryModel,
    fetchAncestors,
    fullName,
    personLabel,
    identityWithheld,
    eventYear,
    emptyMix,
    COUNTRIES,
} from "./countryModel.js";
import { countryTextColour, countryStyle, patternMarkup, swatchStyle } from "./countryColours.js";
import { GROUPINGS } from "./geography.js";
import { FIT_VIEW, constrainView, zoomView, pinchView, parentComparison, reviewBirthplaces } from "./chartTools.js";
import { createChartExport, exportPng, downloadBlob } from "./chartExport.js";

window.BirthCountryFanChartView = class BirthCountryFanChartView extends View {
    static APP_ID = "BirthCountryFanChart";
    static STORAGE_KEY = "wt_birth_country_fan_chart_settings";

    meta() {
        return {
            title: "Fan Chart: Birth Country",
            description:
                "Visualises ancestral birth countries and genealogical slot-weighted ancestral birth-country share, with optional inference for missing locations.",
            docs: "views/birthCountryFanChart/README.md",
            params: ["generations", "infer", "names", "group", "patterns"],
        };
    }

    init(containerSelector, personId, params = {}) {
        this.close();

        this.container = document.querySelector(containerSelector);
        this.personId = Number(personId);
        this.requestSerial = (this.requestSerial || 0) + 1;
        this.countries = [...COUNTRIES];
        this.hiddenCountries = new Set();
        this.visibleCountries = new Set(this.countries);
        this.settings = this._loadSettings(params);
        this.isPresenting = false;
        this.isComparing = false;
        this.isReviewing = false;
        this.isExporting = false;
        this.viewState = { ...FIT_VIEW };
        this.pointers = new Map();
        this.isDragging = false;
        this.suppressClicksUntil = 0;
        this.peopleById = {};
        this.slots = new Map();
        this.overallMix = this._emptyMix();

        if (!this.container) {
            throw new ViewError("Birth Country Fan Chart could not find its view container.");
        }

        this.container.classList.add("bcfc-view-host");
        this.events = new AbortController();
        this._renderShell();
        this.app = this.container.querySelector(".bcfc-app");
        this._renderCountryPanels();
        this._bindControls();
        this._syncControls();
        this._loadData();
    }

    close() {
        this.requestSerial = (this.requestSerial || 0) + 1;
        this.events?.abort();
        this.chartEvents?.abort();
        document.body.classList.remove("bcfc-presenting");
        this.app?.remove();
        this.app = null;
        this.model = null;
        if (this.container) {
            this.container.classList.remove("bcfc-view-host");
        }
        this.container = null;
        this.peopleById = {};
        this.slots = new Map();
    }

    _loadSettings(params) {
        let stored = {};
        try {
            stored = JSON.parse(localStorage.getItem(BirthCountryFanChartView.STORAGE_KEY) || "{}") || {};
        } catch (e) {
            stored = {};
        }

        const paramGenerations = Number(params.generations);
        const savedGenerations = Number(stored.generations);
        const generations = Math.round(
            this._clamp(
                Number.isFinite(paramGenerations) && paramGenerations ? paramGenerations : savedGenerations || 7,
                4,
                8
            )
        );

        const inferFromParam = params.infer === "1" || params.infer === "true";
        const infer = params.infer !== undefined ? inferFromParam : Boolean(stored.infer);

        const modes = ["full", "surname", "off"];
        const names = modes.includes(params.names)
            ? params.names
            : modes.includes(stored.names)
              ? stored.names
              : "full";

        const grouping = Object.hasOwn(GROUPINGS, params.group)
            ? params.group
            : Object.hasOwn(GROUPINGS, stored.group)
              ? stored.group
              : "country";
        const patterns = params.patterns !== undefined ? params.patterns === "1" : Boolean(stored.patterns);
        return { generations, infer, names, group: grouping, patterns };
    }

    _saveSettings() {
        try {
            localStorage.setItem(BirthCountryFanChartView.STORAGE_KEY, JSON.stringify(this.settings));
        } catch (e) {
            // localStorage can be unavailable in hardened/private browsing contexts. The app still works.
        }
        this._syncUrlParams();
    }

    _syncUrlParams() {
        try {
            const hash = new URLSearchParams(window.location.hash.slice(1));
            hash.set("generations", String(this.settings.generations));
            hash.set("infer", this.settings.infer ? "1" : "0");
            hash.set("names", this.settings.names);
            hash.set("group", this.settings.group);
            if (this.settings.patterns) hash.set("patterns", "1");
            else hash.delete("patterns");
            history.replaceState("", "", `${window.location.pathname}${window.location.search}#${hash.toString()}`);
        } catch (e) {
            // Sharing settings in the URL is convenient but not required for rendering.
        }
    }

    _renderShell() {
        this.container.innerHTML = `
            <section class="bcfc-app" aria-label="Birth Country Fan Chart">
                <div class="bcfc-canvas-wrap">
                    <header class="bcfc-hero">
                        <div>
                            <div class="bcfc-heading-meta">
                                <p class="bcfc-eyebrow">WikiTree · Birthplace ancestry</p>
                                <details class="bcfc-info bcfc-about">
                                    <summary title="About this chart and credits"><span aria-hidden="true">i</span><span class="bcfc-sr-only">About this chart and credits</span></summary>
                                    <div class="bcfc-info-popover">
                                        <strong>Acknowledgements</strong>
                                        <p>With thanks to the original Fan Chart tree app:</p>
                                        <p>Original author: <a href="https://www.wikitree.com/wiki/Clarke-11007" target="_blank" rel="noopener noreferrer">Greg Clarke</a><br>
                                        Additional programming by: <a href="https://www.wikitree.com/wiki/Duke-5773" target="_blank" rel="noopener noreferrer">Jonathan Duke</a><br>
                                        Assistance and code borrowed from: Rob Pavey, Kay Knight, Riel Smit &amp; Ian Beacall.</p>
                                        <p>This birthplace view also uses the shared WikiTree Tree Apps framework, location utilities and country catalogue. Thanks to their contributors.</p>
                                        <p>The patterned geographic palette uses colours by <a href="https://jfly.uni-koeln.de/color/" target="_blank" rel="noopener noreferrer">Masataka Okabe and Kei Ito</a>.</p>
                                    </div>
                                </details>
                            </div>
                            <h1><span id="bcfc-profile-title">Your family tree</span> <span id="bcfc-profile-years" class="bcfc-profile-years" hidden></span></h1>
                            <p id="bcfc-profile-meta" class="bcfc-profile-meta"></p>
                        </div>
                        <div class="bcfc-header-actions">
                            <details class="bcfc-action-menu" id="bcfc-tools-menu">
                                <summary>Tools</summary>
                                <div class="bcfc-menu-panel">
                                    <label><input id="bcfc-compare" type="checkbox"> Compare parents</label>
                                    <label><input id="bcfc-review-toggle" type="checkbox"> Review birthplaces</label>
                                    <label><input id="bcfc-pattern-toggle" type="checkbox"> Patterned groups</label>
                                    <p>Patterns apply to regions and continents.</p>
                                    <p id="bcfc-navigation-help">Wheel or pinch to zoom; drag to pan. With the chart focused, use +/− to zoom, arrow keys to pan and 0 to reset.</p>
                                </div>
                            </details>
                            <details class="bcfc-action-menu" id="bcfc-export-menu">
                                <summary>Export</summary>
                                <div class="bcfc-menu-panel">
                                    <button type="button" data-export="png">Download PNG</button>
                                    <button type="button" data-export="svg">Download SVG</button>
                                    <button id="bcfc-present" type="button" aria-pressed="false"><span>Screenshot view</span></button>
                                    <p id="bcfc-export-status" role="status" aria-live="polite" hidden></p>
                                </div>
                            </details>
                        </div>
                    </header>
                    <section class="bcfc-panel bcfc-controls" aria-label="Chart options">
                        <div class="bcfc-options">
                            <label class="bcfc-select-row" for="bcfc-group">
                                <span>Group by</span>
                                <select id="bcfc-group">${Object.entries(GROUPINGS)
                                    .map(([value, label]) => `<option value="${value}">${label}</option>`)
                                    .join("")}</select>
                            </label>
                            <label class="bcfc-select-row" for="bcfc-generations">
                                <span>Generations</span>
                                <select id="bcfc-generations">${[4, 5, 6, 7, 8].map((n) => `<option value="${n}">${n}</option>`).join("")}</select>
                            </label>
                            <label class="bcfc-select-row" for="bcfc-names">
                                <span>Names</span>
                                <select id="bcfc-names">
                                    <option value="full">Full names</option>
                                    <option value="surname">Surnames only</option>
                                    <option value="off">Names off</option>
                                </select>
                            </label>
                            <label class="bcfc-switch-row" for="bcfc-infer" title="Fill missing birthplaces from the nearest known child. Dashed outlines mark inferred values.">
                                <input id="bcfc-infer" type="checkbox" aria-describedby="bcfc-infer-help">
                                <span class="bcfc-switch" aria-hidden="true"></span>
                                <span class="bcfc-switch-copy"><strong>Fill unknowns</strong></span>
                            </label>
                            <span id="bcfc-infer-help" class="bcfc-sr-only">Fill missing birthplaces and ancestor slots from the nearest known child. Dashed outlines mark inferred values.</span>
                        </div>
                        <div id="bcfc-status" class="bcfc-status" role="status" aria-live="polite"></div>
                    </section>
                    <div class="bcfc-chart-area">
                        <svg id="bcfc-svg" viewBox="0 0 1600 870" role="group" tabindex="0" aria-describedby="bcfc-navigation-help" aria-label="Ancestor fan chart coloured by birth country">
                            <defs id="bcfc-patterns"></defs>
                            <g id="bcfc-viewport"><g id="bcfc-chart"></g></g>
                        </svg>
                        <div class="bcfc-chart-navigation" aria-label="Chart navigation">
                            <button type="button" data-zoom="1.3" aria-label="Zoom in">+</button>
                            <button type="button" data-zoom="0.769230769" aria-label="Zoom out">−</button>
                            <button type="button" id="bcfc-reset-view" hidden>Reset view</button>
                        </div>
                    </div>
                    <aside class="bcfc-panel bcfc-country-legend" aria-label="Birth country colour key">
                        <div class="bcfc-section-heading">
                            <h2>Birth country</h2>
                            <details class="bcfc-info">
                                <summary title="About the colour key"><span aria-hidden="true">i</span><span class="bcfc-sr-only">About the colour key</span></summary>
                                <div class="bcfc-info-popover">
                                    <strong>Reading the colours</strong>
                                    <p id="bcfc-grouping-note" hidden></p>
                                    <p>Click a colour to dim or restore matching ancestors.</p>
                                    <p>UK-only locations use the nearest child's Scotland, England or Ireland where possible. Otherwise, their constituent country stays Unknown.</p>
                                    <p>Dashed outlines mark inferred birthplaces.</p>
                                </div>
                            </details>
                        </div>
                        <div class="bcfc-legend-items"></div>
                        <p class="bcfc-inferred-key"><span></span>Inferred birthplace</p>
                    </aside>
                    <section class="bcfc-panel bcfc-ancestry" aria-label="Ancestral birth-country share">
                        <div class="bcfc-mix-head">
                            <div class="bcfc-section-heading">
                                <h2>Ancestral birth-country share</h2>
                                <details class="bcfc-info">
                                    <summary title="About the percentages"><span aria-hidden="true">i</span><span class="bcfc-sr-only">About the percentages</span></summary>
                                    <div class="bcfc-info-popover">
                                        <strong>How the shares work</strong>
                                        <p class="bcfc-mix-note">A genealogical measure of ancestral birthplaces, not ethnicity or a genetic estimate.</p>
                                        <p>Parents contribute 50% each, grandparents 25%, and so on. Uses terminal slots at the selected depth. Missing branches stay Unknown unless filled; a repeated ancestor counts in every slot.</p>
                                    </div>
                                </details>
                            </div>
                            <span class="bcfc-mix-scope" id="bcfc-mix-scope">Whole tree</span>
                        </div>
                        <div class="bcfc-mix-bar" aria-hidden="true"></div>
                        <div class="bcfc-mix-rows"></div>
                        <div id="bcfc-comparison" class="bcfc-comparison" hidden></div>
                    </section>
                </div>
                <section id="bcfc-review" class="bcfc-review" aria-label="Birthplace review" hidden></section>
                <button id="bcfc-exit-present" class="bcfc-exit-present" type="button" hidden>Exit screenshot view</button>
                <div id="bcfc-tooltip" class="bcfc-tooltip" role="tooltip" aria-hidden="true"></div>
            </section>`;
    }

    _bindControls() {
        const on = (element, type, handler) => element.addEventListener(type, handler, { signal: this.events.signal });
        const find = (selector) => this.container.querySelector(selector);
        const generations = find("#bcfc-generations");
        const infer = find("#bcfc-infer");
        const names = find("#bcfc-names");
        on(find("#bcfc-present"), "click", () => this._setPresentation(!this.isPresenting));
        on(find("#bcfc-exit-present"), "click", () => this._setPresentation(false));
        on(find("#bcfc-compare"), "change", (event) => {
            this.isComparing = event.target.checked;
            this._renderToolsPanels();
        });
        on(find("#bcfc-review-toggle"), "change", (event) => {
            this.isReviewing = event.target.checked;
            this._renderToolsPanels();
        });
        on(find("#bcfc-pattern-toggle"), "change", (event) => {
            this.settings.patterns = event.target.checked;
            this._saveSettings();
            this._renderCountryPanels();
            this._renderChart();
        });
        find("#bcfc-export-menu")
            .querySelectorAll("[data-export]")
            .forEach((button) => {
                on(button, "click", () => this._exportChart(button.dataset.export));
            });
        this._bindNavigation();
        on(find("#bcfc-group"), "change", (event) => {
            this.settings.group = event.target.value;
            this._saveSettings();
            this._rebuildModel();
            this._renderChart();
        });
        on(generations, "change", () => {
            this.settings.generations = this._clamp(Number(generations.value) || 7, 4, 8);
            this._saveSettings();
            this._loadData();
        });
        on(infer, "change", () => {
            this.settings.infer = infer.checked;
            this._saveSettings();
            this._rebuildModel();
            this._renderChart();
        });
        on(names, "change", () => {
            this.settings.names = names.value;
            this._saveSettings();
            this._renderChart();
        });
        on(find(".bcfc-legend-items"), "click", (event) => {
            const button = event.target.closest("[data-country-toggle]");
            if (!button) return;
            const country = button.dataset.countryToggle;
            if (this.hiddenCountries.has(country)) this.hiddenCountries.delete(country);
            else this.hiddenCountries.add(country);
            this.visibleCountries = new Set(this.countries.filter((name) => !this.hiddenCountries.has(name)));
            button.classList.toggle("bcfc-is-off", this.hiddenCountries.has(country));
            button.setAttribute("aria-pressed", String(!this.hiddenCountries.has(country)));
            this._applyCountryVisibility();
        });
        on(this.container, "keydown", (event) => {
            if (event.key === "Escape") {
                this._hideTooltip();
                this.container.querySelectorAll("details[open]").forEach((details) => {
                    const hasFocus = details.contains(document.activeElement);
                    details.open = false;
                    if (hasFocus) details.querySelector("summary").focus();
                });
            }
        });
        on(window, "keydown", (event) => {
            if (event.key === "Escape" && this.isPresenting) this._setPresentation(false);
        });
        on(document, "pointerdown", (event) => {
            this.container.querySelectorAll(".bcfc-info[open], .bcfc-action-menu[open]").forEach((details) => {
                if (!details.contains(event.target)) details.open = false;
            });
        });
        on(window, "scroll", () => this._hideTooltip());
        on(window, "resize", () => this._hideTooltip());
    }

    _syncControls() {
        this.container.querySelector("#bcfc-generations").value = String(this.settings.generations);
        this.container.querySelector("#bcfc-infer").checked = this.settings.infer;
        this.container.querySelector("#bcfc-names").value = this.settings.names;
        this.container.querySelector("#bcfc-group").value = this.settings.group;
        const patternToggle = this.container.querySelector("#bcfc-pattern-toggle");
        patternToggle.checked = this.settings.patterns;
        patternToggle.disabled = this.settings.group === "country";
    }

    _countryStyle(country) {
        return countryStyle(country, this.settings.group, this.settings.patterns);
    }

    _countryFill(country) {
        const style = this._countryStyle(country);
        return style.pattern ? `url(#${style.id})` : style.colour;
    }

    _applyView() {
        if (!this.container) return;
        const { scale, x, y } = this.viewState;
        this.container
            .querySelector("#bcfc-viewport")
            .setAttribute("transform", `translate(${x} ${y}) scale(${scale})`);
        this.container.querySelector("#bcfc-reset-view").hidden = scale === 1;
        this.container.querySelector(".bcfc-chart-area").classList.toggle("bcfc-is-zoomed", scale > 1);
    }

    _bindNavigation() {
        const svg = this.container.querySelector("#bcfc-svg");
        const on = (element, type, handler, options = {}) =>
            element.addEventListener(type, handler, { ...options, signal: this.events.signal });
        const point = (event) =>
            new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
        const zoom = (factor, anchor = { x: 800, y: 435 }) => {
            if (this.isPresenting || !this.model) return;
            this.viewState = zoomView(this.viewState, factor, anchor);
            this._hideTooltip();
            this._applyView();
        };
        this.container.querySelectorAll("[data-zoom]").forEach((button) => {
            on(button, "click", () => zoom(Number(button.dataset.zoom)));
        });
        on(this.container.querySelector("#bcfc-reset-view"), "click", () => {
            this.viewState = { ...FIT_VIEW };
            this._applyView();
        });
        on(svg, "keydown", (event) => {
            if (event.target !== svg || this.isPresenting || !this.model) return;
            const moves = { ArrowLeft: [80, 0], ArrowRight: [-80, 0], ArrowUp: [0, 80], ArrowDown: [0, -80] };
            if (["+", "=", "-", "0"].includes(event.key)) {
                event.preventDefault();
                if (event.key === "0") {
                    this.viewState = { ...FIT_VIEW };
                    this._applyView();
                } else zoom(event.key === "-" ? 1 / 1.3 : 1.3);
            } else if (moves[event.key] && this.viewState.scale > 1) {
                event.preventDefault();
                this.viewState = constrainView({
                    ...this.viewState,
                    x: this.viewState.x + moves[event.key][0],
                    y: this.viewState.y + moves[event.key][1],
                });
                this._hideTooltip();
                this._applyView();
            }
        });
        on(
            svg,
            "wheel",
            (event) => {
                if (this.isPresenting || !this.model) return;
                if (this.viewState.scale === 1 && event.deltaY > 0) {
                    if (event.ctrlKey || event.metaKey) event.preventDefault();
                    return;
                }
                event.preventDefault();
                zoom(Math.exp(-event.deltaY * (event.deltaMode === 1 ? 16 : 1) * 0.0025), point(event));
            },
            { passive: false }
        );
        on(svg, "pointerdown", (event) => {
            if (this.isPresenting || !this.model || event.button !== 0) return;
            const position = point(event);
            this.pointers.set(event.pointerId, { position, start: position });
        });
        on(svg, "pointermove", (event) => {
            const previous = this.pointers.get(event.pointerId);
            if (!previous) return;
            const oldPoints = [...this.pointers.values()].map((entry) => entry.position);
            const position = point(event);
            this.pointers.set(event.pointerId, { ...previous, position });
            if (this.pointers.size === 2) {
                const newPoints = [...this.pointers.values()].map((entry) => entry.position);
                this.viewState = pinchView(this.viewState, oldPoints, newPoints);
            } else if (
                this.pointers.size === 1 &&
                this.viewState.scale > 1 &&
                Math.hypot(position.x - previous.start.x, position.y - previous.start.y) >= 5
            ) {
                this.viewState = constrainView({
                    ...this.viewState,
                    x: this.viewState.x + position.x - previous.position.x,
                    y: this.viewState.y + position.y - previous.position.y,
                });
            } else return;
            this.isDragging = true;
            this.suppressClicksUntil = performance.now() + 300;
            svg.setPointerCapture(event.pointerId);
            event.preventDefault();
            this._hideTooltip();
            this._applyView();
        });
        const finish = (event) => {
            this.pointers.delete(event.pointerId);
            if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
            // A remaining finger starts a new pan after a pinch.
            this.pointers.forEach((entry) => {
                entry.start = entry.position;
            });
            if (!this.pointers.size) this.isDragging = false;
        };
        on(svg, "pointerup", finish);
        on(svg, "pointercancel", finish);
        on(svg, "pointerleave", (event) => {
            if (!svg.hasPointerCapture(event.pointerId)) finish(event);
        });
    }

    _renderToolsPanels() {
        if (!this.container) return;
        const escape = (value) => this._escapeHtml(value);
        const comparison = this.container.querySelector("#bcfc-comparison");
        comparison.hidden = !this.isComparing;
        if (this.isComparing) {
            const rows = parentComparison(this.model);
            const percent = (share) => `${(share * 100).toFixed(share >= 0.1 ? 1 : 2)}%`;
            comparison.innerHTML = `<h3>Paternal and maternal ancestry</h3><p>Each side totals 100% at the selected depth.</p>
                <div class="bcfc-table-wrap" tabindex="0" aria-label="Parent comparison table"><table><thead><tr><th scope="col">Birth ${GROUPINGS[this.settings.group].toLowerCase()}</th><th scope="col">Paternal</th><th scope="col">Maternal</th></tr></thead><tbody>${rows
                    .map(
                        (row) =>
                            `<tr><th scope="row"><span class="bcfc-mix-dot" style="${swatchStyle(this._countryStyle(row.country))}"></span>${escape(row.country)}</th><td>${percent(row.paternal)}</td><td>${percent(row.maternal)}</td></tr>`
                    )
                    .join("")}</tbody></table></div>`;
        }
        const review = this.container.querySelector("#bcfc-review");
        review.hidden = !this.isReviewing;
        if (this.isReviewing) {
            const rows = reviewBirthplaces(this.slots, this.settings.group);
            review.innerHTML = `<h2>Birthplace review</h2><p>${rows.length ? `${rows.length} ${rows.length === 1 ? "profile needs" : "profiles need"} a closer look.` : this.model ? "All recorded birthplaces matched." : "Load a chart to review its birthplaces."}</p>${
                rows.length
                    ? `<div class="bcfc-table-wrap" tabindex="0" aria-label="Recorded birthplaces table"><table><thead><tr><th scope="col">Profile</th><th scope="col">Recorded birthplace</th><th scope="col">Review</th><th scope="col">Slots</th></tr></thead><tbody>${rows
                          .map(
                              (row) =>
                                  `<tr><th scope="row">${row.profile ? `<a href="https://www.wikitree.com/wiki/${encodeURIComponent(row.profile)}" target="_blank" rel="noopener noreferrer">${escape(row.name)}</a>` : escape(row.name)}</th><td>${escape(row.location)}</td><td>${escape(row.reason)}</td><td>${row.occurrences}</td></tr>`
                          )
                          .join("")}</tbody></table></div>`
                    : ""
            }`;
        }
    }

    async _exportChart(format) {
        if (!this.model || this.isExporting) return;
        this.isExporting = true;
        const serial = this.requestSerial;
        const status = this.container.querySelector("#bcfc-export-status");
        status.hidden = false;
        status.textContent = "Preparing image…";
        const buttons = [...this.container.querySelectorAll("[data-export]")];
        buttons.forEach((button) => {
            button.disabled = true;
        });
        try {
            const clone = this.container.querySelector("#bcfc-svg").cloneNode(true);
            clone.querySelector("#bcfc-viewport").removeAttribute("transform");
            const years = this.container.querySelector("#bcfc-profile-years");
            const legend = [...this.container.querySelectorAll("[data-country-toggle]")].map((button) => {
                const country = button.dataset.countryToggle;
                const share = (this.overallMix[country] || 0) * 100;
                return {
                    label: country,
                    fill: this._countryFill(country),
                    percent: `${share.toFixed(share >= 10 ? 1 : 2)}%`,
                    dimmed: this.hiddenCountries.has(country),
                };
            });
            const image = createChartExport({
                chartMarkup: clone.innerHTML,
                title: this.container.querySelector("#bcfc-profile-title").textContent,
                years: years.hidden ? "" : years.textContent,
                metadata: `${this.container.querySelector("#bcfc-profile-meta").textContent} · ${this.settings.names === "off" ? "Names off" : this.settings.names === "surname" ? "Surnames" : "Full names"}${this.settings.patterns && this.settings.group !== "country" ? " · Patterned groups" : ""}`,
                legend,
                inferred: [...this.slots.values()].some((node) => node.inference),
            });
            const blob =
                format === "png"
                    ? await exportPng(image)
                    : new Blob([image.svg], { type: "image/svg+xml;charset=utf-8" });
            if (!this.container || serial !== this.requestSerial) return;
            const profile = this._personById(this.rootId)?.Name || "ancestry";
            const filename = `${profile.replace(/[^\p{L}\p{N}._-]/gu, "-")}-birth-${this.settings.group}-${this.settings.generations}gen.${format}`;
            downloadBlob(blob, filename);
            status.textContent = "Download ready.";
            this.container.querySelector("#bcfc-export-menu").open = false;
        } catch (error) {
            if (this.container && serial === this.requestSerial)
                status.textContent = `Could not export: ${error.message}`;
        } finally {
            if (this.container && serial === this.requestSerial) {
                this.isExporting = false;
                buttons.forEach((button) => {
                    button.disabled = false;
                });
            }
        }
    }

    async _loadData() {
        const serial = ++this.requestSerial;
        this.isExporting = false;
        this._hideTooltip();
        this.chartEvents?.abort();
        this.slots = new Map();
        this.model = null;
        this.viewState = { ...FIT_VIEW };
        this._applyView();
        this.peopleById = {};
        this.container.querySelector("#bcfc-chart").replaceChildren();
        this.overallMix = this._unitMix("Unknown");
        this._updateMixPanel(this.overallMix, "Whole tree");
        this._renderToolsPanels();
        this._setLoading(true, `Loading ${this.settings.generations} generations…`);

        try {
            const result = await fetchAncestors(
                WikiTreeAPI,
                BirthCountryFanChartView.APP_ID,
                this.personId,
                this.settings.generations,
                () => serial === this.requestSerial && !!this.container
            );
            if (serial !== this.requestSerial || !this.container) return;

            this.peopleById = result.people;
            this.rootId = result.rootId;
            const root = this._personById(this.rootId);
            if (!root) {
                throw new Error("The starting WikiTree profile was not returned by the API.");
            }

            this._rebuildModel();
            this._renderChart();
            this._setLoading(false, `${Object.keys(this.peopleById).length} profiles loaded.`);
        } catch (error) {
            if (serial !== this.requestSerial || !this.container) return;
            this._setLoading(false, `Could not load ancestors: ${error.message}`, true);
            const chart = this.container.querySelector("#bcfc-chart");
            if (chart) chart.innerHTML = "";
        }
    }

    _rebuildModel() {
        if (!this.peopleById || !Object.keys(this.peopleById).length) return;
        this.model = buildCountryModel(
            this.peopleById,
            this.rootId,
            this.settings.generations,
            this.settings.infer,
            this.settings.group
        );
        this.slots = this.model.slots;
        this.countries = this.model.countries;
        this.visibleCountries = new Set(this.countries.filter((country) => !this.hiddenCountries.has(country)));
        this._renderCountryPanels();
        this._syncControls();
        this.overallMix = this.model.overallMix;
        this._updateMixPanel(this.overallMix, "Whole tree");
    }

    _computeOverallMix() {
        return this.model?.overallMix || this._unitMix("Unknown");
    }

    _branchMix(slot) {
        return this.model?.branchMix(slot) || this._unitMix("Unknown");
    }

    _renderChart() {
        if (!this.container || !this.slots.size) return;

        const svgGroup = this.container.querySelector("#bcfc-chart");
        if (!svgGroup) return;

        this.chartEvents?.abort();
        this.chartEvents = new AbortController();
        this._hideTooltip();
        this._renderHeader();
        this._renderToolsPanels();
        this.container.querySelector("#bcfc-patterns").innerHTML = this.countries
            .map((country) => patternMarkup(this._countryStyle(country)))
            .join("");
        svgGroup.innerHTML = "";
        this.overallMix = this._computeOverallMix();
        this._updateMixPanel(this.overallMix, "Whole tree");

        const NS = "http://www.w3.org/2000/svg";
        const cx = 800;
        const cy = 790;
        const rootRadius = 63;
        const outerRadius = 710;
        const ringWidth = (outerRadius - rootRadius) / this.settings.generations;

        for (let generation = this.settings.generations; generation >= 1; generation -= 1) {
            const count = 2 ** generation;
            const innerRadius = rootRadius + (generation - 1) * ringWidth;
            const outer = rootRadius + generation * ringWidth;

            for (let position = 0; position < count; position += 1) {
                const slot = 2 ** generation + position;
                const node = this.slots.get(slot);
                const startAngle = 180 + (position * 180) / count;
                const endAngle = 180 + ((position + 1) * 180) / count;
                const path = document.createElementNS(NS, "path");
                const country = node?.displayGroup || "Unknown";

                path.setAttribute("d", this._annularSectorPath(cx, cy, innerRadius, outer, startAngle, endAngle));
                path.setAttribute("fill", this._countryFill(country));
                path.setAttribute("stroke", "#171717");
                path.setAttribute("stroke-width", generation >= 7 ? "0.8" : "1.1");
                path.setAttribute("vector-effect", "non-scaling-stroke");
                path.dataset.slot = String(slot);
                path.dataset.country = country;
                path.classList.add("bcfc-wedge", "bcfc-country-wedge");
                if (node?.inference) path.classList.add("bcfc-inferred");

                if (node?.person) path.setAttribute("tabindex", "0");
                if (node?.person?.Name) path.setAttribute("role", "link");
                path.setAttribute("aria-label", this._ariaLabelForNode(node));

                svgGroup.appendChild(path);
            }
        }

        // Root profile circle.
        const root = this.slots.get(1);
        const rootCircle = document.createElementNS(NS, "circle");
        const rootCountry = root?.displayGroup || "Unknown";
        rootCircle.setAttribute("cx", String(cx));
        rootCircle.setAttribute("cy", String(cy));
        rootCircle.setAttribute("r", String(rootRadius));
        rootCircle.setAttribute("fill", this._countryFill(rootCountry));
        rootCircle.setAttribute("stroke", "#171717");
        rootCircle.setAttribute("stroke-width", "1.3");
        rootCircle.dataset.slot = "1";
        rootCircle.dataset.country = rootCountry;
        rootCircle.classList.add("bcfc-wedge", "bcfc-country-wedge");
        if (root?.inference) rootCircle.classList.add("bcfc-inferred");
        if (root?.person) {
            rootCircle.setAttribute("tabindex", "0");
            if (root.person.Name) rootCircle.setAttribute("role", "link");
            rootCircle.setAttribute("aria-label", this._ariaLabelForNode(root));
        }
        svgGroup.appendChild(rootCircle);

        // Labels are drawn after all wedges so they stay legible.
        for (let generation = 1; generation <= this.settings.generations; generation += 1) {
            const count = 2 ** generation;
            const innerRadius = rootRadius + (generation - 1) * ringWidth;
            const outer = rootRadius + generation * ringWidth;
            const labelRadius = (innerRadius + outer) / 2;

            for (let position = 0; position < count; position += 1) {
                const slot = 2 ** generation + position;
                const node = this.slots.get(slot);
                if (!node?.person || this.settings.names === "off") continue;

                const midAngle = 180 + ((position + 0.5) * 180) / count;
                const point = this._polar(cx, cy, labelRadius, midAngle);
                const text = document.createElementNS(NS, "text");
                const country = node.displayGroup || "Unknown";
                const rotation = this._readableRotation(midAngle);
                const fontSize = Math.max(7, 15 - generation * 0.9);
                const label = this._personLabel(node.person);

                text.setAttribute("x", point.x.toFixed(2));
                text.setAttribute("y", point.y.toFixed(2));
                text.setAttribute(
                    "transform",
                    `rotate(${rotation.toFixed(2)} ${point.x.toFixed(2)} ${point.y.toFixed(2)})`
                );
                text.setAttribute("font-size", String(fontSize));
                this._styleLabel(text, country);
                text.setAttribute("text-anchor", "middle");
                text.setAttribute("dominant-baseline", "middle");
                text.dataset.slot = String(slot);
                text.dataset.country = country;
                text.classList.add("bcfc-person-label", "bcfc-country-wedge");
                // Radial labels must stay inside their ring; truncation keeps neighbouring wedges readable.
                const capacity = Math.max(2, Math.floor((ringWidth - 12) / (fontSize * 0.6)));
                text.textContent = label.length > capacity ? `${label.slice(0, capacity - 1)}…` : label;
                svgGroup.appendChild(text);
            }
        }

        if (root?.person && this.settings.names !== "off") {
            const rootText = document.createElementNS(NS, "text");
            rootText.setAttribute("x", String(cx));
            rootText.setAttribute("y", String(cy));
            rootText.setAttribute("font-size", "15");
            this._styleLabel(rootText, rootCountry);
            rootText.setAttribute("text-anchor", "middle");
            rootText.setAttribute("dominant-baseline", "middle");
            rootText.dataset.slot = "1";
            rootText.dataset.country = rootCountry;
            rootText.classList.add("bcfc-person-label", "bcfc-country-wedge");
            const rootLabel = this._personLabel(root.person);
            rootText.textContent = rootLabel.length > 15 ? `${rootLabel.slice(0, 14)}…` : rootLabel;
            svgGroup.appendChild(rootText);
        }

        this._bindChartInteractions();
        this._applyCountryVisibility();
    }

    _bindChartInteractions() {
        const tooltip = this.container.querySelector("#bcfc-tooltip");
        const on = (el, type, handler) => el.addEventListener(type, handler, { signal: this.chartEvents.signal });
        this.container.querySelectorAll(".bcfc-wedge").forEach((element) => {
            const node = this.slots.get(Number(element.dataset.slot));
            const show = (event) => {
                if (this.isPresenting || this.isDragging || this.pointers.size || event.pointerType === "touch") return;
                tooltip.innerHTML = this._tooltipHtml(node);
                tooltip.style.display = "block";
                tooltip.setAttribute("aria-hidden", "false");
                element.setAttribute("aria-describedby", "bcfc-tooltip");
                const rect = element.getBoundingClientRect();
                this._moveTooltip(
                    event.type === "focus"
                        ? { clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2 }
                        : event,
                    tooltip
                );
                this._updateMixPanel(this._branchMix(node.slot), this._fullName(node.person));
            };
            on(element, "pointerenter", show);
            on(element, "focus", show);
            on(element, "pointermove", (event) => {
                if (tooltip.style.display === "block") this._moveTooltip(event, tooltip);
            });
            on(element, "pointerleave", () => this._hideTooltip());
            on(element, "blur", () => this._hideTooltip());
            on(element, "click", () => {
                if (performance.now() >= this.suppressClicksUntil) this._openProfile(node);
            });
            on(element, "keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    this._openProfile(node);
                }
            });
        });
    }

    _hideTooltip() {
        if (!this.container) return;
        const tooltip = this.container.querySelector("#bcfc-tooltip");
        if (tooltip) {
            tooltip.style.display = "none";
            tooltip.setAttribute("aria-hidden", "true");
        }
        this.container
            .querySelectorAll("[aria-describedby=bcfc-tooltip]")
            .forEach((el) => el.removeAttribute("aria-describedby"));
        this._updateMixPanel(this.overallMix, "Whole tree");
    }

    _openProfile(node) {
        if (!node?.person?.Name) return;
        window.open(`https://www.wikitree.com/wiki/${encodeURIComponent(node.person.Name)}`, "_blank", "noopener");
    }

    _moveTooltip(event, tooltip) {
        const { width, height } = tooltip.getBoundingClientRect();
        const x = Math.min(Math.max(event.clientX + 14, 8), Math.max(8, window.innerWidth - width - 8));
        const y = Math.min(Math.max(event.clientY + 14, 8), Math.max(8, window.innerHeight - height - 8));
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }

    _tooltipHtml(node) {
        const person = node.person;
        const mix = this._branchMix(node.slot);
        const composition = this.countries
            .filter((country) => mix[country] > 0)
            .map((country) => `${country} ${(mix[country] * 100).toFixed(2)}%`)
            .join(" · ");
        const provenance =
            node.inference || (node.provenance === "explicit" ? `Explicit: ${node.base.reason}` : node.base.reason);
        return `
            <strong>${this._escapeHtml(this._fullName(person))}</strong>
            <div>WikiTree ID: ${this._escapeHtml(person?.Name || (identityWithheld(person) ? "Withheld by API" : person ? "Unavailable" : "No profile"))}</div>
            ${person ? `<div>Born: ${this._escapeHtml(eventYear(person, "Birth"))} · Died: ${this._escapeHtml(eventYear(person, "Death"))}</div>` : ""}
            <div>Recorded birth location: ${this._escapeHtml(person?.BirthLocation || "Not recorded")}</div>
            <div>Resolved country: ${this._escapeHtml(node.displayCountry)}</div>
            ${this.settings.group !== "country" ? `<div>${GROUPINGS[this.settings.group]}: ${this._escapeHtml(node.displayGroup)}</div>` : ""}
            <div class="${node.inference ? "bcfc-tip-inferred" : ""}">${this._escapeHtml(provenance)}</div>
            <div class="bcfc-tip-mix">${this._escapeHtml(this._mixTitle())}: ${this._escapeHtml(composition)}</div>`;
    }

    _ariaLabelForNode(node) {
        const person = node.person;
        const country = node.displayCountry || "Unknown";
        const group = this.settings.group !== "country" ? `, ${node.displayGroup}` : "";
        return `${this._fullName(person)}, ${country}${group}${node.inference ? ", inferred" : ""}.${person?.Name ? " Open WikiTree profile." : ""}`;
    }

    _renderCountryPanels() {
        const label = GROUPINGS[this.settings.group].toLowerCase();
        const legend = this.container.querySelector(".bcfc-country-legend");
        legend.querySelector("h2").textContent = `Birth ${label}`;
        legend.setAttribute("aria-label", `Birth ${label} colour key`);
        const ancestry = this.container.querySelector(".bcfc-ancestry");
        ancestry.querySelector("h2").textContent = this._mixTitle();
        ancestry.setAttribute("aria-label", this._mixTitle());
        this.container
            .querySelector("#bcfc-svg")
            .setAttribute("aria-label", `Ancestor fan chart coloured by birth ${label}`);
        const note = this.container.querySelector("#bcfc-grouping-note");
        note.hidden = this.settings.group === "country";
        note.innerHTML =
            this.settings.group === "region"
                ? '<a href="https://unstats.un.org/unsd/methodology/m49/" target="_blank" rel="noopener">UN geographic regions</a>. UK and Ireland are Northern Europe. Historical states spanning regions use a broader label.'
                : "Geographic continents; North and South America are separate. Historical states without a clear assignment remain Other.";
        const legendCountries = this.countries.filter(
            (country) => country === "Unknown" || [...this.slots.values()].some((node) => node.displayGroup === country)
        );
        this.app?.classList.toggle("bcfc-many-countries", legendCountries.length > 9);
        const escape = (value) => this._escapeHtml(value);
        const swatch = (country, className) =>
            `<span class="${className}" style="${swatchStyle(this._countryStyle(country))}"></span>`;
        this.container.querySelector(".bcfc-legend-items").innerHTML = legendCountries
            .map(
                (country) => `
            <button type="button" class="bcfc-legend-item ${this.hiddenCountries.has(country) ? "bcfc-is-off" : ""}"
                data-country-toggle="${escape(country)}" aria-pressed="${!this.hiddenCountries.has(country)}">
                ${swatch(country, "bcfc-swatch")}<span>${escape(country)}</span>
            </button>`
            )
            .join("");
        this.container.querySelector(".bcfc-mix-bar").innerHTML = this.countries
            .map(
                (country) =>
                    `<span class="bcfc-mix-seg" data-bar-country="${escape(country)}" style="${swatchStyle(this._countryStyle(country))}"></span>`
            )
            .join("");
        this.container.querySelector(".bcfc-mix-rows").innerHTML = this.countries
            .map(
                (country) => `
            <div class="bcfc-mix-row" data-mix-row="${escape(country)}">
                ${swatch(country, "bcfc-mix-dot")}<span>${escape(country)}</span>
                <span class="bcfc-mix-value" data-pct-country="${escape(country)}">0%</span>
            </div>`
            )
            .join("");
    }

    _updateMixPanel(mix, scope) {
        if (!this.container) return;
        const normalized = this._normaliseMix(mix);
        const scopeEl = this.container.querySelector("#bcfc-mix-scope");
        if (scopeEl) {
            scopeEl.textContent = scope;
            scopeEl.hidden = scope === "Whole tree";
        }
        this.container.querySelectorAll("[data-pct-country]").forEach((element) => {
            const pct = (normalized[element.dataset.pctCountry] || 0) * 100;
            element.textContent = `${pct.toFixed(pct >= 10 ? 1 : 2)}%`;
            element.closest("[data-mix-row]").hidden = pct < 0.005;
        });
        this.container.querySelectorAll("[data-bar-country]").forEach((element) => {
            element.style.width = `${(normalized[element.dataset.barCountry] || 0) * 100}%`;
        });
    }

    _mixTitle() {
        return this.settings.group === "country"
            ? "Ancestral birth-country share"
            : `Ancestral birthplaces by ${this.settings.group}`;
    }

    _renderHeader() {
        const person = this._personById(this.rootId);
        this.container.querySelector("#bcfc-profile-title").textContent = this._fullName(person);
        const birth = eventYear(person, "Birth");
        const death = eventYear(person, "Death");
        const years = this.container.querySelector("#bcfc-profile-years");
        years.hidden = birth === "Unknown" && death === "Unknown";
        years.textContent =
            birth !== "Unknown" && death !== "Unknown"
                ? `${birth}–${death}`
                : birth !== "Unknown"
                  ? `b. ${birth}`
                  : `d. ${death}`;
        this.container.querySelector("#bcfc-profile-meta").textContent = [
            person?.Name,
            `${this.settings.generations} generations`,
            `By ${this.settings.group}`,
            this.settings.infer ? "Unknowns filled" : null,
        ]
            .filter(Boolean)
            .join(" · ");
    }

    _setPresentation(isPresenting) {
        this.isPresenting = isPresenting;
        document.body.classList.toggle("bcfc-presenting", isPresenting);
        const button = this.container.querySelector("#bcfc-present");
        button.setAttribute("aria-pressed", String(isPresenting));
        button.querySelector("span").textContent = isPresenting ? "Exit screenshot view" : "Screenshot view";
        this.container.querySelector("#bcfc-exit-present").hidden = !isPresenting;
        if (isPresenting) {
            this.savedViewState = { ...this.viewState };
            this.viewState = { ...FIT_VIEW };
        } else {
            this.viewState = this.savedViewState || { ...FIT_VIEW };
        }
        this._applyView();
        this._hideTooltip();
        this.container.querySelectorAll("details[open]").forEach((details) => {
            details.open = false;
        });
        this._updateMixPanel(this.overallMix, "Whole tree");
        if (!isPresenting) this.container.querySelector("#bcfc-export-menu > summary").focus();
    }

    _applyCountryVisibility() {
        if (!this.container) return;
        this.container.querySelectorAll("[data-country]").forEach((element) => {
            const country = element.dataset.country;
            element.classList.toggle("bcfc-dimmed", !this.visibleCountries.has(country));
        });
    }

    _personLabel(person) {
        return personLabel(person, this.settings.names);
    }

    _fullName(person) {
        return fullName(person);
    }

    _personById(id) {
        if (!id) return null;
        return this.peopleById[String(id)] || this.peopleById[id] || null;
    }

    _setLoading(isLoading, message, isError = false) {
        if (!this.container) return;
        const status = this.container.querySelector("#bcfc-status");
        const generationSelect = this.container.querySelector("#bcfc-generations");
        const presentButton = this.container.querySelector("#bcfc-present");
        if (status) {
            status.textContent = message || "";
            status.classList.toggle("bcfc-is-error", isError);
            status.classList.toggle("bcfc-is-loading", isLoading);
            status.classList.toggle("bcfc-is-idle", !isLoading && !isError);
        }
        if (generationSelect) generationSelect.disabled = isLoading;
        if (presentButton) presentButton.disabled = isLoading || isError;
        this.container.querySelectorAll("[data-export]").forEach((button) => {
            button.disabled = isLoading || isError || !this.model || this.isExporting;
        });
    }

    _annularSectorPath(cx, cy, innerRadius, outerRadius, startAngle, endAngle) {
        const p1 = this._polar(cx, cy, innerRadius, startAngle);
        const p2 = this._polar(cx, cy, outerRadius, startAngle);
        const p3 = this._polar(cx, cy, outerRadius, endAngle);
        const p4 = this._polar(cx, cy, innerRadius, endAngle);
        const largeArc = endAngle - startAngle > 180 ? 1 : 0;

        return [
            `M ${p1.x} ${p1.y}`,
            `L ${p2.x} ${p2.y}`,
            `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${p3.x} ${p3.y}`,
            `L ${p4.x} ${p4.y}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${p1.x} ${p1.y}`,
            "Z",
        ].join(" ");
    }

    _polar(cx, cy, radius, degrees) {
        const radians = (degrees * Math.PI) / 180;
        return {
            x: cx + radius * Math.cos(radians),
            y: cy + radius * Math.sin(radians),
        };
    }

    _readableRotation(angle) {
        let rotation = angle;
        while (rotation > 90) rotation -= 180;
        while (rotation < -90) rotation += 180;
        return rotation;
    }

    _textColour(country) {
        return countryTextColour(country, this.settings.group, this.settings.patterns);
    }

    _styleLabel(text, country) {
        const fill = this._textColour(country);
        text.setAttribute("fill", fill);
        if (this.settings.patterns && this.settings.group !== "country") {
            text.setAttribute("paint-order", "stroke fill");
            text.setAttribute("stroke", fill === "#ffffff" ? "#000000" : "#ffffff");
            text.setAttribute("stroke-width", "1.8");
            text.setAttribute("stroke-opacity", "0.85");
        }
    }

    _emptyMix() {
        return emptyMix(this.countries);
    }

    _unitMix(country) {
        const mix = this._emptyMix();
        const key = this.countries.includes(country) ? country : "Unknown";
        mix[key] = 1;
        return mix;
    }

    _normaliseMix(mix) {
        const normalized = this._emptyMix();
        const total = this.countries.reduce((sum, key) => sum + (mix?.[key] || 0), 0);
        if (!total) {
            normalized.Unknown = 1;
            return normalized;
        }
        this.countries.forEach((key) => {
            normalized[key] = (mix?.[key] || 0) / total;
        });
        return normalized;
    }

    _clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    _escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
};
