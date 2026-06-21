import React, { useEffect } from 'react';
import {Chip, IconButton, Typography} from '@mui/material';
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
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import { copyStringToClipboard } from '../../utilities/Clipboard';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCopy} from '@fortawesome/free-solid-svg-icons';
import {Button, Link} from '@mui/material';
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import {TagsDisplay, ViewEditTags} from '../../MythicComponents/MythicTag';

const parseCredentialMetadata = (metadata) => {
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

const compactMetadataValue = (value) => {
    if(value === undefined || value === null){
        return "";
    }
    if(typeof value === "object"){
        return JSON.stringify(value);
    }
    return `${value}`;
}

const isPlainObject = (value) => value && typeof value === "object" && !Array.isArray(value);

const metadataKeyStyle = {
    fontFamily: "monospace",
    fontSize: "0.72rem",
    opacity: 0.78,
    overflowWrap: "anywhere",
};

const metadataValueStyle = {
    fontFamily: "monospace",
    fontSize: "0.72rem",
    overflowWrap: "anywhere",
};

function MetadataValue({value}){
    if(Array.isArray(value)){
        return <Chip size="small" variant="outlined" label={`array[${value.length}]`} style={{height: "18px", fontSize: "0.68rem"}} />
    }
    if(isPlainObject(value)){
        const entries = Object.entries(value).slice(0, 3);
        return (
            <div style={{display: "grid", gap: "0.15rem", minWidth: 0}}>
                {entries.map(([key, nestedValue]) => (
                    <div key={key} style={{display: "grid", gridTemplateColumns: "minmax(4rem, auto) 1fr", gap: "0.3rem", minWidth: 0}}>
                        <span style={metadataKeyStyle}>{key}</span>
                        <span style={metadataValueStyle}>{compactMetadataValue(nestedValue)}</span>
                    </div>
                ))}
                {Object.keys(value).length > entries.length &&
                    <Chip size="small" variant="outlined" label={`+${Object.keys(value).length - entries.length} keys`} style={{height: "18px", fontSize: "0.68rem", width: "fit-content"}} />
                }
            </div>
        )
    }
    return <span style={metadataValueStyle}>{compactMetadataValue(value)}</span>
}

function MetadataFieldRow({name, value, chip}){
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "8rem minmax(0, 1fr)",
            gap: "0.4rem",
            alignItems: "start",
            minWidth: 0,
            padding: "0.15rem 0",
            borderBottom: "1px solid rgba(127,127,127,0.15)",
        }}>
            <span style={metadataKeyStyle}>{name}</span>
            <div style={{display: "flex", alignItems: "center", gap: "0.35rem", minWidth: 0, flexWrap: "wrap"}}>
                <MetadataValue value={value} />
                {chip &&
                    <Chip size="small" color={chip.color} label={chip.label} style={{height: "18px", fontSize: "0.68rem"}} />
                }
            </div>
        </div>
    )
}

function CredentialMetadataSummary({metadata, onCopy}){
    const parsedMetadata = parseCredentialMetadata(metadata);
    const metadataEntries = Object.entries(parsedMetadata);
    const validity = parsedMetadata.validity || {};
    const promoted = [
        {label: "client", value: parsedMetadata.client_principal},
        {label: "service", value: parsedMetadata.service_principal},
        {label: "start", value: parsedMetadata.not_before || parsedMetadata.start_time, chip: validity.not_yet_valid ? {label: "not yet valid", color: "warning"} : null},
        {label: "end", value: parsedMetadata.expires_at || parsedMetadata.end_time, chip: validity.expired ? {label: "expired", color: "error"} : null},
        {label: "renew", value: parsedMetadata.renew_until, chip: validity.renew_expired ? {label: "renew expired", color: "warning"} : null},
    ].filter(({value, chip}) => (value !== undefined && value !== null && `${value}` !== "") || chip);
    const summaryChips = [
        parsedMetadata.parser ? {label: `parser:${parsedMetadata.parser}`} : null,
        parsedMetadata.credential_format ? {label: `format:${parsedMetadata.credential_format}`} : null,
        parsedMetadata.ticket_count !== undefined ? {label: `tickets:${parsedMetadata.ticket_count}`} : null,
    ].filter(Boolean);
    const warningValues = Array.isArray(parsedMetadata.parser_warnings) ? parsedMetadata.parser_warnings : [];
    const ignoredKeys = new Set([
        "tickets", "validity", "client_principal", "service_principal", "not_before", "start_time",
        "expires_at", "end_time", "renew_until", "parser_warnings", "parser", "credential_format",
        "ticket_count"
    ]);
    const extra = Object.entries(parsedMetadata)
        .filter(([key, value]) => !ignoredKeys.has(key) && value !== undefined && value !== null)
        .slice(0, 5);
    if(metadataEntries.length === 0){
        return <Typography variant="caption" style={{fontFamily: "monospace", opacity: 0.7}}>{"{}"}</Typography>;
    }
    return (
        <div style={{display: "grid", gap: "0.35rem", minWidth: 0}}>
            <div style={{display: "flex", alignItems: "center", gap: "0.25rem", flexWrap: "wrap"}}>
                {summaryChips.map((chip) => (
                    <Chip key={chip.label} size="small" variant="outlined" label={chip.label} style={{height: "18px", fontSize: "0.68rem"}} />
                ))}
                {onCopy &&
                    <MythicStyledTooltip title={"Copy metadata JSON"}>
                        <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-info" onClick={() => onCopy(JSON.stringify(parsedMetadata, null, 2))} size="small">
                            <FontAwesomeIcon icon={faCopy}/>
                        </IconButton>
                    </MythicStyledTooltip>
                }
            </div>
            {promoted.map(({label, value, chip}) => (
                <MetadataFieldRow key={label} name={label} value={value || ""} chip={chip} />
            ))}
            {extra.map(([key, value]) => (
                <MetadataFieldRow key={key} name={key} value={value} />
            ))}
            {warningValues.slice(0, 2).map((warning, index) => (
                <Chip key={`warning-${index}`} size="small" color="warning" variant="outlined" label={compactMetadataValue(warning)} style={{height: "18px", fontSize: "0.68rem", maxWidth: "100%"}} />
            ))}
        </div>
    )
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
    useEffect( () => {
        setCredentials([...props.credentials]);
    }, [props.credentials]);
    const onEditComment = ({id, comment, operator}) => {
        const updates = credentials.map( (cred) => {
            if(cred.id === id){
                return {...cred, comment, operator}
            }else{
                return {...cred}
            }
        });
        setCredentials(updates);
    }
    const onEditAccount = ({id, account, operator}) => {
        const updates = credentials.map( (cred) => {
            if(cred.id === id){
                return {...cred, account, operator}
            }else{
                return {...cred}
            }
        });
        setCredentials(updates);
    }
    const onEditRealm = ({id, realm, operator}) => {
        const updates = credentials.map( (cred) => {
            if(cred.id === id){
                return {...cred, realm, operator}
            }else{
                return {...cred}
            }
        });
        setCredentials(updates);
    }
    const onEditType = ({id, type, operator}) => {
        const updates = credentials.map( (cred) => {
            if(cred.id === id){
                return {...cred, type, operator}
            }else{
                return {...cred}
            }
        });
        setCredentials(updates);
    }
    const onEditCredential = ({id, credential_text, operator}) => {
        const updates = credentials.map( (cred) => {
            if(cred.id === id){
                return {...cred, credential_text, operator}
            }else{
                return {...cred}
            }
        });
        setCredentials(updates);
    }
    const onEditDeleted = ({id, deleted, operator}) => {
        const updates = credentials.map( (cred) => {
            if(cred.id === id){
                return {...cred, deleted, operator}
            }else{
                return {...cred}
            }
        });
        setCredentials(updates);
    }

    return (
        <TableContainer className="mythicElement">
            <Table stickyHeader size="small" style={{height: "100%", tableLayout: "fixed"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "2rem"}}></TableCell>
                        <TableCell style={{width: "5rem"}}>Edit</TableCell>
                        <TableCell style={{}}>Info</TableCell>
                        <TableCell style={{}}>Metadata</TableCell>
                        <TableCell style={{width: "11rem"}}>Task Info</TableCell>
                        <TableCell style={{width: "15rem"}}>Credential</TableCell>
                        <TableCell style={{width: "11rem"}}>Tags</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                
                {credentials.map( (op) => (
                    <CredentialTableRow
                        me={props.me}
                        key={"cred" + op.id}
                        onEditComment={onEditComment}
                        onEditAccount={onEditAccount}
                        onEditRealm={onEditRealm}
                        onEditCredential={onEditCredential}
                        onEditDeleted={onEditDeleted}
                        onEditType={onEditType}
                        {...op}
                    />
                ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

function CredentialTableRow(props){
    const me = props.me;
    const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
    const [editCommentDialogOpen, setEditCommentDialogOpen] = React.useState(false);
    const [editAccountDialogOpen, setEditAccountDialogOpen] = React.useState(false);
    const [editRealmDialogOpen, setEditRealmDialogOpen] = React.useState(false);
    const [editCredentialDialogOpen, setEditCredentialDialogOpen] = React.useState(false);
    const [editTypeDialogOpen, setEditTypeDialogOpen] = React.useState(false);
    const dropdownAnchorRef = React.useRef(null);
    const [openDropdownButton, setOpenDropdownButton] = React.useState(false);
    const maxDisplayLength = 100;
    const displayCred = props.credential_text.length > maxDisplayLength ? props.credential_text.slice(0, maxDisplayLength) + "..." : props.credential_text;
    const [updateComment] = useMutation(updateCredentialComment, {
        onCompleted: (data) => {
            snackActions.success("updated comment");
            props.onEditComment(data.update_credential_by_pk);
        }
    });
    const [updateAccount] = useMutation(updateCredentialAccount, {
        onCompleted: (data) => {
            snackActions.success("updated account");
            props.onEditAccount(data.update_credential_by_pk);
        }
    });
    const [updateType] = useMutation(updateCredentialType, {
        onCompleted: (data) => {
            snackActions.success("updated credential type");
            props.onEditType(data.update_credential_by_pk);
        }
    });
    const [updateRealm] = useMutation(updateCredentialRealm, {
        onCompleted: (data) => {
            snackActions.success("updated realm");
            props.onEditRealm(data.update_credential_by_pk);
        }
    });
    const [updateCredential] = useMutation(updateCredentialCredential, {
        onCompleted: (data) => {
            snackActions.success("updated credential");
            props.onEditCredential(data.update_credential_by_pk);
        }
    });
    const [updateDeleted] = useMutation(updateCredentialDeleted, {
        onCompleted: (data) => {
            snackActions.success("updated deleted status");
            props.onEditDeleted(data.update_credential_by_pk);
        }
    });
    const onSubmitUpdatedComment = (comment) => {
        updateComment({variables: {credential_id: props.id, comment: comment}})
    }
    const onSubmitUpdatedAccount = (account) => {
        updateAccount({variables: {credential_id: props.id, account: account}})
    }
    const onSubmitUpdatedType = (type) => {
        updateType({variables: {credential_id: props.id, type: type}})
    }
    const onSubmitUpdatedRealm = (realm) => {
        updateRealm({variables: {credential_id: props.id, realm: realm}})
    }
    const onSubmitUpdatedCredential = (credential) => {
        updateCredential({variables: {credential_id: props.id, credential: credential}})
    }
    const onAcceptDelete = () => {
        updateDeleted({variables: {credential_id: props.id, deleted: !props.deleted}})
    }
    const onCopyToClipboard = (data) => {
        let result = copyStringToClipboard(data);
        if(result){
          snackActions.success("Copied text!");
        }else{
          snackActions.error("Failed to copy text");
        }
    }
    const options =  [
        {
            name: 'Edit Account', click: (evt) => {
                evt.stopPropagation();
                setEditAccountDialogOpen(true);
            }
        },
        {
            name: "Edit Realm", click: (evt) => {
                setEditRealmDialogOpen(true);
            }
        },
        {
            name: "Edit Credential", click: (evt) => {
                setEditCredentialDialogOpen(true);
            }
        },
        {   
            name: 'Edit Comment', click: (evt) => {
                setEditCommentDialogOpen(true);
            }
        },
        {
            name: 'Edit Type', click: (evt) => {
                setEditTypeDialogOpen(true);
            }
        },
    ];
    const handleMenuItemClick = (event, index) => {
        options[index].click(event);
        setOpenDropdownButton(false);
    };
    const handleClose = (event) => {
        if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
          return;
        }
        setOpenDropdownButton(false);
      };
    const credentialTypeOptions = [
        "certificate", "cookie", "hash","hex", "key", "plaintext",  "ticket",
    ]
    return (
        <React.Fragment>
            <TableRow hover>
                {openDeleteDialog &&
                    <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete} open={openDeleteDialog} acceptText={props.deleted ? "Restore" : "Remove" }/>
                }
                {editCommentDialogOpen &&
                    <MythicDialog fullWidth={true} maxWidth="md" open={editCommentDialogOpen} 
                        onClose={()=>{setEditCommentDialogOpen(false);}} 
                        innerDialog={<MythicModifyStringDialog onEnter={()=>{}} title="Edit Credential Comment" onSubmit={onSubmitUpdatedComment} value={props.comment} onClose={()=>{setEditCommentDialogOpen(false);}} 
                        multiline={true} maxRows={20}/>}
                    />
                }
                {editAccountDialogOpen &&
                    <MythicDialog fullWidth={true} maxWidth="md" open={editAccountDialogOpen} 
                        onClose={()=>{setEditAccountDialogOpen(false);}} 
                        innerDialog={<MythicModifyStringDialog title="Edit Credential Account" onSubmit={onSubmitUpdatedAccount} value={props.account} onClose={()=>{setEditAccountDialogOpen(false);}} />}
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
                        innerDialog={<MythicModifyStringDialog title="Edit Credential Realm" onSubmit={onSubmitUpdatedRealm} value={props.realm} onClose={()=>{setEditRealmDialogOpen(false);}} />}
                    />
                }
                {editCredentialDialogOpen &&
                    <MythicDialog fullWidth={true} maxWidth="md" open={editCredentialDialogOpen} 
                        onClose={()=>{setEditCredentialDialogOpen(false);}} 
                        innerDialog={<MythicModifyStringDialog onEnter={()=>{}} title="Edit Credential Value" onSubmit={onSubmitUpdatedCredential} value={props.credential_text} onClose={()=>{setEditCredentialDialogOpen(false);}}
                        multiline={true} maxRows={20}/>}
                    />
                }
                
                <MythicStyledTableCell>{props.deleted ? (
                    <MythicStyledTooltip title="Restore Credential for use in Tasking">
                        <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-success" size="small" onClick={()=>{setOpenDeleteDialog(true);}}><RestoreFromTrashIcon fontSize="small" /></IconButton>
                    </MythicStyledTooltip>
                ) : (
                    <MythicStyledTooltip title="Delete Credential so it can't be used in Tasking">
                        <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger" size="small" onClick={()=>{setOpenDeleteDialog(true);}}><DeleteIcon fontSize="small" /></IconButton>
                    </MythicStyledTooltip>
                )} </MythicStyledTableCell>
                <TableCell>
                    <Button className="mythic-table-row-action" size="small" variant="outlined" ref={dropdownAnchorRef}
                        onClick={() => setOpenDropdownButton(true)} >{"Edit"}
                    </Button>
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
                            <MenuList id="split-button-menu"  >
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
                </TableCell>
                <MythicStyledTableCell style={{ whiteSpace: "pre-line",wordBreak: "break-all",}}>
                    <div style={{display: "flex", alignItems: "center", gap: "0.25rem"}}>
                        <Typography variant="body2" style={{wordBreak: "break-all"}}>
                            <b>Tasking ID: </b>{props.id}
                        </Typography>
                        <MythicStyledTooltip title={"Copy credential ID for tasking"}>
                            <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-info" onClick={() => onCopyToClipboard(String(props.id))} size="small">
                                <FontAwesomeIcon icon={faCopy}/>
                            </IconButton>
                        </MythicStyledTooltip>
                    </div>
                    <Typography variant="body2" style={{wordBreak: "break-all"}}><b>Account: </b>{props.account}</Typography>
                    <Typography variant="body2" style={{wordBreak: "break-all"}}><b>Realm: </b>{props.realm}</Typography>
                    <Typography variant="body2" style={{wordBreak: "break-all"}}><b>Type: </b>{props.type}</Typography>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <CredentialMetadataSummary metadata={props.metadata} onCopy={onCopyToClipboard}/>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    {props.task !== null ? (
                        <>
                            <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" href={"/new/callbacks/" + props.task.callback.display_id}>C-{props.task.callback.display_id}</Link>
                            {" / "}<Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" href={"/new/task/" + props.task.display_id}>T-{props.task.display_id}</Link><br/>
                            Host: {props.task.callback.host}<br/>
                            Groups: {props.task.callback.mythictree_groups.join(", ")}
                        </>

                    ): (props.operator.username)}
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <div style={{display: "flex"}}>
                        <MythicStyledTooltip title={"Copy to clipboard"}>
                            <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-info" onClick={() => onCopyToClipboard(props.credential_text)} size="small">
                                <FontAwesomeIcon icon={faCopy}/>
                            </IconButton>
                        </MythicStyledTooltip>
                        <Typography variant="body2" style={{
                            wordBreak: "break-all",
                            display: "inline-block"
                        }}><b>Credential: </b>{displayCred}</Typography>
                    </div>
                    {(props.comment || "").length > 0 &&
                        <Typography variant="caption" style={{whiteSpace: "pre-line", wordBreak: "break-word", display: "block", marginTop: "0.25rem"}}>
                            <b>Comment: </b>{props.comment}
                        </Typography>
                    }
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <ViewEditTags
                        target_object={"credential_id"}
                        target_object_id={props?.id || 0}
                        me={me}/>
                    <TagsDisplay tags={props.tags || []}/>
                </MythicStyledTableCell>
            </TableRow>
        </React.Fragment>
    )
}
