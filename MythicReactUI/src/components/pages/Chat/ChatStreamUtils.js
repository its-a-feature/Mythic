const timestampValue = (timestamp) => {
    if(!timestamp){ return 0; }
    const value = new Date(timestamp).getTime();
    return Number.isNaN(value) ? 0 : value;
};

const newerOrEqual = (incoming, existing) => {
    if(!existing){ return true; }
    const incomingUpdatedAt = timestampValue(incoming.updated_at);
    const existingUpdatedAt = timestampValue(existing.updated_at);
    return incomingUpdatedAt === 0 || existingUpdatedAt === 0 || incomingUpdatedAt >= existingUpdatedAt;
};

const shouldKeepExistingStreamingMessage = (incoming, existing) => {
    if(!incoming || !existing || incoming.id !== existing.id){
        return false;
    }
    const incomingUpdatedAt = timestampValue(incoming.updated_at);
    const existingUpdatedAt = timestampValue(existing.updated_at);
    if(incomingUpdatedAt === 0 || incomingUpdatedAt !== existingUpdatedAt){
        return false;
    }
    if(incoming.deleted || incoming.edited || existing.deleted || existing.edited){
        return false;
    }
    if(existing.author_type !== "ai" || !["pending", "streaming"].includes(existing.status)){
        return false;
    }
    return (incoming.message || "").length < (existing.message || "").length;
};

const rowValuesAreEqual = (left, right) => {
    const keys = new Set([...Object.keys(left || {}), ...Object.keys(right || {})]);
    return [...keys].every((key) => {
        if(left?.[key] === right?.[key]){
            return true;
        }
        if(left?.[key] && right?.[key] && typeof left[key] === "object" && typeof right[key] === "object"){
            return JSON.stringify(left[key]) === JSON.stringify(right[key]);
        }
        return false;
    });
};

export const mergeRowsByID = (current, incoming, sortFunction, limit, preferExistingOnEqual = false) => {
    if(!incoming || incoming.length === 0){
        return current;
    }
    const rowsByID = new Map((current || []).map((row) => [row.id, row]));
    incoming.forEach((row) => {
        const existing = rowsByID.get(row.id);
        const timestampsAreEqual = existing && timestampValue(row.updated_at) === timestampValue(existing.updated_at);
        if(preferExistingOnEqual && timestampsAreEqual){
            return;
        }
        if(newerOrEqual(row, existing)){
            const mergedRow = {...existing, ...row};
            if(shouldKeepExistingStreamingMessage(row, existing)){
                mergedRow.message = existing.message;
            }
            rowsByID.set(row.id, existing && rowValuesAreEqual(existing, mergedRow) ? existing : mergedRow);
        }
    });
    const merged = [...rowsByID.values()].sort(sortFunction);
    const bounded = limit ? merged.slice(-limit) : merged;
    if(current && bounded.length === current.length && bounded.every((row, index) => row === current[index])){
        return current;
    }
    return bounded;
};

export const getProgressivelyVisibleRows = (rows, visibleCount, preserveRow = () => false) => {
    const safeRows = rows || [];
    const startIndex = Math.max(0, safeRows.length - Math.max(0, visibleCount));
    return safeRows.filter((row, index) => index >= startIndex || preserveRow(row));
};

export const getChatMessagePageVariables = (channelID, pageSize, beforeID = null) => ({
    where: {
        channel_id: {_eq: channelID},
        ...(beforeID ? {id: {_lt: beforeID}} : {}),
    },
    limit: pageSize,
});

export const getChatMessagePageInfo = (rows, pageSize, previousOldestID = null) => {
    const pageRows = rows || [];
    const pageOldestID = pageRows.reduce((oldest, row) => (
        oldest === null || row.id < oldest ? row.id : oldest
    ), null);
    return {
        oldestID: pageOldestID === null ? previousOldestID :
            previousOldestID === null ? pageOldestID : Math.min(previousOldestID, pageOldestID),
        hasMore: pageRows.length === pageSize,
    };
};
