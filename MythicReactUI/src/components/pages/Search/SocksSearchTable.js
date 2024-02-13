import React, { useEffect } from 'react';
import {IconButton, Typography, Link} from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import { gql, useMutation } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import {useTheme} from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import Tooltip from '@mui/material/Tooltip';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import {getStringSize} from '../Callbacks/ResponseDisplayTable';

const toggleProxy = gql`
mutation ToggleProxyMutation($callbackport_id: Int!, $action: String!){
    toggleProxy(callbackport_id: $callbackport_id, action: $action){
        status
        error
    }
}
`;

export function SocksSearchTable(props){
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
        <TableContainer component={Paper} className="mythicElement" style={{overflowY: "auto", flexGrow: 1, marginTop: "5px"}}>
            <Table stickyHeader size="small" style={{"maxWidth": "100%", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "1rem"}}></TableCell>
                        <TableCell >User</TableCell>
                        <TableCell >Host</TableCell>
                        <TableCell >Description</TableCell>
                        <TableCell style={{width: "10rem"}}>Callback / Task</TableCell>
                        <TableCell style={{width: "6rem"}}>Local Port</TableCell>
                        <TableCell >Remote Connection</TableCell>
                        <TableCell >Agent Rx/Tx</TableCell>
                        <TableCell style={{width: "7rem"}}>Proxy Type</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                
                {callbacks.map( (op) => (
                    <CallbackSearchTableRow
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

function CallbackSearchTableRow(props){
    const theme = useTheme();
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
    const onAcceptDelete = () => {
        let action = "start";
        if(props.deleted){
            action = "start";
        } else {
            action = "stop";
        }
        updateDeleted({variables: {callbackport_id: props.id, action: action}})
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

                
                <TableCell>{props.deleted ? (
                    <Tooltip title="Start Proxy Port on Mythic Server">
                        <IconButton size="small" onClick={()=>{setOpenDeleteDialog(true);}} style={{color: theme.palette.success.main}} variant="contained"><RestoreFromTrashIcon/></IconButton>
                    </Tooltip>
                ) :
                    (<Tooltip title="Stop Proxy Port on Mythic Server">
                        <IconButton size="small" onClick={()=>{setOpenDeleteDialog(true);}} style={{color: theme.palette.error.main}} variant="contained"><DeleteIcon/></IconButton>
                    </Tooltip>
                    )} </TableCell>
                <TableCell>
                    <Typography variant="body2" style={{wordBreak: "break-all"}}>{props.callback.user}</Typography>
                </TableCell>
                <TableCell>{props.callback.host}</TableCell>
                <TableCell >
                    <Typography variant="body2" style={{wordBreak: "break-all", display: "inline-block"}}>{props.callback.description}</Typography>
                </TableCell>
                <TableCell>
                    <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank"
                        href={"/new/callbacks/" + props.callback.display_id}>
                            {props.callback.display_id}
                    </Link>
                    {" / "}
                    <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank"
                          href={"/new/task/" + props.task.display_id}>
                        {props.task.display_id}
                    </Link>
                </TableCell>
                <TableCell>
                    <Typography variant="body2" style={{wordBreak: "break-all"}}>{props.local_port}</Typography>
                </TableCell>
                <TableCell>
                    {props.remote_port !== 0 &&
                        <Typography variant="body2" style={{wordBreak: "break-all"}}>{props.remote_ip}:{props.remote_port}</Typography>
                    }

                </TableCell>
                <TableCell>
                    <b>Rx: </b>{getStringSize({cellData: {"plaintext": String(props.bytes_received)}})}<br/>
                    <b>Tx: </b>{getStringSize({cellData: {"plaintext": String(props.bytes_sent)}})}
                </TableCell>
                <TableCell>
                    <Typography variant="body2" style={{wordBreak: "break-all"}}>{props.port_type}</Typography>
                </TableCell>
            </TableRow>
        </React.Fragment>
    )
}

