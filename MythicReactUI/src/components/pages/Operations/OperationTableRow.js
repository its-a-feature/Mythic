import React, { } from 'react';
import {Button, IconButton} from '@mui/material';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import EditIcon from '@mui/icons-material/Edit';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import { OperationTableRowUpdateOperatorsDialog } from './OperationTableRowUpdateOperatorsDialog';
import { meState } from '../../../cache';
import {useMutation, gql} from '@apollo/client';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import {OperationTableRowNotificationsDialog} from './OperationTableRowNotificationsDialog';
import { snackActions } from '../../utilities/Snackbar';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashOutlinedIcon from '@mui/icons-material/RestoreFromTrashOutlined';
import {restartWebsockets} from '../../../index';
import {useNavigate} from 'react-router-dom';

export const updateCurrentOperationMutation = gql`
mutation updateCurrentOpertionMutation($operator_id: Int!, $operation_id: Int!) {
  updateCurrentOperation(user_id: $operator_id, operation_id: $operation_id) {
    status
    error
    operation_id
    name
    complete
    banner_text
    banner_color
  }
}
`;
const toggleDeleteStatus = gql`
mutation toggleOperationDeleted($operation_id: Int!, $deleted: Boolean!){
  updateOperation(operation_id: $operation_id, deleted: $deleted) {
    status
    error
  }
}
`;
export const addUserToOperation = gql`
mutation addNewOperators($operation_id: Int!, $add_users: [Int]) {
    updateOperatorOperation(operation_id: $operation_id, add_users: $add_users) {
        status
        error
    }
}
`;
export function OperationTableRow(props){
    const [openUpdateNotifications, setOpenUpdateNotifications] = React.useState(false);
    const [openUpdateOperators, setOpenUpdateOperators] = React.useState(false);
    const [openDelete, setOpenDeleteDialog] = React.useState(false);
    const me = props.me;
    const [addUserToOperationMutation] = useMutation(addUserToOperation, {
        variables: {operation_id: props.id, add_users: [me.user.id]},
        onCompleted: (data) => {
            if(data.updateOperatorOperation.status === "success"){
                snackActions.success("Added to operation, updating current...");
                updateCurrentOperation({variables: {operator_id: me.user.user_id, operation_id: props.id}})
            } else {
                snackActions.error(data.updateOperatorOperation.error);
            }
        }
    })
    const [updateCurrentOperation] = useMutation(updateCurrentOperationMutation, {
      onCompleted: (data) => {
        if(data.updateCurrentOperation.status === "success"){
          meState({...meState(), user: {...meState().user,
                  current_operation_id: data.updateCurrentOperation.operation_id,
                  current_operation: data.updateCurrentOperation.name,
                  current_operation_complete: data.updateCurrentOperation.complete,
                  current_operation_banner_text: data.updateCurrentOperation.banner_text,
                  current_operation_banner_color: data.updateCurrentOperation.banner_color,
              }});
          localStorage.setItem("user", JSON.stringify(meState().user));
          snackActions.success("Updated current operation");
          restartWebsockets();
          props.onUpdateCurrentOperation(data.updateCurrentOperation.operation_id);
          //window.location.reload();
        }else if(data.updateCurrentOperation.error.includes("not a member")){
          // add ourselves as a member and try again
            addUserToOperationMutation();
        } else {
            snackActions.error(data.updateCurrentOperation.error);
        }
      },
      onError: (data) => {
        snackActions.error("Failed to update current operation");
        console.error(data);
      }
    })
    const makeCurrentOperation = () => {
      updateCurrentOperation({variables: {operator_id: me.user.user_id, operation_id: props.id}})
    }
    const [updateDeleted] = useMutation(toggleDeleteStatus, {
      onCompleted: data => {
        if(props.deleted){
          snackActions.success("Successfully restored operation");
        } else {
          snackActions.success("Successfully deleted operation");
        }
        props.updateDeleted({id: props.id, deleted: !props.deleted});
      },
      onError: error => {
        if(props.deleted){
          snackActions.error("Failed to restore operation");
        } else {
          snackActions.error("Failed to mark operation as deleted");
        }
        
      }
    });
    const onAcceptDelete = () => {
      updateDeleted({variables: {operation_id: props.id, deleted: !props.deleted}})
      setOpenDeleteDialog(false);
    }
    const navigate = useNavigate();
    return (
        <React.Fragment>
            <TableRow key={props.id} hover>
                <TableCell>
                {props.deleted ? (
                  <IconButton size="small" onClick={()=>{setOpenDeleteDialog(true);}} color="success" variant="contained"
                          disabled={me?.user?.current_operation_id !== props.id}><RestoreFromTrashOutlinedIcon/> </IconButton>
                ) : (
                  <IconButton size="small" onClick={()=>{setOpenDeleteDialog(true);}} color="error" variant="contained"
                          disabled={me?.user?.current_operation_id !== props.id}><DeleteIcon/> </IconButton>
                )}
                {openDelete && 
                    <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete} 
                      open={openDelete} 
                      acceptText={props.deleted ? "Restore" : "Remove"} 
                      acceptColor={props.deleted ? "success": "error"} />
                  }
                </TableCell>
                <TableCell><Button size="small" onClick={()=>{setOpenUpdateNotifications(true);}} startIcon={<EditIcon/>}
                                   disabled={me?.user?.current_operation_id !== props.id}
                                   color={props.complete ? "success" : "primary"} variant="contained">Edit</Button>
                {openUpdateNotifications && 
                    <MythicDialog open={openUpdateNotifications} fullWidth maxWidth={"lg"}
                        onClose={()=>{setOpenUpdateNotifications(false);}} 
                        innerDialog={<OperationTableRowNotificationsDialog onClose={()=>{setOpenUpdateNotifications(false);}} id={props.id} onUpdateOperation={props.onUpdateOperation} />}
                     />
                }
                </TableCell>
                <TableCell><Button size="small" onClick={()=>{setOpenUpdateOperators(true);}}
                                   disabled={me?.user?.current_operation_id !== props.id}
                                   startIcon={<AssignmentIndIcon/>} color={props.complete ? "success" : "primary"} variant="contained">Edit</Button>
                {openUpdateOperators && 
                    <MythicDialog open={openUpdateOperators} maxHeight={"calc(80vh)"} fullWidth maxWidth={"lg"}
                        onClose={()=>{setOpenUpdateOperators(false);}} 
                        innerDialog={<OperationTableRowUpdateOperatorsDialog id={props.id} onClose={()=>{setOpenUpdateOperators(false);}}/>}
                     />
                }
                </TableCell>
                <TableCell>{props.name} {props.complete ? " (Completed) " : ""}</TableCell>
                <TableCell>{props.admin.username}</TableCell>
                <TableCell>
                <Button size="small" startIcon={<AssessmentIcon/>}
                        onClick={() => {navigate("/new")}} color="primary"
                        disabled={me?.user?.current_operation_id !== props.id}
                        variant="contained">Analysis</Button>
                </TableCell>
                <TableCell>
                    {props.id === me.user.current_operation_id ? ("Current Operation") : (
                      <React.Fragment>
                        <Button size="small" startIcon={<PlayArrowIcon/>} onClick={makeCurrentOperation} color="info" variant="contained">Make Current</Button>
                      </React.Fragment>
                    )}
                </TableCell>
            </TableRow>
        </React.Fragment>
        )
}

