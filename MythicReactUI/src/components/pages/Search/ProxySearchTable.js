import React, { useEffect } from 'react';
import {IconButton, Link} from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Moment from 'react-moment';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import { gql, useMutation } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import {getStringSize} from '../Callbacks/ResponseDisplayTable';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {adjustOutput} from "../Eventing/EventGroupInstancesTable";
import SpeedIcon from '@mui/icons-material/Speed';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import {MythicStateChip} from "../../MythicComponents/MythicStateChip";

const toggleProxy = gql`
mutation ToggleProxyMutation($callbackport_id: Int!, $action: String!){
    toggleProxy(callbackport_id: $callbackport_id, action: $action){
        status
        error
    }
}
`;
const testProxyMutation = gql`
mutation TestProxyMutation($callbackport_id: Int!){
    testProxy(callbackport_id: $callbackport_id){
        status
        error
    }
}
`;

export function ProxySearchTable(props){
    const [callbacks, setCallbacks] = React.useState([]);
    useEffect( () => {
        setCallbacks([...props.callbacks]);
    }, [props.callbacks]);

    const onEditDeleted = ({id, deleted}) => {
        const updates = callbacks.map( (cred) => {
            if(cred.id === id){
                return {...cred, deleted: deleted}
            }else{
                return {...cred}
            }
        });
        setCallbacks(updates);
    }

    return (
        <TableContainer className="mythicElement" style={{overflowY: "auto", flexGrow: 1, marginTop: "5px"}}>
            <Table stickyHeader size="small" style={{tableLayout: "fixed"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "8rem"}}>State</TableCell>
                        <TableCell >User@Host</TableCell>
                        <TableCell style={{width: "9rem"}}>Task Info</TableCell>
                        <TableCell style={{width: "7rem"}}>Bound Port</TableCell>
                        <TableCell >Remote Connection</TableCell>
                        <TableCell style={{width: "9rem"}}>
                            <MythicStyledTooltip title={"Rx is bytes Mythic received from the agent. Tx is bytes Mythic sent to the agent"} >
                                Total Rx/Tx
                            </MythicStyledTooltip>
                        </TableCell>
                        <TableCell style={{width: "7rem"}}>Proxy Type</TableCell>
                        <TableCell style={{width: "9rem"}}>Last Updated</TableCell>
                        <TableCell style={{width: "4rem"}}></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                
                {callbacks.map( (op) => (
                    (props.showDeleted || !op.deleted) &&
                    <ProxySearchTableRow
                        key={"cred" + op.id}
                        onEditDeleted={onEditDeleted}
                        {...op}
                    />
                ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

function ProxySearchTableRow(props){
    const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
    const confirmDialogText = "This does not issue any start/stop command to the agent. This only opens/closes ports that Mythic controls. For rpfwd, this will not open/close that port on the remote host - you need to issue a task to your agent to do that.";
    const [updateDeleted] = useMutation(toggleProxy, {
        onCompleted: (data) => {
            if (data.toggleProxy.status === "success"){
                if(props.deleted){
                    snackActions.success("Started proxy on that Port");
                    props.onEditDeleted({id: props.id, deleted: false});
                } else {
                    snackActions.success("Stopped proxy on that Port");
                    props.onEditDeleted({id: props.id, deleted: true});
                }
            } else {
                snackActions.error(data.toggleProxy.error);
            }
        },
        onError: (data) => {
            snackActions.error("Operation not allowed");
        }
    });
    const [testProxy] = useMutation(testProxyMutation, {
        onCompleted: (data) => {
            if (data.testProxy.status === "success"){
                snackActions.success("Initiating connection test");
            } else {
                snackActions.error(data.testProxy.error);
            }
        },
        onError: (data) => {
            snackActions.error("Operation not allowed");
        }
    });
    const onAcceptDelete = () => {
        let action = "start";
        if(props.deleted){
            action = "start";
        } else {
            action = "stop";
        }
        updateDeleted({variables: {callbackport_id: props.id, action: action}})
    }
    const onTestProxy = () => {
        testProxy({variables: {callbackport_id: props.id}});
    }
    return (
        <React.Fragment>
            <TableRow hover>
                {openDeleteDialog &&
                    <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete}
                                         open={openDeleteDialog} acceptText={props.deleted ? "Restart Proxy" : "Stop Proxy"}
                                         acceptColor={props.deleted ? "success" : "error"}
                                         dialogText={confirmDialogText}
                    />
                }
                <MythicStyledTableCell>
                    <div className="mythic-search-result-action-row">
                        {props.deleted ? (
                            <MythicStyledTooltip title="Start Proxy Port on Mythic Server">
                                <IconButton
                                    className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-success"
                                    size="small"
                                    onClick={()=>{setOpenDeleteDialog(true);}}
                                >
                                    <RestoreFromTrashIcon fontSize="small" />
                                </IconButton>
                            </MythicStyledTooltip>
                        ) :
                            (<MythicStyledTooltip title="Stop Proxy Port on Mythic Server">
                                <IconButton
                                    className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger"
                                    size="small"
                                    onClick={()=>{setOpenDeleteDialog(true);}}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </MythicStyledTooltip>
                            )}
                        <MythicStateChip compact label={props.deleted ? "Stopped" : "Running"} state={props.deleted ? "disabled" : "active"} />
                    </div>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <div className="mythic-search-result-stack">
                        <div className="mythic-search-result-primary">{props.callback.user}@{props.callback.host}</div>
                        {props.callback.description &&
                            <div className="mythic-search-result-secondary">{props.callback.description}</div>
                        }
                    </div>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <div className="mythic-search-result-link-row">
                        <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank"
                            href={"/new/callbacks/" + props.callback.display_id}>
                                C-{props.callback.display_id}
                        </Link>
                        <span className="mythic-search-result-secondary">/</span>
                        <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank"
                              href={"/new/task/" + props.task.display_id}>
                            T-{props.task.display_id}
                        </Link>
                    </div>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <span className="mythic-search-result-code">{props.local_port}</span>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <div className="mythic-search-result-stack">
                    {props.remote_port !== 0 &&
                        <div className="mythic-search-result-primary">{props.remote_ip}:{props.remote_port}</div>
                    }
                    {props.remote_port === 0 &&
                        <div className="mythic-search-result-secondary">No remote endpoint</div>
                    }
                    {props.username !== "" &&
                        <div className="mythic-search-result-stack">
                            <div className="mythic-search-result-inline">
                                <span className="mythic-search-result-label">Auth</span>
                                <span className="mythic-search-result-value">{props.username}</span>
                            </div>
                            <div className="mythic-search-result-inline">
                                <span className="mythic-search-result-label">Password</span>
                                <span className="mythic-search-result-value">{props.password}</span>
                            </div>
                        </div>
                    }
                    </div>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <div className="mythic-search-result-stack">
                        <span className="mythic-search-result-metric">
                            <MythicStyledTooltip title={"Rx is bytes Mythic received from the agent"}>
                                <span className="mythic-search-result-metric-label">Rx</span>
                            </MythicStyledTooltip>
                            <span className="mythic-search-result-value">{getStringSize({cellData: {"plaintext": String(props.bytes_received)}})}</span>
                        </span>
                        <span className="mythic-search-result-metric">
                            <MythicStyledTooltip title={"Tx is bytes Mythic sent to the agent"}>
                                <span className="mythic-search-result-metric-label">Tx</span>
                            </MythicStyledTooltip>
                            <span className="mythic-search-result-value">{getStringSize({cellData: {"plaintext": String(props.bytes_sent)}})}</span>
                        </span>
                    </div>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <MythicStateChip compact label={props.port_type} state="neutral" />
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Moment filter={(newTime) => adjustOutput(props, newTime)} interval={1000}
                            parse={"YYYY-MM-DDTHH:mm:ss.SSSSSSZ"}
                            withTitle
                            titleFormat={"YYYY-MM-DD HH:mm:ss"}
                            fromNow ago
                    >
                        {props.updated_at + "Z"}
                    </Moment>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    {props.remote_port !== 0 &&
                        <MythicStyledTooltip title={"Test Remote Connection"} >
                            <IconButton
                                className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-success"
                                size="small"
                                onClick={onTestProxy}
                            >
                                <SpeedIcon fontSize="small" />
                            </IconButton>
                        </MythicStyledTooltip>
                    }
                </MythicStyledTableCell>
            </TableRow>
        </React.Fragment>
    )
}
