const INTERACTIVE_FEATURE = "task_response:interactive";
const INTERACTIVE_FEATURE_PREFIX = `${INTERACTIVE_FEATURE}:`;
const INTERACTIVE_PROTOCOLS = new Set(["terminal", "rdp", "vnc"]);

// A command fixes the protocol for the whole task. The legacy unsuffixed
// feature remains terminal, while an explicit suffix is authoritative.
export const getInteractiveTaskProtocol = (task) => {
    const features = task?.command?.supported_ui_features;
    if(!Array.isArray(features)){
        return null;
    }
    let hasLegacyTerminal = false;
    let protocol = null;
    for(const feature of features){
        if(feature === INTERACTIVE_FEATURE){
            hasLegacyTerminal = true;
            continue;
        }
        if(typeof feature !== "string" || !feature.startsWith(INTERACTIVE_FEATURE_PREFIX)){
            continue;
        }
        const candidate = feature.slice(INTERACTIVE_FEATURE_PREFIX.length);
        if(!INTERACTIVE_PROTOCOLS.has(candidate) || (protocol !== null && protocol !== candidate)){
            return null;
        }
        protocol = candidate;
    }
    return protocol ?? (hasLegacyTerminal ? "terminal" : null);
};
