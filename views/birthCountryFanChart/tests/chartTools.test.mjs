import test from "node:test";
import assert from "node:assert/strict";
import { buildCountryModel } from "../countryModel.js";
import { FIT_VIEW, zoomView, pinchView, constrainView, parentComparison, reviewBirthplaces } from "../chartTools.js";
import { createChartExport } from "../chartExport.js";
import { GEOGRAPHIC_REGIONS } from "../geographyData.js";
import { countryColour, countryStyle, countryTextColour, patternMarkup } from "../countryColours.js";
import { fixture } from "./fixture.mjs";

test("zoom keeps its anchor fixed and clamps scale/panning to the chart", () => {
    const point = { x: 650, y: 400 };
    const zoomed = zoomView(FIT_VIEW, 2, point);
    assert.deepEqual(zoomed, { scale: 2, x: -650, y: -400 });
    assert.equal((point.x - zoomed.x) / zoomed.scale, point.x);
    assert.deepEqual(zoomView(zoomed, 0.5, point), FIT_VIEW);
    assert.equal(zoomView(FIT_VIEW, 100, point).scale, 6);
    assert.deepEqual(constrainView({ scale: 2, x: -9999, y: 50 }), { scale: 2, x: -1600, y: 0 });
});

test("pinch zoom follows the moving centre and stays within fit/maximum bounds", () => {
    const before = [
        { x: 600, y: 400 },
        { x: 1000, y: 400 },
    ];
    const after = [
        { x: 450, y: 430 },
        { x: 1250, y: 430 },
    ];
    const zoomed = pinchView(FIT_VIEW, before, after);
    assert.deepEqual(zoomed, { scale: 2, x: -750, y: -370 });
    assert.equal((850 - zoomed.x) / zoomed.scale, 800);
    assert.equal((430 - zoomed.y) / zoomed.scale, 400);
    assert.equal(
        pinchView(FIT_VIEW, before, [
            { x: 795, y: 400 },
            { x: 805, y: 400 },
        ]).scale,
        1
    );
    assert.ok(
        Number.isFinite(
            pinchView(
                FIT_VIEW,
                [
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                ],
                after
            ).scale
        )
    );
});

test("parent comparisons preserve pedigree collapse and recombine to the whole tree", () => {
    for (const grouping of ["country", "continent", "region"]) {
        for (const infer of [false, true]) {
            const model = buildCountryModel(fixture, 1, 4, infer, grouping);
            const rows = parentComparison(model);
            for (const side of ["paternal", "maternal"]) {
                assert.ok(Math.abs(rows.reduce((sum, row) => sum + row[side], 0) - 1) < 1e-10);
            }
            for (const row of rows) assert.equal((row.paternal + row.maternal) / 2, model.overallMix[row.country]);
        }
    }
    const model = buildCountryModel({ 1: { Id: 1, Father: 2 }, 2: { Id: 2, BirthLocation: "France" } }, 1, 4);
    const rows = parentComparison(model);
    assert.equal(rows.find((row) => row.country === "Unknown").maternal, 1);
    assert.deepEqual(parentComparison(null), []);
});

test("review lists recorded problems once per profile, with slot counts and safe withheld identities", () => {
    const people = {
        1: { Id: 1, Father: 2, Mother: 3, BirthLocation: "Scotland" },
        2: { Id: 2, Name: "Example-2", BirthLocation: "Unmapped town, Unmapped region", Father: 4 },
        3: { Id: 3, BirthLocation: "UK", Father: 4 },
        4: { Id: 4, Name: "Example-4", BirthLocation: "Unmapped village" },
    };
    const model = buildCountryModel(people, 1, 4, true);
    const rows = reviewBirthplaces(model.slots, "country");
    assert.equal(rows.length, 3);
    assert.equal(rows.find((row) => row.profile === "Example-4").occurrences, 2);
    assert.equal(rows.find((row) => row.reason === "UK country unspecified").profile, "");
    assert.ok(rows.every((row) => row.location));
    assert.deepEqual(reviewBirthplaces(buildCountryModel({ 1: { Id: 1 } }, 1, 4).slots, "country"), []);
});

test("export escapes profile text, wraps headings and grows to include a long legend", () => {
    const legend = Array.from({ length: 60 }, (_, index) => ({
        label: `Country <${index}>`,
        fill: "#0065bd",
        percent: "1.00%",
    }));
    const image = createChartExport({
        chartMarkup: '<g><path fill="#ffffff"/></g>',
        title: 'Alex <Root> & "Family"',
        years: "1980–2020",
        metadata: "8 generations · Names off",
        legend,
        inferred: true,
    });
    assert.ok(image.height > 2000);
    assert.ok(image.svg.includes("Alex &lt;Root&gt; &amp; &quot;Family&quot;"));
    assert.ok(image.svg.includes("Country &lt;59&gt;"));
    assert.ok(image.svg.includes('fill="#ffffff"'));
    assert.ok(!image.svg.includes("text{font-family:Arial,Helvetica,sans-serif;fill:"));
    assert.ok(image.svg.includes("Dashed outlines"));
    assert.ok(!image.svg.includes("foreignObject"));
});

test("region colours are separated and patterned geographic categories have unique signatures", () => {
    const names = [...Object.keys(GEOGRAPHIC_REGIONS), "Europe (region unspecified)"];
    const rgb = (hex) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
    const colours = names.map((name) => countryColour(name, "region"));
    assert.equal(new Set(colours).size, names.length);
    for (let i = 0; i < colours.length; i++) {
        for (let j = i + 1; j < colours.length; j++) {
            const a = rgb(colours[i]),
                b = rgb(colours[j]);
            assert.ok(Math.hypot(...a.map((value, k) => value - b[k])) > 60);
        }
    }
    const styles = names.map((name) => countryStyle(name, "region", true));
    assert.equal(new Set(styles.map((style) => `${style.colour}/${style.pattern}`)).size, names.length);
    assert.ok(styles.every((style) => patternMarkup(style).includes(style.id)));
    assert.equal(countryStyle("Scotland", "country", true).colour, "#0065bd");
    assert.equal(countryStyle("Unknown", "region", true).pattern, 0);
});

test("normal and patterned regional labels have at least 4.5:1 base-fill contrast", () => {
    const luminance = (hex) =>
        [1, 3, 5]
            .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
            .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
            .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
    for (const name of [...Object.keys(GEOGRAPHIC_REGIONS), "Europe (region unspecified)", "Other", "Unknown"]) {
        for (const patterned of [false, true]) {
            const fill = luminance(countryColour(name, "region", patterned));
            const label = luminance(countryTextColour(name, "region", patterned));
            assert.ok((Math.max(fill, label) + 0.05) / (Math.min(fill, label) + 0.05) >= 4.5, name);
        }
    }
});

test("patterned regional signatures remain separated in protanopia/deuteranopia simulations", () => {
    // Machado's severity-1 matrices in linear RGB (Appendix A):
    // https://www.inf.ufrgs.br/~oliveira/students_dissertations/Masters/Gustavo_Machado_Masters_thesis_UFRGS_2010.pdf
    const matrices = [
        [
            [0.152286, 1.052583, -0.204868],
            [0.114503, 0.786281, 0.099216],
            [-0.003882, -0.048116, 1.051998],
        ],
        [
            [0.367322, 0.860646, -0.227968],
            [0.280085, 0.672501, 0.047413],
            [-0.01182, 0.04294, 0.968881],
        ],
    ];
    const styles = [...Object.keys(GEOGRAPHIC_REGIONS), "Europe (region unspecified)"].map((name) =>
        countryStyle(name, "region", true)
    );
    for (const matrix of matrices) {
        const simulated = styles.map((style) => {
            const linear = [1, 3, 5]
                .map((offset) => parseInt(style.colour.slice(offset, offset + 2), 16) / 255)
                .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
            return matrix
                .map((row) =>
                    Math.max(
                        0,
                        Math.min(
                            1,
                            row.reduce((sum, weight, i) => sum + weight * linear[i], 0)
                        )
                    )
                )
                .map((c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255);
        });
        for (let i = 0; i < styles.length; i++) {
            for (let j = i + 1; j < styles.length; j++) {
                if (styles[i].pattern !== styles[j].pattern) continue;
                assert.ok(Math.hypot(...simulated[i].map((value, k) => value - simulated[j][k])) > 25);
            }
        }
    }
});
