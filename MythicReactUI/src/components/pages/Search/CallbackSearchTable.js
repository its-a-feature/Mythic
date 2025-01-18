import React, { useEffect } from 'react';
import {IconButton, Typography, Link} from '@mui/material';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import {  useMutation } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import {useTheme} from '@mui/material/styles';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {toggleHideCallbackMutations} from '../Callbacks/CallbackMutations';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import {DetailedCallbackTable} from '../Callbacks/DetailedCallbackTable';
import InfoIconOutline from '@mui/icons-material/InfoOutlined';
import MythicStyledTableCell from '../../MythicComponents/MythicTableCell';
import {MythicAgentSVGIcon} from "../../MythicComponents/MythicAgentSVGIcon";
import {CallbacksTableLastCheckinCell} from "../Callbacks/CallbacksTableRow";



export function CallbackSearchTable(props){
    const [callbacks, setCallbacks] = React.useState([]);
    useEffect( () => {
        setCallbacks([...props.callbacks]);
    }, [props.callbacks]);

    const onEditDeleted = ({id, active}) => {
        const updates = callbacks.map( (cred) => {
            if(cred.id === id){
                return {...cred, active}
            }else{
                return {...cred}
            }
        });
        setCallbacks(updates);
    }

    return (
        <TableContainer className="mythicElement" style={{height: "100%", overflowY: "auto"}}>
            <Table stickyHeader size="small" style={{"maxWidth": "100%", "overflow": "auto", tableLayout: "fixed"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "3rem"}}>View</TableCell>
                        <TableCell >User</TableCell>
                        <TableCell >Domain</TableCell>
                        <TableCell >Host</TableCell>
                        <TableCell >Last Checkin</TableCell>
                        <TableCell >Description</TableCell>
                        <TableCell >IP</TableCell>
                        <TableCell style={{width: "5rem"}}>ID</TableCell>
                        <TableCell style={{width: "60px"}}>Agent</TableCell>
                        <TableCell style={{width: "3rem"}}></TableCell>
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
    const [openMetaDialog, setOpenMetaDialog] = React.useState(false);
    const [updateDeleted] = useMutation(toggleHideCallbackMutations, {
        onCompleted: (data) => {
            snackActions.success("Updated active status");
            props.onEditDeleted({id: props.id, active: !props.active});
        },
        onError: (data) => {
            snackActions.error("Operation not allowed");
        }
    });
    const ips = JSON.parse(props.ip);
    const onAcceptDelete = () => {
        updateDeleted({variables: {callback_display_id: props.display_id, active: !props.active}})
    }
    return (
        <React.Fragment>
            <TableRow hover style={{backgroundColor: props.color}}>
                <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete} open={openDeleteDialog} acceptText={props.active ? "Hide" : "Restore" }/>
                
                <MythicStyledTableCell>{!props.active ? (
                    <MythicStyledTooltip title="Restore Callback for Tasking">
                        <IconButton size="small" onClick={()=>{setOpenDeleteDialog(true);}} style={{color: theme.palette.error.main}} variant="contained"><VisibilityOffIcon/></IconButton>
                    </MythicStyledTooltip>
                ) : (
                    <MythicStyledTooltip title="Hide Callback so it can't be used in Tasking">
                        <IconButton size="small" onClick={()=>{setOpenDeleteDialog(true);}} style={{color: theme.palette.success.main}} variant="contained"><VisibilityIcon/></IconButton>
                    </MythicStyledTooltip>
                )} </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <Typography variant="body2" style={{wordBreak: "break-all"}}>{props.user}</Typography>
                </MythicStyledTableCell>
                <MythicStyledTableCell >
                    <Typography variant="body2" style={{wordBreak: "break-all"}}>{props.domain}</Typography>
                </MythicStyledTableCell>
                <MythicStyledTableCell>{props.host}</MythicStyledTableCell>
                <MythicStyledTableCell style={{whiteSpace: "pre"}}>
                    <CallbacksTableLastCheckinCell rowData={{...props}} ></CallbacksTableLastCheckinCell>
                </MythicStyledTableCell>
                <MythicStyledTableCell >
                    <Typography variant="body2" style={{wordBreak: "break-all", display: "inline-block"}}>{props.description}</Typography>
                </MythicStyledTableCell>
                <MythicStyledTableCell style={{whiteSpace: "pre"}}>
                    {ips.slice(0,1).join("\n")}
                    {ips.length > 1 ? "\n..." : null}
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" 
                        href={"/new/callbacks/" + props.display_id}>
                            {props.display_id}
                    </Link>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                <MythicStyledTooltip title={props.payload.payloadtype.name}>
                    <MythicAgentSVGIcon payload_type={props.payload.payloadtype.name} style={{width: "35px", height: "35px"}} />
                </MythicStyledTooltip>
                </MythicStyledTableCell>
                <MythicStyledTableCell>
                    <InfoIconOutline onClick={() => setOpenMetaDialog(true)} style={{color: theme.palette.info.main, cursor: "pointer"}}/>
                    {openMetaDialog && 
                        <MythicDialog fullWidth={true} maxWidth="lg" open={openMetaDialog}
                            onClose={()=>{setOpenMetaDialog(false);}} 
                            innerDialog={<DetailedCallbackTable onClose={()=>{setOpenMetaDialog(false);}} callback_id={props.id} />}
                        />
                    }
                </MythicStyledTableCell>
            </TableRow>
        </React.Fragment>
    )
}

