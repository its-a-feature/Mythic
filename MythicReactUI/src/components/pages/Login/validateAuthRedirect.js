export const validateAuthRedirect = (value) => {
    // Reject control characters before browser URL parsing can normalize them.
    // eslint-disable-next-line no-control-regex
    if (typeof value !== "string" || /[\s\u0000-\u001f\u007f\\]/u.test(value) ||
        !/^https?:\/\/[^/]/i.test(value)) {
        throw new Error("Authentication provider returned an invalid HTTP(S) redirect URL");
    }
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || !url.hostname || url.username || url.password) {
        throw new Error("Authentication provider returned an invalid HTTP(S) redirect URL");
    }
    return url.href;
};
