import React, {useEffect} from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {getTimeDifference, useInterval, toLocalTime } from '../../utilities/Time';
import {useTheme} from '@mui/material/styles';
import LockIcon from '@mui/icons-material/Lock';
import WifiIcon from '@mui/icons-material/Wifi';
import InsertLinkTwoToneIcon from '@mui/icons-material/InsertLinkTwoTone';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import EditIcon from '@mui/icons-material/Edit';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {MythicModifyStringDialog} from '../../MythicComponents/MythicDialog';
import {C2PathDialog} from '../Callbacks/C2PathDialog';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import {useSubscription } from '@apollo/client';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import {SUB_Edges} from '../Callbacks/CallbacksTop';

export function ExpandedCallbackSideDetails(props){
    const theme = useTheme();
    return (
        <div style={{ width: "100%", height: "100%", overflowY: "scroll" }}>
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main, marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
                <Typography variant="h3" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                    Callback {props.callback.display_id}
                </Typography>
            </Paper>
            <TableContainer component={Paper} className="mythicElement">   
                <ExpandedCallbackSideDetailsTable {...props.callback} />
            </TableContainer>
        </div>
    )
}


export function ExpandedCallbackSideDetailsTable(props){
    const theme = useTheme();
    const me = useReactiveVar(meState);
    const [displayTime, setDisplayTime] = React.useState("");
    const [openEditDescriptionDialog, setOpenEditDescriptionDialog] = React.useState(false);
    const [activeEgress, setActiveEgress] = React.useState(theme.palette.success.main);
    const [activeEgressBool, setActiveEgressBool] = React.useState(true);
    const [openC2Dialog, setOpenC2Dialog] = React.useState(false);
    const [callbackgraphedges, setCallbackgraphedges] = React.useState([]);
    const [callbackgraphedgesAll, setCallbackgraphedgesAll] = React.useState([]);
    const [hasEgressRoute, setHasEgressRoute] = React.useState(true);
    const [callbackEdges, setCallbackEdges] = React.useState([]);
    const lastCheckinDifference = React.useRef(-1);
    const lastCheckinTimestamp = React.useRef("");
    const lastCheckinTimestampFromMythic = React.useRef("");
    useSubscription(SUB_Edges, {
        fetchPolicy: "network-only",
        shouldResubscribe: true,
        onSubscriptionData: ({subscriptionData}) => {
          setCallbackEdges(subscriptionData.data.callbackgraphedge)
        }
    });
    const updateDisplayTime = () => {
        if(lastCheckinDifference.current === 0){
            if(displayTime === "0s"){
                return
            }
            setDisplayTime("0s");
            return
        }
        let newTimeDifference = getTimeDifference(lastCheckinDifference.current);
        if(newTimeDifference.includes("m")){
            if(newTimeDifference.includes("m0s")){
                lastCheckinTimestamp.current = toLocalTime(lastCheckinTimestampFromMythic.current, false);
                setDisplayTime(newTimeDifference.slice(0, newTimeDifference.length-2));
            }else if(displayTime === ""){
                lastCheckinTimestamp.current = toLocalTime(lastCheckinTimestampFromMythic.current, false);
                setDisplayTime(newTimeDifference.slice(0, newTimeDifference.indexOf("m")+1));
            } else {
                lastCheckinTimestamp.current = toLocalTime(lastCheckinTimestampFromMythic.current, false);
                setDisplayTime(newTimeDifference);
            }
        } else {
            lastCheckinTimestamp.current = toLocalTime(lastCheckinTimestampFromMythic.current, false);
            setDisplayTime(newTimeDifference);
        }
    }
    useInterval( () => {
        let last = new Date(props.last_checkin);
        let currentMythic = new Date(props.current_time);
        let timeskew = (new Date()) - currentMythic;
        lastCheckinDifference.current = last - timeskew;
        lastCheckinTimestampFromMythic.current = props.last_checkin;
        if(last.getFullYear() === 1970){
            lastCheckinDifference.current = 0;
        }
        updateDisplayTime();
    }, 1000);
    useEffect( () => {
        const routes = callbackgraphedgesAll.filter( (edge) => {
            if(!edge.c2profile.is_p2p && edge.source.id === props.id && edge.destination.id === props.id){
                return true;
            }
            return false;
        }).length;
        if(routes > 0 && !hasEgressRoute){
            setHasEgressRoute(true);
        }else if(routes === 0 && hasEgressRoute){
            setHasEgressRoute(false);
        }
    }, [callbackgraphedgesAll])
    useEffect( () => {
        const getEdges = (activeOnly) => {
            //update our aggregate of callbackgraphedges for both src and dst that involve us
            let myEdges = callbackEdges.filter( (edge) =>{
                if(edge.source.id === props.id || edge.destination.id === props.id){
                    if(activeOnly){
                        if(edge.end_timestamp === null){
                            return true;
                        }
                        else{return false}
                    }
                    return true;
                }
                return false;
            });
            let foundMore = true;
            while(foundMore){
                //look at all of the edges in myEdges and see if there are any edges that share a source/destination in callbackEdges that are _not_ in myEdges so far
                const newEdges = callbackEdges.reduce( (prev, edge) => {
                    //looking to see if we should add 'edge' to our list of relevant edges
                    if(prev.includes(edge)){return [...prev]}
                    //look through all of the previous edges we know about and see if there's a matching source/destination id with the new edge
                    const matching = prev.filter( (e) => {
                        if(e.source.id === edge.source.id || e.source.id === edge.destination.id || e.destination.id === edge.source.id ){
                            if(activeOnly){
                                if(edge.end_timestamp === null) { return true}
                                else{return false}
                            }
                            return true;
                        }
                        return false;
                    });
                    if(matching.length > 0){
                        return [...prev, edge];
                    }else{
                        return [...prev];
                    }
                }, [...myEdges]);
                foundMore = newEdges.length > myEdges;
                myEdges = [...newEdges];
            }
            return myEdges;
        }
        const myActiveEdges = getEdges(true);
        const myEdges = getEdges(false);
        setCallbackgraphedges(myActiveEdges);
        setCallbackgraphedgesAll(myEdges);
    }, [callbackEdges, props.id]);
    
    useEffect( () => {
        //determine if there are any active routes left at all
        const activeRoutes = callbackgraphedges.filter( (edge) => {
            if(!edge.c2profile.is_p2p  && edge.end_timestamp === null){
                return true;
            }
            return false
        });
        if(activeRoutes.length === 0){
            setActiveEgress(theme.palette.error.main);
            setActiveEgressBool(false);
        }else{
            setActiveEgress(theme.palette.success.main);
            setActiveEgressBool(true);
        }
    }, [callbackgraphedges, theme.palette.success.main, theme.palette.error.main]);

    const toggleLock = () => {
        props.toggleLock({id: props.id, locked: props.locked})
    }
    const editDescriptionSubmit = (description) => {
        props.updateDescription({description, id: props.id})
    }
    const options = [{name: props.locked ? 'Locked (by ' + props.locked_operator.username + ')' : 'Unlocked', icon: props.locked ? (<LockIcon style={{paddingRight: "5px"}}/>) : (<LockOpenIcon style={{paddingRight: "5px"}} />), click: (evt) => {
                        evt.stopPropagation();
                        toggleLock();
                     }},
                     {name: "Edit Description", icon: <EditIcon style={{paddingRight: "5px"}} />, click: (evt) => {
                        evt.stopPropagation();
                        setOpenEditDescriptionDialog(true);
                     }},
                 ];
    return (
        <Table  size="small" style={{"overflow": "scroll"}}>
                <TableBody style={{whiteSpace: "pre"}}>
                    <TableRow hover>
                        <TableCell>Elevation Level</TableCell>
                        <TableCell>{props.integrity_level}
                            {props.integrity_level === 4 ? (" ( SYSTEM Integrity )") : ""}
                            {props.integrity_level === 3 ? (" ( High Integrity )") : ""}
                            {props.integrity_level === 2 ? (" ( Medium Integrity ) ") : ""}
                            {props.integrity_level === 1 ? (" ( Low Integrity )") : ""}
                            {props.integrity_level === 0 ? (" ( UNKNOWN Integrity )") : ""}
                        </TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>Callback Lock Status</TableCell>
                        <TableCell>
                            {props.locked ? (
                                <React.Fragment>
                                    <LockIcon style={{paddingRight: "5px", display: "inline-block", paddingTop: "6px"}}/>
                                    <Typography style={{display: "inline-block"}}>
                                        {'Locked (by ' + props.locked_operator.username + ')'}
                                    </Typography>
                                </React.Fragment>
                            ) : (
                                <React.Fragment>
                                    <LockOpenIcon style={{paddingRight: "5px", display: "inline-block", paddingTop: "6px"}}/>
                                    
                                    <Typography style={{display: "inline-block"}}>
                                        {'Unlocked'}
                                    </Typography>
                                </React.Fragment>
                            )}
                        </TableCell>
                    </TableRow>
                    <TableRow hover >
                        <TableCell>IP Address</TableCell>
                        <TableCell>{JSON.parse(props.ip).map(c => c + "\n")}</TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>External IP</TableCell>
                        <TableCell>{props.external_ip}</TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>Host</TableCell>
                        <TableCell>{props.host}</TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>User</TableCell>
                        <TableCell>{props.user}</TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>Domain</TableCell>
                        <TableCell>{props.domain}</TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>OS / Architecture</TableCell>
                        <TableCell>{props.os}({props.architecture})</TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>Process ID</TableCell>
                        <TableCell>{props.pid}</TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>Last Checkin</TableCell>
                        <TableCell>
                            <MythicStyledTooltip title={lastCheckinTimestamp.current} >
                                {displayTime}
                            </MythicStyledTooltip>
                        </TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>First Checkin</TableCell>
                        <TableCell>{toLocalTime(props.init_callback, me?.user?.view_utc_time || false)}</TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>Description</TableCell>
                        <TableCell>{props.description}</TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>Sleep Info</TableCell>
                        <TableCell>{props.sleep_info}</TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>Agent Type</TableCell>
                        <TableCell>{props.payload.payloadtype.name}</TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>Egress Route</TableCell>
                        <TableCell>
                        {hasEgressRoute ? 
                            <WifiIcon onClick={(evt)=>{evt.stopPropagation();setOpenC2Dialog(true);}} style={{color: activeEgress, cursor: "pointer"}}/> : 
                            <InsertLinkTwoToneIcon onClick={(evt)=>{evt.stopPropagation();setOpenC2Dialog(true);}} style={{color: activeEgress, cursor: "pointer"}} />
                        }
                        </TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>Process Name</TableCell>
                        <TableCell>{props.process_name}</TableCell>
                    </TableRow>
                    <MythicDialog fullWidth={true} maxWidth="lg" open={openC2Dialog}
                        onClose={()=>{setOpenC2Dialog(false);}} 
                        innerDialog={<C2PathDialog onClose={()=>{setOpenC2Dialog(false);}} callback={props} callbackgraphedges={activeEgressBool ? callbackgraphedges : callbackgraphedgesAll} />}
                    />
                    <MythicDialog fullWidth={true} open={openEditDescriptionDialog}  onClose={() => {setOpenEditDescriptionDialog(false);}}
                        innerDialog={
                            <MythicModifyStringDialog title={"Edit Callback's Description"} onClose={() => {setOpenEditDescriptionDialog(false);}} value={props.description} onSubmit={editDescriptionSubmit} />
                        }
                        />
                    <TableRow hover>
                        <TableCell>Extra Info</TableCell>
                        <TableCell>{props.extra_info}</TableCell>
                    </TableRow>
                    <TableRow hover>
                        <TableCell>Groups</TableCell>
                        <TableCell>{props.mythictree_groups.join(", ")}</TableCell>
                    </TableRow>
                    {props.enc_key_base64 !== undefined ? (
                        <TableRow hover>
                            <TableCell>Encryption Keys</TableCell>
                            <TableCell>
                                {props.crypto_type}
                                {props.enc_key_base64 === null ? (null) : (
                                    <React.Fragment>
                                    <br/><b>Encryption Key: </b> {props.enc_key_base64}
                                    </React.Fragment>
                                    ) 
                                }
                                {props.dec_key_base64 === null ? (null) : (
                                    <React.Fragment>
                                    <br/><b>Decryption Key: </b> {props.dec_key_base64}
                                    </React.Fragment>
                                )
                                }
                            </TableCell>
                        </TableRow>
                    ) : (null)}
                    <TableRow>
                        <TableCell>Callback ID / Display ID</TableCell>
                        <TableCell>{props.id} / {props.display_id}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>Agent Callback ID</TableCell>
                        <TableCell>{props.agent_callback_id}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
    )
}
