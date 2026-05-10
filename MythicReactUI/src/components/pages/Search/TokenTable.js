import React, { useEffect } from 'react';
import {IconButton, Link} from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import { gql, useMutation } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import EditIcon from '@mui/icons-material/Edit';
import {TaskTokenDialog} from '../Callbacks/TaskTokenDialog';
import {TokenDescriptionDialog} from './TokenDescriptionDialog';
import {TokenUserDialog} from './TokenUserDialog';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import {MythicStateChip} from "../../MythicComponents/MythicStateChip";

const updateCredentialDeleted = gql`
mutation updateCredentialDeletedMutation($token_id: Int!, $deleted: Boolean!){
    update_token_by_pk(pk_columns: {id: $token_id}, _set: {deleted: $deleted}) {
        deleted
        id
    }
}
`;
const updateCallbacksOfDeletedToken = gql`
mutation updateCallbacksOfDeletedTokenMutation($token_id: Int!, $deleted: Boolean!){
    update_callbacktoken(where: {token_id: {_eq: $token_id}}, _set: {deleted: $deleted}) {
        affected_rows
    }
}
`;

export function TokenTable(props){
    const [tokens, setTokens] = React.useState([...props.tokens]);
    useEffect( () => {
        setTokens([...props.tokens]);
    }, [props.tokens]);

    const onEditDeleted = ({id, deleted}) => {
        const updates = tokens.map( (cred) => {
            if(cred.id === id){
                return {...cred, deleted}
            }else{
                return {...cred}
            }
        });
        setTokens(updates);
    }
    const onUpdateDescription = ({id, description}) => {
        const updates = tokens.map( (cred) => {
            if(cred.id === id){
                return {...cred, description}
            }else{
                return {...cred}
            }
        });
        setTokens(updates);
    }
    const onUpdateUser = ({id, user}) => {
        const updates = tokens.map( (cred) => {
            if(cred.id === id){
                return {...cred, user}
            }else{
                return {...cred}
            }
        });
        setTokens(updates);
    }

    return (
        <TableContainer className="mythicElement"  style={{height: "100%", overflowY: "auto"}}>
            <Table stickyHeader size="small" style={{"maxWidth": "100%", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "9rem"}}>State</TableCell>
                        <TableCell >User</TableCell>
                        <TableCell >TokenId</TableCell>
                        <TableCell >Description</TableCell>
                        <TableCell >Task</TableCell>
                        <TableCell >Callbacks Using Token</TableCell>
                        <TableCell >Host</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                
                {tokens.map( op => (
                    <TokenTableRow
                        key={"searchedToken" + op.id}
                        onEditDeleted={onEditDeleted}
                        onUpdateDescription={onUpdateDescription}
                        onUpdateUser={onUpdateUser}
                        {...op}
                    />
                ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

function TokenTableRow(props){
    const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
    const [viewTokenDialog, setViewTokenDialog] = React.useState(false);
    const [editDescriptionDialog, setEditDescriptionDialog] = React.useState(false);
    const [editUserDialog, setEditUserDialog] = React.useState(false);
    const [updateCallbackTokensDeleted] = useMutation(updateCallbacksOfDeletedToken, {
        onCompleted: (data) => {
            snackActions.success("Removed token from callback");
        },
        onError: (data) => {
            snackActions.error("Operation not allowed");
        }
    });
    const [updateDeleted] = useMutation(updateCredentialDeleted, {
        onCompleted: (data) => {
            snackActions.success("Updated deleted status");
            if(props.callbacktokens !== null && !props.deleted){
                //token was deleted, make sure to delete associated callback tokens too
                updateCallbackTokensDeleted({variables: {token_id: props.id, deleted: true}})
            }
            props.onEditDeleted(data.update_token_by_pk);
        },
        onError: (data) => {
            snackActions.error("Operation not allowed");
        }
    });
    const onAcceptDelete = () => {
        updateDeleted({variables: {token_id: props.id, deleted: !props.deleted}})
    }
    return (
        <React.Fragment>
            <TableRow hover>
                {openDeleteDialog &&
                    <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete} open={openDeleteDialog} acceptText={props.deleted ? "Restore" : "Hide" }/>
                }
                
                <MythicStyledTableCell>
                    <div className="mythic-search-result-action-row">
                        {props.deleted ? (
                            <MythicStyledTooltip title="Restore Token for use in Tasking">
                                <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-success" size="small" onClick={()=>{setOpenDeleteDialog(true);}}><VisibilityOffIcon fontSize="small" /></IconButton>
                            </MythicStyledTooltip>
                        ) : (
                            <MythicStyledTooltip title="Hide Token so it can't be used in Tasking">
                                <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-warning" size="small" onClick={()=>{setOpenDeleteDialog(true);}}><VisibilityIcon fontSize="small" /></IconButton>
                            </MythicStyledTooltip>
                        )}
                        <MythicStateChip compact label={props.deleted ? "Hidden" : "Available"} state={props.deleted ? "disabled" : "active"} />
                    </div>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <div className="mythic-search-result-action-row">
                        <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info" onClick={() => setEditUserDialog(true)} size="small"><EditIcon fontSize="small" /></IconButton>
                        <span className="mythic-search-result-primary">{props.user}</span>
                    </div>

                    {editUserDialog &&  <MythicDialog fullWidth={true} maxWidth="md" open={editUserDialog}
                            onClose={()=>{setEditUserDialog(false);}} 
                            innerDialog={<TokenUserDialog token_id={props.id} onClose={()=>{setEditUserDialog(false);}} onUpdateUser={props.onUpdateUser}/> }
                        />
                    }
                </MythicStyledTableCell>
                <MythicStyledTableCell >
                    <div className="mythic-search-result-action-row">
                        <MythicStyledTooltip title="View Token Information">
                            <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info" size="small" onClick={()=>{setViewTokenDialog(true);}}><ConfirmationNumberIcon fontSize="small" /></IconButton>
                        </MythicStyledTooltip>
                        <span className="mythic-search-result-code">{props.token_id}</span>
                    </div>
                    {viewTokenDialog && <MythicDialog fullWidth={true} maxWidth="md" open={viewTokenDialog}
                        onClose={()=>{setViewTokenDialog(false);}} 
                        innerDialog={<TaskTokenDialog token_id={props.id} onClose={()=>{setViewTokenDialog(false);}} />}
                    />}
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <div className="mythic-search-result-action-row">
                        <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info" onClick={() => setEditDescriptionDialog(true)} size="small"><EditIcon fontSize="small" /></IconButton>
                        <span className="mythic-search-result-secondary">{props.description || "No description"}</span>
                    </div>

                    {editDescriptionDialog && <MythicDialog fullWidth={true} maxWidth="md" open={editDescriptionDialog}
                            onClose={()=>{setEditDescriptionDialog(false);}}  
                            innerDialog={<TokenDescriptionDialog token_id={props.id} onClose={()=>{setEditDescriptionDialog(false);}} onUpdateDescription={props.onUpdateDescription}/> }
                        />
                    }
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <div className="mythic-search-result-link-row">
                        <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank"
                            href={"/new/task/" + props.task.display_id}>
                                T-{props.task.display_id}
                        </Link>
                    </div>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <div className="mythic-search-result-link-row">
                        {props.callbacktokens?.length > 0 ? props.callbacktokens.map( (cbt) => (
                            <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" key={"callbacklink" + cbt.callback.display_id + "row" + props.id}
                                href={"/new/callbacks/" + cbt.callback.display_id}>
                                    C-{cbt.callback.display_id}
                            </Link>
                        )) : <span className="mythic-search-result-secondary">No callbacks</span>}
                    </div>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <div className="mythic-search-result-primary">{props.host}</div>
                </MythicStyledTableCell>
            </TableRow>
        </React.Fragment>
    )
}
