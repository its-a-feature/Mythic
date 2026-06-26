import React from 'react';
import {Button, Chip, IconButton, Link, Typography} from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { MythicDialog, MythicModifyStringDialog } from '../../MythicComponents/MythicDialog';
import {MythicSelectFromRawListDialog} from '../../MythicComponents/MythicSelectFromListDialog';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import { gql, useMutation } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import { copyStringToClipboard } from '../../utilities/Clipboard';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCopy} from '@fortawesome/free-solid-svg-icons';
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import {TagsDisplay, ViewEditTags} from '../../MythicComponents/MythicTag';
import Split from 'react-split';

export const credentialSearchDataFragment = gql`
fragment credentialSearchData on credential{
    account
    comment
    credential_text
    id
    realm
    type
    metadata
    task {
        display_id
        id
        callback {
            id
            host
            display_id
            mythictree_groups
        }
    }
    timestamp
    deleted
    operator {
        username
    }
    tags {
        tagtype {
            name
            color
            id
        }
        id
    }
}
`;

export const parseCredentialMetadata = (metadata) => {
    if(metadata === undefined || metadata === null){
        return {};
    }
    if(typeof metadata === "string"){
        try{
            const parsed = JSON.parse(metadata);
            return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
        }catch(error){
            return {};
        }
    }
    return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
}

export const compactMetadataValue = (value) => {
    if(value === undefined || value === null){
        return "";
    }
    if(typeof value === "object"){
        return JSON.stringify(value);
    }
    return `${value}`;
}

const isPlainObject = (value) => value && typeof value === "object" && !Array.isArray(value);

export const getCredentialValidityChips = (metadata) => {
    const parsedMetadata = parseCredentialMetadata(metadata);
    const validity = parsedMetadata.validity || {};
    const chips = [];
    if(validity.not_yet_valid){
        chips.push({label: "not yet valid", color: "warning"});
    }
    if(validity.expired){
        chips.push({label: "expired", color: "error"});
    }
    if(validity.renew_expired){
        chips.push({label: "renew expired", color: "warning"});
    }
    if(chips.length === 0 && validity.has_lifecycle && validity.valid){
        chips.push({label: "valid", color: "success"});
    }
    return chips;
}

export const getCredentialSourceLabel = (credential) => {
    if(credential?.task){
        return `C-${credential.task.callback?.display_id || "?"} / T-${credential.task.display_id || "?"}`;
    }
    return credential?.operator?.username || "manual";
}

const credentialTypeOptions = [
    "certificate", "cookie", "hash","hex", "key", "plaintext",  "ticket",
];

const credentialSearchSplitStorageKey = "credentialSearchSplitSizes";
const defaultCredentialSearchSplitSizes = [60, 40];

const getStoredCredentialSearchSplitSizes = () => {
    try {
        const storedValue = localStorage.getItem(credentialSearchSplitStorageKey);
        const parsedValue = JSON.parse(storedValue);
        if(Array.isArray(parsedValue) &&
            parsedValue.length === 2 &&
            parsedValue.every((value) => Number.isFinite(value) && value > 10 && value < 90)){
            return parsedValue;
        }
    } catch(error) {
        console.log("failed to parse credential search split sizes");
    }
    return defaultCredentialSearchSplitSizes;
}

const metadataSystemKeys = new Set([
    "kerberos", "not_before", "expires_at", "renew_until", "parsed_at", "parser",
    "parser_warnings", "validity"
]);

const getNestedMetadataObject = (metadata, key) => {
    const value = metadata?.[key];
    return isPlainObject(value) ? value : {};
}

const updateCredentialComment = gql`
mutation updateCommentMutation($credential_id: Int!, $comment: String!){
    update_credential_by_pk(pk_columns: {id: $credential_id}, _set: {comment: $comment}) {
        comment
        id
        operator {
            username
        }
    }
}
`;
const updateCredentialAccount = gql`
mutation updateAccountMutation($credential_id: Int!, $account: String!){
    update_credential_by_pk(pk_columns: {id: $credential_id}, _set: {account: $account}) {
        account
        id
        operator {
            username
        }
    }
}
`;
const updateCredentialRealm = gql`
mutation updateAccountMutation($credential_id: Int!, $realm: String!){
    update_credential_by_pk(pk_columns: {id: $credential_id}, _set: {realm: $realm}) {
        realm
        id
        operator {
            username
        }
    }
}
`;
const updateCredentialType = gql`
mutation updateAccountMutation($credential_id: Int!, $type: String!){
    update_credential_by_pk(pk_columns: {id: $credential_id}, _set: {type: $type}) {
        type
        id
        operator {
            username
        }
    }
}
`;
const updateCredentialCredential = gql`
mutation updateAccountMutation($credential_id: Int!, $credential: bytea!){
    update_credential_by_pk(pk_columns: {id: $credential_id}, _set: {credential_raw: $credential}) {
        credential_text
        id
        operator {
            username
        }
    }
}
`;
export const updateCredentialDeleted = gql`
mutation updateAccountMutation($credential_id: Int!, $deleted: Boolean!){
    update_credential_by_pk(pk_columns: {id: $credential_id}, _set: {deleted: $deleted}) {
        deleted
        id
        operator {
            username
        }
    }
}
`;

export function CredentialTable(props){
    const [credentials, setCredentials] = React.useState([]);
    const [selectedCredentialID, setSelectedCredentialID] = React.useState(null);
    const [credentialSearchSplitSizes, setCredentialSearchSplitSizes] = React.useState(getStoredCredentialSearchSplitSizes);

    React.useEffect( () => {
        const nextCredentials = [...props.credentials];
        setCredentials(nextCredentials);
        setSelectedCredentialID((currentSelectedID) => {
            if(nextCredentials.length === 0){
                return null;
            }
            if(currentSelectedID !== null && nextCredentials.some((credential) => credential.id === currentSelectedID)){
                return currentSelectedID;
            }
            return nextCredentials[0].id;
        });
    }, [props.credentials]);

    const updateCredentialInState = (id, updates) => {
        setCredentials((currentCredentials) => currentCredentials.map((cred) => {
            if(cred.id === id){
                return {...cred, ...updates};
            }
            return {...cred};
        }));
    }
    const onEditComment = ({id, comment, operator}) => {
        updateCredentialInState(id, {comment, operator});
    }
    const onEditAccount = ({id, account, operator}) => {
        updateCredentialInState(id, {account, operator});
    }
    const onEditRealm = ({id, realm, operator}) => {
        updateCredentialInState(id, {realm, operator});
    }
    const onEditType = ({id, type, operator}) => {
        updateCredentialInState(id, {type, operator});
    }
    const onEditCredential = ({id, credential_text, operator}) => {
        updateCredentialInState(id, {credential_text, operator});
    }
    const onEditDeleted = ({id, deleted, operator}) => {
        updateCredentialInState(id, {deleted, operator});
    }
    const onCredentialSearchSplitDragEnd = React.useCallback((sizes) => {
        setCredentialSearchSplitSizes(sizes);
        localStorage.setItem(credentialSearchSplitStorageKey, JSON.stringify(sizes));
    }, []);
    const selectedCredential = credentials.find((credential) => credential.id === selectedCredentialID) || null;

    return (
        <Split
            direction="horizontal"
            className="mythic-credential-search"
            sizes={credentialSearchSplitSizes}
            minSize={[420, 360]}
            gutterSize={8}
            snapOffset={0}
            onDragEnd={onCredentialSearchSplitDragEnd}>
            <div className="mythic-credential-search-results">
                <TableContainer className="mythic-credential-search-table-wrap">
                    <Table stickyHeader size="small" className="mythic-credential-search-table">
                        <TableHead>
                            <TableRow>
                                <TableCell style={{width: "5.25rem"}}>ID</TableCell>
                                <TableCell>Account / Realm</TableCell>
                                <TableCell style={{width: "7rem"}}>Type</TableCell>
                                <TableCell style={{width: "10rem"}}>Validity</TableCell>
                                <TableCell style={{width: "9rem"}}>Source</TableCell>
                                <TableCell style={{width: "9rem"}}>Tags</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {credentials.map((credential) => (
                                <CredentialSearchRow
                                    key={"cred" + credential.id}
                                    credential={credential}
                                    selected={selectedCredentialID === credential.id}
                                    onSelect={() => {
                                        setSelectedCredentialID(credential.id);
                                        if(props.onSelectCredential){
                                            props.onSelectCredential(credential);
                                        }
                                    }}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
            <CredentialInspector
                credential={selectedCredential}
                me={props.me}
                onEditComment={onEditComment}
                onEditAccount={onEditAccount}
                onEditRealm={onEditRealm}
                onEditCredential={onEditCredential}
                onEditDeleted={onEditDeleted}
                onEditType={onEditType}
                readOnly={props.readOnly}
            />
        </Split>
    )
}

export function CredentialSearchRow({credential, selected, onSelect}){
    const parsedMetadata = parseCredentialMetadata(credential.metadata);
    const validityChips = getCredentialValidityChips(credential.metadata);
    const sourceLabel = getCredentialSourceLabel(credential);
    const tagCount = credential.tags?.length || 0;
    const hasComment = (credential.comment || "").trim().length > 0;
    const hasMetadata = Object.keys(parsedMetadata).length > 0;

    return (
        <TableRow
            hover
            selected={selected}
            className={`mythic-credential-search-row ${selected ? "mythic-credential-search-row-selected" : ""}`}
            onClick={onSelect}>
            <TableCell>
                <div className="mythic-credential-search-id-cell">
                    <span className="mythic-credential-search-id">#{credential.id}</span>
                    {credential.deleted &&
                        <Chip size="small" color="warning" variant="outlined" label="deleted" className="mythic-credential-search-mini-chip" />
                    }
                </div>
            </TableCell>
            <TableCell>
                <div className="mythic-credential-search-primary-cell">
                    <span title={credential.account || ""}>{credential.account || "-"}</span>
                    <span title={credential.realm || ""}>{credential.realm || "-"}</span>
                    <span className="mythic-credential-search-row-flags">
                        {hasComment && <Chip size="small" variant="outlined" label="comment" className="mythic-credential-search-mini-chip" />}
                        {hasMetadata && <Chip size="small" variant="outlined" label="metadata" className="mythic-credential-search-mini-chip" />}
                    </span>
                </div>
            </TableCell>
            <TableCell>
                <Chip size="small" variant="outlined" label={credential.type || "unknown"} className="mythic-credential-search-type-chip" />
            </TableCell>
            <TableCell>
                <div className="mythic-credential-search-chip-list">
                    {validityChips.length > 0 ? (
                        validityChips.slice(0, 2).map((chip) => (
                            <Chip key={chip.label} size="small" color={chip.color} variant="outlined" label={chip.label} className="mythic-credential-search-mini-chip" />
                        ))
                    ) : (
                        <span className="mythic-credential-search-muted">-</span>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <span className="mythic-credential-search-source" title={sourceLabel}>{sourceLabel}</span>
            </TableCell>
            <TableCell>
                <div className="mythic-credential-search-tag-summary">
                    {tagCount > 0 ? (
                        <div className="mythic-tag-list mythic-tag-list-truncate">
                            <TagsDisplay tags={credential.tags || []}/>
                        </div>
                    ) : (
                        <span className="mythic-credential-search-muted">-</span>
                    )}
                </div>
            </TableCell>
        </TableRow>
    )
}

export function CredentialInspector(props){
    const credential = props.credential;
    const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
    const [editCommentDialogOpen, setEditCommentDialogOpen] = React.useState(false);
    const [editAccountDialogOpen, setEditAccountDialogOpen] = React.useState(false);
    const [editRealmDialogOpen, setEditRealmDialogOpen] = React.useState(false);
    const [editCredentialDialogOpen, setEditCredentialDialogOpen] = React.useState(false);
    const [editTypeDialogOpen, setEditTypeDialogOpen] = React.useState(false);
    const dropdownAnchorRef = React.useRef(null);
    const [openDropdownButton, setOpenDropdownButton] = React.useState(false);

    const [updateComment] = useMutation(updateCredentialComment, {
        onCompleted: (data) => {
            snackActions.success("updated comment");
            if(props.onEditComment){ props.onEditComment(data.update_credential_by_pk); }
        }
    });
    const [updateAccount] = useMutation(updateCredentialAccount, {
        onCompleted: (data) => {
            snackActions.success("updated account");
            if(props.onEditAccount){ props.onEditAccount(data.update_credential_by_pk); }
        }
    });
    const [updateType] = useMutation(updateCredentialType, {
        onCompleted: (data) => {
            snackActions.success("updated credential type");
            if(props.onEditType){ props.onEditType(data.update_credential_by_pk); }
        }
    });
    const [updateRealm] = useMutation(updateCredentialRealm, {
        onCompleted: (data) => {
            snackActions.success("updated realm");
            if(props.onEditRealm){ props.onEditRealm(data.update_credential_by_pk); }
        }
    });
    const [updateCredential] = useMutation(updateCredentialCredential, {
        onCompleted: (data) => {
            snackActions.success("updated credential");
            if(props.onEditCredential){ props.onEditCredential(data.update_credential_by_pk); }
        }
    });
    const [updateDeleted] = useMutation(updateCredentialDeleted, {
        onCompleted: (data) => {
            snackActions.success("updated deleted status");
            if(props.onEditDeleted){ props.onEditDeleted(data.update_credential_by_pk); }
        }
    });

    React.useEffect(() => {
        setOpenDropdownButton(false);
        setOpenDeleteDialog(false);
        setEditCommentDialogOpen(false);
        setEditAccountDialogOpen(false);
        setEditRealmDialogOpen(false);
        setEditCredentialDialogOpen(false);
        setEditTypeDialogOpen(false);
    }, [credential?.id]);

    if(credential === null){
        return (
            <aside className="mythic-credential-search-inspector mythic-credential-search-inspector-empty">
                <VpnKeyIcon fontSize="small" />
                <Typography variant="body2">No credential selected</Typography>
            </aside>
        )
    }

    const parsedMetadata = parseCredentialMetadata(credential.metadata);
    const validity = parsedMetadata.validity || {};
    const validityChips = getCredentialValidityChips(credential.metadata);
    const kerberosMetadata = getNestedMetadataObject(parsedMetadata, "kerberos");
    const kerberosValue = (key) => kerberosMetadata[key];
    const hasKerberosMetadata = parsedMetadata.parser === "kerberos";
    const warningValues = hasKerberosMetadata && Array.isArray(parsedMetadata.parser_warnings) ? parsedMetadata.parser_warnings : [];
    const kerberosSummaryChips = [
        hasKerberosMetadata ? {label: "parser:kerberos"} : null,
        kerberosValue("credential_format") ? {label: `format:${kerberosValue("credential_format")}`} : null,
        kerberosValue("ticket_count") !== undefined ? {label: `tickets:${kerberosValue("ticket_count")}`} : null,
    ].filter(Boolean);
    const kerberosFields = [
        {label: "Client", value: kerberosValue("client_principal")},
        {label: "Service", value: kerberosValue("service_principal")},
        {label: "Auth Time", value: kerberosValue("auth_time")},
        {label: "Start", value: kerberosValue("start_time"), chip: validity.not_yet_valid ? {label: "not yet valid", color: "warning"} : null},
        {label: "End", value: kerberosValue("end_time"), chip: validity.expired ? {label: "expired", color: "error"} : null},
        {label: "Renew Until", value: kerberosValue("renew_until"), chip: validity.renew_expired ? {label: "renew expired", color: "warning"} : null},
        {label: "Client Realm", value: kerberosValue("client_realm")},
        {label: "Service Realm", value: kerberosValue("service_realm")},
        {label: "Key Type", value: kerberosValue("key_type")},
        {label: "Flags", value: kerberosValue("flags"), code: true},
    ].filter(({value, chip}) => (value !== undefined && value !== null && `${value}` !== "") || chip);
    const showKerberosSection = hasKerberosMetadata;
    const pureMetadataEntries = Object.entries(parsedMetadata)
        .filter(([key, value]) => !metadataSystemKeys.has(key) && value !== undefined && value !== null);
    const pureMetadata = Object.fromEntries(pureMetadataEntries);

    const onCopyToClipboard = (data) => {
        let result = copyStringToClipboard(data);
        if(result){
            snackActions.success("Copied text!");
        }else{
            snackActions.error("Failed to copy text");
        }
    }
    const onSubmitUpdatedComment = (comment) => {
        updateComment({variables: {credential_id: credential.id, comment: comment}})
    }
    const onSubmitUpdatedAccount = (account) => {
        updateAccount({variables: {credential_id: credential.id, account: account}})
    }
    const onSubmitUpdatedType = (type) => {
        updateType({variables: {credential_id: credential.id, type: type}})
    }
    const onSubmitUpdatedRealm = (realm) => {
        updateRealm({variables: {credential_id: credential.id, realm: realm}})
    }
    const onSubmitUpdatedCredential = (credentialValue) => {
        updateCredential({variables: {credential_id: credential.id, credential: credentialValue}})
    }
    const onAcceptDelete = () => {
        updateDeleted({variables: {credential_id: credential.id, deleted: !credential.deleted}})
    }
    const options =  [
        {name: 'Edit Account', click: () => setEditAccountDialogOpen(true)},
        {name: "Edit Realm", click: () => setEditRealmDialogOpen(true)},
        {name: "Edit Credential", click: () => setEditCredentialDialogOpen(true)},
        {name: 'Edit Comment', click: () => setEditCommentDialogOpen(true)},
        {name: 'Edit Type', click: () => setEditTypeDialogOpen(true)},
    ];
    const handleMenuItemClick = (event, index) => {
        event.stopPropagation();
        options[index].click(event);
        setOpenDropdownButton(false);
    };
    const handleClose = (event) => {
        if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
            return;
        }
        setOpenDropdownButton(false);
    };

    return (
        <aside className="mythic-credential-search-inspector">
            {openDeleteDialog &&
                <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete} open={openDeleteDialog} acceptText={credential.deleted ? "Restore" : "Remove" }/>
            }
            {editCommentDialogOpen &&
                <MythicDialog fullWidth={true} maxWidth="md" open={editCommentDialogOpen}
                    onClose={()=>{setEditCommentDialogOpen(false);}}
                    innerDialog={<MythicModifyStringDialog onEnter={()=>{}} title="Edit Credential Comment" onSubmit={onSubmitUpdatedComment} value={credential.comment || ""} onClose={()=>{setEditCommentDialogOpen(false);}}
                    multiline={true} maxRows={20}/>}
                />
            }
            {editAccountDialogOpen &&
                <MythicDialog fullWidth={true} maxWidth="md" open={editAccountDialogOpen}
                    onClose={()=>{setEditAccountDialogOpen(false);}}
                    innerDialog={<MythicModifyStringDialog title="Edit Credential Account" onSubmit={onSubmitUpdatedAccount} value={credential.account || ""} onClose={()=>{setEditAccountDialogOpen(false);}} />}
                />
            }
            {editTypeDialogOpen &&
                <MythicDialog fullWidth={true} maxWidth="sm" open={editTypeDialogOpen}
                    onClose={()=>{setEditTypeDialogOpen(false);}}
                    innerDialog={<MythicSelectFromRawListDialog title="Edit Credential Type" onSubmit={onSubmitUpdatedType}
                    options={credentialTypeOptions}
                    onClose={()=>{setEditTypeDialogOpen(false);}} />}
                />
            }
            {editRealmDialogOpen &&
                <MythicDialog fullWidth={true} maxWidth="md" open={editRealmDialogOpen}
                    onClose={()=>{setEditRealmDialogOpen(false);}}
                    innerDialog={<MythicModifyStringDialog title="Edit Credential Realm" onSubmit={onSubmitUpdatedRealm} value={credential.realm || ""} onClose={()=>{setEditRealmDialogOpen(false);}} />}
                />
            }
            {editCredentialDialogOpen &&
                <MythicDialog fullWidth={true} maxWidth="md" open={editCredentialDialogOpen}
                    onClose={()=>{setEditCredentialDialogOpen(false);}}
                    innerDialog={<MythicModifyStringDialog onEnter={()=>{}} title="Edit Credential Value" onSubmit={onSubmitUpdatedCredential} value={credential.credential_text || ""} onClose={()=>{setEditCredentialDialogOpen(false);}}
                    multiline={true} maxRows={20}/>}
                />
            }
            <div className="mythic-credential-search-inspector-header">
                <div className="mythic-credential-search-inspector-title">
                    <VpnKeyIcon fontSize="small" />
                    <span title={`Credential ${credential.id}`}>Credential {credential.id}</span>
                    <Chip size="small" variant="outlined" label={credential.type || "unknown"} className="mythic-credential-search-mini-chip" />
                    {credential.deleted &&
                        <Chip size="small" color="warning" variant="outlined" label="deleted" className="mythic-credential-search-mini-chip" />
                    }
                    {validityChips.map((chip) => (
                        <Chip key={chip.label} size="small" color={chip.color} variant="outlined" label={chip.label} className="mythic-credential-search-mini-chip" />
                    ))}
                </div>
                {!props.readOnly &&
                <div className="mythic-credential-search-inspector-actions">
                    <Button className="mythic-table-row-action" size="small" variant="outlined" ref={dropdownAnchorRef}
                        startIcon={<EditIcon fontSize="small" />}
                        onClick={() => setOpenDropdownButton(true)} >Edit</Button>
                    <Popper open={openDropdownButton} anchorEl={dropdownAnchorRef.current} role={undefined} transition style={{zIndex: 4}}>
                        {({ TransitionProps, placement }) => (
                            <Grow
                                {...TransitionProps}
                                style={{
                                    transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                                }}
                            >
                                <Paper variant="outlined" className={"dropdownMenuColored"}>
                                    <ClickAwayListener onClickAway={handleClose}>
                                        <MenuList id="credential-inspector-edit-menu">
                                            {options.map((option, index) => (
                                                <MenuItem
                                                    key={option.name + index}
                                                    onClick={(event) => handleMenuItemClick(event, index)}
                                                >
                                                    {option.name}
                                                </MenuItem>
                                            ))}
                                        </MenuList>
                                    </ClickAwayListener>
                                </Paper>
                            </Grow>
                        )}
                    </Popper>
                    {credential.deleted ? (
                        <MythicStyledTooltip title="Restore Credential for use in Tasking">
                            <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-success" size="small" onClick={()=>{setOpenDeleteDialog(true);}}><RestoreFromTrashIcon fontSize="small" /></IconButton>
                        </MythicStyledTooltip>
                    ) : (
                        <MythicStyledTooltip title="Delete Credential so it can't be used in Tasking">
                            <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger" size="small" onClick={()=>{setOpenDeleteDialog(true);}}><DeleteIcon fontSize="small" /></IconButton>
                        </MythicStyledTooltip>
                    )}
                </div>
                }
            </div>
            <div className="mythic-credential-search-inspector-body">
                <CredentialInspectorSection title="Identity">
                    <CredentialDetail label="Account" value={credential.account} />
                    <CredentialDetail
                        label="Tasking ID"
                        value={credential.id}
                        code
                        action={
                            <MythicStyledTooltip title={"Copy credential ID for tasking"}>
                                <IconButton className="mythic-credential-search-field-action mythic-table-row-icon-action mythic-table-row-icon-action-info" onClick={() => onCopyToClipboard(String(credential.id))} size="small">
                                    <FontAwesomeIcon icon={faCopy}/>
                                </IconButton>
                            </MythicStyledTooltip>
                        }
                    />
                    <CredentialDetail label="Realm" value={credential.realm} />
                    <CredentialDetail label="Type" value={credential.type} />
                </CredentialInspectorSection>
                {showKerberosSection &&
                    <CredentialInspectorSection title="Kerberos">
                        {kerberosSummaryChips.length > 0 &&
                            <div className="mythic-credential-search-chip-list mythic-credential-search-section-chips">
                                {kerberosSummaryChips.map((chip) => (
                                    <Chip key={chip.label} size="small" variant="outlined" label={chip.label} className="mythic-credential-search-mini-chip" />
                                ))}
                            </div>
                        }
                        {kerberosFields.map((field) => (
                            <CredentialDetail key={field.label} label={field.label} value={field.value} chip={field.chip} wide={field.label === "Client" || field.label === "Service"} code={field.code || field.label === "Client" || field.label === "Service"} />
                        ))}
                        {warningValues.length > 0 &&
                            <div className="mythic-credential-search-warning-list">
                                {warningValues.map((warning, index) => (
                                    <Chip key={`warning-${index}`} size="small" color="warning" variant="outlined" label={compactMetadataValue(warning)} className="mythic-credential-search-warning-chip" />
                                ))}
                            </div>
                        }
                    </CredentialInspectorSection>
                }
                <CredentialInspectorSection
                    title="Metadata"
                    actions={
                        <MythicStyledTooltip title={"Copy metadata JSON"}>
                            <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-info" onClick={() => onCopyToClipboard(JSON.stringify(pureMetadata, null, 2))} size="small">
                                <FontAwesomeIcon icon={faCopy}/>
                            </IconButton>
                        </MythicStyledTooltip>
                    }>
                    {pureMetadataEntries.length === 0 ? (
                        <div className="mythic-credential-search-empty-value">{"{}"}</div>
                    ) : (
                        <div className="mythic-credential-search-metadata-grid">
                            {pureMetadataEntries.map(([key, value]) => (
                                <CredentialMetadataPair key={key} name={key} value={value} />
                            ))}
                        </div>
                    )}
                </CredentialInspectorSection>
                <CredentialInspectorSection title="Source">
                    {credential.task ? (
                        <>
                            <CredentialDetail
                                label="Task"
                                wide
                                value={
                                    <span>
                                        <Link color="textPrimary" underline="always" target="_blank" href={"/new/callbacks/" + credential.task.callback?.display_id}>C-{credential.task.callback?.display_id || "?"}</Link>
                                        {" / "}
                                        <Link color="textPrimary" underline="always" target="_blank" href={"/new/task/" + credential.task.display_id}>T-{credential.task.display_id || "?"}</Link>
                                    </span>
                                }
                            />
                            <CredentialDetail label="Host" value={credential.task.callback?.host} />
                            <CredentialDetail label="Groups" value={(credential.task.callback?.mythictree_groups || []).join(", ")} wide />
                        </>
                    ) : (
                        <CredentialDetail label="Operator" value={credential.operator?.username} />
                    )}
                </CredentialInspectorSection>
                <CredentialInspectorSection title="Credential">
                    <div className="mythic-credential-search-secret-row">
                        <div className="mythic-credential-search-secret" title={credential.credential_text || ""}>
                            {credential.credential_text || "-"}
                        </div>
                        <MythicStyledTooltip title={"Copy credential value"}>
                            <IconButton className="mythic-credential-search-secret-copy mythic-table-row-icon-action mythic-table-row-icon-action-info" onClick={() => onCopyToClipboard(credential.credential_text || "")} size="small">
                                <FontAwesomeIcon icon={faCopy}/>
                            </IconButton>
                        </MythicStyledTooltip>
                    </div>
                </CredentialInspectorSection>
                <CredentialInspectorSection title="Comment">
                    <div className="mythic-credential-search-comment">
                        {(credential.comment || "").trim().length > 0 ? credential.comment : "No comment."}
                    </div>
                </CredentialInspectorSection>
                <CredentialInspectorSection title="Tags">
                    <div className="mythic-credential-search-tags">
                        <ViewEditTags
                            target_object={"credential_id"}
                            target_object_id={credential?.id || 0}
                            me={props.me}/>
                        <TagsDisplay tags={credential.tags || []}/>
                    </div>
                </CredentialInspectorSection>
            </div>
        </aside>
    )
}

function CredentialInspectorSection({title, actions, children}){
    return (
        <section className="mythic-credential-search-section">
            <div className="mythic-credential-search-section-header">
                <span>{title}</span>
                {actions && <div className="mythic-credential-search-section-actions">{actions}</div>}
            </div>
            <div className="mythic-credential-search-section-body">
                {children}
            </div>
        </section>
    )
}

function CredentialDetail({label, value, chip, wide=false, code=false, action}){
    const isReactValue = React.isValidElement(value);
    const displayValue = value === undefined || value === null || value === "" ? "-" : value;
    return (
        <div className={`mythic-credential-search-detail ${wide ? "mythic-credential-search-detail-wide" : ""}`}>
            <span>{label}</span>
            <div className="mythic-credential-search-detail-value-row">
                <strong className={code ? "mythic-credential-search-code" : ""} title={isReactValue ? undefined : `${displayValue}`}>
                    {displayValue}
                </strong>
                {action && <div className="mythic-credential-search-detail-action">{action}</div>}
            </div>
            {chip &&
                <Chip size="small" color={chip.color} variant="outlined" label={chip.label} className="mythic-credential-search-inline-chip" />
            }
        </div>
    )
}

function CredentialMetadataPair({name, value}){
    return (
        <div className="mythic-credential-search-metadata-pair">
            <span title={name}>{name}</span>
            <strong title={compactMetadataValue(value)}>
                <MetadataValue value={value} />
            </strong>
        </div>
    )
}

function MetadataValue({value}){
    if(Array.isArray(value)){
        return <Chip size="small" variant="outlined" label={`array[${value.length}]`} className="mythic-credential-search-mini-chip" />
    }
    if(isPlainObject(value)){
        const entries = Object.entries(value)
        return (
            <div className="mythic-credential-search-nested-metadata">
                {entries.map(([key, nestedValue]) => (
                    <div key={key}>
                        <span>{key}</span>
                        <strong>{compactMetadataValue(nestedValue)}</strong>
                    </div>
                ))}
            </div>
        )
    }
    return <span>{compactMetadataValue(value)}</span>
}
