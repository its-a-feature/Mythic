import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { OperationTableRow } from './OperationTableRow';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {SettingsOperatorDialog} from '../Settings/SettingsOperatorDialog';
import {snackActions} from '../../utilities/Snackbar';
import {useMutation, gql} from '@apollo/client';
import {MythicModifyStringDialog} from '../../MythicComponents/MythicDialog';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import {meState} from "../../../cache";
import {MythicPageHeader, MythicPageHeaderChip} from "../../MythicComponents/MythicPageHeader";
import {MythicToolbarButton, MythicToolbarToggle} from "../../MythicComponents/MythicTableToolbar";
import {MythicTableEmptyState} from "../../MythicComponents/MythicStateDisplay";

const newOperatorMutation = gql`
mutation NewOperator($username: String!, $password: String!) {
  createOperator(input: {password: $password, username: $username}) {
    error
    id
    status
  }
}
`;
export const Update_Operation = gql`
mutation MyMutation($operation_id: Int!, $channel: String!, $complete: Boolean!, $name: String!, $webhook: String!, $banner_text: String!, $banner_color: String!) {
    updateOperation(operation_id: $operation_id, channel: $channel, complete: $complete, name: $name, webhook: $webhook, banner_text: $banner_text, banner_color: $banner_color) {
        status
        error
        name
        complete
        banner_text
        banner_color
        id
    }
}
`;
export const newOperationMutation = gql`
mutation newOperationMutation($name: String){
    createOperation(name: $name){
        status
        error
        operation_id
        operation_name
        
    }
}
`;

export function OperationTable(props){
    const [openNewOperator, setOpenNewOperatorDialog] = React.useState(false);
    const [openNewOperation, setOpenNewOperationDialog] = React.useState(false);
    const [showDeleted, setShowDeleted] = React.useState(false);
    const [newOperator] = useMutation(newOperatorMutation, {
        update: (cache, {data}) => {
            if(data.createOperator.status === "success"){
                snackActions.success("Created operator");
            }else{
                snackActions.error(data.createOperator.error);
            }
        },
        onError: (err) => {
          snackActions.warning("Unable to create new operator - Access Denied");
          console.log(err);
        }
    });
    const [updateOperation] = useMutation(Update_Operation, {
        onCompleted: (data) => {
            if(data.updateOperation.status === "success"){
                props.onUpdateOperation(data.updateOperation);
                snackActions.success("Successfully updated operation");

                meState({...meState(), user: {...meState().user,
                        current_operation_id: data.updateOperation.id,
                        current_operation: data.updateOperation.name,
                        current_operation_complete: data.updateOperation.complete,
                        current_operation_banner_text: data.updateOperation.banner_text,
                        current_operation_banner_color: data.updateOperation.banner_color,
                    }});
                localStorage.setItem("user", JSON.stringify(meState().user));
            } else {
                snackActions.error(data.updateOperation.error);
            }

        },
        onError: (data) => {
          snackActions.error("Failed to update operation");
          console.log("error updating operation", data);
        }
      });
    const [newOperation] = useMutation(newOperationMutation, {
        onCompleted: (data) => {
            //console.log(data);
            if(data.createOperation.status === "success"){
                snackActions.success("Successfully created operation!");
                props.onNewOperation({name: data.createOperation.operation_name, id: data.createOperation.operation_id});
            }else{
                snackActions.error(data.createOperation.error);
            }
        },
        onError: (data) => {
            snackActions.error("Unable to create new operation - Access Denied")
            console.log(data);
        }
    });
    const onUpdateOperation = ({operation_id, name, channel, webhook, complete, banner_text, banner_color}) => {
        updateOperation({variables:{
            operation_id,
            name,
            channel,
            webhook,
            complete,
                banner_text,
                banner_color
        }});
    }
    const onSubmitNewOperator = (id, username, passwordOld, passwordNew) => {
        if(passwordOld !== passwordNew){
            snackActions.error("Passwords don't match");
        }else if(passwordNew.length === 0){
            snackActions.error("Password must not be empty",);
        }else if(username.length === 0) {
            snackActions.error("Username must not be empty",);
        } else if(passwordNew.length < 12){
            snackActions.error("Password must be at least 12 characters long");
        }else{
            newOperator({variables:{username:username, password:passwordNew}})
            setOpenNewOperatorDialog(false);
        }
    }
    const onSubmitNewOperation = (operation_name) => {
        newOperation({variables: {name: operation_name}})
    }
    const visibleOperations = props.operations.filter((op) => showDeleted || !op.deleted);
    const visibleOperationsLabel = visibleOperations.length === 1 ? "1 shown" : `${visibleOperations.length} shown`;
    const totalOperationsLabel = props.operations.length === 1 ? "1 total" : `${props.operations.length} total`;
    return (
        <>
            <MythicPageHeader
                title={"Operations"}
                subtitle={"Create operations, assign operators, and manage engagement state."}
                meta={
                    <>
                        <MythicPageHeaderChip label={visibleOperationsLabel} />
                        <MythicPageHeaderChip label={totalOperationsLabel} />
                        {showDeleted && <MythicPageHeaderChip label="Deleted visible" />}
                    </>
                }
                actions={
                    <>
                        <MythicToolbarButton variant="contained" color="primary" onClick={() => {setOpenNewOperationDialog(true);}} startIcon={<AddCircleIcon />}>
                            Operation
                        </MythicToolbarButton>
                        <MythicToolbarButton variant="outlined" color="primary" onClick={()=>{setOpenNewOperatorDialog(true);}} startIcon={<PersonAddIcon />}>
                            Operator
                        </MythicToolbarButton>
                        <MythicToolbarToggle
                            checked={showDeleted}
                            onClick={() => setShowDeleted(!showDeleted)}
                            label="Deleted"
                            activeIcon={<VisibilityIcon fontSize="small" />}
                            inactiveIcon={<VisibilityOffIcon fontSize="small" />}
                        />
                    </>
                }
            />
            {openNewOperator &&
                <MythicDialog open={openNewOperator}
                    onClose={()=>{setOpenNewOperatorDialog(false);}}
                    innerDialog={<SettingsOperatorDialog title="New Operator" onAccept={onSubmitNewOperator} handleClose={()=>{setOpenNewOperatorDialog(false);}}  {...props}/>}
                />
            }
            {openNewOperation &&
                <MythicDialog
                    fullWidth={true}
                    open={openNewOperation}
                    onClose={() => {setOpenNewOperationDialog(false);}}
                    innerDialog={
                        <MythicModifyStringDialog title={"New Operation's Name"}
                            onClose={() => {setOpenNewOperationDialog(false);}}
                            value={""}
                            onSubmit={onSubmitNewOperation}
                        />
                    }
                />
            }
            <TableContainer className="mythicElement">
                <Table  size="small" style={{"tableLayout": "fixed", "overflow": "scroll"}}>
                    <TableHead>
                        <TableRow>
                            <TableCell style={{width: "2rem"}}></TableCell>
                            <TableCell style={{width: "8rem"}}>Configure</TableCell>
                            <TableCell style={{width: "8rem"}}>Operators</TableCell>
                            <TableCell>Operation Name</TableCell>
                            <TableCell>Operation Admin</TableCell>
                            <TableCell style={{width: "8rem"}}>Analysis</TableCell>
                            <TableCell style={{width: "11rem"}}>Operation Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {visibleOperations.length === 0 &&
                            <MythicTableEmptyState
                                colSpan={7}
                                compact
                                title={props.operations.length === 0 ? "No operations available" : "No visible operations"}
                                description={props.operations.length === 0 ? "Ask a Mythic admin or operation lead to add you to an operation." : "Deleted operations are hidden. Toggle Deleted to include them."}
                            />
                        }
                        {visibleOperations.map((op) => (
                                <OperationTableRow
                                    me={props.me}
                                    key={"operation" + op.id}
                                    onUpdateOperation={onUpdateOperation}
                                    onUpdateCurrentOperation={props.onUpdateCurrentOperation}
                                    updateDeleted={props.updateDeleted}
                                    {...op} operator={props.operator}
                                />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
    </>
    )
}
