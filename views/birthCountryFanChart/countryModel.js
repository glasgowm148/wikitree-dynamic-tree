import { Utils } from "../shared/Utils.js";
import { groupBirthCountry } from "./geography.js";
import {
    countries as countryCatalogue,
    historicalCountries,
    canadaProvincesDetails,
} from "../oneNameTrees/location_data.js";

export const COUNTRIES = Object.freeze(["Scotland", "Ireland", "England", "Other", "Unknown"]);
const HOME_COUNTRIES = ["Scotland", "England", "Ireland"];
const regions = {
    Scotland:
        "aberdeenshire|angus|argyll|argyllshire|ayrshire|banffshire|berwickshire|bute|buteshire|caithness|clackmannanshire|dumfriesshire|dunbartonshire|east lothian|fife|forfarshire|inverness-shire|invernessshire|kincardineshire|kinross-shire|kinrossshire|kirkcudbrightshire|lanarkshire|midlothian|moray|nairnshire|orkney|peeblesshire|perthshire|renfrewshire|ross-shire|ross and cromarty|roxburghshire|selkirkshire|shetland|stirlingshire|sutherland|west lothian|wigtownshire|edinburgh|glasgow|aberdeen|dundee|inverness",
    England:
        "bedfordshire|berkshire|bristol|buckinghamshire|cambridgeshire|cheshire|cornwall|cumberland|cumbria|derbyshire|devon|devonshire|dorset|durham|essex|gloucestershire|hampshire|herefordshire|hertfordshire|huntingdonshire|isle of wight|kent|lancashire|leicestershire|lincolnshire|london|middlesex|norfolk|northamptonshire|northumberland|nottinghamshire|oxfordshire|rutland|shropshire|somerset|staffordshire|suffolk|surrey|sussex|warwickshire|westmorland|wiltshire|worcestershire|yorkshire|york|manchester|birmingham|liverpool|leeds",
    Ireland:
        "antrim|armagh|carlow|cavan|clare|cork|derry|donegal|down|dublin|fermanagh|galway|kerry|kildare|kilkenny|laois|leitrim|limerick|londonderry|longford|louth|mayo|meath|monaghan|offaly|roscommon|sligo|tipperary|tyrone|waterford|westmeath|wexford|wicklow|kings county|queens county|belfast",
    Wales: "wales|cymru|anglesey|breconshire|caernarfonshire|carmarthenshire|cardiganshire|denbighshire|flintshire|glamorgan|glamorganshire|merionethshire|monmouthshire|montgomeryshire|pembrokeshire|radnorshire|cardiff|swansea|powys|gwynedd",
};
const regionSets = Object.fromEntries(Object.entries(regions).map(([key, value]) => [key, new Set(value.split("|"))]));
const uk =
    /^(?:united kingdom|kingdom of great britain|modern united kingdom|great britain|britain|u\.?k\.?|gb|gbr)(?: of great britain and (?:northern )?ireland)?$/;
const missing = /^(?:unknown|not known|not recorded|n\/a|\?|unspecified)$/;
const overseasStates = new Set(
    "alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|district of columbia".split(
        "|"
    )
);

function clean(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[’']/g, "")
        .replace(/\[[^\]]*\]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

// Reuse the existing Tree Apps catalogue, including native names and recorded historical countries.
const countryAliases = new Map();
for (const country of countryCatalogue) {
    const name = country.name === "United States of America" ? "United States" : country.name;
    for (const alias of [country.name, country.nativeName, ...(country.aliases || [])]) {
        if (alias) countryAliases.set(clean(alias), name);
    }
}
for (const country of historicalCountries) {
    // Some upstream entries contain explanatory prose; those are not usable location labels.
    if (!country.includes(",") && !countryAliases.has(clean(country))) countryAliases.set(clean(country), country);
}
const aliases = {
    "Ireland": ["Northern Ireland", "Republic of Ireland", "Irish Free State", "Kingdom of Ireland", "Eire"],
    "Scotland": ["Kingdom of Scotland"],
    "England": ["Kingdom of England", "Commonwealth of England"],
    "Wales": ["Cymru", "Principality of Wales"],
    "France": ["Kingdom of France", "French Republic"],
    "Germany": ["Deutschland", "Modern Germany"],
    "Austria": ["Osterreich", "Erzherzogtum Osterreich"],
    "Netherlands": ["The Netherlands", "Holland", "Nederland", "Nederlanden"],
    "Denmark": ["Danmark"],
    "Switzerland": ["Suisse", "Schweiz", "Svizzera"],
    "Italy": ["Italia"],
    "Poland": ["Polska", "Kingdom of Poland"],
    "Lithuania": ["Grand Duchy of Lithuania"],
    "Belarus": ["Byelorussia", "Belorussia"],
    "Holy Roman Empire": [
        "Heiliges Romisches Reich",
        "Saint-Empire Romain Germanique",
        "Saint Empire Romain Germanique",
        "Heilige Roomse Rijk",
    ],
    "Prussia": ["Prussia", "Preussen", "Preußen", "Kingdom of Prussia", "Duchy of Prussia"],
    "Yugoslavia": ["Yugoslavia"],
    "Czechia": ["Czech Republic"],
    "United States": ["USA", "U.S.A.", "U.S.", "US", "America", "United States of America"],
    "Isle of Man": ["Isle of Man"],
    "Jersey": ["Jersey"],
    "Guernsey": ["Guernsey"],
};
for (const [country, names] of Object.entries(aliases)) {
    for (const alias of [country, ...names]) countryAliases.set(clean(alias), country);
}
const overseasRegions = new Map();
for (const province of canadaProvincesDetails) overseasRegions.set(clean(province.name), "Canada");
overseasRegions.set("newfoundland", "Canada");
for (const region of "new south wales|victoria|queensland|tasmania|western australia|south australia|northern territory|australian capital territory".split(
    "|"
)) {
    overseasRegions.set(region, "Australia");
}
const additionalRegions = {
    Germany:
        "berlin|bayern|bavaria|saxony|sachsen|lower saxony|niedersachsen|thuringia|thuringen|brandenburg|schleswig-holstein",
};
for (const [country, names] of Object.entries(additionalRegions)) {
    regionSets[country] = new Set(names.split("|"));
}

export function sortCountries(names) {
    const first = ["Scotland", "Ireland", "England", "Wales"];
    return [...new Set(names)].sort((a, b) => {
        const rank = (name) =>
            first.includes(name) ? first.indexOf(name) : name === "Other" ? 1000 : name === "Unknown" ? 1001 : 10;
        return rank(a) - rank(b) || a.localeCompare(b);
    });
}

/** Retains named countries rather than collapsing them into Other. Never changes the recorded location. */
export function normaliseCountry(location) {
    const birthLocation = String(location || "").trim();
    if (!birthLocation || missing.test(clean(birthLocation))) {
        return { country: "Unknown", birthLocation, missing: true, reason: "Birth location missing" };
    }
    const parts = clean(birthLocation)
        .replace(/\((scotland|england|ireland|northern ireland|wales|united kingdom|great britain|u\.?k\.?)\)/g, ",$1")
        .split(/[,;]/)
        .map((part) => part.trim())
        .filter(Boolean);
    const sharedCountry = clean(Utils.settingsStyleLocation(birthLocation, "Country"));
    const suffix = parts.filter((part) => !uk.test(part)).at(-1);
    // Explicit country names take priority over regions. Bare Georgia is the country;
    // Georgia with another town component and no country is treated as the US state.
    if (suffix && overseasStates.has(suffix) && (suffix !== "georgia" || parts.length > 1)) {
        return { country: "United States", birthLocation, missing: false, reason: "Recorded overseas state" };
    }
    let hasUK = false;
    for (const part of [...parts].reverse()) {
        if (uk.test(part)) {
            hasUK = true;
            continue;
        }
        let country = countryAliases.get(part);
        if (country) {
            // Historical catalogue names can also be Irish counties (e.g. Fermanagh).
            for (const home of [...HOME_COUNTRIES, "Wales"]) {
                if (regionSets[home].has(part)) country = home;
            }
        }
        if (country && country !== "United Kingdom") {
            return { country, birthLocation, missing: false, reason: "Recorded country" };
        }
    }
    const overseasCountry = overseasRegions.get(suffix);
    if (overseasCountry && !hasUK) {
        return { country: overseasCountry, birthLocation, missing: false, reason: "Recognised overseas region" };
    }
    for (const candidate of [...parts].reverse().concat(sharedCountry)) {
        const region = candidate
            .replace(/^(?:county|co\.?|city of)\s+/, "")
            .replace(/\s+(?:county|city)$/, "")
            .replace(/^(?:east|west|north|south) riding of /, "");
        for (const [country, known] of Object.entries(regionSets)) {
            if (known.has(region))
                return { country, birthLocation, missing: false, reason: "Recognised place in recorded location" };
        }
    }
    if (hasUK) return { country: "UK", birthLocation, missing: false, reason: "UK constituent country unspecified" };
    return {
        country: parts.length > 1 ? "Other" : "Unknown",
        birthLocation,
        missing: false,
        reason: parts.length > 1 ? "Other recorded location" : "Location not recognised",
    };
}

export function fullName(person) {
    if (!person) return "Unknown ancestor";
    return (
        person.BirthName ||
        person.BirthNamePrivate ||
        [person.FirstName || person.RealName, person.LastNameAtBirth || person.LastNameCurrent]
            .filter(Boolean)
            .join(" ") ||
        person.Name ||
        (identityWithheld(person) ? "Name withheld" : "Name unavailable")
    );
}

export function personLabel(person, mode = "full") {
    if (mode === "off") return "";
    if (mode !== "surname") return fullName(person);
    if (!person) return "Unknown ancestor";
    return (
        person.LastNameAtBirth ||
        person.LastNameCurrent ||
        person.Name?.replace(/-\d+$/, "") ||
        (identityWithheld(person) ? "Name withheld" : "Surname unavailable")
    );
}

// Negative IDs are response-local placeholders, including for some public ancestors.
// Missing names and the presence of BirthNamePrivate do not establish profile privacy.
export function identityWithheld(person) {
    return !!person && Number(person.Id) < 0 && !person.Name;
}

export function eventYear(person, event) {
    const field = `${event}Date`;
    const year = String(person?.[field] || "").match(/^(\d{4})(?:-|$)/)?.[1];
    const decade = String(person?.[`${field}Decade`] || "");
    const value = Number(year) > 0 ? String(Number(year)) : /^\d{3}0s$/.test(decade) ? decade : "";
    if (!value) return "Unknown";
    const prefix = { guess: "about ", before: "before ", after: "after " }[person?.DataStatus?.[field]] || "";
    return prefix + value;
}

export function emptyMix(countryNames = COUNTRIES) {
    return Object.fromEntries(countryNames.map((country) => [country, 0]));
}

/** Ahnentafel slots are separate even when their profile IDs repeat. Generation 1 = parents. */
export function buildCountryModel(people, rootId, generations, infer = false, grouping = "country") {
    const slots = new Map();
    const personById = (id) => (id ? people[String(id)] || null : null);
    for (let slot = 1; slot < 2 ** (generations + 1); slot++) {
        const childSlot = slot === 1 ? null : Math.floor(slot / 2);
        const child = slots.get(childSlot);
        const person = slot === 1 ? personById(rootId) : personById(child?.person?.[slot % 2 ? "Mother" : "Father"]);
        const base = normaliseCountry(person?.BirthLocation);
        const sourceSlot = child?.nearestKnownSlot || null;
        const sourceCountry = slots.get(sourceSlot)?.displayCountry;
        let displayCountry = base.country === "UK" ? "Unknown" : base.country;
        let inference = null;
        if (base.country === "UK" && HOME_COUNTRIES.includes(sourceCountry)) {
            displayCountry = sourceCountry;
            inference = "UK-only value inferred from nearest child with a specific country";
        } else if (base.missing && infer && sourceCountry) {
            displayCountry = sourceCountry;
            inference = "Missing birth country inferred from nearest child";
        }
        const node = {
            slot,
            generation: Math.floor(Math.log2(slot)),
            position: slot - 2 ** Math.floor(Math.log2(slot)),
            childSlot,
            person,
            base,
            displayCountry,
            displayGroup: groupBirthCountry(
                grouping !== "country" && base.country === "UK" && displayCountry === "Unknown"
                    ? "United Kingdom"
                    : displayCountry,
                grouping
            ),
            inference,
            sourceSlot: inference ? sourceSlot : null,
            provenance: inference ? "inferred" : displayCountry === "Unknown" ? "unresolved" : "explicit",
            nearestKnownSlot: displayCountry !== "Unknown" ? slot : sourceSlot,
        };
        slots.set(slot, node);
    }
    const countries = sortCountries([
        ...COUNTRIES.map((country) => groupBirthCountry(country, grouping)),
        ...[...slots.values()].map((node) => node.displayGroup),
    ]);
    const mixes = new Map();
    function branchMix(slot) {
        if (mixes.has(slot)) return mixes.get(slot);
        const node = slots.get(slot);
        const mix = emptyMix(countries);
        if (!node || node.generation >= generations || !node.person) {
            mix[node?.displayGroup || "Unknown"] = 1;
        } else {
            const father = branchMix(slot * 2);
            const mother = branchMix(slot * 2 + 1);
            for (const country of countries) mix[country] = (father[country] + mother[country]) / 2;
        }
        mixes.set(slot, mix);
        return mix;
    }
    return { slots, countries, branchMix, overallMix: branchMix(1) };
}

export const API_FIELDS = [
    "Id",
    "Name",
    "FirstName",
    "RealName",
    "LastNameAtBirth",
    "LastNameCurrent",
    "BirthLocation",
    "BirthDate",
    "DeathDate",
    "BirthDateDecade",
    "DeathDateDecade",
    "DataStatus",
    "Father",
    "Mother",
    "Meta",
    "Derived.BirthName",
    "Derived.BirthNamePrivate",
];

/** Uses the framework API wrapper, preserving its login credentials and privacy-filtered fields. */
export async function fetchAncestors(api, appId, personId, generations, isCurrent = () => true) {
    const people = {};
    const options = { ancestors: generations, limit: 1000, start: 0 };
    let rootId = personId;
    let requestKey = String(personId);
    let hasRedirect = false;
    for (let page = 0; page < 3; page++) {
        if (!isCurrent()) return null;
        const response = await api.getPeople(appId, requestKey, API_FIELDS, { ...options });
        if (!isCurrent()) return null;
        const [status = "", byKey = {}, batch = {}] = response || [];
        const rootResult =
            byKey[requestKey] || byKey[requestKey.replaceAll("_", " ")] || byKey[requestKey.replaceAll(" ", "_")];
        const rootStatus = String(rootResult?.status || "");
        const redirect = rootStatus.match(/^Redirected to ([1-9]\d*)(?:\/|$)/);
        if (rootStatus && !redirect) throw new Error(rootStatus);
        if (redirect) {
            // A merged profile's metadata can retain the old Id while people contains only the new Id.
            rootId = Number(redirect[1]);
            if (!Number.isSafeInteger(rootId)) throw new Error("Invalid profile ID in API redirect.");
            requestKey = String(rootId);
            hasRedirect = true;
        } else if (rootResult?.Id) {
            rootId = rootResult.Id;
        }
        const truncated = String(status).startsWith("Maximum number of profiles");
        if (status && !truncated) throw new Error(String(status));
        Object.assign(people, batch);
        if (!truncated) {
            if (hasRedirect && !people[String(rootId)]) {
                throw new Error("The redirected WikiTree profile was not returned by the API.");
            }
            return { people, rootId };
        }
        if (!Object.keys(batch).length) throw new Error("The API returned an empty ancestor page.");
        // The starting profile is repeated on every page; it is not part of the pagination offset.
        options.start += options.limit;
    }
    throw new Error("The API did not return a complete ancestor tree. Try fewer generations.");
}
