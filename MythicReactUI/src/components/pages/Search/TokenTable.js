import React, { useEffect } from 'react';
import {IconButton, Typography, Link} from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import { gql, useMutation } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import {useTheme} from '@mui/material/styles';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import EditIcon from '@mui/icons-material/Edit';
import {TaskTokenDialog} from '../Callbacks/TaskTokenDialog';
import {TokenDescriptionDialog} from './TokenDescriptionDialog';
import {TokenUserDialog} from './TokenUserDialog';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';

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
    const [tokens, setTokens] = React.useState([]);
    useEffect( () => {
        setTokens([...props.tokens]);
    }, [props.credentials]);

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
        <TableContainer component={Paper} className="mythicElement" >
            <Table stickyHeader size="small" style={{"maxWidth": "100%", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "5rem"}}>Visibility</TableCell>
                        <TableCell >User</TableCell>
                        <TableCell >TokenId</TableCell>
                        <TableCell >Description</TableCell>
                        <TableCell >Task</TableCell>
                        <TableCell >Callbacks With Handles</TableCell>
                        <TableCell >Host</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                
                {tokens.map( (op, index) => (
                    <TokenTableRow
                        key={"token" + index}
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
    const theme = useTheme();
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
                <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete} open={openDeleteDialog} acceptText={props.deleted ? "Restore" : "Hide" }/>
                
                <MythicStyledTableCell>{props.deleted ? (
                    <MythicStyledTooltip title="Restore Token for use in Tasking">
                        <IconButton size="small" onClick={()=>{setOpenDeleteDialog(true);}} style={{color: theme.palette.error.main}} variant="contained"><VisibilityOffIcon/></IconButton>
                    </MythicStyledTooltip>
                ) : (
                    <MythicStyledTooltip title="Delete Token so it can't be used in Tasking">
                        <IconButton size="small" onClick={()=>{setOpenDeleteDialog(true);}} style={{color: theme.palette.success.main}} variant="contained"><VisibilityIcon/></IconButton>
                    </MythicStyledTooltip>
                )} </MythicStyledTableCell>
                <MythicStyledTableCell>
                <Typography variant="body2" style={{wordBreak: "break-all", display: "inline-block"}}>{props.user}</Typography>
                    <IconButton onClick={() => setEditUserDialog(true)} size="small"><EditIcon /></IconButton>
                        <MythicDialog fullWidth={true} maxWidth="md" open={editUserDialog} 
                            onClose={()=>{setEditUserDialog(false);}} 
                            innerDialog={<TokenUserDialog token_id={props.id} onClose={()=>{setEditUserDialog(false);}} onUpdateUser={props.onUpdateUser}/> }
                        />
                </MythicStyledTableCell>
                <MythicStyledTableCell >
                    <Typography variant="body2" style={{wordBreak: "break-all", display: "inline-block"}}>{props.token_id}</Typography>
                    <MythicStyledTooltip title="View Token Information"><IconButton size="small" color="primary" onClick={()=>{setViewTokenDialog(true);}}><ConfirmationNumberIcon/></IconButton></MythicStyledTooltip>
                    <MythicDialog fullWidth={true} maxWidth="md" open={viewTokenDialog} 
                        onClose={()=>{setViewTokenDialog(false);}} 
                        innerDialog={<TaskTokenDialog token_id={props.id} onClose={()=>{setViewTokenDialog(false);}} />}
                    />
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Typography variant="body2" style={{wordBreak: "break-all", display: "inline-block"}}>{props.description}</Typography>
                    <IconButton onClick={() => setEditDescriptionDialog(true)} size="small"><EditIcon /></IconButton>
                        <MythicDialog fullWidth={true} maxWidth="md" open={editDescriptionDialog} 
                            onClose={()=>{setEditDescriptionDialog(false);}}  
                            innerDialog={<TokenDescriptionDialog token_id={props.id} onClose={()=>{setEditDescriptionDialog(false);}} onUpdateDescription={props.onUpdateDescription}/> }
                        />
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" 
                        href={"/new/task/" + props.task.id}>
                            {props.task.id}
                    </Link>
                </MythicStyledTableCell>
                <MythicStyledTableCell>{props.callbacktokens?.map( (cbt) => (
                    <React.Fragment>
                        <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" key={"callbacklink" + cbt.callback_id + "row" + props.id}
                            href={"/new/callbacks/" + cbt.callback_id}>
                                {cbt.callback_id}
                        </Link>
                        {" "}
                    </React.Fragment>
                    ))|| null
                }</MythicStyledTableCell>
                <MythicStyledTableCell>{props.host}</MythicStyledTableCell>
            </TableRow>
        </React.Fragment>
    )
}

