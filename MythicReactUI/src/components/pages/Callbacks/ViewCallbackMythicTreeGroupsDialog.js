import React from 'react';
import TableRow from '@mui/material/TableRow';
import Table from '@mui/material/Table';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import {useQuery, gql} from '@apollo/client';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {Button} from '@mui/material';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import { useTheme } from '@mui/material/styles';
import LayersIcon from '@mui/icons-material/Layers';
import Paper from '@mui/material/Paper';
import {IconButton, Typography} from '@mui/material';
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import LinearProgress from '@mui/material/LinearProgress';
import { Backdrop } from '@mui/material';
import {CircularProgress} from '@mui/material';
import {snackActions} from "../../utilities/Snackbar";
import {MythicAgentSVGIcon} from "../../MythicComponents/MythicAgentSVGIcon";


const getCallbackMythicTreeGroups = gql`
query getCallbackMythicTreeGroups($group_name: [String!]!) {
  callback(where: {mythictree_groups: {_contains: $group_name}}, order_by: {id: asc}) {
    display_id
    user
    host
    domain
    active
    ip
    pid
    description
    payload {
        payloadtype {
            name
        }
    }
  }
}
`;
const getAllCallbackMythicTreeGroups = gql`
query getCallbackMythicTreeGroups {
  callback(order_by: {id: asc}) {
    display_id
    user
    host
    domain
    active
    mythictree_groups
    ip
    pid
    description
    payload {
        payloadtype {
            name
        }
    }
  }
}
`;
export function ViewCallbackMythicTreeGroupsDialog(props){
    const theme = useTheme();
    const [backdropOpen, setBackdropOpen] = React.useState(true);
    const [groups, setGroups] = React.useState([]);
    const [openViewAllCallbacksDialog, setOpenViewAllCallbacksDialog] = React.useState(false);
    React.useEffect( () => {
        snackActions.info("Loading callbacks...");
    }, []);
    useQuery(getCallbackMythicTreeGroups, {
        fetchPolicy: "no-cache",
        variables: {group_name: [props.group_name]},
        onCompleted: data => {

            const groupData = data.callback.map( c => {
                try{
                    let cIP = JSON.parse(c.ip);
                    if(cIP.length > 0){
                        return {...c, ip:cIP[0] };
                    }
                    return {...c, ip: ""};

                }catch(error){
                    return {...c};
                }
            })
            setGroups(groupData);
            setBackdropOpen(false);
        }
        });
    React.useLayoutEffect(() => {
        snackActions.clearAll();
    }, [groups]);
    return (
        <React.Fragment>
          <DialogTitle id="form-dialog-title" style={{display: "flex", justifyContent: "space-between"}}>
              Viewing Callbacks for group: {props.group_name}
              <MythicStyledTooltip title="View all groups" >
                  <IconButton size="small" onClick={()=>{setOpenViewAllCallbacksDialog(true);}} style={{color: theme.palette.info.main}} variant="contained"><LayersIcon/></IconButton>
              </MythicStyledTooltip>
          </DialogTitle>
            <div style={{paddingLeft: "20px"}}>
                All of these callbacks are contributing data that's aggregated together for the "{props.group_name}" group.
            </div>
          <DialogContent dividers={true} style={{padding: 0}}>
              <Backdrop open={backdropOpen} style={{zIndex: 2, position: "absolute"}} invisible={false}>
                  <CircularProgress color="inherit" />
              </Backdrop>
            <Table stickyHeader={true} size="small" style={{ "overflowWrap": "break-word", width: "100%"}}>
                <TableHead>
                    <TableRow>
                        <TableCell></TableCell>
                        <TableCell>Callback</TableCell>
                        <TableCell>User</TableCell>
                        <TableCell>Host</TableCell>
                        <TableCell>Domain</TableCell>
                        <TableCell>IP</TableCell>
                        <TableCell>PID</TableCell>
                        <TableCell>Description</TableCell>
                    </TableRow>

                </TableHead>
                <TableBody>
                    {groups.map( (a, i) => (
                        <TableRow key={'array' + props.group_name + i} hover>
                            <MythicStyledTableCell style={{width: "90px"}}>
                                {!a.active ?
                                    <MythicStyledTooltip title={"Callback is not active"}>
                                        <VisibilityOffIcon style={{color: theme.palette.error.main, marginRight: "15px"}}/>
                                    </MythicStyledTooltip>
                                 :
                                    <MythicStyledTooltip title={"Callback is active"}>
                                        <VisibilityIcon style={{color: theme.palette.success.main, marginRight: "15px"}}/>
                                    </MythicStyledTooltip>
                                }
                                <MythicStyledTooltip title={a.payload.payloadtype.name}>
                                    <MythicAgentSVGIcon payload_type={a.payload.payloadtype.name} style={{width: "35px", height: "35px"}} />
                                </MythicStyledTooltip>
                            </MythicStyledTableCell>

                            <MythicStyledTableCell>{a.display_id}</MythicStyledTableCell>
                            <MythicStyledTableCell>{a.user}</MythicStyledTableCell>
                            <MythicStyledTableCell>{a.host}</MythicStyledTableCell>
                            <MythicStyledTableCell>{a.domain}</MythicStyledTableCell>
                            <MythicStyledTableCell style={{wordBreak: "break-all"}}>{a.ip}</MythicStyledTableCell>
                            <MythicStyledTableCell >{a.pid}</MythicStyledTableCell>
                            <MythicStyledTableCell style={{wordBreak: "break-all"}}>{a.description}</MythicStyledTableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </DialogContent>
          <DialogActions>
            <Button onClick={props.onClose} variant="contained" color="primary">
              Close
            </Button>
          </DialogActions>
            {openViewAllCallbacksDialog &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth={"lg"}
                    open={openViewAllCallbacksDialog}
                    onClose={() => {setOpenViewAllCallbacksDialog(false);}}
                    innerDialog={
                        <ViewAllCallbackMythicTreeGroupsDialog onClose={() => {setOpenViewAllCallbacksDialog(false);}} />
                    }
                />
            }
        </React.Fragment>
        )
}

export function ViewAllCallbackMythicTreeGroupsDialog(props){
    const theme = useTheme();
    const [groups, setGroups] = React.useState([]);
    const {loading} = useQuery(getAllCallbackMythicTreeGroups, {
        fetchPolicy: "no-cache",
        onCompleted: data => {
            let groupDict = {};
            const callbacks = data.callback.map( c => {
                try{
                    let cIP = JSON.parse(c.ip);
                    if(cIP.length > 0){
                        return {...c, ip:cIP[0] };
                    }
                    return {...c, ip: ""};

                }catch(error){
                    return {...c};
                }
            });
            for(let i = 0; i < callbacks.length; i++){
                if (callbacks[i].mythictree_groups.length > 0){
                    for(let j = 0; j < callbacks[i].mythictree_groups.length; j++){
                        if(callbacks[i].mythictree_groups[j] === "Default"){
                            continue;
                        }
                        if(groupDict[callbacks[i].mythictree_groups[j]] === undefined){
                            groupDict[callbacks[i].mythictree_groups[j]] = [];
                        }
                        groupDict[callbacks[i].mythictree_groups[j]].push(callbacks[i]);
                    }
                } else {

                }
            }
            const keys = Object.keys(groupDict).sort();
            const groupData = keys.map( k => {
                return {
                    "group": k,
                    "callbacks": groupDict[k]
                }
            })
            setGroups(groupData);
        }
    });
    if (loading) {
        return (
            <LinearProgress style={{marginTop: "10px"}}/>
        )
    }
    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title">Viewing Callbacks for every group
            </DialogTitle>
            <div style={{paddingLeft: "20px"}}>
                Callbacks with no groups or with only the "Default" group are not shown.
            </div>
            <DialogContent dividers={true} style={{paddingLeft: 0, paddingRight: 0}}>

                {groups.map( (g, i) => (
                    <div key={g.group}>
                        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
                            <Typography variant="h6" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                                {g.group}
                            </Typography>
                        </Paper>
                        <Table size="small" aria-label="details" style={{ "overflowWrap": "break-word", width: "100%"}}>
                            <TableHead>
                                <TableRow>
                                    <MythicStyledTableCell></MythicStyledTableCell>
                                    <MythicStyledTableCell>Callback</MythicStyledTableCell>
                                    <MythicStyledTableCell>User</MythicStyledTableCell>
                                    <MythicStyledTableCell>Host</MythicStyledTableCell>
                                    <MythicStyledTableCell>Domain</MythicStyledTableCell>
                                    <MythicStyledTableCell>IP</MythicStyledTableCell>
                                    <MythicStyledTableCell>PID</MythicStyledTableCell>
                                    <MythicStyledTableCell>Description</MythicStyledTableCell>
                                </TableRow>

                            </TableHead>
                            <TableBody>
                                {g.callbacks.map( (a, i) => (
                                    <TableRow key={'array' + g.group + i} hover>
                                        <MythicStyledTableCell style={{width: "90px"}}>
                                            {!a.active ?
                                                <MythicStyledTooltip title={"Callback is not active"}>
                                                    <VisibilityOffIcon style={{color: theme.palette.error.main, marginRight: "15px"}}/>
                                                </MythicStyledTooltip>
                                                :
                                                <MythicStyledTooltip title={"Callback is active"}>
                                                    <VisibilityIcon style={{color: theme.palette.success.main, marginRight: "15px"}}/>
                                                </MythicStyledTooltip>
                                            }
                                            <MythicStyledTooltip title={a.payload.payloadtype.name}>
                                                <MythicAgentSVGIcon payload_type={a.payload.payloadtype.name} style={{width: "35px", height: "35px"}} />
                                            </MythicStyledTooltip>
                                        </MythicStyledTableCell>

                                        <MythicStyledTableCell>{a.display_id}</MythicStyledTableCell>
                                        <MythicStyledTableCell>{a.user}</MythicStyledTableCell>
                                        <MythicStyledTableCell>{a.host}</MythicStyledTableCell>
                                        <MythicStyledTableCell>{a.domain}</MythicStyledTableCell>
                                        <MythicStyledTableCell style={{wordBreak: "break-all"}}>{a.ip}</MythicStyledTableCell>
                                        <MythicStyledTableCell >{a.pid}</MythicStyledTableCell>
                                        <MythicStyledTableCell style={{wordBreak: "break-all"}}>{a.description}</MythicStyledTableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                ))}
            </DialogContent>
            <DialogActions>
                <Button onClick={props.onClose} variant="contained" color="primary">
                    Close
                </Button>
            </DialogActions>
        </React.Fragment>
    )
}
