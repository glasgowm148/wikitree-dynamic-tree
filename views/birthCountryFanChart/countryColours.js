// Stable across roots, generations and toggles. Preserve the original three country colours.
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

function rgbForCountry(country) {
    const hex = fixed[country];
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

export function countryColour(country) {
    return (
        fixed[country] ||
        "#" +
            rgbForCountry(country)
                .map((value) => value.toString(16).padStart(2, "0"))
                .join("")
    );
}

export function countryTextColour(country) {
    const [r, g, b] = rgbForCountry(country).map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // Pick the greater of white/black contrast ratios, including bright gold/yellow fills.
    return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? "#171717" : "#ffffff";
}
