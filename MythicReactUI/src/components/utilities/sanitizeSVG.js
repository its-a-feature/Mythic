import createDOMPurify from "dompurify";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const purifier = createDOMPurify(window);

// Logos can reference their own gradients, masks and reusable paths. They do
// not need navigation or references to other documents. Use a private purifier
// instance so this policy cannot affect sanitization elsewhere in the UI.
purifier.addHook("uponSanitizeAttribute", (node, attribute) => {
    if (["href", "xlink:href"].includes(attribute.attrName)) {
        const localReference = /^#[^\s#]+$/u.test(attribute.attrValue);
        // Some existing SVG logos embed bitmap artwork. Keep those embedded
        // image bytes, but never permit an embedded SVG or a navigation URL.
        const embeddedBitmap = ["image", "feimage"].includes(node.localName.toLowerCase()) &&
            /^data:image\/(?:png|jpeg|gif|webp|avif);base64,[a-z\d+/=\s]+$/iu.test(attribute.attrValue);
        attribute.keepAttr = localReference || embeddedBitmap;
    }
});

export const sanitizeSVGMarkup = (markup) => {
    if (!purifier.isSupported) throw new Error("SVG sanitization is not supported");
    const document = new DOMParser().parseFromString(markup, "image/svg+xml");
    const svg = document.documentElement;
    if (document.querySelector("parsererror") || svg.localName !== "svg" || svg.namespaceURI !== SVG_NAMESPACE) {
        throw new Error("Invalid SVG image");
    }
    // Sanitize the XML tree and serialize it back as XML. HTML parsing would
    // otherwise risk changing SVG namespaces, mixed-case names or attributes.
    purifier.sanitize(svg, {
        USE_PROFILES: {svg: true, svgFilters: true},
        ADD_TAGS: ["use"],
        FORBID_TAGS: ["script", "foreignObject", "animate", "animateMotion", "animateTransform", "set"],
        FORBID_ATTR: ["xml:base"],
        ALLOW_DATA_ATTR: false,
        IN_PLACE: true,
    });
    return new XMLSerializer().serializeToString(svg);
};

// Fetched response headers do not carry over to blob URLs. Sanitize SVG before
// exposing its blob URL, preserving vectors for graph zooming and SVG export.
export const sanitizeSVG = async (blob) => {
    if (blob.type.split(";")[0].toLowerCase() !== "image/svg+xml") return blob;
    return new Blob([sanitizeSVGMarkup(await blob.text())], {type: "image/svg+xml"});
};
