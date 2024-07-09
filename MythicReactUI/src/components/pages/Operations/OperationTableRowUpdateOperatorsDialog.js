import React, {  } from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {gql, useMutation, useQuery} from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import {OperationTableRowUpdateOperatorsDialogRow} from './OperationTableRowUpdateOperatorsDialogRow';

const GET_Operations = gql`
query GetOperation($operation_id: Int!) {
  operation_by_pk(id: $operation_id) {
    id
    admin {
      username
      id
    }
    operatoroperations {
      view_mode
      operator {
        username
        account_type
        id
      }
      disabledcommandsprofile {
        name
        id
      }
      id
    }
  }
  operator(where: {active: {_eq: true}, deleted: {_eq: false}}) {
    id
    username
    account_type
    operation {
        id
        name
    }
  }
  disabledcommandsprofile(where: {operation_id: {_eq: $operation_id}}, distinct_on: name, order_by: {name: asc}) {
    name
    id
  }
}
`;
const Update_Lead = gql`
mutation updateLeadMutation($operation_id: Int!, $admin_id: Int!) {
  updateOperation(operation_id: $operation_id, admin_id: $admin_id) {
    status
    error
  }
}
`;
const Update_Operators = gql`
mutation updateOperatorViewMode($operation_id: Int!, $spectators: [Int], $operators: [Int], $add_users: [Int], $remove_users: [Int], $disabledCommands: [disabledCommand]) {
  updateOperatorOperation(operation_id: $operation_id, add_users: $add_users, remove_users: $remove_users, view_mode_operators: $operators, view_mode_spectators: $spectators, disabled_command_map: $disabledCommands) {
    status
    error
  }
}`;

export function OperationTableRowUpdateOperatorsDialog(props) {
    const [operators, setOperators] = React.useState([]);
    const [admin, setAdmin] = React.useState({});
    const [originalOperators, setOriginalOperators] = React.useState([]);
    const [commandBlockLists, setCommandBlockLists] = React.useState([]);
    useQuery(GET_Operations, {variables: {operation_id: props.id}, fetchPolicy: "no-cache",
      onCompleted: (data) => {
        const allOperators = data.operator.map( (operator) => {
          return {...operator, checked: false}
        });
        setOriginalOperators(data.operation_by_pk.operatoroperations);
        setAdmin(data.operation_by_pk.admin);
        const updateAssignments = allOperators.map( (operator) => {
          const assigned = data.operation_by_pk.operatoroperations.find( (op) => op.operator.id === operator.id );
          if( assigned ){
            if(assigned.operator.id === data.operation_by_pk.admin.id){
              return {...operator, checked: true, view_mode: "lead", operatoroperation_id: assigned.id, disabledcommandsprofile: assigned.disabledcommandsprofile};
            }
            return {...operator, checked: true, view_mode: assigned.view_mode, operatoroperation_id: assigned.id, disabledcommandsprofile: assigned.disabledcommandsprofile};
          }
          return {...operator, view_mode: "operator"};
        });
        updateAssignments.sort( (a,b) => a.username > b.username ? 1 : -1)
        setOperators(updateAssignments);
        const blockListNames = [...data.disabledcommandsprofile];
        setCommandBlockLists(blockListNames)
      },
      onError: (data) => {
        snackActions.error("Failed to get operational data");
        console.error(data);
      }
    });
    const [updateOperationLead] = useMutation(Update_Lead, {
      onCompleted: (data) => {
        snackActions.success("Successfully updated Lead");
      },
      onError: (data) => {
        snackActions.error("Failed to update operation");
        console.log("error updating operation", data);
      }
    })
    const [updateOperationMembers] = useMutation(Update_Operators, {
      onCompleted: (data) => {
          if(data.updateOperatorOperation.status === "error"){
              snackActions.error(data.updateOperatorOperation.error)
          }
          snackActions.success("Successfully updated operation");
        props.onClose();
      },
      onError: (data) => {
          snackActions.error("Failed to update members: " + data.message)
          props.onClose();
      }
    })
    const onAccept = () =>{
      // make sure there is only one with view_mode of "lead"
      //   set that operator as the lead, add/remove the other operators
      const newAdmin = operators.find( (op) => op.view_mode === "lead");
      if(!newAdmin){
        snackActions.error("No Lead for the operation is set");
        return;
      }
      if(newAdmin.id !== admin.id){
        updateOperationLead({variables: {
          operation_id: props.id,
          admin_id: newAdmin.id
        }});
      }
      // now loop through the props.assignedOperators to see 
      let newOperators = [];
      let removeOperators = [];
      let operatorViewMode = [];
      let spectatorViewMode = [];
      let disabledCommandMap = [];
      operators.forEach( (op) => {
        let oldMatch = originalOperators.find( (oop) => oop.operator.id === op.id);
        if(oldMatch){
          // op was listed in the original set, so we're looking to update or remove based on checked/view_mode
          if(op.checked){
            // op is still checked, so just a potential update
            //  || 
            if(op.view_mode !== oldMatch.view_mode){
              if(op.view_mode === "operator"){
                operatorViewMode.push(op.id);
              } else if (op.view_mode === "spectator"){
                spectatorViewMode.push(op.id)
              } else if (op.view_mode === "lead") {
                updateOperationLead({variables: {operation_id: props.id, admin_id: op.id}})
              }
            }
            if(op.disabledcommandsprofile !== oldMatch.disabledcommandsprofile){
              disabledCommandMap.push({"user_id": op.id, "disabled_command_profile_id":op.disabledcommandsprofile?op.disabledcommandsprofile.id:0})
            }
          }
          else{
            // op is unchecked, but was originally listed, so remove this operator
            removeOperators.push(op.id);
          }
          //op was checked then, is checked now, and nothing changed. just move on
        }else{
          //op wasn't listed, so if checked is true, then we want to add them to the operation
          if(op.checked){
            newOperators.push(op.id);
            if(op.view_mode === "operator"){
              operatorViewMode.push(op.id);
            } else if (op.view_mode === "spectator"){
              spectatorViewMode.push(op.id)
            }
          }
          // op wasnt checked then, isn't checked now, so move on
        }
      });
      //console.log( {operation_id: props.id, add_users: newOperators, remove_users: removeOperators, spectators: spectatorViewMode, operators: operatorViewMode, disabledCommands: disabledCommandMap})
      updateOperationMembers({variables: {operation_id: props.id, add_users: newOperators, remove_users: removeOperators, spectators: spectatorViewMode, operators: operatorViewMode,
      disabledCommands: disabledCommandMap}})
  
      
    }
    const updateOperator = (op) => {
      let updates = [...operators];
      if(op.view_mode === "lead"){
        //make sure nobody else has this, if they do, demote them down to "operator"
        updates = updates.map( (operator) => {
          if(operator.view_mode === "lead"){
            return {...operator, view_mode: "operator"}
          }
          return {...operator}
        });
      }
      updates = updates.map( (operator) => {
        if(operator.id === op.id){
          return {...op};
        }
        return {...operator};
      });
      setOperators(updates);
    }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Modify Operator Assignments</DialogTitle>
        <DialogContent dividers={true}>
          <TableContainer className="mythicElement" style={{marginTop: "0px"}}>
              <Table stickyHeader={true} size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "scroll"}}>
                  <TableHead>
                      <TableRow>
                          <TableCell style={{width: "8rem"}}>Assign to Operation</TableCell>
                          <TableCell style={{}}>Operator</TableCell>
                          <TableCell style={{width: "10rem"}}>Role</TableCell>
                          <TableCell >Block List</TableCell>
                          <TableCell style={{width: "4rem"}}></TableCell>
                      </TableRow>
                  </TableHead>
                  <TableBody>
                  
                  {operators.map( (op) => (
                      <OperationTableRowUpdateOperatorsDialogRow
                          key={"operator" + op.id}
                          operator={op} updateOperator={updateOperator}
                          commandBlockLists={commandBlockLists}
                          operation_id={props.id}
                      />
                  ))}
                  </TableBody>
              </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Cancel
          </Button>
          <Button onClick={onAccept} variant="contained" color="warning">
            Update
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

