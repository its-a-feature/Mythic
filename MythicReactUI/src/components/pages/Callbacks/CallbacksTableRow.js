import React, {useCallback, useEffect, useContext} from 'react';
import {IconButton} from '@mui/material';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import { MythicDisplayTextDialog} from '../../MythicComponents/MythicDisplayTextDialog';
import {MythicModifyStringDialog} from '../../MythicComponents/MythicDialog';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import LockIcon from '@mui/icons-material/Lock';
import WifiIcon from '@mui/icons-material/Wifi';
import InsertLinkTwoToneIcon from '@mui/icons-material/InsertLinkTwoTone';
import {C2PathDialog} from './C2PathDialog';
import {snackActions} from '../../utilities/Snackbar';
import {
    updateIPsCallbackMutation,
} from './CallbackMutations';
import {useMutation } from '@apollo/client';
import SnoozeIcon from '@mui/icons-material/Snooze';
import {useTheme} from '@mui/material/styles';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faQuestion, faSkullCrossbones, faRobot} from '@fortawesome/free-solid-svg-icons';
import {faLinux, faApple, faWindows, faChrome, faAndroid} from '@fortawesome/free-brands-svg-icons';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import { MythicSelectFromRawListDialog } from '../../MythicComponents/MythicSelectFromListDialog';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { areEqual } from 'react-window';
import {CallbackGraphEdgesContext, OnOpenTabContext} from './CallbacksTop';
import Moment from 'react-moment';
import moment from 'moment';
import {GetMythicSetting} from "../../MythicComponents/MythicSavedUserSetting";
import TerminalIcon from '@mui/icons-material/Terminal';
import VerticalSplitIcon from '@mui/icons-material/VerticalSplit';
import NotificationsActiveTwoToneIcon from '@mui/icons-material/NotificationsActiveTwoTone';
import {faSocks} from '@fortawesome/free-solid-svg-icons';
import {TagsDisplay, ViewEditTags} from "../../MythicComponents/MythicTag";

export const CallbacksTableIDCell = React.memo(({rowData, callbackDropdown}) =>{
    const theme = useTheme();
    const dropdownAnchorRef = React.useRef(null);
    const onOpenTab = useContext(OnOpenTabContext);
    const interactType = GetMythicSetting({setting_name: "interactType", default_value: "interact"})
    const [rowDataStatic, setRowDataStatic] = React.useState(rowData);
    React.useEffect( () => {
        let update = false;
        if(rowData.locked !== rowDataStatic.locked){
            update = true;
        }
        if(rowData.integrity_level !== rowDataStatic.integrity_level){
            update = true;
        }
        if(rowData.host !== rowDataStatic.host){
            update = true;
        }
        if(rowData.locked_operator !== rowDataStatic.locked_operator){
            update = true;
        }
        if(rowData.description !== rowDataStatic.description){
            update = true;
        }
        if(rowData.id !== rowDataStatic.id){
            update = true;
        }
        if(rowData.color !== rowDataStatic.color){
            update = true;
        }
        if(rowData.trigger_on_checkin_after_time !== rowDataStatic.trigger_on_checkin_after_time){
            update = true;
        }
        if(rowData.callbackports.length !== rowDataStatic.callbackports.length){
            update = true;
        }
        if(update){
            setRowDataStatic(rowData);
        }
    }, [rowData]);
    const proxyMessage = useCallback(() => {
        let message = [];
        for(let i = 0; i < rowDataStatic?.callbackports?.length || 0; i++){
            switch(rowDataStatic.callbackports[i].port_type){
                case "socks":
                    if(rowDataStatic.callbackports[i].username === ""){
                        message.push(`socks: ${rowDataStatic.callbackports[i].local_port}`);
                    } else {
                        message.push(`socks: ${rowDataStatic.callbackports[i].local_port}, ${rowDataStatic.callbackports[i].username}:${rowDataStatic.callbackports[i].password}`);
                    }
                    break;
                case "rpfwd":
                    if(rowDataStatic.callbackports[i].username === ""){
                        message.push(`rpfwd: ${rowDataStatic.callbackports[i].local_port}->${rowDataStatic.callbackports[i].remote_ip}:${rowDataStatic.callbackports[i].remote_port}`);
                    } else {
                        message.push(`pfwd: ${rowDataStatic.callbackports[i].local_port}->${rowDataStatic.callbackports[i].remote_ip}:${rowDataStatic.callbackports[i].remote_port}, ${rowDataStatic.callbackports[i].username}:${rowDataStatic.callbackports[i].password}`);
                    }
                    break;
                case "interactive":
                    message.push(`interactive: ${rowDataStatic.callbackports[i].local_port}`);
                    break;
            }
        }
        return message.join("\n");
    }, [rowDataStatic]);
    const handleDropdownToggle = (event) => {
        event.stopPropagation();
        callbackDropdown({rowDataStatic, event});
    };
    const localOnOpenTab = () => {
        onOpenTab({tabType: interactType, tabID: rowDataStatic.id + interactType, callbackID: rowDataStatic.id,  displayID: rowDataStatic.display_id});
    }
    let defaultInteractIcon = <KeyboardIcon style={{paddingRight: "5px"}}/>;
    if(interactType === "interactSplit"){
        defaultInteractIcon = <VerticalSplitIcon style={{paddingRight: "5px"}}/>;
    } else if(interactType === "interactConsole"){
        defaultInteractIcon = <TerminalIcon style={{paddingRight: "5px"}}/>;
    }

    return (
        <div id={`callbacksTableID${rowDataStatic.id}`} style={{display: "inline-flex", alignItems: "flex-start"}}>
            <IconButton style={{padding: 0, margin: 0}} color={rowDataStatic.integrity_level > 2 ? "error" : ""}
                onClick={(evt) => {evt.stopPropagation();localOnOpenTab()}}
            >
                {rowDataStatic.locked ? (<LockIcon  style={{marginRight: "10px"}} />):(defaultInteractIcon)}
            </IconButton>
        {rowDataStatic.display_id}
            <IconButton
                style={{margin: 0, padding: 0}}
                color={rowDataStatic.integrity_level > 2 ? "error" : ""}
                aria-haspopup="menu"
                onClick={handleDropdownToggle}
                ref={dropdownAnchorRef}
            >
            <ArrowDropDownIcon/>
            </IconButton>
            {rowDataStatic.trigger_on_checkin_after_time > 0 &&
                <MythicStyledTooltip title={`Alert on callback after no checkin for ${rowDataStatic.trigger_on_checkin_after_time} minutes`}>
                    <NotificationsActiveTwoToneIcon color={"success"}/>
                </MythicStyledTooltip>
            }
            {rowDataStatic.callbackports.length > 0 &&
                <MythicStyledTooltip title={proxyMessage()}>
                    <FontAwesomeIcon icon={faSocks} size="lg" style={{color: theme.palette.success.main}}/>
                </MythicStyledTooltip>
            }
    </div>
    )
},
    areEqual)
export const CallbacksTableStringCell = React.memo(({rowData, cellData}) => {
    return (
        <div>{cellData}</div>
    )
}, areEqual)
export const CallbacksTableLastCheckinCell = React.memo( ({rowData, cellData, me}) => {
    const adjustOutput = (newTime) => {
        if(newTime === "a few seconds"){
            moment.relativeTimeThreshold('s', 60);
            moment.relativeTimeThreshold('ss', 0);
            return moment(rowData.last_checkin + "Z", "YYYY-MM-DDTHH:mm:ss.SSSSSSZ").subtract(me?.user?.server_skew || 0, 'millisecond').fromNow(true)
        }
        return moment(rowData.last_checkin + "Z", "YYYY-MM-DDTHH:mm:ss.SSSSSSZ").subtract(me?.user?.server_skew || 0, 'millisecond').fromNow(true);
        //return newTime;
    }
    const theme = useTheme();
    if(rowData?.payload?.payloadtype?.agent_type !== "agent"){
        return ""
    }
    if(rowData.last_checkin === "1970-01-01T00:00:00"){
        return (
            <>
            {rowData.dead &&
                <MythicStyledTooltip title={"Based on callback's last checkin and sleep info, it's likely dead"}>
                    <FontAwesomeIcon disabled icon={faSkullCrossbones} style={{
                        color: theme.palette.error.main, cursor: "pointer", marginRight: "10px",}} />
                </MythicStyledTooltip>
            }
            {"Streaming Now"}
            </>

        )
    }
    return (
        <div style={{display: "flex", alignItems: "center"}}>
            {rowData.dead &&
                <MythicStyledTooltip title={"Based on callback's last checkin and sleep info, it's likely dead"}>
                    <FontAwesomeIcon icon={faSkullCrossbones} style={{
                        color: theme.palette.error.main, cursor: "pointer", marginRight: "10px",}} />
                </MythicStyledTooltip>
            }
                <Moment filter={adjustOutput} interval={1000} parse={"YYYY-MM-DDTHH:mm:ss.SSSSSSZ"}
                    withTitle
                    titleFormat={"YYYY-MM-DD HH:mm:ss"}
                    fromNow ago
                >
                    {rowData.last_checkin + "Z"}
                </Moment>
        </div>
        
    )
}, areEqual);
export const CallbacksTablePayloadTypeCell = React.memo( ({rowData}) => {
    return (
        rowData?.payload?.payloadtype?.name
    )
}, areEqual)
export const CallbacksTableIPCell = React.memo(({cellData, rowData}) => {
    const [displayIP, setDisplayIP] = React.useState("");
    const [openPickIP, setOpenPickIP] = React.useState(false);
    const [options, setOptions] = React.useState([]);
    const [updateIPs] = useMutation(updateIPsCallbackMutation, {
        update: (cache, {data}) => {
            if(data.updateCallback.status === "success"){
                snackActions.success("Updated Callback");
            } else {
                snackActions.warning(data.updateCallback.error);
            }

        },
        onError: data => {
            console.log(data)
            snackActions.warning(data);
        }
    });
    const updateIPsInfo = React.useCallback( ({callback_display_id, ips}) => {
        updateIPs({variables: {callback_display_id: callback_display_id, ips}})
    }, []);
    const onClick = () => {
        setOpenPickIP(true);
    }
    const editIPSubmit = (selected_ip) => {
        // update IP order
        const ipArray = JSON.parse(cellData).filter( c => c !== selected_ip);
        const newIPArray = [selected_ip, ...ipArray];
        //const newIPString = JSON.stringify( newIPArray);
        updateIPsInfo({callback_display_id: rowData.display_id, ips: newIPArray});
        //console.log(newIPString)
    }
    React.useEffect( () => {
        let IPArray = JSON.parse(cellData);
        if(IPArray.length > 0){
            setDisplayIP(IPArray[0]);
        }
        setOptions(IPArray);
    }, [cellData]);
    return (
        <>
            <div style={{display: "inline-flex", alignItems: "center", height: "100%"}}>
                {options.length > 1 &&
                    <MythicStyledTooltip title={"Adjust Displayed"}>
                        <UnfoldMoreIcon onClick={onClick} style={{paddingTop: "5px", cursor: "pointer", width: "unset"}} />
                    </MythicStyledTooltip>
                }
                {displayIP}
            </div>
            {openPickIP && 
                <MythicDialog fullWidth={true} open={openPickIP}  onClose={() => {setOpenPickIP(false);}}
                innerDialog={
                    <MythicSelectFromRawListDialog 
                        onClose={() => {setOpenPickIP(false);}} 
                        options={options}
                        action={"Select"}
                        title={"Select new IP to display"}
                        onSubmit={editIPSubmit} />
                }
            />}
        </>
        
    )
}, areEqual)
export const CallbacksTableC2Cell = React.memo(({rowData}) => {
    const theme = useTheme();
    const [localRowData, setLocalRowData] = React.useState(rowData);
    const initialCallbackGraphEdges = useContext(CallbackGraphEdgesContext);
    const onOpenTab = useContext(OnOpenTabContext);
    const [activeEgress, setActiveEgress] = React.useState(theme.palette.success.main);
    const [hasEgressRoute, setHasEgressRoute] = React.useState(true);
    const [openC2Dialog, setOpenC2Dialog] = React.useState(false);
    const [callbackgraphedges, setCallbackgraphedges] = React.useState([]);
    const [callbackgraphedgesAll, setCallbackgraphedgesAll] = React.useState([]);
    const onOpenC2Dialog = (event) => {
        event.stopPropagation();
        setOpenC2Dialog(true);
    }
    useEffect( () => {
        const routes = callbackgraphedgesAll.filter( (edge) => {
            if(!edge.c2profile.is_p2p && edge.source.id === localRowData.id && edge.destination.id === localRowData.id){
                return true;
            }
            return false;
        }).length;
        if(routes > 0 && !hasEgressRoute){
            setHasEgressRoute(true);
        }else if(routes === 0 && hasEgressRoute){
            setHasEgressRoute(false);
        }
    }, [callbackgraphedgesAll, localRowData]);
    useEffect( () => {
        const getEdges = (activeOnly) => {
            //update our aggregate of callbackgraphedges for both src and dst that involve us
            let myEdges = initialCallbackGraphEdges?.filter( (edge) =>{
                if(edge.source.id === localRowData.id || edge.destination.id === localRowData.id){
                    if(activeOnly){
                        if(edge.end_timestamp === null){
                            return true;
                        }
                        else{return false}
                    }
                    return true;
                }
                return false;
            }) || [];
            let foundMore = true;
            while(foundMore){
                //look at all of the edges in myEdges and see if there are any edges that share a source/destination in props.callbackgraphedges that are _not_ in myEdges so far
                const newEdges = initialCallbackGraphEdges?.reduce( (prev, edge) => {
                    //looking to see if we should add 'edge' to our list of relevant edges
                    const alreadyIncludes = prev.filter( (e) => e.id === edge.id);
                    if(alreadyIncludes.length > 0){
                        return [...prev]
                    }
                    //look through all of the previous edges we know about and see if there's a matching source/destination id with the new edge
                    const matching = prev.filter( (e) => {
                        if(e.source.id === edge.source.id || e.source.id === edge.destination.id || e.destination.id === edge.source.id || e.destination.id === edge.destination.id ){
                            if(activeOnly){
                                if(edge.end_timestamp === null) { return true}
                                else{return false}
                            }
                            return true;
                        }
                        return false;
                    });
                    if(matching.length > 0){
                        return [...prev, {...edge}];
                    }else{
                        return [...prev];
                    }
                }, [...myEdges]) || [];
                foundMore = newEdges.length > myEdges.length;
                myEdges = [...newEdges];
            }
            return myEdges;
        }
        const myActiveEdges = getEdges(true);
        const myEdges = getEdges(false);
        setCallbackgraphedges(myActiveEdges);
        setCallbackgraphedgesAll(myEdges);

    }, [initialCallbackGraphEdges, localRowData]);
    useEffect( () => {
        //determine if there are any active routes left at all
        //console.log(localRowData.display_id, callbackgraphedges)
        const activeRoutes = callbackgraphedges.filter( (edge) => {
            if(!edge.c2profile.is_p2p  && edge.end_timestamp === null){
                return true;
            }
            return false
        });
        if(activeRoutes.length === 0){
            setActiveEgress(theme.palette.error.main);
        }else{
            setActiveEgress(theme.palette.success.main);
        }
    }, [callbackgraphedges, theme.palette.success.main, theme.palette.error.main]);
    useEffect( () => {
        if(rowData.id !== localRowData.id){
            setLocalRowData(rowData);
        }
    }, [rowData]);
    if(rowData?.payload?.payloadtype?.agent_type !== "agent"){
        return null
    }
    return (
        <div>
            {hasEgressRoute ? 
                <WifiIcon onClick={onOpenC2Dialog} style={{color: activeEgress, cursor: "pointer"}}/> : 
                <InsertLinkTwoToneIcon onClick={onOpenC2Dialog} style={{color: activeEgress, cursor: "pointer"}} />
            }
            {openC2Dialog &&
                <MythicDialog 
                    fullWidth={true} 
                    maxWidth="lg" 
                    open={openC2Dialog}
                    onClose={()=>{setOpenC2Dialog(false);}} 
                    innerDialog={
                        <C2PathDialog 
                            onClose={()=>{setOpenC2Dialog(false);}}

                            callback={localRowData}
                            callbackgraphedges={callbackgraphedgesAll}
                            onOpenTab={onOpenTab}
                        />
                    }
                />
            }
            
        </div>
        
    )
}, areEqual)
export const CallbacksTableOSCell = React.memo( ({rowData, cellData}) => {
    const [openOSDialog, setOpenOSDialog] = React.useState(false);
    const getOSIcon = useCallback( () => {
        if(rowData?.payload?.payloadtype?.agent_type !== "agent"){
            return <FontAwesomeIcon icon={faRobot} style={{cursor: "pointer"}} onClick={displayOSInfo} />
        }
        switch(rowData.payload.os.toLowerCase()){
            case "windows":
                return <FontAwesomeIcon icon={faWindows}  style={{cursor: "pointer"}} onClick={displayOSInfo} />
            case "linux":
            case "centos":
            case "redhat":
            case "debian":
            case "fedora":
            case "freebsd":
                return <FontAwesomeIcon icon={faLinux}  style={{cursor: "pointer"}} onClick={displayOSInfo} />
            case "macos":
                return <FontAwesomeIcon icon={faApple} style={{cursor: "pointer"}} onClick={displayOSInfo}/>
            case "chrome":
                return <FontAwesomeIcon icon={faChrome} style={{cursor: "pointer"}} onClick={displayOSInfo} />
            case "android":
                return <FontAwesomeIcon icon={faAndroid}  style={{cursor: "pointer"}} onClick={displayOSInfo} />
            default:
                return <FontAwesomeIcon icon={faQuestion}  style={{cursor: "pointer"}} onClick={displayOSInfo} />
        }
    }, [rowData?.payload?.os]);
    const displayOSInfo = React.useCallback( () => {
        setOpenOSDialog(true);
    }, []);
    return (
        <div>
            {getOSIcon()}
            { openOSDialog &&
                <MythicDisplayTextDialog 
                    onClose={()=>{setOpenOSDialog(false);}} 
                    title={"Operating System Information"} 
                    maxWidth={"md"} 
                    fullWidth={true} 
                    value={cellData} 
                    open={openOSDialog}
                />
            }
        </div>
        
                
    )
}, areEqual);
export const CallbacksTableSleepCell = React.memo( ({rowData, cellData, updateSleepInfo}) => {
    const theme = useTheme();
    const [openSleepDialog, setOpenSleepDialog] = React.useState(false);
    const editSleepSubmit = (sleep) => {
        updateSleepInfo({sleep_info: sleep, callback_display_id: rowData.display_id});
    }
    const onOpenSleepDialog = (event) => {
        event.stopPropagation();
        setOpenSleepDialog(true);
    }
    if(rowData?.payload?.payloadtype?.agent_type !== "agent"){
        return null
    }
    return (
        <div style={{height: "100%", display: "flex", alignItems: "center"}}>
            <SnoozeIcon onClick={onOpenSleepDialog} 
                style={{color: cellData === "" ? theme.palette.warning.main : theme.palette.info.main, cursor: "pointer"}}
            />
            { openSleepDialog &&
                <MythicDialog fullWidth={true} open={openSleepDialog} maxWidth={"md"}
                              style={{height: "100%"}}
                              onClose={() => {setOpenSleepDialog(false);}}
                    innerDialog={
                        <MythicModifyStringDialog title={"View / Edit Sleep Information - This doesn't issue tasks to the agent, but helps alive/dead tracking"}
                                                  maxRows={20}
                            onClose={() => {setOpenSleepDialog(false);}}
                            value={cellData} 
                            onSubmit={editSleepSubmit} />
                    }
                />
            }
        </div>
        
            
    )
}, areEqual)
export const CallbacksTableTagsCell = React.memo(({rowData, cellData}) => {
    return (
        <div>
            <ViewEditTags target_object={"callback_id"} target_object_id={rowData.id} />
            <TagsDisplay tags={cellData} expand={false} />
        </div>
    )
}, areEqual)