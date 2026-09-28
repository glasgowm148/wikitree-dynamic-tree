import test from "node:test";
import assert from "node:assert/strict";
import {
    normaliseCountry,
    buildCountryModel,
    personLabel,
    fullName,
    identityWithheld,
    eventYear,
    fetchAncestors,
    API_FIELDS,
} from "../countryModel.js";
import { fixture } from "./fixture.mjs";
import { GEOGRAPHIC_REGIONS } from "../geographyData.js";
import { groupBirthCountry } from "../geography.js";

const locations = [
    ["Glasgow, Lanarkshire, Scotland, United Kingdom", "Scotland"],
    ["Edinburgh, Midlothian, UK", "Scotland"],
    ["Fife", "Scotland"],
    ["Aberdeen", "Scotland"],
    ["Dundee, Forfarshire", "Scotland"],
    ["Kirkcudbrightshire", "Scotland"],
    ["England", "England"],
    ["York, Yorkshire, Great Britain", "England"],
    ["London, Middlesex", "England"],
    ["London, Ontario, Canada", "Canada"],
    ["Edinburgh, Pennsylvania", "United States"],
    ["York, Maine", "United States"],
    ["Washington, Durham", "England"],
    ["Scotland, Connecticut, United States", "United States"],
    ["Glasgow, Victoria, Australia", "Australia"],
    ["New South Wales, Australia", "Australia"],
    ["Ireland", "Ireland"],
    ["Northern Ireland", "Ireland"],
    ["Republic of Ireland", "Ireland"],
    ["Éire", "Ireland"],
    ["County Cork", "Ireland"],
    ["Co. Antrim", "Ireland"],
    ["Galway, County Galway, U.K.", "Ireland"],
    ["United Kingdom", "UK"],
    ["UK", "UK"],
    ["U.K.", "UK"],
    ["Great Britain", "UK"],
    ["United Kingdom of Great Britain and Northern Ireland", "UK"],
    ["Cardiff, Wales, United Kingdom", "Wales"],
    ["Wales", "Wales"],
    ["Swansea, Glamorganshire, UK", "Wales"],
    ["France", "France"],
    ["Hungary", "Hungary"],
    ["Scotland, Hungary", "Hungary"],
    ["Scotland (United Kingdom)", "Scotland"],
    ["United Kingdom (UK)", "UK"],
    ["Paris, France", "France"],
    ["", "Unknown"],
    ["Unknown", "Unknown"],
    ["Unrecognised hamlet", "Unknown"],
    ["Berlin, Deutschland", "Germany"],
    ["Wien, Österreich", "Austria"],
    ["Geneva, Suisse", "Switzerland"],
    ["Milano, Italia", "Italy"],
    ["Skanderborg, Danmark", "Denmark"],
    ["Berlin, Brandenburg, Prussia", "Prussia"],
    ["Dresden, Heiliges Römisches Reich", "Holy Roman Empire"],
    ["comté de Hainaut, Saint-Empire romain germanique", "Holy Roman Empire"],
    ["Hanoi, Việt Nam", "Vietnam"],
    ["Tokyo, 日本", "Japan"],
    ["Newfoundland", "Canada"],
    ["Sydney, New South Wales", "Australia"],
    ["County Fermanagh", "Ireland"],
    ["Fermanagh", "Ireland"],
    ["Georgia", "Georgia"],
    ["Atlanta, Georgia", "United States"],
    ["Parish, Unidentified Region", "Other"],
];
for (const [location, country] of locations) {
    test(`normalise ${location || "(empty)"} → ${country}`, () =>
        assert.equal(normaliseCountry(location).country, country));
}

test("every geographic country/territory label can be parsed and grouped from a birthplace", () => {
    for (const [region, { continent, countries }] of Object.entries(GEOGRAPHIC_REGIONS)) {
        for (const label of countries.split("|")) {
            for (const location of [label, `Example town, ${label}`]) {
                const { country } = normaliseCountry(location);
                assert.ok(!["Other", "Unknown"].includes(country), location);
                // Bare Georgia is the country; a town with Georgia alone is ambiguous.
                if (label === "Georgia" && location !== label) continue;
                const grouped = country === "UK" ? "United Kingdom" : country;
                assert.equal(groupBirthCountry(grouped, "continent"), continent, location);
                assert.equal(groupBirthCountry(grouped, "region"), region, location);
            }
        }
    }
});

test("public-profile sampling regressions retain recorded text and historical labels", () => {
    const sample = [
        ["Fernie BC Canada", "Canada"],
        ["Hatley, Quebec Canada", "Canada"],
        ["Drahenice 16 Czech Republic", "Czechia"],
        ["Forrest City, NC", "United States"],
        ["Newark, Essex county NJ", "United States"],
        ["Basse-Terre, Guadeloupe", "Guadeloupe"],
        ["Wellington, Cape Colony (South Africa)", "Cape Colony"],
        ["Santa Clara, Ocotlán, Nueva España (Jalisco, México)", "Mexico"],
        ["Lhota, Hradiště Uherské, Morava, Rakousko", "Austria"],
        ["New York Colony", "Province of New York"],
        ["Deutscher Bund", "German Confederation"],
        ["Charlesbourg, Nouvelle France", "New France"],
        ["Repentigny, Province de Québec", "Province of Quebec"],
        ["Waterberg, ZAR", "South African Republic"],
        ["Niederschopfheim, Amt Offenburg, Großherzogtum Baden", "Baden"],
        ["Corleone, Palermo, Sicily", "Italy"],
        ["Kincardine, Bruce, Canada West", "Canada"],
        ["Indiana Territory", "United States"],
        ["Grafton, Worcester, Massachusetts Bay", "United States"],
        ["Berlin, Prussia (Germany)", "Prussia"],
        ["New Jersey USA", "United States"],
        ["Pocahontas,Randolph,Arkansas USA", "United States"],
        ["Floyd, Va.", "United States"],
        ["Graaf-Reinet, Cape Colony", "Cape Colony"],
    ];
    for (const [location, expected] of sample) {
        const result = normaliseCountry(location);
        assert.equal(result.country, expected, location);
        assert.equal(result.birthLocation, location);
        assert.equal(result.missing, false);
    }
});

test("short region codes require context and never override explicit countries", () => {
    for (const code of ["IN", "OR", "ON", "CA", "NC"]) {
        assert.equal(normaliseCountry(code).country, "Unknown", code);
    }
    assert.equal(normaliseCountry("Paris, IN").country, "United States");
    assert.equal(normaliseCountry("London, ON").country, "Canada");
    assert.equal(normaliseCountry("Paris, in").country, "Other");
    assert.equal(normaliseCountry("London, ON, England").country, "England");
    assert.equal(normaliseCountry("London, ON, UK").country, "England");
    assert.equal(normaliseCountry("Example, IN, France").country, "France");
    assert.equal(normaliseCountry("Mexico City").country, "Unknown");
    assert.equal(normaliseCountry("Canadian hamlet").country, "Unknown");
    assert.equal(normaliseCountry("Example, or").country, "Other");
    assert.equal(normaliseCountry("Example, on").country, "Other");
});

test("unrecognised recorded text is not genuinely missing", () => {
    assert.equal(normaliseCountry("Unrecognised hamlet").missing, false);
    assert.equal(normaliseCountry("unknown").missing, true);
});
test("UK inference always on, missing-location inference separate", () => {
    const off = buildCountryModel(fixture, 1, 3, false);
    assert.equal(off.slots.get(5).displayCountry, "Ireland");
    assert.equal(off.slots.get(5).provenance, "inferred");
    assert.equal(off.slots.get(13).displayCountry, "Unknown");
    const on = buildCountryModel(fixture, 1, 3, true);
    assert.equal(on.slots.get(13).displayCountry, "England");
    assert.equal(on.slots.get(13).provenance, "inferred");
    assert.equal(on.slots.get(7).provenance, "explicit");
    assert.equal(on.slots.get(14).displayCountry, "Wales");
});
test("UK-only profiles do not inherit a non-supported country", () => {
    const people = { 1: { BirthLocation: "Wales", Father: 2 }, 2: { BirthLocation: "United Kingdom" } };
    for (const infer of [true, false])
        assert.equal(buildCountryModel(people, 1, 2, infer).slots.get(2).displayCountry, "Unknown");
});
test("nearest specific child works across missing locations and repeated UK-only ancestors", () => {
    const people = {
        1: { BirthLocation: "Scotland", Father: 2 },
        2: { Father: 3 },
        3: { BirthLocation: "UK", Father: 4 },
        4: { BirthLocation: "UK" },
    };
    const off = buildCountryModel(people, 1, 3, false);
    assert.equal(off.slots.get(2).displayCountry, "Unknown");
    assert.equal(off.slots.get(4).displayCountry, "Scotland");
    assert.equal(off.slots.get(4).sourceSlot, 1);
    assert.equal(off.slots.get(8).displayCountry, "Scotland");
    const on = buildCountryModel(people, 1, 4, true);
    assert.equal(on.slots.get(16).displayCountry, "Scotland");
    assert.equal(people[2].BirthLocation, undefined);
});
test("toggle does not overwrite unrecognised recorded places", () => {
    const people = { 1: { BirthLocation: "Scotland", Father: 2 }, 2: { BirthLocation: "Unrecognised hamlet" } };
    assert.equal(buildCountryModel(people, 1, 1, true).slots.get(2).displayCountry, "Unknown");
});
test("parent 50%, grandparent 25%, great-grandparent 12.5%", () => {
    const oneKnown = (depth) => {
        const people = { 1: { Father: 2 } };
        for (let slot = 2; slot <= 2 ** depth; slot *= 2)
            people[slot] = { BirthLocation: slot === 2 ** depth ? "Ireland" : "", Father: slot * 2 };
        return buildCountryModel(people, 1, depth).overallMix.Ireland;
    };
    assert.equal(oneKnown(1), 0.5);
    assert.equal(oneKnown(2), 0.25);
    assert.equal(oneKnown(3), 0.125);
});
test("Irish half and Scottish half give 50/50", () => {
    const people = { 1: { Father: 2, Mother: 3 }, 2: { BirthLocation: "Ireland" }, 3: { BirthLocation: "Scotland" } };
    const mix = buildCountryModel(people, 1, 7, true).overallMix;
    assert.equal(mix.Ireland, 0.5);
    assert.equal(mix.Scotland, 0.5);
});
test("fixture weighting preserves unknown branches", () => {
    const mix = buildCountryModel(fixture, 1, 3).overallMix;
    assert.equal(mix.Ireland, 0.375);
    assert.equal(mix.England, 0.125);
    assert.equal(mix.Unknown, 0.5);
});
test("inference affects percentage shares and recurses through missing slots", () => {
    const mix = buildCountryModel(fixture, 1, 4, true).overallMix;
    assert.equal(mix.Ireland, 0.5);
    assert.equal(mix.England, 0.25);
    assert.equal(mix.Wales, 0.25);
    assert.equal(mix.Unknown, 0);
});
test("pedigree collapse counts each slot, not unique profiles", () => {
    const model = buildCountryModel(fixture, 1, 3);
    assert.equal(model.slots.get(8).person.Id, 8);
    assert.equal(model.slots.get(10).person.Id, 8);
    assert.equal(model.overallMix.Ireland, 3 / 8);
});
test("same UK-only profile resolves differently in different branches", () => {
    const people = {
        1: { Father: 2, Mother: 3 },
        2: { BirthLocation: "Scotland", Father: 4 },
        3: { BirthLocation: "Ireland", Father: 4 },
        4: { BirthLocation: "UK" },
    };
    const model = buildCountryModel(people, 1, 2);
    assert.equal(model.slots.get(4).displayCountry, "Scotland");
    assert.equal(model.slots.get(6).displayCountry, "Ireland");
});
test("all whole-tree and branch shares sum to 100% at 4–8 generations", () => {
    for (let depth = 4; depth <= 8; depth++)
        for (const infer of [false, true]) {
            const model = buildCountryModel(fixture, 1, depth, infer);
            for (const slot of model.slots.keys()) {
                const mix = model.branchMix(slot);
                assert.ok(Math.abs(Object.values(mix).reduce((a, b) => a + b, 0) - 1) < 1e-12);
                assert.ok(Object.values(mix).every((value) => value >= 0));
            }
        }
});
test("negative private IDs preserved; no synthetic WikiTree links or guessed names", () => {
    const people = {
        "1": { Father: -1 },
        "-1": { Id: -1, BirthNamePrivate: "Private Father", Mother: -2 },
        "-2": { Id: -2, BirthNamePrivate: "Private Grandmother" },
    };
    const model = buildCountryModel(people, 1, 2);
    assert.equal(model.slots.get(2).person.Id, -1);
    assert.equal(model.slots.get(5).person.Id, -2);
    assert.equal(fullName(people[-1]), "Private Father");
    assert.equal(personLabel(people[-1], "surname"), "Name withheld");
    assert.equal(people[-1].Name, undefined);
});
test("anonymous public ancestor placeholders are withheld, not labelled private", () => {
    const publicAncestor = { Id: -5, Privacy: 50, Father: 1020, Mother: 699 };
    assert.equal(identityWithheld(publicAncestor), true);
    assert.equal(fullName(publicAncestor), "Name withheld");
    assert.equal(personLabel(publicAncestor, "surname"), "Name withheld");
    assert.equal(publicAncestor.Name, undefined);
    assert.equal(publicAncestor.Id, -5);
});
test("missing names and derived private names do not establish privacy", () => {
    assert.equal(fullName({ Id: 12, Privacy: 50 }), "Name unavailable");
    assert.equal(personLabel({ Id: 12, Privacy: 50 }, "surname"), "Surname unavailable");
    const publicPerson = { Id: 12, Privacy: 50, BirthNamePrivate: "John Glasgow II" };
    assert.equal(fullName(publicPerson), "John Glasgow II");
    assert.equal(personLabel(publicPerson, "surname"), "Surname unavailable");
    assert.equal(identityWithheld(publicPerson), false);
    assert.equal(identityWithheld({ Id: -5, Name: "Example-1" }), false);
    assert.equal(identityWithheld(null), false);
    assert.equal(fullName(null), "Unknown ancestor");
});
test("hover years retain date uncertainty and decade precision", () => {
    assert.equal(eventYear({ BirthDate: "1566-06-19", DeathDate: "1625-03-27" }, "Birth"), "1566");
    assert.equal(eventYear({ DeathDate: "1625-03-27" }, "Death"), "1625");
    assert.equal(eventYear({ BirthDate: "1900-00-00" }, "Birth"), "1900");
    assert.equal(eventYear({ BirthDate: "0000-00-00", BirthDateDecade: "1880s" }, "Birth"), "1880s");
    for (const [status, prefix] of [
        ["guess", "about"],
        ["before", "before"],
        ["after", "after"],
    ]) {
        assert.equal(
            eventYear({ DeathDate: "1900-00-00", DataStatus: { DeathDate: status } }, "Death"),
            `${prefix} 1900`
        );
    }
    assert.equal(eventYear({ DeathDate: "0000-00-00" }, "Death"), "Unknown");
    assert.equal(eventYear({ BirthDateDecade: "unknown" }, "Birth"), "Unknown");
    assert.equal(eventYear(null, "Birth"), "Unknown");
});
test("surname/full/off name modes and fallbacks", () => {
    assert.equal(personLabel(fixture[1], "surname"), "Root");
    assert.equal(personLabel(fixture[1], "full"), "Alex Root");
    assert.equal(personLabel({ LastNameCurrent: "Current" }, "surname"), "Current");
    assert.equal(personLabel({ Name: "Mac Donald-42" }, "surname"), "Mac Donald");
    assert.equal(personLabel(fixture[1], "off"), "");
    assert.equal(fullName(fixture[3]), "Jean Scottish");
});
test("API helper uses required fields and numeric root resolution", async () => {
    const result = await fetchAncestors(
        {
            getPeople: async (appId, key, fields, options) => {
                assert.equal(appId, "BirthCountryFanChart");
                assert.equal(key, "Root-1");
                assert.equal(fields, API_FIELDS);
                assert.equal(options.ancestors, 7);
                return ["", { "Root-1": { Id: 1 } }, fixture];
            },
        },
        "BirthCountryFanChart",
        "Root-1",
        7
    );
    assert.equal(result.rootId, 1);
});
test("redirects resolve the canonical root and its ancestor slots", async () => {
    const canonicalId = 21303918;
    const people = {
        ...fixture,
        [canonicalId]: { Id: canonicalId, Name: "Hofmeijer-7", Father: 2, Mother: 3 },
    };
    for (const key of ["Hofmeyr-85", 10981400]) {
        const result = await fetchAncestors(
            {
                getPeople: async () => [
                    "",
                    { [key]: { Id: 10981400, status: "Redirected to 21303918/Hofmeijer-7" } },
                    people,
                ],
            },
            "BirthCountryFanChart",
            key,
            7
        );
        assert.equal(result.rootId, canonicalId);
        const model = buildCountryModel(result.people, result.rootId, 7);
        assert.equal(model.slots.get(1).person.Name, "Hofmeijer-7");
        assert.equal(model.slots.get(2).person, fixture[2]);
        assert.equal(model.slots.get(3).person, fixture[3]);
    }
});
test("API result keys accept spaces or underscores in surnames", async () => {
    for (const [requested, returned] of [
        ["Van_der_Byl-59", "Van der Byl-59"],
        ["Van der Byl-59", "Van_der_Byl-59"],
    ]) {
        const result = await fetchAncestors(
            { getPeople: async () => ["", { [returned]: { Id: 1 } }, fixture] },
            "BirthCountryFanChart",
            requested,
            7
        );
        assert.equal(result.rootId, 1);
    }
});
test("redirected pagination continues with the canonical profile ID", async () => {
    const requests = [];
    const root = { Id: 21303918, Name: "Hofmeijer-7", Father: 2, Mother: 3 };
    const result = await fetchAncestors(
        {
            getPeople: async (appId, key, fields, options) => {
                requests.push([key, options.start]);
                return requests.length === 1
                    ? [
                          "Maximum number of profiles reached",
                          { 10981400: { Id: 10981400, status: "Redirected to 21303918/Hofmeijer-7" } },
                          { 21303918: root, 2: fixture[2] },
                      ]
                    : ["", { 21303918: { Id: 21303918 } }, { 21303918: root, 3: fixture[3] }];
            },
        },
        "BirthCountryFanChart",
        10981400,
        8
    );
    assert.deepEqual(requests, [
        ["10981400", 0],
        ["21303918", 1000],
    ]);
    assert.equal(result.rootId, root.Id);
    assert.equal(Object.keys(result.people).length, 3);
});
test("malformed redirect statuses remain errors", async () => {
    for (const status of [
        "Redirected to unknown/Hofmeijer-7",
        "Redirected to 0/Hofmeijer-7",
        "Redirected to 21303918junk/Hofmeijer-7",
        "Redirected to 9007199254740993/Hofmeijer-7",
    ]) {
        await assert.rejects(
            fetchAncestors(
                { getPeople: async () => ["", { 1: { Id: 1, status } }, fixture] },
                "BirthCountryFanChart",
                1,
                7
            ),
            /redirect/i
        );
    }
});
test("redirects fail clearly when the canonical profile is missing", async () => {
    await assert.rejects(
        fetchAncestors(
            { getPeople: async () => ["", { 1: { Id: 1, status: "Redirected to 21303918/Hofmeijer-7" } }, fixture] },
            "BirthCountryFanChart",
            1,
            7
        ),
        /redirected WikiTree profile was not returned/i
    );
});
test("pagination excludes repeated starting profile from offset", async () => {
    const offsets = [];
    const result = await fetchAncestors(
        {
            getPeople: async (appId, key, fields, options) => {
                offsets.push(options.start);
                return offsets.length === 1
                    ? ["Maximum number of profiles reached", { 1: { Id: 1 } }, { 1: fixture[1], 2: fixture[2] }]
                    : ["", { 1: { Id: 1 } }, { 1: fixture[1], 3: fixture[3] }];
            },
        },
        "BirthCountryFanChart",
        1,
        8
    );
    assert.deepEqual(offsets, [0, 1000]);
    assert.equal(Object.keys(result.people).length, 3);
});
test("API errors not silently shown as Unknown", async () => {
    for (const response of [
        ["Permission denied", {}, {}],
        ["", { 1: { status: "Private profile" } }, {}],
    ]) {
        await assert.rejects(fetchAncestors({ getPeople: async () => response }, "BirthCountryFanChart", 1, 7));
    }
});
test("stale/closed request ignores result and stops pagination", async () => {
    let current = true,
        calls = 0;
    const result = await fetchAncestors(
        {
            getPeople: async () => {
                calls++;
                current = false;
                return ["Maximum number of profiles reached", {}, fixture];
            },
        },
        "BirthCountryFanChart",
        1,
        7,
        () => current
    );
    assert.equal(result, null);
    assert.equal(calls, 1);
});

test("named countries propagate through missing slots and weighted shares", () => {
    const people = { 1: { Father: 2, Mother: 3 }, 2: { BirthLocation: "France" }, 3: { BirthLocation: "Deutschland" } };
    const model = buildCountryModel(people, 1, 7, true);
    assert.equal(model.overallMix.France, 0.5);
    assert.equal(model.overallMix.Germany, 0.5);
    assert.equal(model.overallMix.Other, 0);
    assert.ok(model.countries.includes("France") && model.countries.includes("Germany"));
    assert.equal(model.slots.get(4).displayCountry, "France");
    assert.equal(model.slots.get(4).provenance, "inferred");
    assert.equal(model.branchMix(3).Germany, 1);
});

test("foreign UK-only child does not resolve a UK constituent country", () => {
    const people = { 1: { BirthLocation: "France", Father: 2 }, 2: { BirthLocation: "UK" } };
    assert.equal(buildCountryModel(people, 1, 1, true).slots.get(2).displayCountry, "Unknown");
});
