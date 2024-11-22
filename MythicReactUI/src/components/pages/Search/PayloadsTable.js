import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { PayloadsTableRow } from '../Payloads/PayloadsTableRow';
import {snackActions} from "../../utilities/Snackbar";
import {payloadsCallbackAlert, payloadsDelete, restorePayloadMutation} from "../Payloads/Payloads";
import {useMutation} from '@apollo/client';


export function SearchPayloadsTable({payloads, setPayloads, showDeleted, me}){
    const [deletePayload] = useMutation(payloadsDelete, {
        onCompleted: (data) => {
            if(data.deleteFile.status === "success"){
                const updated = payloads.map( (p) => {
                    if(data.deleteFile.payload_ids.includes(p.id)){
                        return {...p, deleted: true};
                    }else{
                        return {...p}
                    }
                });
                setPayloads(updated);
                snackActions.success("Successfully deleted");
            }else{
                snackActions.error(data.deleteFile.error);
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
                if(payload.id === data.update_payload_by_pk.id){
                    return {...payload, ...data.update_payload_by_pk};
                }else{
                    return {...payload};
                }
            });
            setPayloads(updated);
            if(data.update_payload_by_pk.deleted === false){
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
                if(payload.id === data.update_payload_by_pk.id){
                    return {...payload, ...data.update_payload_by_pk};
                }else{
                    return {...payload};
                }
            });
            if(data.update_payload_by_pk.callback_alert){
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
    const onDeletePayload = (id) => {
        deletePayload({variables: {id}});
    }
    const onUpdateCallbackAlert = (id, callback_alert) => {
        callbackAlert({
            variables: {id, callback_alert}

        });
    }
    const onRestorePayload = (id) => {
        restorePayload({
            variables: {id}
        })
    }
    return (
            <div style={{display: "flex", flexGrow: 1, overflowY: "auto"}}>
                <TableContainer >
                    <Table stickyHeader size="small" style={{ "maxWidth": "100%", "overflow": "scroll", tableLayout: "fixed"}}>
                        <TableHead>
                            <TableRow>
                                <TableCell style={{width: "2rem"}}></TableCell>
                                <TableCell style={{width: "6rem"}}></TableCell>
                                <TableCell>Progress</TableCell>
                                <TableCell style={{width: "6rem"}}>Download</TableCell>
                                <TableCell>Tags</TableCell>
                                <TableCell>File</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell >C2 Status</TableCell>
                                <TableCell style={{width: "3rem"}}></TableCell>
                                <TableCell style={{width: "3rem"}}></TableCell>
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

