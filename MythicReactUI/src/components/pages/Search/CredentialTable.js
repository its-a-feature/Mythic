import React, { useEffect } from 'react';
import {IconButton, Typography} from '@mui/material';
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
import {useTheme} from '@mui/material/styles';
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
const updateCredentialDeleted = gql`
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
                        <TableCell >Info</TableCell>
                        <TableCell style={{width: "15rem"}}>Comment</TableCell>
                        <TableCell >Task Info</TableCell>
                        <TableCell style={{}}>Credential</TableCell>
                        <TableCell style={{width: "15rem"}}>Tags</TableCell>
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
    const theme = useTheme();
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
        "certificate", "hash","hex", "key", "plaintext",  "ticket",
    ]
    return (
        <React.Fragment>
            <TableRow hover>
                <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete} open={openDeleteDialog} acceptText={props.deleted ? "Restore" : "Remove" }/>
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
                        innerDialog={<MythicModifyStringDialog onEnter={()=>{}} title="Edit Credential Credential" onSubmit={onSubmitUpdatedCredential} value={props.credential_text} onClose={()=>{setEditCredentialDialogOpen(false);}} 
                        multiline={true} maxRows={20}/>}
                    />
                }
                
                <MythicStyledTableCell>{props.deleted ? (
                    <MythicStyledTooltip title="Restore Credential for use in Tasking">
                        <IconButton size="small" onClick={()=>{setOpenDeleteDialog(true);}} style={{color: theme.palette.success.main}} variant="contained"><RestoreFromTrashIcon/></IconButton>
                    </MythicStyledTooltip>
                ) : (
                    <MythicStyledTooltip title="Delete Credential so it can't be used in Tasking">
                        <IconButton size="small" onClick={()=>{setOpenDeleteDialog(true);}} style={{color: theme.palette.error.main}} variant="contained"><DeleteIcon/></IconButton>
                    </MythicStyledTooltip>
                )} </MythicStyledTableCell>
                <TableCell>
                    <Button size="small" variant="contained" color="primary" ref={dropdownAnchorRef}
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
                    <Typography variant="body2" style={{wordBreak: "break-all"}}><b>Account: </b>{props.account}</Typography>
                    <Typography variant="body2" style={{wordBreak: "break-all"}}><b>Realm: </b>{props.realm}</Typography>
                    <Typography variant="body2" style={{wordBreak: "break-all"}}><b>Type: </b>{props.type}</Typography>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Typography variant="body2" style={{whiteSpace: "pre-line",wordBreak: "break-all",}}>{props.comment}</Typography>
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
                            <IconButton onClick={() => onCopyToClipboard(props.credential_text)} size="small">
                                <FontAwesomeIcon icon={faCopy}/>
                            </IconButton>
                        </MythicStyledTooltip>
                        <Typography variant="body2" style={{
                            wordBreak: "break-all",
                            display: "inline-block"
                        }}><b>Credential: </b>{displayCred}</Typography>
                    </div>
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

