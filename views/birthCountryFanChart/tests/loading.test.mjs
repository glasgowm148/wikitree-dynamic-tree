import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixture.mjs";
import { COUNTRIES } from "../countryModel.js";

globalThis.window = globalThis;
globalThis.View = class {};
await import("../BirthCountryFanChartView.js");

function viewAt(depth) {
    const view = new BirthCountryFanChartView();
    const elements = new Map();
    const classes = new Set();
    view.app = {
        classList: {
            toggle(name, enabled) {
                if (enabled) classes.add(name);
                else classes.delete(name);
            },
        },
    };
    view.container = {
        querySelector(selector) {
            if (!elements.has(selector)) elements.set(selector, { replaceChildren() {} });
            return elements.get(selector);
        },
    };
    view.settings = { generations: depth };
    view.countries = [...COUNTRIES];
    view.personId = 1;
    view.requestSerial = 0;
    view._hideTooltip = () => {};
    view._applyView = () => {};
    view._updateMixPanel = () => {};
    view._renderToolsPanels = () => {};
    view._rebuildModel = () => {};
    view._renderChart = () => {};
    view._setLoading = () => {};
    return { view, elements, classes };
}

test("fresh settings default to five ancestor generations, at most 63 profiles", () => {
    globalThis.localStorage = { getItem: () => null };
    const settings = new BirthCountryFanChartView()._loadSettings({});
    assert.equal(settings.generations, 5);
    assert.equal(2 ** (settings.generations + 1) - 1, 63);
});

test("saved depth and shared URL depth remain selected instead of being silently reduced", () => {
    globalThis.localStorage = { getItem: () => JSON.stringify({ generations: 7 }) };
    const view = new BirthCountryFanChartView();
    assert.equal(view._loadSettings({}).generations, 7);
    assert.equal(view._loadSettings({ generations: "8" }).generations, 8);
});

test("only four and five generations fetch ancestors automatically", async () => {
    const requests = [];
    globalThis.WikiTreeAPI = {
        getPeople: async (_app, _key, _fields, options) => {
            requests.push(options.ancestors);
            return ["", { 1: { Id: 1 } }, fixture];
        },
    };
    for (const depth of [4, 5]) {
        const { view, classes } = viewAt(depth);
        await view._loadData();
        assert.ok(!classes.has("bcfc-awaiting-load"));
        assert.equal(view.peopleById[1].Name, "Root-1");
    }
    assert.deepEqual(requests, [4, 5]);
});

test("six to eight generations make no ancestor request before a user action", async () => {
    globalThis.WikiTreeAPI = { getPeople: () => assert.fail("Unexpected automatic ancestor request") };
    for (const depth of [6, 7, 8]) {
        const { view, elements, classes } = viewAt(depth);
        await view._loadData();
        assert.ok(classes.has("bcfc-awaiting-load"));
        assert.equal(elements.get("#bcfc-load-prompt").hidden, false);
        assert.equal(elements.get("#bcfc-load-chart").textContent, `Load ${depth} generations`);
        assert.ok(elements.get("#bcfc-load-description").textContent.includes(String(2 ** (depth + 1) - 1)));
    }
});

test("explicit loading fetches the selected larger depth and removes the prompt", async () => {
    const requests = [];
    globalThis.WikiTreeAPI = {
        getPeople: async (_app, _key, _fields, options) => {
            requests.push(options.ancestors);
            return ["", { 1: { Id: 1 } }, fixture];
        },
    };
    for (const depth of [6, 7, 8]) {
        const { view, elements, classes } = viewAt(depth);
        await view._loadData();
        await view._loadData(true);
        assert.ok(!classes.has("bcfc-awaiting-load"));
        assert.equal(elements.get("#bcfc-load-prompt").hidden, true);
        assert.equal(view.peopleById[1].Name, "Root-1");
    }
    assert.deepEqual(requests, [6, 7, 8]);
});
