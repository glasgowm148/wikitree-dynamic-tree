// Geographic snapshot from UN M49, retrieved 2026-09-28.
// Source: https://unstats.un.org/unsd/methodology/m49/
// Uses the most specific geographic level; Americas split into North/South for continents.
// Includes aliases used by Tree Apps, UK constituent countries, and Taiwan (Eastern Asia).
export const GEOGRAPHIC_REGIONS = Object.freeze({
    "Eastern Africa": Object.freeze({
        continent: "Africa",
        countries:
            "British Indian Ocean Territory|Burundi|Comoros|Djibouti|Eritrea|Ethiopia|French Southern Territories|Kenya|Madagascar|Malawi|Mauritius|Mayotte|Mozambique|Rwanda|Réunion|Seychelles|Somalia|South Sudan|Tanzania|Uganda|United Republic of Tanzania|Zambia|Zimbabwe",
    }),
    "Middle Africa": Object.freeze({
        continent: "Africa",
        countries:
            "Angola|Cameroon|Central African Republic|Chad|Congo|Congo (Brazzaville)|Congo (Kinshasa)|Democratic Republic of the Congo|Equatorial Guinea|Gabon|Sao Tome and Principe",
    }),
    "Northern Africa": Object.freeze({
        continent: "Africa",
        countries: "Algeria|Egypt|Libya|Morocco|Sudan|Tunisia|Western Sahara",
    }),
    "Southern Africa": Object.freeze({
        continent: "Africa",
        countries: "Botswana|Eswatini|Lesotho|Namibia|South Africa",
    }),
    "Western Africa": Object.freeze({
        continent: "Africa",
        countries:
            "Benin|Burkina Faso|Cabo Verde|Cape Verde|Côte d’Ivoire|Gambia|Ghana|Guinea|Guinea-Bissau|Liberia|Mali|Mauritania|Niger|Nigeria|Saint Helena|Senegal|Sierra Leone|Togo",
    }),
    "Antarctica": Object.freeze({ continent: "Antarctica", countries: "Antarctica" }),
    "Central Asia": Object.freeze({
        continent: "Asia",
        countries: "Kazakhstan|Kyrgyzstan|Tajikistan|Turkmenistan|Uzbekistan",
    }),
    "Eastern Asia": Object.freeze({
        continent: "Asia",
        countries:
            "China|China, Hong Kong Special Administrative Region|China, Macao Special Administrative Region|Democratic People's Republic of Korea|Japan|Mongolia|North Korea|Republic of Korea|South Korea|Taiwan",
    }),
    "South-eastern Asia": Object.freeze({
        continent: "Asia",
        countries:
            "Brunei|Brunei Darussalam|Cambodia|Indonesia|Lao People's Democratic Republic|Laos|Malaysia|Myanmar|Philippines|Singapore|Thailand|Timor-Leste|Viet Nam|Vietnam",
    }),
    "Southern Asia": Object.freeze({
        continent: "Asia",
        countries:
            "Afghanistan|Bangladesh|Bhutan|India|Iran|Iran (Islamic Republic of)|Maldives|Nepal|Pakistan|Sri Lanka",
    }),
    "Western Asia": Object.freeze({
        continent: "Asia",
        countries:
            "Armenia|Azerbaijan|Bahrain|Cyprus|Georgia|Iraq|Israel|Jordan|Kuwait|Lebanon|Oman|Palestine|Qatar|Saudi Arabia|State of Palestine|Syria|Syrian Arab Republic|Turkey|Türkiye|United Arab Emirates|Yemen",
    }),
    "Eastern Europe": Object.freeze({
        continent: "Europe",
        countries:
            "Belarus|Bulgaria|Czech Republic|Czechia|Hungary|Moldova|Poland|Republic of Moldova|Romania|Russia|Russian Federation|Slovakia|Ukraine",
    }),
    "Northern Europe": Object.freeze({
        continent: "Europe",
        countries:
            "Denmark|England|Estonia|Faroe Islands|Finland|Guernsey|Iceland|Ireland|Isle of Man|Jersey|Latvia|Lithuania|Northern Ireland|Norway|Scotland|Svalbard and Jan Mayen Islands|Sweden|United Kingdom|United Kingdom of Great Britain and Northern Ireland|Wales|Åland Islands",
    }),
    "Southern Europe": Object.freeze({
        continent: "Europe",
        countries:
            "Albania|Andorra|Bosnia and Herzegovina|Croatia|Gibraltar|Greece|Holy See|Italy|Malta|Montenegro|North Macedonia|Portugal|San Marino|Serbia|Slovenia|Spain|Vatican City",
    }),
    "Western Europe": Object.freeze({
        continent: "Europe",
        countries:
            "Austria|Belgium|France|Germany|Liechtenstein|Luxembourg|Monaco|Netherlands|Netherlands (Kingdom of the)|Switzerland",
    }),
    "Caribbean": Object.freeze({
        continent: "North America",
        countries:
            "Anguilla|Antigua and Barbuda|Aruba|Bahamas|Barbados|Bonaire, Sint Eustatius and Saba|British Virgin Islands|Cayman Islands|Cuba|Curaçao|Dominica|Dominican Republic|Grenada|Guadeloupe|Haiti|Jamaica|Martinique|Montserrat|Puerto Rico|Saint Barthélemy|Saint Kitts and Nevis|Saint Lucia|Saint Martin (French Part)|Saint Vincent and the Grenadines|Sint Maarten (Dutch part)|Trinidad and Tobago|Turks and Caicos Islands|United States Virgin Islands",
    }),
    "Central America": Object.freeze({
        continent: "North America",
        countries: "Belize|Costa Rica|El Salvador|Guatemala|Honduras|Mexico|Nicaragua|Panama",
    }),
    "Northern America": Object.freeze({
        continent: "North America",
        countries: "Bermuda|Canada|Greenland|Saint Pierre and Miquelon|United States|United States of America",
    }),
    "Australia and New Zealand": Object.freeze({
        continent: "Oceania",
        countries:
            "Australia|Christmas Island|Cocos (Keeling) Islands|Heard Island and McDonald Islands|New Zealand|Norfolk Island",
    }),
    "Melanesia": Object.freeze({
        continent: "Oceania",
        countries: "Fiji|New Caledonia|Papua New Guinea|Solomon Islands|Vanuatu",
    }),
    "Micronesia": Object.freeze({
        continent: "Oceania",
        countries:
            "Guam|Kiribati|Marshall Islands|Micronesia|Micronesia (Federated States of)|Naoero|Nauru|Northern Mariana Islands|Palau|United States Minor Outlying Islands",
    }),
    "Polynesia": Object.freeze({
        continent: "Oceania",
        countries:
            "American Samoa|Cook Islands|French Polynesia|Niue|Pitcairn|Samoa|Tokelau|Tonga|Tuvalu|Wallis and Futuna Islands",
    }),
    "South America": Object.freeze({
        continent: "South America",
        countries:
            "Argentina|Bolivia|Bolivia (Plurinational State of)|Bouvet Island|Brazil|Chile|Colombia|Ecuador|Falkland Islands (Malvinas)|French Guiana|Guyana|Paraguay|Peru|South Georgia and the South Sandwich Islands|Suriname|Uruguay|Venezuela|Venezuela (Bolivarian Republic of)",
    }),
});
