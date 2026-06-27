import React from 'react';
import {gql, useLazyQuery, useMutation} from '@apollo/client';
import {Box, Button, Chip, DialogActions, DialogContent, DialogTitle, TextField, Typography} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import {CredentialInspector, CredentialTable, credentialSearchDataFragment} from '../Search/CredentialTable';
import {CredentialTableNewCredentialDialog} from '../Search/CredentialTableNewCredentialDialog';
import {MythicDialog} from '../../MythicComponents/MythicDialog';
import {MythicStyledTooltip} from '../../MythicComponents/MythicStyledTooltip';
import {snackActions} from "../../utilities/Snackbar";

export const taskReferenceRegex = /@([A-Za-z][A-Za-z0-9_-]*):([A-Za-z0-9][A-Za-z0-9_-]*)(?:\.([A-Za-z][A-Za-z0-9_-]*))?/g;
const exactTaskReferenceRegex = /^@([A-Za-z][A-Za-z0-9_-]*):([A-Za-z0-9][A-Za-z0-9_-]*)(?:\.([A-Za-z][A-Za-z0-9_-]*))?$/;
const credentialReferenceKeyword = "cred";
export const credentialReferenceFields = ["credential", "account", "realm", "type", "subtype", "comment", "id", "custom_display", "credential_identity", "metadata"];
const credentialReferenceFieldSet = new Set(credentialReferenceFields);

const isCredentialReference = (reference) => reference?.keyword?.toLowerCase() === credentialReferenceKeyword;

const taskReferenceProviders = {
    [credentialReferenceKeyword]: {
        validateSelector: (selector) => {
            const id = Number(selector);
            return /^\d+$/.test(selector) && Number.isSafeInteger(id) && id > 0;
        },
        validateField: (field) => field === "" || credentialReferenceFieldSet.has(field),
    },
};

const taskReferenceFromMatch = (match) => {
    const keyword = match[1].toLowerCase();
    const selector = match[2];
    const field = (match[3] || "").toLowerCase();
    const provider = taskReferenceProviders[keyword];
    if(!provider || !provider.validateSelector(selector) || !provider.validateField(field)){
        return undefined;
    }
    return {
        raw: match[0],
        keyword,
        selector,
        field,
        index: match.index,
    };
}

export const parseTaskReferences = (value) => {
    const text = String(value || "");
    const references = [];
    for(const match of text.matchAll(taskReferenceRegex)){
        const reference = taskReferenceFromMatch(match);
        if(reference){
            references.push(reference);
        }
    }
    return references;
}

export const parseExactCredentialReference = (value) => {
    const match = String(value || "").trim().match(exactTaskReferenceRegex);
    const reference = match ? taskReferenceFromMatch(match) : undefined;
    if(!reference || !isCredentialReference(reference)){
        return undefined;
    }
    return reference;
}

export const formatCredentialReference = (credentialID, field) => {
    if(field){
        return `@cred:${credentialID}.${field}`;
    }
    return `@cred:${credentialID}`;
}

export const getCredentialDisplayLabel = (credential, field="") => {
    if(!credential){
        return "credential";
    }
    if((credential.custom_display || "").trim() !== ""){
        const fieldText = field ? ` .${field}` : "";
        return `${credential.custom_display}${fieldText}`;
    }
    const account = credential.account || "-";
    const realm = credential.realm ? `@${credential.realm}` : "";
    const fieldText = field ? ` .${field}` : "";
    return `${account}${realm}${fieldText}`;
}

const credentialReferenceFieldOptions = [
    {field: "", label: "Full credential"},
    {field: "credential", label: "Credential"},
    {field: "account", label: "Account"},
    {field: "realm", label: "Realm"},
    {field: "type", label: "Type"},
    {field: "subtype", label: "Subtype"},
    {field: "comment", label: "Comment"},
    {field: "custom_display", label: "Custom Display"},
    {field: "credential_identity", label: "Credential Identity"},
    {field: "metadata", label: "Metadata"},
    {field: "id", label: "ID"},
];

const getCredentialReferenceFieldOptions = (allowBareReference=false) => {
    if(allowBareReference){
        return credentialReferenceFieldOptions;
    }
    return credentialReferenceFieldOptions.filter((option) => option.field !== "");
}

const formatCredentialReferenceFieldValue = (value) => {
    if(value === undefined || value === null || value === ""){
        return "-";
    }
    if(typeof value === "object"){
        return JSON.stringify(value);
    }
    return `${value}`;
}

const getCredentialReferenceFieldValue = (credential, field) => {
    if(!credential){
        return "Credential unavailable or deleted";
    }
    switch(field){
        case "":
            return `${getCredentialDisplayLabel(credential)} #${credential.id}`;
        case "credential":
            return formatCredentialReferenceFieldValue(credential.credential_text);
        case "id":
            return formatCredentialReferenceFieldValue(credential.id);
        default:
            return formatCredentialReferenceFieldValue(credential[field]);
    }
}

const getCredentialReferenceFieldLabel = (field) => {
    return credentialReferenceFieldOptions.find((option) => option.field === field)?.label || field || "Full credential";
}

const getExpandedCredentialPreview = (credential) => {
    if(!credential){
        return "Credential unavailable or deleted";
    }
    return JSON.stringify({
        id: credential.id,
        account: credential.account || "",
        realm: credential.realm || "",
        type: credential.type || "",
        subtype: credential.subtype || "",
        comment: credential.comment || "",
        credential: credential.credential_text || "",
        metadata: credential.metadata || {},
        credential_identity: credential.credential_identity || {},
        custom_display: credential.custom_display || "",
    }, null, 2);
}

const getTaskReferenceReviewLabel = (reference) => {
    if(!isCredentialReference(reference)){
        return reference.keyword;
    }
    return getCredentialReferenceFieldLabel(reference.field);
}

const getTaskReferenceReviewValue = (reference, credential) => {
    if(!isCredentialReference(reference)){
        return "Unsupported reference";
    }
    if(reference.field === ""){
        return getExpandedCredentialPreview(credential);
    }
    return getCredentialReferenceFieldValue(credential, reference.field);
}

export const getTaskReferenceCaretContext = (text, cursorPosition) => {
    const beforeCursor = String(text || "").slice(0, cursorPosition);
    const fieldMatch = beforeCursor.match(/@cred:(\d+)\.([A-Za-z0-9_-]*)$/);
    if(fieldMatch){
        return {
            type: "credential-field",
            credentialID: Number(fieldMatch[1]),
            partialField: fieldMatch[2] || "",
            start: cursorPosition - fieldMatch[0].length,
            end: cursorPosition,
        };
    }
    const selectorMatch = beforeCursor.match(/@cred:(\d*)$/);
    if(selectorMatch){
        return {
            type: "credential-selector",
            partialSelector: selectorMatch[1] || "",
            start: cursorPosition - selectorMatch[0].length,
            end: cursorPosition,
        };
    }
    return undefined;
}

export const replaceTextRange = (text, start, end, replacement) => {
    return `${String(text || "").slice(0, start)}${replacement}${String(text || "").slice(end)}`;
}

const credentialReferenceSearchQuery = gql`
${credentialSearchDataFragment}
query CredentialReferenceSearch($where: credential_bool_exp!) {
    credential(
        limit: 50,
        order_by: {id: desc},
        where: $where
    ){
        ...credentialSearchData
    }
}
`;

const credentialReferenceByIdsQuery = gql`
${credentialSearchDataFragment}
query CredentialReferenceByIds($ids: [Int!]) {
    credential(where: {id: {_in: $ids}, deleted: {_eq: false}}){
        ...credentialSearchData
    }
}
`;

const credentialReferenceByIdQuery = gql`
${credentialSearchDataFragment}
query CredentialReferenceById($id: Int!) {
    credential(limit: 1, where: {id: {_eq: $id}, deleted: {_eq: false}}){
        ...credentialSearchData
    }
}
`;

const createCredentialReferenceMutation = gql`
mutation CreateCredentialReference($comment: String!, $account: String!, $realm: String!, $type: String!, $subtype: String, $credential: String!, $metadata: jsonb, $custom_display: String) {
    createCredential(account: $account, credential: $credential, comment: $comment, realm: $realm, credential_type: $type, credential_subtype: $subtype, metadata: $metadata, custom_display: $custom_display) {
        status
        error
        id
    }
}
`;

const uniqueCredentialReferenceIDs = (references) => {
    const ids = new Set();
    references.forEach((reference) => {
        if(!isCredentialReference(reference)){
            return;
        }
        const id = Number(reference.selector);
        if(!Number.isNaN(id)){
            ids.add(id);
        }
    });
    return Array.from(ids);
}

const getCredentialReferenceByIdResult = (data) => data?.credential?.[0];

const getUnavailableCredentialReferences = (references, credentialsByID) => {
    return references.filter((reference) => isCredentialReference(reference) && !credentialsByID[Number(reference.selector)]);
}

const taskReferenceVariablesKey = "selected_task_references";

const splitTaskReferenceVariables = (variables) => {
    const {[taskReferenceVariablesKey]: selectedTaskReferences, ...taskVariables} = variables || {};
    return {
        taskVariables,
        selectedTaskReferences: Array.isArray(selectedTaskReferences) ? selectedTaskReferences : [],
    };
}

const selectedTaskReferencesCoverAll = (references, selectedTaskReferences) => {
    if(references.length === 0){
        return false;
    }
    const selectedCounts = selectedTaskReferences.reduce((previous, reference) => {
        previous[reference] = (previous[reference] || 0) + 1;
        return previous;
    }, {});
    for(const reference of references){
        const count = selectedCounts[reference.raw] || 0;
        if(count <= 0){
            return false;
        }
        selectedCounts[reference.raw] = count - 1;
    }
    return true;
}

export function useTaskReferenceSubmitter(createTask) {
    const [pendingVariables, setPendingVariables] = React.useState(null);
    const [pendingReferences, setPendingReferences] = React.useState([]);
    const pendingReviewCancel = React.useRef(null);
    const pendingSelectedTaskReferences = React.useRef([]);
    const [getCredentials, {data, loading: credentialsLoading}] = useLazyQuery(credentialReferenceByIdsQuery, {fetchPolicy: "no-cache"});
    const credentialsByID = React.useMemo(() => {
        return (data?.credential || []).reduce((previous, credential) => {
            previous[credential.id] = credential;
            return previous;
        }, {});
    }, [data]);
    const submitTask = React.useCallback((options) => {
        const {onTaskReferenceReviewCancel, ...taskOptions} = options || {};
        const variables = options?.variables || {};
        const {taskVariables, selectedTaskReferences} = splitTaskReferenceVariables(variables);
        const references = parseTaskReferences(taskVariables.params || "");
        if(taskVariables.resolve_task_references === false || references.length === 0){
            createTask({...taskOptions, variables: taskVariables});
            return;
        }
        if(taskVariables.resolve_task_references === true || selectedTaskReferencesCoverAll(references, selectedTaskReferences)){
            createTask({...taskOptions, variables: {...taskVariables, resolve_task_references: true}});
            return;
        }
        pendingReviewCancel.current = onTaskReferenceReviewCancel || null;
        pendingSelectedTaskReferences.current = selectedTaskReferences;
        setPendingVariables(taskVariables);
        setPendingReferences(references);
        const ids = uniqueCredentialReferenceIDs(references);
        if(ids.length > 0){
            getCredentials({variables: {ids}});
        }
    }, [createTask, getCredentials]);
    const closeDialog = React.useCallback(() => {
        setPendingVariables(null);
        setPendingReferences([]);
        pendingReviewCancel.current = null;
        pendingSelectedTaskReferences.current = [];
    }, []);
    const cancelSubmit = React.useCallback(() => {
        const pendingCancel = pendingReviewCancel.current;
        const variables = pendingSelectedTaskReferences.current.length > 0 ?
            {...(pendingVariables || {}), [taskReferenceVariablesKey]: pendingSelectedTaskReferences.current} :
            pendingVariables;
        closeDialog();
        if(pendingCancel && variables){
            pendingCancel(variables);
        }
    }, [closeDialog, pendingVariables]);
    const confirmSubmit = React.useCallback((resolveReferences) => {
        if(!pendingVariables){
            return;
        }
        createTask({variables: {...pendingVariables, resolve_task_references: resolveReferences}});
        closeDialog();
    }, [closeDialog, createTask, pendingVariables]);
    const dialog = pendingVariables ? (
        <MythicDialog fullWidth={true} maxWidth="md" open={pendingVariables !== null}
                      onClose={cancelSubmit}
                      innerDialog={<TaskReferenceConfirmationDialog
                          variables={pendingVariables}
                          references={pendingReferences}
                          credentialsByID={credentialsByID}
                          loadingCredentials={credentialsLoading}
                          onClose={cancelSubmit}
                          onSubmit={confirmSubmit}
                      />}
        />
    ) : null;
    return {submitTask, dialog};
}

export function TaskReferenceDisplay({text}) {
    const references = React.useMemo(() => parseTaskReferences(text), [text]);
    const credentialIDs = React.useMemo(() => uniqueCredentialReferenceIDs(references), [references]);
    const credentialIDKey = credentialIDs.join(",");
    const [getCredentials, {data}] = useLazyQuery(credentialReferenceByIdsQuery, {fetchPolicy: "cache-first"});

    React.useEffect(() => {
        if(credentialIDs.length > 0){
            getCredentials({variables: {ids: credentialIDs}});
        }
    }, [credentialIDKey, credentialIDs, getCredentials]);

    const credentialsByID = React.useMemo(() => {
        return (data?.credential || []).reduce((previous, credential) => {
            previous[credential.id] = credential;
            return previous;
        }, {});
    }, [data]);

    if(references.length === 0){
        return <>{text}</>;
    }

    const parts = [];
    let lastIndex = 0;
    references.forEach((reference, index) => {
        if(reference.index > lastIndex){
            parts.push(<span key={`text-${index}`}>{String(text || "").slice(lastIndex, reference.index)}</span>);
        }
        const credential = isCredentialReference(reference) ? credentialsByID[Number(reference.selector)] : undefined;
        parts.push(<TaskReferenceToken key={`reference-${index}`} reference={reference} credential={credential} />);
        lastIndex = reference.index + reference.raw.length;
    });
    if(lastIndex < String(text || "").length){
        parts.push(<span key="text-tail">{String(text || "").slice(lastIndex)}</span>);
    }

    return <span className="mythic-reference-display">{parts}</span>;
}

function TaskReferenceInlinePreview({text, credentialsByID}) {
    const previewReferences = parseTaskReferences(text);
    if(previewReferences.length === 0){
        return <>{text}</>;
    }
    const parts = [];
    let lastIndex = 0;
    previewReferences.forEach((reference, index) => {
        if(reference.index > lastIndex){
            parts.push(<span key={`text-${index}`}>{String(text || "").slice(lastIndex, reference.index)}</span>);
        }
        const credential = isCredentialReference(reference) ? credentialsByID[Number(reference.selector)] : undefined;
        parts.push(<TaskReferenceToken key={`reference-${index}`} reference={reference} credential={credential} />);
        lastIndex = reference.index + reference.raw.length;
    });
    if(lastIndex < String(text || "").length){
        parts.push(<span key="text-tail">{String(text || "").slice(lastIndex)}</span>);
    }
    return <>{parts}</>;
}

const formatTaskReferencePreviewParams = (params) => {
    try{
        return JSON.stringify(JSON.parse(params), null, 2);
    }catch(error){
        return params || "";
    }
}

function TaskReferenceConfirmationDialog({variables, references, credentialsByID, loadingCredentials, onClose, onSubmit}) {
    const previewParams = formatTaskReferencePreviewParams(variables?.params || "");
    const unavailableReferences = getUnavailableCredentialReferences(references, credentialsByID);
    const resolveDisabled = loadingCredentials || unavailableReferences.length > 0;
    const showUnavailableMessage = !loadingCredentials && unavailableReferences.length > 0;
    return (
        <>
            <DialogTitle>Review Task References</DialogTitle>
            <DialogContent dividers>
                <Box className="mythic-tasking-reference-review-context">
                    <Typography component="div" className="mythic-tasking-reference-review-command">
                        {variables?.command || "Task"} parameters
                    </Typography>
                    <Box component="pre" className="mythic-tasking-reference-review-preview">
                        <TaskReferenceInlinePreview text={previewParams} credentialsByID={credentialsByID} />
                    </Box>
                </Box>
                <Box className="mythic-tasking-reference-review-list">
                    {references.map((reference, index) => {
                        const credential = isCredentialReference(reference) ? credentialsByID[Number(reference.selector)] : undefined;
                        const resolvedValue = loadingCredentials && !credential ? "Loading" : getTaskReferenceReviewValue(reference, credential);
                        return (
                            <Box key={`${reference.raw}-${index}`} className="mythic-tasking-reference-review-row">
                                <Box className="mythic-tasking-reference-review-row-header">
                                    <TaskReferenceToken reference={reference} credential={credential} />
                                    <Box className="mythic-tasking-reference-review-row-meta">
                                        <Typography component="span" className="mythic-tasking-reference-review-label">
                                            {getTaskReferenceReviewLabel(reference)}
                                        </Typography>
                                        <Typography component="span" className="mythic-tasking-reference-review-raw">
                                            {reference.raw}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Typography component="span" className="mythic-tasking-reference-review-value" title={resolvedValue}>
                                    {resolvedValue}
                                </Typography>
                            </Box>
                        )
                    })}
                </Box>
                {showUnavailableMessage &&
                    <Typography component="div" color="error" className="mythic-tasking-reference-review-raw">
                        One or more credential references are unavailable or deleted.
                    </Typography>
                }
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="outlined" onClick={() => onSubmit(false)}>Send Literal</Button>
                <Button variant="contained" color="success" disabled={resolveDisabled} onClick={() => onSubmit(true)}>Resolve References</Button>
            </DialogActions>
        </>
    )
}

const getCredentialReferenceSearchWhere = ({operation_id, search, credentialTypes}) => {
    const andConditions = [
        {deleted: {_eq: false}},
        {operation_id: {_eq: operation_id}},
        {
            _or: [
                {account: {_ilike: search}},
                {realm: {_ilike: search}},
                {comment: {_ilike: search}},
                {custom_display: {_ilike: search}},
                {type: {_ilike: search}},
                {credential_text: {_ilike: search}},
            ],
        },
    ];
    if(Array.isArray(credentialTypes) && credentialTypes.length > 0){
        andConditions.push({type: {_in: credentialTypes}});
    }
    return {_and: andConditions};
}

export function CredentialReferencePickerDialog({operation_id, credentialTypes, onClose, onSelect}) {
    const [search, setSearch] = React.useState("");
    const [selectedCredential, setSelectedCredential] = React.useState(null);
    const [createCredentialDialogOpen, setCreateCredentialDialogOpen] = React.useState(false);
    const [searchCredentials, {data, loading}] = useLazyQuery(credentialReferenceSearchQuery, {fetchPolicy: "no-cache"});
    const credentials = React.useMemo(() => (data?.credential || []).filter((credential) => !credential.deleted), [data]);
    const credentialTypeKey = React.useMemo(() => Array.isArray(credentialTypes) ? credentialTypes.join(",") : "", [credentialTypes]);
    const newCredentialInitialValues = React.useMemo(() => {
        return Array.isArray(credentialTypes) && credentialTypes.length > 0 ? {type: credentialTypes[0]} : {};
    }, [credentialTypes]);
    const [getCreatedCredential] = useLazyQuery(credentialReferenceByIdQuery, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            const credential = getCredentialReferenceByIdResult(data);
            if(credential){
                setSelectedCredential(credential);
                onSelect(credential);
                return;
            }
            snackActions.error("Failed to load created credential");
        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to load created credential");
        },
    });
    const [createCredential, {loading: createCredentialLoading}] = useMutation(createCredentialReferenceMutation, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            if(data.createCredential.status === "success"){
                snackActions.success("Successfully created new credential");
                getCreatedCredential({variables: {id: data.createCredential.id}});
            }else{
                snackActions.error(data.createCredential.error);
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to create credential");
        },
    });

    React.useEffect(() => {
        if(!operation_id){
            return;
        }
        searchCredentials({
            variables: {
                where: getCredentialReferenceSearchWhere({
                    operation_id,
                    search: `%${search}%`,
                    credentialTypes,
                }),
            },
        });
    }, [operation_id, search, credentialTypeKey, credentialTypes, searchCredentials]);

    React.useEffect(() => {
        if(credentials.length > 0 && (selectedCredential === null || !credentials.some((credential) => credential.id === selectedCredential.id))){
            setSelectedCredential(credentials[0]);
        }
        if(credentials.length === 0){
            setSelectedCredential(null);
        }
    }, [credentials, selectedCredential]);

    const onCreateCredential = ({type, subtype, account, realm, comment, credential, metadata, custom_display}) => {
        createCredential({variables: {type, subtype, account, realm, comment, credential, metadata, custom_display}});
    }

    return (
        <>
            {createCredentialDialogOpen &&
                <MythicDialog fullWidth={true} maxWidth="md" open={createCredentialDialogOpen}
                              onClose={() => setCreateCredentialDialogOpen(false)}
                              innerDialog={<CredentialTableNewCredentialDialog
                                  credentialOptions={credentialTypes}
                                  initialValues={newCredentialInitialValues}
                                  onSubmit={onCreateCredential}
                                  onClose={() => setCreateCredentialDialogOpen(false)}
                              />}
                />
            }
            <DialogTitle>
                Select Credential
                <Button
                    variant="outlined"
                    color="success"
                    style={{float: "right"}}
                    disabled={createCredentialLoading}
                    onClick={() => setCreateCredentialDialogOpen(true)}
                    startIcon={<AddCircleIcon fontSize="small" />}
                >
                    New Credential
                </Button>
            </DialogTitle>
            <DialogContent dividers className="mythic-reference-picker-dialog">
                <Box className="mythic-reference-picker-toolbar">
                    <TextField
                        size="small"
                        fullWidth
                        autoFocus
                        color="secondary"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search credentials"
                    />
                    <Chip size="small" variant="outlined" label={loading ? "Loading" : `${credentials.length} shown`} className="mythic-tasking-reference-chip" />
                    {Array.isArray(credentialTypes) && credentialTypes.length > 0 &&
                        <Chip size="small" variant="outlined" label={credentialTypes.join(", ")} className="mythic-tasking-reference-chip" />
                    }
                </Box>
                <Box className="mythic-reference-picker-body">
                    <CredentialTable
                        credentials={credentials}
                        readOnly={true}
                        onSelectCredential={(credential) => {
                            if(!credential?.deleted){
                                setSelectedCredential(credential);
                            }
                        }}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    color="success"
                    disabled={!selectedCredential || selectedCredential.deleted}
                    onClick={() => {
                        if(selectedCredential && !selectedCredential.deleted){
                            onSelect(selectedCredential);
                        }
                    }}
                    startIcon={<VpnKeyIcon fontSize="small" />}
                >
                    Use Credential
                </Button>
            </DialogActions>
        </>
    )
}

export function CredentialReferenceFieldDialog({credentialID, partialField="", allowBareReference=false, onClose, onSelect}) {
    const [getCredential, {data, loading}] = useLazyQuery(credentialReferenceByIdQuery, {
        fetchPolicy: "cache-first",
        onError: (data) => console.log(data),
    });
    const credential = getCredentialReferenceByIdResult(data);
    const credentialUnavailable = !loading && !credential;
    const normalizedPartial = String(partialField || "").toLowerCase();
    const fieldOptions = getCredentialReferenceFieldOptions(allowBareReference);
    const matchingOptions = fieldOptions.filter((option) => {
        const referenceText = formatCredentialReference(credentialID, option.field).toLowerCase();
        return option.field.toLowerCase().includes(normalizedPartial) ||
            option.label.toLowerCase().includes(normalizedPartial) ||
            referenceText.includes(normalizedPartial);
    });
    const visibleOptions = matchingOptions.length > 0 ? matchingOptions : fieldOptions;
    React.useEffect(() => {
        if(credentialID){
            getCredential({variables: {id: Number(credentialID)}});
        }
    }, [credentialID, getCredential]);
    return (
        <>
            <DialogTitle>Select Credential Reference</DialogTitle>
            <DialogContent dividers>
                <Box className="mythic-tasking-reference-field-list">
                    {visibleOptions.map((option) => {
                        const referenceText = formatCredentialReference(credentialID, option.field);
                        const previewValue = loading && !credential ? "Loading" : getCredentialReferenceFieldValue(credential, option.field);
                        return (
                        <Button
                            key={option.field || "full"}
                            variant="outlined"
                            fullWidth
                            className="mythic-tasking-reference-field-row"
                            disabled={!credential}
                            onClick={() => onSelect(option.field)}
                        >
                            <Box className="mythic-tasking-reference-field-row-content">
                                <Box className="mythic-tasking-reference-field-row-header">
                                    <Typography component="span" className="mythic-tasking-reference-field-row-label">
                                        {option.label}
                                    </Typography>
                                    <Typography component="span" className="mythic-tasking-reference-field-row-reference">
                                        {referenceText}
                                    </Typography>
                                </Box>
                                <Typography component="span" className="mythic-tasking-reference-field-row-value" title={previewValue}>
                                    {previewValue}
                                </Typography>
                            </Box>
                        </Button>
                    )})}
                </Box>
                {credentialUnavailable &&
                    <Typography component="div" color="error">
                        Credential is unavailable or deleted.
                    </Typography>
                }
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
            </DialogActions>
        </>
    )
}

export function TaskReferenceToken({reference, credential}) {
    const [open, setOpen] = React.useState(false);
    const label = credential ? getCredentialDisplayLabel(credential, reference.field) : reference.raw;
    return (
        <>
            <MythicStyledTooltip title={reference.raw}>
                <span
                    className={`mythic-reference-token${credential ? "" : " mythic-reference-token-warning"}`}
                    onClick={() => setOpen(true)}
                >
                    {label}
                </span>
            </MythicStyledTooltip>
            {open &&
                <MythicDialog fullWidth={true} maxWidth="md" open={open}
                    onClose={() => setOpen(false)}
                    innerDialog={
                        credential ? (
                            <CredentialInspector credential={credential} readOnly={true} />
                        ) : (
                            <>
                                <DialogTitle>Credential Reference</DialogTitle>
                                <DialogContent dividers>
                                    <Typography>{reference.raw}</Typography>
                                </DialogContent>
                            </>
                        )
                    }
                />
            }
        </>
    )
}
