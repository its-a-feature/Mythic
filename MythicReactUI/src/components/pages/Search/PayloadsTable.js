import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { PayloadsTableRow } from '../Payloads/PayloadsTableRow';
import {snackActions} from "../../utilities/Snackbar";
import {
    payloadsCallbackAlert,
    payloadsCallbackAllowed,
    payloadsDelete,
    restorePayloadMutation
} from "../Payloads/Payloads";
import {useMutation} from '@apollo/client';


export function SearchPayloadsTable({payloads, setPayloads, showDeleted, me}){
    const [deletePayload] = useMutation(payloadsDelete, {
        onCompleted: (data) => {
            if(data.updatePayload.status === "success"){
                const updated = payloads.map( (p) => {
                    if(data.updatePayload.id === p.id){
                        return {...p, deleted: true};
                    }else{
                        return {...p}
                    }
                });
                setPayloads(updated);
                snackActions.success("Successfully deleted");
            }else{
                snackActions.error(data.updatePayload.error);
            }

        },
        onError: (data) => {
            snackActions.warning("Failed to delete payload");
            console.log(data);
        }
    });
    const [restorePayload] = useMutation(restorePayloadMutation, {
        onCompleted: (data) => {
            const updated = payloads.map( (payload) => {
                if(payload.id === data.updatePayload.id){
                    return {...payload, ...data.updatePayload};
                }else{
                    return {...payload};
                }
            });
            setPayloads(updated);
            if(data.updatePayload.deleted === false){
                snackActions.success("Successfully marked payload as not deleted");
            }
        },
        onError: (data) => {
            snackActions.warning("Failed to mark as not deleted");
            console.log(data);
        }
    });
    const [callbackAlert] = useMutation(payloadsCallbackAlert, {
        onCompleted: (data) => {
            const updated = payloads.map( (payload) => {
                if(payload.id === data.updatePayload.id){
                    return {...payload, ...data.updatePayload};
                }else{
                    return {...payload};
                }
            });
            if(data.updatePayload.callback_alert){
                snackActions.success("Now Alerting on New Callbacks");
            }else{
                snackActions.success("No Longer Alerting on New Callbacks");
            }

            setPayloads(updated);
        },
        onError: (data) => {
            snackActions.warning("Failed to update callback alerting status");
            console.log(data);
        }
    });
    const [callbackAllowed] = useMutation(payloadsCallbackAllowed, {
        onCompleted: (data) => {
            const updated = payloads.map( (payload) => {
                if(payload.id === data.updatePayload.id){
                    return {...payload, ...data.updatePayload};
                }else{
                    return {...payload};
                }
            });
            if(data.updatePayload.callback_allowed){
                snackActions.success("Now Allowing New Callbacks from this Payload");
            }else{
                snackActions.success("No Longer Allowing New Callbacks from this Payload");
            }

            setPayloads(updated);
        },
        onError: (data) => {
            snackActions.warning("Failed to update callback alerting status");
            console.log(data);
        }
    });
    const onDeletePayload = (payload_uuid) => {
        deletePayload({variables: {payload_uuid}});
    }
    const onUpdateCallbackAlert = (payload_uuid, callback_alert) => {
        callbackAlert({
            variables: {payload_uuid, callback_alert}

        });
    }
    const onRestorePayload = (payload_uuid) => {
        restorePayload({
            variables: {payload_uuid}
        })
    }
    const onCallbacksAllowedChanged = (payload_uuid, callback_allowed) => {
        callbackAllowed({variables: {payload_uuid, callback_allowed}});
    }
    return (
            <div style={{display: "flex", flexGrow: 1, overflowY: "auto"}}>
                <TableContainer style={{height: "100%", overflowY: "auto"}}>
                    <Table stickyHeader size="small" style={{ "maxWidth": "100%", "overflow": "scroll", tableLayout: "fixed"}}>
                        <TableHead>
                            <TableRow>
                                <TableCell style={{width: "6rem"}}></TableCell>
                                <TableCell style={{width: "3rem"}}></TableCell>
                                <TableCell>File</TableCell>
                                <TableCell>Progress</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell >C2 Status</TableCell>
                                <TableCell>Tags</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {payloads.map( (op) => (
                                <PayloadsTableRow
                                    me={me}
                                    onDeletePayload={onDeletePayload}
                                    onAlertChanged={onUpdateCallbackAlert}
                                    showDeleted={showDeleted}
                                    onRestorePayload={onRestorePayload}
                                    onCallbacksAllowedChanged={onCallbacksAllowedChanged}
                                    key={"payload" + op.id}
                                    {...op}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
    )
}

