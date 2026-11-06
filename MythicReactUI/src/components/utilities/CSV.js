const escapeCSVCell = (value) => {
    let text = String(value ?? "");
    // CSV quoting alone does not prevent spreadsheets from evaluating formulas.
    // Check past leading whitespace too, since importers may trim it.
    if (/^\s*[=+\-@]|^[\t\r\n]/.test(text)) {
        text = "'" + text;
    }
    return '"' + text.replace(/"/g, '""') + '"';
};

export const serializeTableToCSV = (rows) => {
    if (rows.length === 0) {
        return "";
    }
    const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
    const records = [headers, ...rows.map(row => headers.map(header =>
        Object.prototype.hasOwnProperty.call(row, header) ? row[header] : ""
    ))];
    return records.map(record => record.map(escapeCSVCell).join(",")).join("\r\n");
};
