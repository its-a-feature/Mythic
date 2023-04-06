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

const stopSocks = gql`
mutation StopSocksMutation($callback_id: Int!, $port: Int!, $port_type: String!){
    stop_socks(callback_id: $callback_id, port: $port, port_type: $port_type){
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

    const onEditDeleted = ({id, port, port_type}) => {
        const updates = callbacks.map( (cred) => {
            if(cred.id === id && cred.port == port && cred.port_type == port_type){
                return {...cred, port: null}
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
                        <TableCell style={{width: "5rem"}}>Stop</TableCell>
                        <TableCell >User</TableCell>
                        <TableCell >Host</TableCell>
                        <TableCell >Description</TableCell>
                        <TableCell >Callback</TableCell>
                        <TableCell >Port</TableCell>
                        <TableCell >Proxy Type</TableCell>
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

    const [updateDeleted] = useMutation(stopSocks, {
        onCompleted: (data) => {
            snackActions.success("Stopped proxy on that Port");
            props.onEditDeleted({id: props.id, port: props.port, port_type: props.port_type});
        },
        onError: (data) => {
            snackActions.error("Operation not allowed");
        }
    });
    const onAcceptDelete = () => {
        updateDeleted({variables: {callback_id: props.callback.id, port: props.port, port_type: props.port_type}})
    }
    return (
        <React.Fragment>
            <TableRow hover>
                <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete} open={openDeleteDialog} acceptText={"Stop Proxy"}/>
                
                <TableCell>{props.port ? (
                    <Tooltip title="Stop Proxy Port on Mythic Server">
                        <IconButton size="small" onClick={()=>{setOpenDeleteDialog(true);}} style={{color: theme.palette.error.main}} variant="contained"><DeleteIcon/></IconButton>
                    </Tooltip>
                ) : ( null )} </TableCell>
                <TableCell>
                    <Typography variant="body2" style={{wordBreak: "break-all"}}>{props.callback.user}</Typography>
                </TableCell>
                <TableCell>{props.host}</TableCell>
                <TableCell >
                    <Typography variant="body2" style={{wordBreak: "break-all", display: "inline-block"}}>{props.callback.description}</Typography>
                </TableCell>
                <TableCell>
                <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" 
                        href={"/new/callbacks/" + props.callback.display_id}>
                            {props.callback.display_id}
                    </Link>
                </TableCell>
                <TableCell>
                <Typography variant="body2" style={{wordBreak: "break-all"}}>{props.port}</Typography>
                </TableCell>
                <TableCell>
                <Typography variant="body2" style={{wordBreak: "break-all"}}>{props.port_type}</Typography>
                </TableCell>
            </TableRow>
        </React.Fragment>
    )
}

