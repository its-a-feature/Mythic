import React from 'react';
import {Button} from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { OperationTableRow } from './OperationTableRow';
import Typography from '@mui/material/Typography';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {useTheme} from '@mui/material/styles';
import {SettingsOperatorDialog} from '../Settings/SettingsOperatorDialog';
import {snackActions} from '../../utilities/Snackbar';
import {useMutation, gql} from '@apollo/client';
import {MythicModifyStringDialog} from '../../MythicComponents/MythicDialog';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import { IconButton } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import {meState} from "../../../cache";

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
    const theme = useTheme();
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
    return (
        <React.Fragment>
        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main}} variant={"elevation"}>
            <Typography variant="h5" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                Operations
            </Typography>
            {showDeleted ? (
                <MythicStyledTooltip title={"Hide Deleted Operations"} tooltipStyle={{float: "right"}}>
                    <IconButton size="small" style={{float: "right", marginRight: "10px"}}
                                variant="contained" onClick={() => setShowDeleted(!showDeleted)}>
                        <VisibilityIcon />
                    </IconButton>
                </MythicStyledTooltip>
                
              ) : (
                <MythicStyledTooltip title={"Show Deleted Operations"} tooltipStyle={{float: "right"}}>
                  <IconButton size="small" style={{float: "right",  marginRight: "10px"}}
                              variant="contained" onClick={() => setShowDeleted(!showDeleted)} >
                      <VisibilityOffIcon />
                  </IconButton>
                </MythicStyledTooltip>
              )}
            <MythicStyledTooltip title={"Create new operator"} tooltipStyle={{float: "right"}}>
                <IconButton size="small"
                            onClick={()=>{setOpenNewOperatorDialog(true);}}
                            style={{marginRight: "10px", float: "right"}}
                            variant="contained">
                    <PersonAddIcon />
                </IconButton>
            </MythicStyledTooltip>
            <Button size="small" onClick={() => {setOpenNewOperationDialog(true);}}
                    style={{marginRight: "20px", float: "right", color: "white"}}
                    startIcon={<AddCircleIcon color="success" style={{backgroundColor: "white", borderRadius: "10px"}}/>} >
                New Operation
            </Button>

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
            
        </Paper>
        <TableContainer className="mythicElement">
            {props.operations.length === 0 &&
                <div style={{display: "flex", flexDirection: "column", flexGrow: 1}}>
                    <div style={{
                        position: "absolute",
                        left: "35%",
                        top: "50%"
                    }}>
                        {"No Operations available!"}<br/>
                        {"Ask a Mythic admin or operation lead to add you to an operation."}
                    </div>
                </div>
            }
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
                    {props.operations.map((op) => (
                        showDeleted || !op.deleted ? (
                            <OperationTableRow
                                me={props.me}
                                key={"operation" + op.id}
                            onUpdateOperation={onUpdateOperation}
                            onUpdateCurrentOperation={props.onUpdateCurrentOperation}
                            updateDeleted={props.updateDeleted}
                            {...op} operator={props.operator}
                        />
                    ) : null
                ))}
                </TableBody>
            </Table>
        </TableContainer>
    </React.Fragment>
    )
}

