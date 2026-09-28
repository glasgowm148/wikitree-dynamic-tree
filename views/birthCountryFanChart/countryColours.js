// Stable across roots, generations and toggles. Preserve the original three country colours.
import { GEOGRAPHIC_REGIONS } from "./geographyData.js";

const regionNames = [...Object.keys(GEOGRAPHIC_REGIONS), "Europe (region unspecified)"];
// Fixed palette selected for separation in sRGB, rather than independently hashed regional hues.
const regionPalette = [
    "#0065bd",
    "#cccc33",
    "#cc33cc",
    "#8f2424",
    "#78dddd",
    "#33cc52",
    "#64248f",
    "#dd7878",
    "#798f24",
    "#7878dd",
    "#8ddd78",
    "#33ccad",
    "#318181",
    "#d185d1",
    "#cc5233",
    "#248f24",
    "#d1c285",
    "#3333cc",
    "#cc3370",
    "#338fcc",
    "#8b46b9",
    "#24248f",
    "#70cc33",
    "#b98b46",
];
const continentNames = ["Europe", "Africa", "Asia", "North America", "South America", "Oceania", "Antarctica"];
// Okabe–Ito palette; geographic modes add patterns as redundant category information.
// https://jfly.uni-koeln.de/color/
const accessiblePalette = ["#0072b2", "#e69f00", "#56b4e9", "#009e73", "#f0e442", "#d55e00", "#cc79a7"];
const fixed = {
    "Scotland": "#0065bd",
    "England": "#d71920",
    "Ireland": "#169b62",
    "Wales": "#b8860b",
    "France": "#7c3aed",
    "Germany": "#dfb52c",
    "Netherlands": "#ea7c16",
    "Denmark": "#00a6a6",
    "Sweden": "#4f46e5",
    "Poland": "#d94698",
    "Italy": "#84b51b",
    "Austria": "#a64b2a",
    "Switzerland": "#b91c1c",
    "Spain": "#b85cce",
    "Portugal": "#317873",
    "Lithuania": "#8f6f43",
    "Prussia": "#5d65a2",
    "Holy Roman Empire": "#9262a4",
    "United States": "#0891b2",
    "Canada": "#e85d75",
    "Australia": "#918f16",
    "Europe": "#0065bd",
    "Africa": "#b8860b",
    "Asia": "#ea7c16",
    "North America": "#169b62",
    "South America": "#7c3aed",
    "Oceania": "#0891b2",
    "Antarctica": "#64748b",
    "Other": "#777777",
    "Unknown": "#ffffff",
};

function rgbForCountry(country, grouping, patterned) {
    if (!["region", "continent"].includes(grouping)) grouping = "country";
    const index = (grouping === "region" ? regionNames : continentNames).indexOf(country);
    const hex =
        patterned === true && grouping !== "country" && index >= 0
            ? accessiblePalette[index % accessiblePalette.length]
            : grouping === "region" && index >= 0
              ? regionPalette[index]
              : fixed[country];
    if (hex) return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
    // FNV-1a yields a deterministic hue; saturation/lightness vary to widen the palette.
    let hash = 2166136261;
    for (const character of country) hash = Math.imul(hash ^ character.codePointAt(0), 16777619) >>> 0;
    const hue = (hash / 2 ** 32) * 360;
    const saturation = (60 + ((hash >>> 8) % 25)) / 100;
    const lightness = (37 + ((hash >>> 16) % 18)) / 100;
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
    const offset = lightness - chroma / 2;
    const sectors = [
        [chroma, x, 0],
        [x, chroma, 0],
        [0, chroma, x],
        [0, x, chroma],
        [x, 0, chroma],
        [chroma, 0, x],
    ];
    return sectors[Math.floor(hue / 60)].map((value) => Math.round((value + offset) * 255));
}

export function countryColour(country, grouping = "country", patterned = false) {
    return (
        "#" +
        rgbForCountry(country, grouping, patterned)
            .map((value) => value.toString(16).padStart(2, "0"))
            .join("")
    );
}

export function countryTextColour(country, grouping = "country", patterned = false) {
    const [r, g, b] = rgbForCountry(country, grouping, patterned).map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // Pick the greater of white/black contrast ratios, including bright gold/yellow fills.
    return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? "#000000" : "#ffffff";
}

export function countryStyle(country, grouping, patterned) {
    const index = (grouping === "region" ? regionNames : continentNames).indexOf(country);
    const pattern =
        patterned === true && ["region", "continent"].includes(grouping) && index >= 0 ? 1 + Math.floor(index / 7) : 0;
    return {
        colour: countryColour(country, grouping, patterned),
        pattern,
        id: pattern ? `bcfc-pattern-${grouping}-${index}` : "",
    };
}

export function patternMarkup({ colour, pattern, id }) {
    if (!pattern) return "";
    const shapes = [
        "",
        '<path d="M-2 2L2-2M0 8L8 0M6 10L10 6"/>',
        '<circle cx="4" cy="4" r="1.3" fill="black"/>',
        '<path d="M0 4H8"/>',
        '<path d="M0 0L8 8M0 8L8 0"/>',
    ];
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="8" height="8"><rect width="8" height="8" fill="${colour}"/><g stroke="black" stroke-width="1" opacity=".2">${shapes[pattern]}</g></pattern>`;
}

export function swatchStyle(style) {
    const backgrounds = [
        "none",
        "repeating-linear-gradient(135deg,transparent 0 4px,#0003 4px 5px)",
        "radial-gradient(#0005 1px,transparent 1.5px)",
        "repeating-linear-gradient(0deg,transparent 0 4px,#0003 4px 5px)",
        "repeating-linear-gradient(45deg,transparent 0 4px,#0003 4px 5px),repeating-linear-gradient(135deg,transparent 0 4px,#0003 4px 5px)",
    ];
    return `background-color:${style.colour};background-image:${backgrounds[style.pattern]};background-size:${style.pattern === 2 ? "8px 8px" : "auto"}`;
}
