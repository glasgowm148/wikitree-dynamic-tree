import { fullName } from "./countryModel.js";

export const FIT_VIEW = Object.freeze({ scale: 1, x: 0, y: 0 });

export function constrainView({ scale, x, y }) {
    scale = Math.max(1, Math.min(6, scale));
    return {
        scale,
        x: Math.max(1600 * (1 - scale), Math.min(0, x)),
        y: Math.max(870 * (1 - scale), Math.min(0, y)),
    };
}

export function zoomView(view, factor, point) {
    const scale = Math.max(1, Math.min(6, view.scale * factor));
    const ratio = scale / view.scale;
    return constrainView({ scale, x: point.x - (point.x - view.x) * ratio, y: point.y - (point.y - view.y) * ratio });
}

export function pinchView(view, oldPoints, newPoints) {
    const distance = (points) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    const centre = (points) => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 });
    const oldCentre = centre(oldPoints);
    const newCentre = centre(newPoints);
    const zoomed = zoomView(view, distance(newPoints) / Math.max(1, distance(oldPoints)), oldCentre);
    return constrainView({
        ...zoomed,
        x: zoomed.x + newCentre.x - oldCentre.x,
        y: zoomed.y + newCentre.y - oldCentre.y,
    });
}

export function parentComparison(model) {
    if (!model) return [];
    const paternal = model.branchMix(2);
    const maternal = model.branchMix(3);
    return model.countries
        .filter((country) => paternal[country] || maternal[country])
        .map((country) => ({ country, paternal: paternal[country] || 0, maternal: maternal[country] || 0 }));
}

export function reviewBirthplaces(slots, grouping) {
    const rows = new Map();
    for (const node of slots.values()) {
        if (!node.person || node.base.missing) continue;
        const country = node.base.country;
        const reason = ["Other", "Unknown"].includes(country)
            ? "Country not recognised"
            : country === "UK"
              ? "UK country unspecified"
              : grouping !== "country" && node.displayGroup === "Other"
                ? "Geographic group not assigned"
                : "";
        if (!reason) continue;
        const key = node.person.Id || node.person.Name || `slot-${node.slot}`;
        if (rows.has(key)) {
            rows.get(key).occurrences++;
        } else {
            rows.set(key, {
                name: fullName(node.person),
                profile: node.person.Name || "",
                location: node.base.birthLocation,
                reason,
                occurrences: 1,
            });
        }
    }
    return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name));
}
