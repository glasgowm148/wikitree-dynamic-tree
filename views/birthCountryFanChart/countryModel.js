import { Utils } from "../shared/Utils.js";
import { groupBirthCountry } from "./geography.js";
import { GEOGRAPHIC_REGIONS } from "./geographyData.js";
import {
    countries as countryCatalogue,
    historicalCountries,
    canadaProvincesDetails,
    usStatesDetails,
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
// The upstream catalogue omits some modern countries and many territories. Reuse our
// UN geographic labels as well, without replacing existing native-name aliases.
for (const { countries } of Object.values(GEOGRAPHIC_REGIONS)) {
    for (const country of countries.split("|")) {
        if (!countryAliases.has(clean(country))) countryAliases.set(clean(country), country);
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
    "Austria": ["Osterreich", "Erzherzogtum Osterreich", "Rakousko"],
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
    "Tanzania": ["United Republic of Tanzania"],
    "Congo (Brazzaville)": ["Republic of the Congo", "Congo"],
    "Congo (Kinshasa)": ["Democratic Republic of the Congo"],
    "Côte d’Ivoire": ["Ivory Coast", "Côte d'Ivoire"],
    "North Korea": ["Democratic People's Republic of Korea"],
    "South Korea": ["Republic of Korea"],
    "Brunei": ["Brunei Darussalam"],
    "Laos": ["Lao People's Democratic Republic"],
    "Iran": ["Iran (Islamic Republic of)"],
    "Palestine": ["State of Palestine"],
    "Syria": ["Syrian Arab Republic"],
    "Moldova": ["Republic of Moldova"],
    "Russia": ["Russian Federation"],
    "Netherlands": ["The Netherlands", "Holland", "Nederland", "Nederlanden", "Netherlands (Kingdom of the)"],
    "Vatican City": ["Holy See"],
    "Micronesia": ["Micronesia (Federated States of)"],
    "Nauru": ["Naoero"],
    "Bolivia": ["Bolivia (Plurinational State of)"],
    "Venezuela": ["Venezuela (Bolivarian Republic of)"],
    "China, Hong Kong Special Administrative Region": ["Hong Kong", "Hongkong"],
    "China, Macao Special Administrative Region": ["Macao", "Macau"],
    "Falkland Islands (Malvinas)": ["Falkland Islands"],
    "German Confederation": ["Deutscher Bund"],
    "New France": ["Nouvelle France", "Nouvelle-France"],
    "Province of New York": ["New York Colony"],
    "Province of Quebec": ["Province de Québec"],
    "South African Republic": ["ZAR", "Zuid-Afrikaansche Republiek"],
    "Baden": ["Großherzogtum Baden", "Grand Duchy of Baden"],
    "Cape Colony": ["Kaapkolonie"],
};
for (const [country, names] of Object.entries(aliases)) {
    for (const alias of [country, ...names]) countryAliases.set(clean(alias), country);
}
const overseasRegions = new Map();
for (const province of canadaProvincesDetails) overseasRegions.set(clean(province.name), "Canada");
overseasRegions.set("newfoundland", "Canada");
overseasRegions.set("canada west", "Canada");
overseasRegions.set("canada east", "Canada");
overseasRegions.set("indiana territory", "United States");
overseasRegions.set("massachusetts bay", "United States");
overseasRegions.set("sicily", "Italy");
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
const abbreviatedRegions = new Map([
    ...usStatesDetails.map(({ abbreviation }) => [abbreviation, "United States"]),
    ...canadaProvincesDetails.map(({ abbreviation }) => [abbreviation, "Canada"]),
]);
// Longest first: e.g. Nouvelle France must match before France. Short codes such as
// IN/ON/CA need separate context and must not be treated as arbitrary word suffixes.
const countrySuffixes = [...countryAliases.keys()]
    .filter((alias) => alias.length > 3 || alias === "usa")
    .sort((a, b) => b.length - a.length);

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
    for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i];
        if (uk.test(part)) {
            hasUK = true;
            continue;
        }
        // Some complete UN names themselves contain a comma.
        let country =
            countryAliases.get(parts.slice(i).join(", ")) ||
            countryAliases.get(part) ||
            countryAliases.get(part.replace(/\s*\([^)]*\)/g, "").trim());
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
    // Parenthetical modern locations are useful when the main label is unresolved;
    // a recognised historical country above retains priority over that annotation.
    for (const match of clean(birthLocation).matchAll(/\(([^()]*)\)/g)) {
        for (const part of match[1].split(/[,;]/).reverse()) {
            const country = countryAliases.get(part.trim());
            if (country && country !== "United Kingdom") {
                return { country, birthLocation, missing: false, reason: "Recorded country in annotation" };
            }
        }
    }
    for (const alias of countrySuffixes) {
        if (suffix?.endsWith(` ${alias}`)) {
            let country = countryAliases.get(alias);
            for (const home of [...HOME_COUNTRIES, "Wales"]) {
                if (regionSets[home].has(alias)) country = home;
            }
            if (country !== "United Kingdom") {
                return { country, birthLocation, missing: false, reason: "Recorded country suffix" };
            }
        }
    }
    // Accept uppercase state/province codes only in a multi-component location.
    // Explicit countries and UK markers above take priority over these ambiguous codes.
    const finalComponent = birthLocation.split(/[,;]/).at(-1).trim();
    const abbreviation = (
        finalComponent.match(/\b([A-Z]{2})$/)?.[1] || finalComponent.match(/\b([A-Z][a-z])\.$/)?.[1]
    )?.toUpperCase();
    if (parts.length > 1 && !hasUK && abbreviatedRegions.has(abbreviation)) {
        return {
            country: abbreviatedRegions.get(abbreviation),
            birthLocation,
            missing: false,
            reason: "Recorded state or province abbreviation",
        };
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
