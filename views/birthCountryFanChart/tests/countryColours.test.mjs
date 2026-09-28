import test from "node:test";
import assert from "node:assert/strict";
import { countryColour, countryTextColour } from "../countryColours.js";
import { countries } from "../../oneNameTrees/location_data.js";

test("original palette and unknown/other colours retained", () => {
    assert.equal(countryColour("Scotland"), "#0065bd");
    assert.equal(countryColour("England"), "#d71920");
    assert.equal(countryColour("Ireland"), "#169b62");
    assert.equal(countryColour("Other"), "#777777");
    assert.equal(countryColour("Unknown"), "#ffffff");
});
test("every catalogue country gets a distinct stable colour", () => {
    const names = countries.map((country) => country.name).filter((name) => name !== "United Kingdom");
    const colours = names.map(countryColour);
    assert.equal(new Set(colours).size, names.length);
    for (const name of names) {
        assert.match(countryColour(name), /^#[0-9a-f]{6}$/);
        assert.equal(countryColour(name), countryColour(name));
        assert.notEqual(countryColour(name), countryColour("Other"));
    }
});
test("historic realms and additional countries have their own colours", () => {
    const names = [
        "France",
        "Germany",
        "Denmark",
        "Netherlands",
        "Wales",
        "Prussia",
        "Holy Roman Empire",
        "Yugoslavia",
        "Zimbabwe",
    ];
    assert.equal(new Set(names.map(countryColour)).size, names.length);
});
test("labels adapt to bright and dark fills", () => {
    assert.equal(countryTextColour("Unknown"), "#171717");
    assert.equal(countryTextColour("Germany"), "#171717");
    assert.equal(countryTextColour("Scotland"), "#ffffff");
    assert.equal(countryTextColour("France"), "#ffffff");
});
