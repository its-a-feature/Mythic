import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import {useMutation, gql} from '@apollo/client';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import {toLocalTime} from "../../utilities/Time";
import CheckCircleTwoToneIcon from '@mui/icons-material/CheckCircleTwoTone';
import CancelTwoToneIcon from '@mui/icons-material/CancelTwoTone';
import {snackActions} from "../../utilities/Snackbar";

const updateApprovalStatusMutation = gql`
mutation updateApprovalStatus($eventgroupapproval_id: Int!, $approved: Boolean!) {
  updateEventGroupApproval(eventgroupapproval_id: $eventgroupapproval_id, approved: $approved) {
    status
    error
  }
}
`;

export function EventGroupTableRunAsDialog({eventgroupapprovals, me, onClose, selectedEventGroup}) {
    const [UpdateApprovalStatusMutation] = useMutation(updateApprovalStatusMutation, {
        onCompleted: (data) => {
            if(data.updateEventGroupApproval.status === "success"){
                snackActions.success("Updated approval");
            } else {
                snackActions.error(data.updateEventGroupApproval.error);
            }

        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to update");
        }
    });
    const onApprovalClick = ({id, approved}) => {
        UpdateApprovalStatusMutation({variables: {eventgroupapproval_id: id, approved}})
    }
    const getRunAsHelp = (run_as) => {
        switch(run_as){
            case "bot":
                return "These actions run under a 'bot' account rather than as a normal operator account.";
            case "self":
                return "These actions run under the context of the operator that created the workflow";
            case "trigger":
                return "These actions run under the context of the operator that triggered the workflow";
            default:
                return "These actions run under the context of the identified operator";
        }
    }
    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title">Approve or Deny Event Workflow Execution Per Operator</DialogTitle>
            <DialogContent dividers={true} style={{maxHeight: "calc(70vh)"}}>
                <DialogContentText>
                    Individual users must approve workflows to run under their account and operation leads must approve bot workflows.<br/>
                    <b>Run As: </b>{selectedEventGroup.run_as} <br/>
                    {getRunAsHelp(selectedEventGroup.run_as)}
                </DialogContentText>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell style={{}}>Operator</TableCell>
                            <TableCell style={{width: "20rem"}}>Approval Status</TableCell>
                            <TableCell style={{width: "15rem"}}>Last Updated</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {eventgroupapprovals.map( e => (
                            <TableRow key={e.id}>
                                <TableCell>{e.operator.username}</TableCell>
                                <TableCell>
                                    {e.approved ? (
                                        <>
                                            <Button disabled style={{marginRight: "10px"}} variant={"contained"} color={"success"}
                                                    onClick={() => onApprovalClick({id: e.id, approved: true})}>
                                                <CheckCircleTwoToneIcon color={"success"} style={{marginRight: "5px"}} /> Approved
                                            </Button>
                                            <Button disabled={e.operator.id !== me?.user?.id} variant={"contained"} color={"warning"}
                                                    onClick={() => onApprovalClick({id: e.id, approved: false})}>
                                                <CancelTwoToneIcon style={{marginRight: "5px"}} /> Deny
                                            </Button>
                                        </>

                                    ) : e.created_at === e.updated_at ? (
                                        <>
                                            <Button disabled={e.operator.id !== me?.user?.id} style={{marginRight: "20px"}}
                                                    variant={"contained"} color={"success"}
                                                    onClick={() => onApprovalClick({id: e.id, approved: true})}>
                                                <CheckCircleTwoToneIcon style={{marginRight: "5px"}} /> {"Approve "}
                                            </Button>
                                            <Button disabled={e.operator.id !== me?.user?.id} variant={"contained"}
                                                    color={"warning"}
                                                    onClick={() => onApprovalClick({id: e.id, approved: false})}>
                                                <CancelTwoToneIcon style={{marginRight: "5px"}} /> Deny
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button style={{marginRight: "20px"}} variant={"contained"} color={"success"}
                                                    disabled={e.operator.id !== me?.user?.id}
                                                    onClick={() => onApprovalClick({id: e.id, approved: true})}>
                                                <CheckCircleTwoToneIcon style={{marginRight: "5px"}} /> Approve
                                            </Button>
                                            <Button disabled variant={"contained"} color={"warning"}
                                                    onClick={() => onApprovalClick({id: e.id, approved: false})}>
                                                <CancelTwoToneIcon color={"warning"} style={{marginRight: "5px"}} /> Denied
                                            </Button>

                                        </>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {e.created_at !== e.updated_at ? (
                                        toLocalTime(e?.updated_at, me?.user?.view_utc_time)
                                    ) : null}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained" color="primary">
                    Close
                </Button>
            </DialogActions>
        </React.Fragment>
    );
}

