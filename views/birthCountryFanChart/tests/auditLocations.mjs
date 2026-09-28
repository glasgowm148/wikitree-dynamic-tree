// Manual public-API audit, deliberately separate from the offline unit-test suite.
// API contract: https://github.com/wikitree/wikitree-api/blob/main/getPeople.md
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { normaliseCountry } from "../countryModel.js";
import { groupBirthCountry } from "../geography.js";

const args = process.argv.slice(2);
const isFetch = args[0] === "--fetch";
if (isFetch) args.shift();
const file = args[0] || "output/location-audit/random-response.json";
const seed = Number(args[1] || 933);
if (!Number.isSafeInteger(seed) || seed <= 0 || seed > 0xffffffff) throw new Error("Seed must be a positive uint32");

let snapshot;
if (isFetch) {
    const requestedIds = new Set();
    const maxId = 40_000_000;
    let state = seed;
    while (requestedIds.size < 500) {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        requestedIds.add(1 + Math.floor(((state >>> 0) / 2 ** 32) * maxId));
    }
    const response = await fetch("https://api.wikitree.com/api.php", {
        method: "POST",
        body: new URLSearchParams({
            action: "getPeople",
            appId: "BirthCountryFanChartAudit",
            keys: [...requestedIds].join(","),
            fields: "Id,Name,BirthLocation",
        }),
        signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);
    snapshot = {
        fetchedAt: new Date().toISOString(),
        generator: "xorshift32",
        seed,
        maxId,
        requestedIds: [...requestedIds],
        response: await response.json(),
    };
    if (snapshot.response?.[0]?.status) throw new Error(snapshot.response[0].status);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(snapshot, null, 2) + "\n");
} else {
    snapshot = JSON.parse(await readFile(file, "utf8"));
}

const result = snapshot.response?.[0];
if (!result || result.status || !result.people) throw new Error(result?.status || "Missing API people response");
// A name is required to treat a returned record as an accessible public profile.
const returned = Object.values(result.people);
const profiles = returned.filter((person) => person.Name && person.Id > 0);
const rows = profiles.map((person) => ({ profile: person.Name, ...normaliseCountry(person.BirthLocation) }));
const recorded = rows.filter((row) => !row.missing);
const unresolved = recorded.filter((row) => ["Other", "Unknown", "UK"].includes(row.country));
const summary = {
    seed: snapshot.seed,
    maxId: snapshot.maxId,
    requested: snapshot.requestedIds.length,
    returned: returned.length,
    accessibleNamed: profiles.length,
    missingBirthplace: rows.length - recorded.length,
    recordedBirthplace: recorded.length,
    resolved: recorded.length - unresolved.length,
    unresolved: unresolved.length,
    resolutionPercent: Number(((100 * (recorded.length - unresolved.length)) / recorded.length).toFixed(1)),
    unassignedRegion: recorded.filter(
        (row) => groupBirthCountry(row.country === "UK" ? "United Kingdom" : row.country, "region") === "Other"
    ).length,
};
await writeFile(
    file.replace(/\.json$/, "") + ".audit.json",
    JSON.stringify(
        {
            summary,
            limitation:
                "Random numeric IDs in a fixed range; excludes inaccessible and missing profiles. Resolution is not verified accuracy or a globally representative sample.",
            unresolved,
        },
        null,
        2
    ) + "\n"
);
console.log(JSON.stringify(summary, null, 2));
