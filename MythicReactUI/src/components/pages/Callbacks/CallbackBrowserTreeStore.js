import React from "react";
import {gql, useQuery, useSubscription} from "@apollo/client";
import {getSkewedNow} from "../../utilities/Time";

const browserTreeFragment = gql`
    fragment callbackBrowserTreeData on mythictree {
        comment
        deleted
        task_id
        filemeta {
            id
            agent_file_id
            filename_text
        }
        tags {
            tagtype {
                name
                color
                id
            }
            id
        }
        host
        id
        os
        can_have_children
        has_children
        success
        full_path_text
        display_path_text
        name_text
        timestamp
        parent_path_text
        tree_type
        metadata
        callback {
            id
            display_id
            mythictree_groups
        }
    }
`;

const rootBrowserTreeQuery = gql`
    ${browserTreeFragment}
    query callbackBrowserTreeRoots($tree_type: String!) {
        mythictree(
            where: {parent_path_text: {_eq: ""}, tree_type: {_eq: $tree_type}}
            order_by: {id: asc}
        ) {
            ...callbackBrowserTreeData
        }
    }
`;

const browserTreeSubscription = gql`
    ${browserTreeFragment}
    subscription callbackBrowserTreeStream($now: timestamp!, $tree_type: String!) {
        mythictree_stream(
            batch_size: 1000
            cursor: {initial_value: {timestamp: $now}}
            where: {tree_type: {_eq: $tree_type}}
        ) {
            ...callbackBrowserTreeData
        }
    }
`;

const processTreeSubscription = gql`
    ${browserTreeFragment}
    subscription callbackProcessTreeStream($now: timestamp!) {
        mythictree_stream(
            batch_size: 1000
            cursor: {initial_value: {timestamp: $now}}
            where: {tree_type: {_eq: "process"}, deleted: {_eq: false}}
        ) {
            ...callbackBrowserTreeData
        }
    }
`;

const getGroups = (row) => row?.callback?.mythictree_groups || ["Unknown Callbacks"];

const decodeFilename = (value) => {
    if(!value){return "";}
    try{
        const text = window.atob(value);
        const bytes = Uint8Array.from(text, (character) => character.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    }catch(error){
        try{
            return decodeURIComponent(window.atob(value));
        }catch(secondError){
            return value;
        }
    }
};

const uniqueBy = (values = [], getKey = (value) => value?.id) => {
    const result = [];
    const indexes = new Map();
    values.forEach((value) => {
        const key = getKey(value);
        if(key === undefined || key === null){
            result.push(value);
            return;
        }
        if(indexes.has(key)){
            result[indexes.get(key)] = value;
        }else{
            indexes.set(key, result.length);
            result.push(value);
        }
    });
    return result;
};

const uniquePermissions = (values = []) => uniqueBy(values, (value) => {
    if(value && typeof value === "object"){
        const keys = Object.keys(value).sort();
        return JSON.stringify(value, keys);
    }
    return `${typeof value}:${value}`;
});

const decodeFilemeta = (values = []) => values.map((file) => ({
    ...file,
    filename_text: decodeFilename(file.filename_text),
}));
const uniqueFilemeta = (values = []) => uniqueBy(values).sort((left, right) => left.id - right.id);

const rowFingerprint = (row) => JSON.stringify({
    id: row.id,
    task_id: row.task_id,
    timestamp: row.timestamp,
    deleted: row.deleted,
    success: row.success,
    comment: row.comment,
    has_children: row.has_children,
    metadata: row.metadata,
    tags: (row.tags || []).map((tag) => tag.id),
    filemeta: (row.filemeta || []).map((file) => [file.id, file.filename_text]),
    callback: row.callback?.id,
    callbackGroups: row.callback?.mythictree_groups,
});

const cloneRow = (row, mode) => ({
    ...row,
    metadata: {...(row.metadata || {})},
    tags: uniqueBy(row.tags || []),
    filemeta: mode === "file" ? uniqueFilemeta(decodeFilemeta(row.filemeta || [])) : [...(row.filemeta || [])],
    ...(mode === "process" ? {callbacks: row.callback ? [row.callback] : []} : {}),
});

const mergeFileRow = (existing, row) => {
    const next = {...existing};
    if((existing.task_id ?? -1) <= (row.task_id ?? -1)){
        next.deleted = row.deleted;
    }
    if((existing.success === null || !existing.success) && row.success !== null){
        next.success = row.success;
        next.task_id = row.task_id;
    }
    next.comment = row.comment;
    next.tags = uniqueBy([...(existing.tags || []), ...(row.tags || [])]);
    next.has_children = row.has_children || existing.has_children;
    next.metadata = {...(existing.metadata || {})};
    ["size", "access_time", "modify_time"].forEach((key) => {
        next.metadata[key] = row.metadata?.[key];
    });
    if(row.metadata?.permissions !== undefined && row.metadata?.permissions !== null){
        if(Array.isArray(existing.metadata?.permissions) && Array.isArray(row.metadata.permissions)){
            next.metadata.permissions = uniquePermissions([
                ...existing.metadata.permissions,
                ...row.metadata.permissions,
            ]);
        }else if(Array.isArray(existing.metadata?.permissions) !== Array.isArray(row.metadata.permissions)){
            next.metadata.permissions = row.metadata.permissions;
        }else{
            next.metadata.permissions = {
                ...(existing.metadata?.permissions || {}),
                ...(row.metadata.permissions || {}),
            };
        }
    }
    next.filemeta = uniqueFilemeta([...(existing.filemeta || []), ...decodeFilemeta(row.filemeta || [])]);
    return next;
};

const mergeCustomRow = (existing, row) => {
    if((existing.task_id ?? -1) >= (row.task_id ?? -1)){
        return existing;
    }
    return {
        ...existing,
        deleted: row.deleted,
        success: ((existing.success === null || !existing.success) && row.success !== null) ? row.success : existing.success,
        comment: row.comment,
        tags: uniqueBy(row.tags || []),
        has_children: row.has_children || existing.has_children,
        metadata: {...(existing.metadata || {}), ...(row.metadata || {})},
        display_path_text: row.display_path_text,
        task_id: row.task_id,
    };
};

const mergeProcessRow = (existing, row) => {
    if((existing.task_id ?? -1) <= (row.task_id ?? -1) && row.deleted){
        return null;
    }
    return {
        ...existing,
        has_children: row.has_children || existing.has_children,
        callbacks: uniqueBy([...(existing.callbacks || []), ...(row.callback ? [row.callback] : [])]),
        comment: `${existing.comment || ""}${row.comment || ""}`,
        tags: uniqueBy([...(existing.tags || []), ...(row.tags || [])]),
        metadata: (existing.task_id ?? -1) > (row.task_id ?? -1) ?
            {...(row.metadata || {}), ...(existing.metadata || {})} :
            {...(existing.metadata || {}), ...(row.metadata || {})},
        task_id: Math.max(existing.task_id ?? -1, row.task_id ?? -1),
    };
};

const mergeRow = (existing, row, mode) => {
    if(!existing){
        if(mode === "process" && row.deleted){return null;}
        return cloneRow(row, mode);
    }
    if(mode === "file"){
        return mergeFileRow(existing, row);
    }
    if(mode === "process"){
        return mergeProcessRow(existing, row);
    }
    return mergeCustomRow(existing, row);
};

const cloneMatrixBucket = (matrix, group, host, parent, cloned) => {
    if(!cloned.root){
        matrix = {...matrix};
        cloned.root = true;
    }
    if(!cloned.groups.has(group)){
        matrix[group] = {...(matrix[group] || {})};
        cloned.groups.add(group);
    }
    const hostKey = `${group}\u0000${host}`;
    if(!cloned.hosts.has(hostKey)){
        matrix[group][host] = {...(matrix[group][host] || {})};
        cloned.hosts.add(hostKey);
    }
    const parentKey = `${hostKey}\u0000${parent}`;
    if(!cloned.parents.has(parentKey)){
        matrix[group][host][parent] = {...(matrix[group][host][parent] || {})};
        cloned.parents.add(parentKey);
    }
    return matrix;
};

export const mergeBrowserTreeRows = (entry, rows, mode = entry.mode) => {
    let matrix = entry.matrix;
    let changed = false;
    const changedBuckets = new Set();
    const cloned = {root: false, groups: new Set(), hosts: new Set(), parents: new Set()};

    rows.forEach((row) => {
        const fingerprint = rowFingerprint(row);
        if(entry.fingerprints.get(row.id) === fingerprint){return;}
        entry.fingerprints.set(row.id, fingerprint);
        getGroups(row).forEach((group) => {
            entry.data[group] = entry.data[group] || {};
            entry.data[group][row.host] = entry.data[group][row.host] || {};
            const existing = entry.data[group][row.host][row.full_path_text];
            let next = mergeRow(existing, row, mode);
            if(next === existing){return;}
            const previousParent = existing?.parent_path_text ?? row.parent_path_text ?? "";
            const nextParent = row.parent_path_text ?? previousParent;
            if(next && next.parent_path_text !== nextParent){next = {...next, parent_path_text: nextParent};}
            matrix = cloneMatrixBucket(matrix, group, row.host, previousParent, cloned);
            if(nextParent !== previousParent){
                matrix = cloneMatrixBucket(matrix, group, row.host, nextParent, cloned);
                delete matrix[group][row.host][previousParent][row.full_path_text];
            }
            if(next === null){
                delete entry.data[group][row.host][row.full_path_text];
                delete matrix[group][row.host][previousParent][row.full_path_text];
            }else{
                entry.data[group][row.host][row.full_path_text] = next;
                matrix[group][row.host][nextParent][row.full_path_text] = 1;
            }
            changedBuckets.add(`${group}\u0000${row.host}\u0000${previousParent}`);
            if(nextParent !== previousParent){changedBuckets.add(`${group}\u0000${row.host}\u0000${nextParent}`);}
            changed = true;
        });
    });
    if(changed){entry.matrix = matrix;}
    return {changed, changedBuckets};
};

const createEntry = (mode) => ({
    mode,
    data: {},
    dataRef: {current: {}},
    matrix: {},
    version: 0,
    hydrated: false,
    fingerprints: new Map(),
    loadedScopes: new Set(),
    listeners: new Set(),
    changeListeners: new Set(),
});

export const createCallbackBrowserTreeStore = () => {
    const entries = new Map();
    const getEntry = (treeType, mode = treeType === "process" ? "process" : treeType === "file" ? "file" : "custom") => {
        if(!entries.has(treeType)){
            const entry = createEntry(mode);
            entry.dataRef.current = entry.data;
            entries.set(treeType, entry);
        }
        return entries.get(treeType);
    };
    const publish = (entry) => {
        entry.version += 1;
        entry.listeners.forEach((listener) => listener());
    };
    return {
        getEntry,
        mergeRows(treeType, mode, rows, {notify = false, hydrated = false} = {}){
            const entry = getEntry(treeType, mode);
            const result = mergeBrowserTreeRows(entry, rows, mode);
            if(hydrated){entry.hydrated = true;}
            if(result.changed || hydrated){publish(entry);}
            if(notify && result.changed){
                entry.changeListeners.forEach((listener) => listener(result));
            }
            return {...result, matrix: entry.matrix, data: entry.data};
        },
        setMatrix(treeType, matrix){
            const entry = getEntry(treeType);
            entry.matrix = matrix;
            publish(entry);
        },
        subscribe(treeType, listener){
            const entry = getEntry(treeType);
            entry.listeners.add(listener);
            return () => entry.listeners.delete(listener);
        },
        subscribeToChanges(treeType, listener){
            const entry = getEntry(treeType);
            entry.changeListeners.add(listener);
            return () => entry.changeListeners.delete(listener);
        },
        getSnapshot(treeType){return getEntry(treeType).version;},
        isScopeLoaded(treeType, scope){return getEntry(treeType).loadedScopes.has(scope);},
        markScopeLoaded(treeType, scope){getEntry(treeType).loadedScopes.add(scope);},
    };
};

const CallbackBrowserTreeContext = React.createContext(null);

const getTreeSources = (openTabs) => {
    const sources = new Map();
    openTabs.forEach((tab) => {
        if(tab.tabType === "fileBrowser"){
            sources.set("file", {treeType: "file", mode: "file"});
        }else if(tab.tabType === "processBrowser"){
            sources.set("process", {treeType: "process", mode: "process"});
        }else if(tab.tabType === "customFileBasedBrowser" && tab.customBrowser?.name){
            sources.set(tab.customBrowser.name, {treeType: tab.customBrowser.name, mode: "custom"});
        }
    });
    return [...sources.values()];
};

const CallbackBrowserTreeSource = ({treeType, mode, store}) => {
    const fromNow = React.useRef(getSkewedNow());
    useQuery(rootBrowserTreeQuery, {
        variables: {tree_type: treeType},
        fetchPolicy: "no-cache",
        onCompleted: (data) => store.mergeRows(treeType, mode, data.mythictree || [], {hydrated: true}),
    });
    useSubscription(mode === "process" ? processTreeSubscription : browserTreeSubscription, {
        variables: mode === "process" ? {now: fromNow.current} : {now: fromNow.current, tree_type: treeType},
        fetchPolicy: "no-cache",
        ignoreResults: true,
        onData: ({data}) => store.mergeRows(treeType, mode, data.data?.mythictree_stream || [], {notify: true}),
    });
    return null;
};

export const CallbackBrowserTreeProvider = ({openTabs, children}) => {
    const storeRef = React.useRef();
    if(!storeRef.current){storeRef.current = createCallbackBrowserTreeStore();}
    const sources = React.useMemo(() => getTreeSources(openTabs), [openTabs]);
    return (
        <CallbackBrowserTreeContext.Provider value={storeRef.current}>
            {sources.map((source) => (
                <CallbackBrowserTreeSource key={source.treeType} {...source} store={storeRef.current} />
            ))}
            {children}
        </CallbackBrowserTreeContext.Provider>
    );
};

const emptySubscribe = () => () => {};

export const useCallbackBrowserTree = ({treeType, mode, active, onInactiveChange}) => {
    const store = React.useContext(CallbackBrowserTreeContext);
    if(!store){throw new Error("useCallbackBrowserTree must be used inside CallbackBrowserTreeProvider");}
    store.getEntry(treeType, mode);
    const subscribe = React.useCallback(
        (listener) => active ? store.subscribe(treeType, listener) : emptySubscribe(listener),
        [active, store, treeType]
    );
    React.useSyncExternalStore(
        subscribe,
        React.useCallback(() => store.getSnapshot(treeType), [store, treeType]),
        React.useCallback(() => store.getSnapshot(treeType), [store, treeType]),
    );
    React.useEffect(() => store.subscribeToChanges(treeType, () => {
        if(!active){onInactiveChange?.();}
    }), [active, onInactiveChange, store, treeType]);
    const entry = store.getEntry(treeType, mode);
    return {
        treeRootDataRef: entry.dataRef,
        treeAdjMtx: entry.matrix,
        version: entry.version,
        hydrated: entry.hydrated,
        mergeRows: React.useCallback(
            (rows, options) => store.mergeRows(treeType, mode, rows, options),
            [mode, store, treeType]
        ),
        setTreeAdjMtx: React.useCallback(
            (matrix) => store.setMatrix(treeType, matrix),
            [store, treeType]
        ),
        isScopeLoaded: React.useCallback(
            (scope) => store.isScopeLoaded(treeType, scope),
            [store, treeType]
        ),
        markScopeLoaded: React.useCallback(
            (scope) => store.markScopeLoaded(treeType, scope),
            [store, treeType]
        ),
    };
};

export const getDefaultBrowserSelection = (treeData, matrix, callbackID, preferredHost) => {
    const groups = Object.keys(matrix).sort();
    if(groups.length === 0){return {group: "Default", host: preferredHost || ""};}
    let callbackGroup;
    for(const group of groups){
        for(const hostNodes of Object.values(treeData[group] || {})){
            for(const node of Object.values(hostNodes || {})){
                if(node?.callback?.id === callbackID){callbackGroup = group; break;}
            }
            if(callbackGroup){break;}
        }
        if(callbackGroup){break;}
    }
    const group = callbackGroup || (groups.includes("Default") ? "Default" : groups[0]);
    const hosts = Object.keys(matrix[group] || {}).sort();
    return {group, host: hosts.includes(preferredHost) ? preferredHost : (hosts[0] || preferredHost || "")};
};
