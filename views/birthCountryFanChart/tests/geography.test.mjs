import test from "node:test";
import assert from "node:assert/strict";
import { countries as catalogue } from "../../oneNameTrees/location_data.js";
import { GEOGRAPHIC_REGIONS } from "../geographyData.js";
import { groupBirthCountry } from "../geography.js";
import { buildCountryModel } from "../countryModel.js";
import { countryColour } from "../countryColours.js";
import { fixture } from "./fixture.mjs";

const mappings = [
    ["Scotland", "Europe", "Northern Europe"],
    ["England", "Europe", "Northern Europe"],
    ["Ireland", "Europe", "Northern Europe"],
    ["Wales", "Europe", "Northern Europe"],
    ["France", "Europe", "Western Europe"],
    ["Germany", "Europe", "Western Europe"],
    ["Poland", "Europe", "Eastern Europe"],
    ["Italy", "Europe", "Southern Europe"],
    ["Russia", "Europe", "Eastern Europe"],
    ["Turkey", "Asia", "Western Asia"],
    ["Cyprus", "Asia", "Western Asia"],
    ["Kazakhstan", "Asia", "Central Asia"],
    ["India", "Asia", "Southern Asia"],
    ["Japan", "Asia", "Eastern Asia"],
    ["Taiwan", "Asia", "Eastern Asia"],
    ["Thailand", "Asia", "South-eastern Asia"],
    ["Egypt", "Africa", "Northern Africa"],
    ["Nigeria", "Africa", "Western Africa"],
    ["Kenya", "Africa", "Eastern Africa"],
    ["South Africa", "Africa", "Southern Africa"],
    ["United States", "North America", "Northern America"],
    ["Mexico", "North America", "Central America"],
    ["Jamaica", "North America", "Caribbean"],
    ["Brazil", "South America", "South America"],
    ["French Guiana", "South America", "South America"],
    ["Australia", "Oceania", "Australia and New Zealand"],
    ["Fiji", "Oceania", "Melanesia"],
    ["Samoa", "Oceania", "Polynesia"],
    ["Antarctica", "Antarctica", "Antarctica"],
    ["New France", "North America", "Northern America"],
    ["Province of New York", "North America", "Northern America"],
    ["Province of Quebec", "North America", "Northern America"],
    ["South African Republic", "Africa", "Southern Africa"],
    ["Cape Colony", "Africa", "Southern Africa"],
    ["Connecticut Colony", "North America", "Northern America"],
    ["Province of North Carolina", "North America", "Northern America"],
    ["Rhodesia", "Africa", "Southern Africa"],
];
test("continent and region mappings use geographic rather than sovereign affiliation", () => {
    for (const [country, continent, region] of mappings) {
        assert.equal(groupBirthCountry(country, "country"), country);
        assert.equal(groupBirthCountry(country, "continent"), continent, country);
        assert.equal(groupBirthCountry(country, "region"), region, country);
    }
});
test("every existing modern country has a continent and region", () => {
    for (const { name } of catalogue) {
        assert.notEqual(groupBirthCountry(name, "continent"), "Other", name);
        assert.notEqual(groupBirthCountry(name, "region"), "Other", name);
    }
});
test("historical spanning states stay broad; missing and unassigned values stay separate", () => {
    for (const country of ["Prussia", "Holy Roman Empire", "Austria-Hungary"]) {
        assert.equal(groupBirthCountry(country, "country"), country);
        assert.equal(groupBirthCountry(country, "continent"), "Europe");
        assert.equal(groupBirthCountry(country, "region"), "Europe (region unspecified)");
    }
    for (const mode of ["continent", "region"]) {
        assert.equal(groupBirthCountry("Unknown", mode), "Unknown");
        assert.equal(groupBirthCountry("Other", mode), "Other");
        assert.equal(groupBirthCountry("Unmapped historical place", mode), "Other");
    }
    assert.equal(groupBirthCountry("France", "invalid"), "France");
});
test("grouped shares retain slot weights, collapse and original countries", () => {
    const people = {
        1: { Father: 2, Mother: 3 },
        2: { Father: 4, Mother: 5 },
        3: { Father: 4, Mother: 6 },
        4: { BirthLocation: "England" },
        5: { BirthLocation: "Ireland" },
        6: { BirthLocation: "France" },
    };
    const before = JSON.stringify(people);
    const regions = buildCountryModel(people, 1, 2, false, "region");
    assert.equal(regions.overallMix["Northern Europe"], 0.75);
    assert.equal(regions.overallMix["Western Europe"], 0.25);
    assert.equal(regions.branchMix(3)["Northern Europe"], 0.5);
    assert.equal(regions.slots.get(4).displayCountry, "England");
    assert.equal(regions.slots.get(4).displayGroup, "Northern Europe");
    assert.equal(regions.slots.get(4).person, regions.slots.get(6).person);
    assert.equal(buildCountryModel(people, 1, 2, false, "continent").overallMix.Europe, 1);
    assert.equal(JSON.stringify(people), before);
});
test("UK-only places have known broad geography without inventing a constituent country", () => {
    const people = { 1: { Father: 2 }, 2: { BirthLocation: "United Kingdom" } };
    const country = buildCountryModel(people, 1, 1);
    assert.equal(country.slots.get(2).displayCountry, "Unknown");
    assert.equal(country.overallMix.Unknown, 1);
    const region = buildCountryModel(people, 1, 1, false, "region");
    assert.equal(region.slots.get(2).displayCountry, "Unknown");
    assert.equal(region.slots.get(2).displayGroup, "Northern Europe");
    assert.equal(region.overallMix["Northern Europe"], 0.5);
    assert.equal(region.overallMix.Unknown, 0.5);
});
test("grouping preserves inference provenance and every branch totals 100%", () => {
    for (const mode of ["country", "continent", "region"])
        for (const depth of [4, 7, 8])
            for (const infer of [false, true]) {
                const model = buildCountryModel(fixture, 1, depth, infer, mode);
                assert.equal(model.slots.get(5).displayCountry, "Ireland");
                assert.equal(model.slots.get(5).provenance, "inferred");
                assert.equal(
                    model.slots.get(5).displayGroup,
                    mode === "country" ? "Ireland" : mode === "continent" ? "Europe" : "Northern Europe"
                );
                for (const slot of model.slots.keys())
                    assert.ok(Math.abs(Object.values(model.branchMix(slot)).reduce((a, b) => a + b, 0) - 1) < 1e-12);
            }
});
test("each group has a distinct stable colour within its display mode", () => {
    const continents = [...new Set(Object.values(GEOGRAPHIC_REGIONS).map((region) => region.continent))];
    const regions = [...Object.keys(GEOGRAPHIC_REGIONS), "Europe (region unspecified)"];
    for (const names of [continents, regions]) {
        const colours = [...names, "Other", "Unknown"].map(countryColour);
        assert.equal(new Set(colours).size, colours.length);
    }
});
