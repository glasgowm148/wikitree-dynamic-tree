export function escapeXml(value) {
    return String(value ?? "").replace(
        /[&<>"']/g,
        (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]
    );
}

function lines(value, limit = 44) {
    const output = [""];
    for (const word of String(value).split(/\s+/)) {
        const last = output.length - 1;
        if (output[last] && output[last].length + word.length + 1 > limit) output.push(word);
        else output[last] += (output[last] ? " " : "") + word;
    }
    return output;
}

// chartMarkup is trusted, serialised SVG produced by our renderer; all profile/legend text is escaped.
export function createChartExport({ chartMarkup, title, years, metadata, legend, inferred }) {
    const width = 1600;
    const titleLines = lines(title, 65);
    const chartY = 114 + 40 * (titleLines.length - 1);
    const legendY = chartY + 890;
    const rowHeight = 56;
    const height = legendY + Math.ceil(legend.length / 3) * rowHeight + 70;
    const text = (x, y, value, attrs = "") => `<text x="${x}" y="${y}" ${attrs}>${escapeXml(value)}</text>`;
    const items = legend.map((item, index) => {
        const x = 48 + (index % 3) * 506;
        const y = legendY + Math.floor(index / 3) * rowHeight;
        const labelLines = lines(item.label, 38);
        const label = labelLines.map((line, i) => text(x + 28, y + 16 + i * 19, line, 'font-size="17"')).join("");
        return `<g opacity="${item.dimmed ? 0.35 : 1}"><rect x="${x}" y="${y}" width="16" height="16" rx="3" fill="${escapeXml(item.fill)}" stroke="#233247" stroke-width="0.5"/>${label}${text(x + 457, y + 16, item.percent, 'font-size="17" text-anchor="end" font-weight="600"')}</g>`;
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="#233247">
<title>${escapeXml(title)} — Fan Chart: Birth Country</title>
<desc>${escapeXml(metadata)}. Legend percentages describe the whole tree.</desc>
<style>text{font-family:Arial,Helvetica,sans-serif}.bcfc-person-label{font-family:Arial,Helvetica,sans-serif;font-weight:700;pointer-events:none}.bcfc-inferred{stroke-dasharray:4 3}.bcfc-dimmed{opacity:.12}</style>
<rect width="100%" height="100%" fill="white"/>
${titleLines.map((line, i) => text(48, 56 + i * 40, line, 'font-size="34" font-weight="600"')).join("")}
${text(48, chartY - 32, [years, metadata].filter(Boolean).join(" · "), 'font-size="18" fill="#68768a"')}
<svg x="0" y="${chartY}" width="1600" height="870" viewBox="0 0 1600 870">${chartMarkup}</svg>
${items.join("")}
${text(48, height - 24, `WikiTree · Fan Chart: Birth Country${inferred ? " · Dashed outlines: inferred birthplace" : ""}`, 'font-size="15" fill="#68768a"')}
</svg>`;
    return { svg, width, height };
}

export async function exportPng({ svg, width, height }) {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const scale = Math.min(2, 8192 / height, Math.sqrt(20_000_000 / (width * height)));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Image export is unavailable in this browser.");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return await new Promise((resolve, reject) =>
            canvas.toBlob(
                (blob) => (blob ? resolve(blob) : reject(new Error("Could not create the PNG image."))),
                "image/png"
            )
        );
    } finally {
        URL.revokeObjectURL(url);
    }
}

export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
