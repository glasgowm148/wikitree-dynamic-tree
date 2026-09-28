import { GEOGRAPHIC_REGIONS } from "./geographyData.js";

export const GROUPINGS = Object.freeze({ country: "Country", continent: "Continent", region: "Region" });
const geography = new Map();
for (const [region, { continent, countries }] of Object.entries(GEOGRAPHIC_REGIONS)) {
    for (const country of countries.split("|")) geography.set(country, { continent, region });
}

// Historical extensions to the modern UN scheme. Keep spanning states broad rather than
// assigning a modern successor's region to every recorded birthplace in that state.
const historicalRegions = {
    "Northern Europe":
        "Kingdom of Gwynedd|Kingdom of Powys|Kingdom of Scotland|Commonwealth of England|The Protectorate|Kingdom of Great Britain|United Kingdom of Great Britain and Ireland|Lordship of Ireland|Osraige|Airgíalla|Uí Maine|Ailech|Tyrconnell|Tír Eoghain|Magh Luirg|Republic of Connacht|Thomond|Kingdom of Desmond|Clandeboye|Kingdom of Uí Failghe|Kingdom of Leinster|Kingdom of Connacht|Irish Catholic Confederation|Irish soviets|Limerick Soviet|Livonia",
    "Western Europe":
        "Duchy of Brittany|Duchy of Burgundy|Duchy of Normandy|Duchy of Lorraine|Viscounty of Béarn|County of Foix|Paris Commune|Territory of the Saar Basin|Saar Protectorate|Vichy France|Confederation of the Rhine|Duchy of Anhalt|Principality of Reuss-Gera|Grand Duchy of Frankfurt|Baden|Kingdom of Bavaria|Bavarian Soviet Republic|Bremen|Frankfurt|Hamburg|Kingdom of Hanover|Hesse-Homburg|Hesse-Kassel|Hohenzollern-Hechingen|Hohenzollern-Sigmaringen|Holstein|Lippe|Lübeck|Mecklenburg-Schwerin|Mecklenburg-Strelitz|Nassau|Oldenburg|Reuss|Saxe-Altenburg|Saxe-Coburg-Saalfeld|Saxe-Coburg and Gotha|Saxe-Gotha|Saxe-Hildburghausen|Saxe-Lauenburg|Saxe-Meiningen|Saxe-Weimar-Eisenach|Saxony|Schaumburg-Lippe|Schwarzburg-Rudolstadt|Schwarzburg-Sondershausen|Germany Waldeck|Württemberg|Free State of Bottleneck|Old Swiss Confederacy|Helvetic Republic|Rhodanic Republic|Benelux|Duchy of Brabant|Duchy of Bouillon|United Belgian States",
    "Eastern Europe": "Free City of Danzig|Duchy of Warsaw|Kingdom of Bohemia|Kingdom of Hungary|Kingdom of Poland",
    "Southern Europe":
        "Kingdom of Corsica|Corsican Republic|Anglo-Corsican Kingdom|Kingdom of Naples|Kingdom of Sardinia|Kingdom of Sicily|Kingdom of the Two Sicilies|Republic of Venice|Republic of Genoa|Papal States|Grand Duchy of Tuscany|Kingdom of Italy|Kingdom of Lombardy–Venetia|Yugoslavia|Kingdom of Yugoslavia|Socialist Federal Republic of Yugoslavia|Federal Republic of Yugoslavia|Serbia and Montenegro|Kingdom of Serbia|Kingdom of Portugal|Kingdom of Castile|Crown of Castile|Crown of Aragon|Iberian Union",
};
for (const [region, names] of Object.entries(historicalRegions)) {
    for (const country of names.split("|")) geography.set(country, { continent: "Europe", region });
}
for (const country of "Holy Roman Empire|Prussia|Duchy of Prussia|Brandenburg-Prussia|Kingdom of Prussia|German Confederation|German Empire|North German Federation|Austria-Hungary|Austrian Empire|Polish-Lithuanian Commonwealth|Grand Duchy of Lithuania|Angevin Empire|Pomerania".split(
    "|"
)) {
    geography.set(country, { continent: "Europe", region: "Europe (region unspecified)" });
}
for (const country of "New France|Province of New York|Province of Quebec|Province of Massachusetts Bay|Colony of Virginia|Bas-Canada|Lower Canada|Upper Canada|Connecticut Colony|Province of North Carolina|Province of South Carolina|Province of Georgia|Province of Maryland|Province of New Jersey|Province of New Hampshire|Province of Pennsylvania|Colony of Pennsylvania|Delaware Colony|Colony of Rhode Island and Providence Plantations|Province of Carolina".split(
    "|"
)) {
    geography.set(country, { continent: "North America", region: "Northern America" });
}
for (const country of ["South African Republic", "Orange Free State", "Cape Colony", "Rhodesia"]) {
    geography.set(country, { continent: "Africa", region: "Southern Africa" });
}

export function groupBirthCountry(country, grouping = "country") {
    if (grouping === "country" || !GROUPINGS[grouping] || country === "Other" || country === "Unknown") return country;
    return geography.get(country)?.[grouping] || "Other";
}
