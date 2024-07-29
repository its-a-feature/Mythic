import React, {useCallback, useEffect, useContext} from 'react';
import {IconButton, Button} from '@mui/material';
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

import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import {
    hideCallbackMutation,
    lockCallbackMutation,
    unlockCallbackMutation,
    updateIPsCallbackMutation,
    exportCallbackConfigQuery
} from './CallbackMutations';
import {useMutation, useLazyQuery } from '@apollo/client';
import SnoozeIcon from '@mui/icons-material/Snooze';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import {useTheme} from '@mui/material/styles';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faQuestion, faSkullCrossbones, faFolderOpen, faList, faRobot} from '@fortawesome/free-solid-svg-icons';
import {faLinux, faApple, faWindows, faChrome, faAndroid} from '@fortawesome/free-brands-svg-icons';
import {DetailedCallbackTable} from './DetailedCallbackTable';
import InfoIcon from '@mui/icons-material/Info';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import {TaskFromUIButton} from './TaskFromUIButton';
import { MythicSelectFromRawListDialog } from '../../MythicComponents/MythicSelectFromListDialog';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { areEqual } from 'react-window';
import {CallbackGraphEdgesContext, OnOpenTabContext} from './CallbacksTop';
import Moment from 'react-moment';
import moment from 'moment';
import WidgetsIcon from '@mui/icons-material/Widgets';
import TerminalIcon from '@mui/icons-material/Terminal';
import ImportExportIcon from '@mui/icons-material/ImportExport';

export const CallbacksTableIDCell = React.memo(({rowData, metaDialog, updateDescription, editMythicTreeGroupsDialog, setOpenHideMultipleDialog, setOpenTaskMultipleDialog, callbackDropdown}) =>{
    const dropdownAnchorRef = React.useRef(null);
    const theme = useTheme();
    const onOpenTab = useContext(OnOpenTabContext);
    const [openTaskingButton, setOpenTaskingButton] = React.useState(false);
    const taskingData = React.useRef({"parameters": "", "ui_feature": "callback_table:exit"});
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
        if(update){
            setRowDataStatic(rowData);
        }
    }, [rowData]);
    const [lockCallback] = useMutation(lockCallbackMutation, {
        update: (cache, {data}) => {
            if(data.updateCallback.status === "success"){
                snackActions.success("Locked callback");
            }else{
                snackActions.warning(data.updateCallback.error);
            }

        },
        onError: data => {
            console.log(data);
            snackActions.warning(data);
        }
    });
    const [unlockCallback] = useMutation(unlockCallbackMutation, {
        update: (cache, {data}) => {
            if(data.updateCallback.status === "success"){
                snackActions.success("Unlocked callback");
            }else{
                snackActions.warning(data.updateCallback.error);
            }

        },
        onError: data => {
            console.log(data);
            snackActions.warning(data);
        }
    });
    const handleDropdownToggle = (evt) => {
        evt.stopPropagation();
        callbackDropdown({options: options, callback: rowDataStatic, dropdownAnchorRef: dropdownAnchorRef.current, event: evt});
    };
    const localOnOpenTab = (tabType) => {
        onOpenTab({tabType, tabID: rowDataStatic.id + tabType, callbackID: rowDataStatic.id,  displayID: rowDataStatic.display_id});
    }

    const [hideCallback] = useMutation(hideCallbackMutation, {
        update: (cache, {data}) => {
            if(data.updateCallback.status === "success"){
                snackActions.success("Hiding callback");
            }else{
                snackActions.warning(data.updateCallback.error);
            }
            
        },
        onError: data => {
            console.log(data);
        }
    });
    const localToggleLock = () => {
        if(rowDataStatic.locked){
            unlockCallback({variables: {callback_display_id: rowDataStatic.display_id}})
        }else{
            lockCallback({variables: {callback_display_id: rowDataStatic.display_id}})
        }
    }
    const [exportConfig] = useLazyQuery(exportCallbackConfigQuery, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            if(data.exportCallbackConfig.status === "success"){
                const dataBlob = new Blob([data.exportCallbackConfig.config], {type: 'text/plain'});
                const ele = document.getElementById("download_config");
                if(ele !== null){
                    ele.href = URL.createObjectURL(dataBlob);
                    ele.download = rowDataStatic.agent_callback_id + ".json";
                    ele.click();
                }else{
                    const element = document.createElement("a");
                    element.id = "download_config";
                    element.href = URL.createObjectURL(dataBlob);
                    element.download = rowDataStatic.agent_callback_id + ".json";
                    document.body.appendChild(element);
                    element.click();
                }
            }else{
                snackActions.error("Failed to export configuration: " + data.exportCallbackConfig.error);
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error("Failed to export configuration: " + data.message)
        }
    })
    const options =  [
        {name: 'Hide Callback', icon: <VisibilityOffIcon color={"warning"} style={{paddingRight: "5px"}}/>, click: (evt) => {
            evt.stopPropagation();
            hideCallback({variables: {callback_display_id: rowDataStatic.display_id}});
        }},
        {
            name: "Hide Multiple", icon: <VisibilityOffIcon color={"warning"} style={{paddingRight: "5px"}}/>, click: (evt) => {
                setOpenHideMultipleDialog(true);
            }
        },
        {
            name: "Exit Callback", icon: <FontAwesomeIcon icon={faSkullCrossbones} style={{color: theme.errorOnMain, cursor: "pointer", marginRight: "10px"}} />, click: (evt) => {
                taskingData.current = {"parameters": "", "ui_feature": "callback_table:exit", "getConfirmation": true, acceptText: "exit"};
                setOpenTaskingButton(true);
            }
        },
        {
            name: "Task Multiple", icon: <FontAwesomeIcon icon={faList} style={{cursor: "pointer", marginRight: "10px"}} />, click: (evt) => {
                setOpenTaskMultipleDialog({open: true, data: rowDataStatic});
            }
        },
        {name: 'File Browser', icon: <FontAwesomeIcon icon={faFolderOpen} style={{color: theme.folderColor, cursor: "pointer", marginRight: "10px"}} />, click: (evt) => {
            evt.stopPropagation();
            localOnOpenTab("fileBrowser");
        }},
        {name: 'Process Browser', icon: <AccountTreeIcon style={{paddingRight: "5px"}}/>, click: (evt) => {
            evt.stopPropagation();
            localOnOpenTab("processBrowser");
        }},
        {name: 'Split Tasking', icon: <KeyboardIcon style={{paddingRight: "5px"}}/>, click: (evt) => {
                evt.stopPropagation();
                localOnOpenTab("interactSplit");
            }},
        {name: "Console View", icon: <TerminalIcon style={{paddingRight: "5px"}}/>, click: (evt) => {
                evt.stopPropagation();
                localOnOpenTab("interactConsole");
            }},
        {name: rowDataStatic.locked ? 'Unlock (Locked by ' + rowDataStatic.locked_operator.username + ')' : 'Lock Callback', icon: rowDataStatic.locked ? (<LockIcon color={"error"} style={{paddingRight: "5px"}}/>) : (<LockOpenIcon color={"success"} style={{paddingRight: "5px"}} />), click: (evt) => {
            evt.stopPropagation();
            localToggleLock();
        }},
        {name: "Edit Description", icon: <EditIcon style={{paddingRight: "5px"}} />, click: (evt) => {
            evt.stopPropagation();
            updateDescription({payload_description: rowDataStatic.payload.description,
                callback_display_id: rowDataStatic.display_id,
                description: rowDataStatic.description,
            });
        }},
        {name: "Expand Callback", icon: <OpenInNewIcon style={{paddingRight: "5px"}} />, click: (evt) => {
            evt.stopPropagation();
            window.open("/new/callbacks/" + rowDataStatic.display_id, "_blank").focus();
        }},
        {name: "Export Callback", icon: <ImportExportIcon style={{paddingRight: "5px"}} />, click: (evt) => {
            evt.stopPropagation();
            exportConfig({variables: {agent_callback_id: rowDataStatic.agent_callback_id}});
        }},
        {name: "View Metadata", icon: <InfoIcon color={"info"} style={{paddingRight: "5px"}} />, click: (evt) => {
            evt.stopPropagation();
            metaDialog(rowDataStatic.id);
        }},
        {name: "Modify Groupings", icon: <WidgetsIcon color={"info"} style={{paddingRight: "5px"}} />, click: (evt) => {
            evt.stopPropagation();
            editMythicTreeGroupsDialog(rowDataStatic.id);
        }}
    ];
    return (
        <div id={`callbacksTableID${rowDataStatic.id}`}>
                <IconButton style={{padding: 0, margin: 0}} color={rowDataStatic.integrity_level > 2 ? "error" : ""}
                    onClick={(evt) => {evt.stopPropagation();localOnOpenTab("interact")}}
                >
                    {rowDataStatic.locked ? (<LockIcon  style={{marginRight: "10px"}} />):(<KeyboardIcon  style={{marginRight: "10px"}}/>)}
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

            {openTaskingButton && 
                <TaskFromUIButton ui_feature={taskingData.current?.ui_feature || " "} 
                    callback_id={rowDataStatic.id} 
                    display_id={rowDataStatic.display_id}
                    parameters={taskingData.current?.parameters || ""}
                    openDialog={taskingData.current?.openDialog || false}
                    getConfirmation={taskingData.current?.getConfirmation || false}
                    acceptText={taskingData.current?.acceptText || "YES"}
                    selectCallback={taskingData.current?.selectCallback || false}
                    onTasked={() => setOpenTaskingButton(false)}/>
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
export const CallbacksTableLastCheckinCell = React.memo( ({rowData, cellData}) => {
    const adjustOutput = (newTime) => {
        if(newTime === "a few seconds"){
            moment.relativeTimeThreshold('s', 60);
            moment.relativeTimeThreshold('ss', 0);
            return moment(rowData.last_checkin + "Z", "YYYY-MM-DDTHH:mm:ss.SSSSSSZ").fromNow(true)
        }
        return newTime;
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
            <div style={{display: "flex", alignItems: "center"}}>
                {options.length > 1 &&
                    <MythicStyledTooltip title={"Adjust Displayed"}>
                        <UnfoldMoreIcon onClick={onClick} style={{paddingTop: "5px", cursor: "pointer"}} />
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
                }, [...myEdges]) || [];
                foundMore = newEdges.length > myEdges;
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