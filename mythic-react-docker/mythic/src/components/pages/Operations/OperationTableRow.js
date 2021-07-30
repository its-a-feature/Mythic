import React, { } from 'react';
import {Button} from '@material-ui/core';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import EditIcon from '@material-ui/icons/Edit';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import { OperationTableRowUpdateOperatorsDialog } from './OperationTableRowUpdateOperatorsDialog';
import { meState, updateCurrentOperationState } from '../../../cache';
import {useReactiveVar, useMutation, gql} from '@apollo/client';
import TuneIcon from '@material-ui/icons/Tune';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import AssessmentIcon from '@material-ui/icons/Assessment';
import AssignmentIndIcon from '@material-ui/icons/AssignmentInd';
import {OperationTableRowNotificationsDialog} from './OperationTableRowNotificationsDialog';
import { snackActions } from '../../utilities/Snackbar';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';

const updateCurrentOpertionMutation = gql`
mutation updateCurrentOpertionMutation($operator_id: Int!, $operation_id: Int!) {
  update_operator_by_pk(pk_columns: {id: $operator_id}, _set: {current_operation_id: $operation_id}) {
    current_operation_id
    id
  }
}
`;
export function OperationTableRow(props){
    const [openUpdateNotifications, setOpenUpdateNotifications] = React.useState(false);
    const [openUpdateOperators, setOpenUpdateOperators] = React.useState(false);
    const [openBlocklists, setOpenBlocklists] = React.useState(false);
    const [openChangeCurrentOperation, setOpenChangeCurrentOperation] = React.useState(false);
    const me = useReactiveVar(meState);
    const [updateCurrentOperation] = useMutation(updateCurrentOpertionMutation, {
      onCompleted: (data) => {
        updateCurrentOperationState({operation_name: props.name, operation_id: props.id});
        snackActions.success("Updated current operation");
      },
      onError: (data) => {
        snackActions.error("Failed to update current operation");
        console.error(data);
      }
    })
    const makeCurrentOperation = () => {
      updateCurrentOperation({variables: {operator_id: me.user.user_id, operation_id: props.id}})
    }
    return (
        <React.Fragment>
            <TableRow key={props.id}>
                <TableCell><Button size="small" onClick={()=>{setOpenUpdateNotifications(true);}} startIcon={<EditIcon/>} color="secondary" variant="contained">Edit</Button>
                    <MythicDialog open={openUpdateNotifications} fullWidth
                        onClose={()=>{setOpenUpdateNotifications(false);}} 
                        innerDialog={<OperationTableRowNotificationsDialog onClose={()=>{setOpenUpdateNotifications(false);}} id={props.id} />}
                     />
                </TableCell>
                <TableCell><Button size="small" onClick={()=>{setOpenUpdateOperators(true);}} startIcon={<AssignmentIndIcon/>} color="secondary" variant="contained">Edit</Button>
                    <MythicDialog open={openUpdateOperators} maxHeight={"calc(80vh)"} fullWidth
                        onClose={()=>{setOpenUpdateOperators(false);}} 
                        innerDialog={<OperationTableRowUpdateOperatorsDialog id={props.id} onClose={()=>{setOpenUpdateOperators(false);}}/>}
                     />
                </TableCell>
                <TableCell><Button size="small" onClick={()=>{setOpenBlocklists(true);snackActions.warning("Not Implemented")}} startIcon={<TuneIcon/>} color="primary" variant="contained">Edit</Button>
                    
                </TableCell>
                <TableCell>{props.name}</TableCell>
                <TableCell>{props.admin.username}</TableCell>
                <TableCell>
                <Button size="small" startIcon={<AssessmentIcon/>} onClick={() => {snackActions.warning("Not Implemented")}} color="primary" variant="contained">Analysis</Button>
                </TableCell>
                <TableCell>{props.id === me.user.current_operation_id ? ("Current Operation") : (
                  <React.Fragment>
                    <Button size="small"startIcon={<PlayArrowIcon/>} onClick={()=>{setOpenChangeCurrentOperation(true);}} color="primary" variant="contained">Make Current</Button>
                    <MythicConfirmDialog onClose={() => {setOpenChangeCurrentOperation(false);}} onSubmit={makeCurrentOperation} 
                      open={openChangeCurrentOperation} title={"Change Current Operation?"} acceptText={"Update"}
                      dialogText={"Changing operations will force you to log in again"}/>
                  </React.Fragment>
                )}</TableCell>
            </TableRow>
        </React.Fragment>
        )
}

