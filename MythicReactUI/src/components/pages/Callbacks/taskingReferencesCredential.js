import React from 'react';
import {gql, useLazyQuery, useMutation} from '@apollo/client';
import {Box, Button, DialogActions, DialogContent, DialogTitle, TextField, Typography} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import {CredentialInspector, CredentialTable, credentialSearchDataFragment} from '../Search/CredentialTable';
import {CredentialTableNewCredentialDialog} from '../Search/CredentialTableNewCredentialDialog';
import {MythicDialog} from '../../MythicComponents/MythicDialog';
import {MythicStyledTooltip} from '../../MythicComponents/MythicStyledTooltip';
import {snackActions} from "../../utilities/Snackbar";
import {MythicChip} from '../../MythicComponents/MythicChip';

export const credentialReferenceKeyword = "cred";
export const credentialReferenceFields = ["credential", "account", "realm", "type", "subtype", "comment", "id", "custom_display", "credential_identity", "metadata"];

export const credentialReferenceRegex = /@cred:([A-Za-z0-9][A-Za-z0-9_-]*)(?:\.([A-Za-z][A-Za-z0-9_-]*))?/g;
const exactCredentialReferenceRegex = /^@cred:([A-Za-z0-9][A-Za-z0-9_-]*)(?:\.([A-Za-z][A-Za-z0-9_-]*))?$/;
const credentialReferenceFieldSet = new Set(credentialReferenceFields);

export const isCredentialReference = (reference) => reference?.keyword?.toLowerCase() === credentialReferenceKeyword;

const isValidCredentialSelector = (selector) => {
    const id = Number(selector);
    return /^\d+$/.test(selector) && Number.isSafeInteger(id) && id > 0;
}

const isValidCredentialField = (field) => field === "" || credentialReferenceFieldSet.has(field);

const credentialReferenceFromMatch = (match) => {
    const selector = match[1];
    const field = (match[2] || "").toLowerCase();
    if(!isValidCredentialSelector(selector) || !isValidCredentialField(field)){
        return undefined;
    }
    return {
        raw: match[0],
        keyword: credentialReferenceKeyword,
        selector,
        field,
        index: match.index,
    };
}

export const parseCredentialReferences = (value) => {
    const references = [];
    for(const match of String(value || "").matchAll(credentialReferenceRegex)){
        const reference = credentialReferenceFromMatch(match);
        if(reference){
            references.push(reference);
        }
    }
    return references;
}

export const parseExactCredentialReference = (value) => {
    const match = String(value || "").trim().match(exactCredentialReferenceRegex);
    return match ? credentialReferenceFromMatch(match) : undefined;
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

export const getCredentialReferenceFieldValue = (credential, field) => {
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

export const getCredentialReferenceFieldLabel = (field) => {
    return credentialReferenceFieldOptions.find((option) => option.field === field)?.label || field || "Full credential";
}

export const getExpandedCredentialPreview = (credential) => {
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

export const getCredentialTaskReferenceReviewLabel = (reference) => {
    return getCredentialReferenceFieldLabel(reference.field);
}

export const getCredentialTaskReferenceReviewValue = (reference, credential) => {
    if(reference.field === ""){
        return getExpandedCredentialPreview(credential);
    }
    return getCredentialReferenceFieldValue(credential, reference.field);
}

export const getCredentialTaskReferenceCaretContext = (text, cursorPosition) => {
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

export const credentialReferenceSearchQuery = gql`
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

export const credentialReferenceByIdsQuery = gql`
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

export const uniqueCredentialReferenceIDs = (references) => {
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

export const getUnavailableCredentialReferences = (references, credentialsByID) => {
    return references.filter((reference) => isCredentialReference(reference) && !credentialsByID[Number(reference.selector)]);
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
                    <MythicChip size="small" variant="outlined" label={loading ? "Loading" : `${credentials.length} shown`} />
                    {Array.isArray(credentialTypes) && credentialTypes.length > 0 &&
                        <MythicChip size="small" variant="outlined" label={credentialTypes.join(", ")} />
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

export function CredentialReferenceToken({reference, credential}) {
    const [open, setOpen] = React.useState(false);
    const label = credential ? getCredentialDisplayLabel(credential, reference.field) : reference.raw;
    const onClickReference = (e) => {
        e.stopPropagation();
        if(credential){
            setOpen(true);
        } else {
            snackActions.error("Credential either doesn't exist or is deleted");
        }
    }
    return (
        <>
            <MythicStyledTooltip title={reference.raw}>
                <span
                    className={`mythic-reference-token${credential ? "" : " mythic-reference-token-warning"}`}
                    onClick={onClickReference}
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
