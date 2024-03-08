import React, {useCallback, useEffect, useContext} from 'react';
import {Button} from '@mui/material';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import { MythicDisplayTextDialog} from '../../MythicComponents/MythicDisplayTextDialog';
import {MythicModifyStringDialog} from '../../MythicComponents/MythicDialog';
import ButtonGroup from '@mui/material/ButtonGroup';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import LockIcon from '@mui/icons-material/Lock';
import WifiIcon from '@mui/icons-material/Wifi';
import InsertLinkTwoToneIcon from '@mui/icons-material/InsertLinkTwoTone';
import {C2PathDialog} from './C2PathDialog';
import {snackActions} from '../../utilities/Snackbar';
import Paper from '@mui/material/Paper';
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ClickAwayListener from '@mui/material/ClickAwayListener';
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
import {ModifyCallbackMythicTreeGroupsDialog} from "./ModifyCallbackMythicTreeGroupsDialog";
import TerminalIcon from '@mui/icons-material/Terminal';
import ImportExportIcon from '@mui/icons-material/ImportExport';

export const CallbacksTableIDCell = React.memo(({rowData, toggleLock, updateDescription, setOpenHideMultipleDialog, setOpenTaskMultipleDialog}) =>{
    const dropdownAnchorRef = React.useRef(null);
    const theme = useTheme();
    const onOpenTab = useContext(OnOpenTabContext);
    const [openMetaDialog, setOpenMetaDialog] = React.useState(false);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [openEditDescriptionDialog, setOpenEditDescriptionDialog] = React.useState(false);
    const [openTaskingButton, setOpenTaskingButton] = React.useState(false);
    const [openEditMythicTreeGroupsDialog, setOpenEditMythicTreeGroupsDialog] = React.useState(false);
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
    const editDescriptionSubmit = (description) => {
        if(description === ""){
            updateDescription({description: rowDataStatic.payload.description, callback_display_id: rowDataStatic.display_id});
        } else {
            updateDescription({description, callback_display_id: rowDataStatic.display_id});
        }
        
        
    }
    const handleDropdownToggle = (evt) => {
            evt.stopPropagation();
            setDropdownOpen((prevOpen) => !prevOpen);
      };
    const localOnOpenTab = (tabType) => {
        if(tabType === "interact"){
            onOpenTab({tabType, tabID: rowDataStatic.id + tabType, callbackID: rowDataStatic.id, displayID: rowDataStatic.display_id});
        }else if(tabType === "processBrowser"){
            onOpenTab({tabType, tabID: rowDataStatic.host, callbackID: rowDataStatic.id,  displayID: rowDataStatic.display_id});
        }else{
            onOpenTab({tabType, tabID: rowDataStatic.id + tabType, callbackID: rowDataStatic.id,  displayID: rowDataStatic.display_id});
        }
    }
    const handleMenuItemClick = (event, index) => {
        options[index].click(event);
        setDropdownOpen(false);
    };
    const handleClose = (event) => {
        if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
          return;
        }

        setDropdownOpen(false);
      };
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
        {name: 'Hide Callback', icon: <VisibilityOffIcon style={{color: theme.palette.warning.main, paddingRight: "5px"}}/>, click: (evt) => {
            evt.stopPropagation();
            hideCallback({variables: {callback_display_id: rowDataStatic.display_id}});
        }},
        {
            name: "Hide Multiple", icon: <VisibilityOffIcon style={{paddingRight: "5px"}}/>, click: (evt) => {
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
            }
        },
        {name: rowDataStatic.locked ? 'Unlock (Locked by ' + rowDataStatic.locked_operator.username + ')' : 'Lock Callback', icon: rowDataStatic.locked ? (<LockOpenIcon style={{color: theme.successOnMain, paddingRight: "5px"}}/>) : (<LockIcon style={{color: theme.errorOnMain, paddingRight: "5px"}} />), click: (evt) => {
            evt.stopPropagation();
            localToggleLock();
        }},
        {name: "Edit Description", icon: <EditIcon style={{paddingRight: "5px"}} />, click: (evt) => {
            evt.stopPropagation();
            setOpenEditDescriptionDialog(true);
        }},
        {name: "Expand Callback", icon: <OpenInNewIcon style={{paddingRight: "5px"}} />, click: (evt) => {
            evt.stopPropagation();
            window.open("/new/callbacks/" + rowDataStatic.display_id, "_blank").focus();
        }},
        {name: "Export Callback", icon: <ImportExportIcon style={{paddingRight: "5px"}} />, click: (evt) => {
            evt.stopPropagation();
            exportConfig({variables: {agent_callback_id: rowDataStatic.agent_callback_id}});
        }},
        {name: "View Metadata", icon: <InfoIcon style={{color: theme.infoOnMain, paddingRight: "5px"}} />, click: (evt) => {
            evt.stopPropagation();
            setOpenMetaDialog(true);
        }},
        {name: "Modify Groupings", icon: <WidgetsIcon style={{paddingRight: "5px"}} />, click: (evt) => {
            evt.stopPropagation();
            setOpenEditMythicTreeGroupsDialog(true);
        }}
    ];
    return (
        <div>
            <ButtonGroup  
                color={rowDataStatic.integrity_level > 2 ? "error" : "primary"} 
                ref={dropdownAnchorRef} 
                aria-label="split button"
            >
                <Button style={{padding: "0 10px 0 10px"}} color={rowDataStatic.integrity_level > 2 ? "error" : "primary"}  variant="contained"
                    onClick={(evt) => {evt.stopPropagation();localOnOpenTab("interact")}}>
                    { rowDataStatic.locked ? (<LockIcon fontSize="large" style={{color: theme.errorOnMain, marginRight: "10px"}} />):(<KeyboardIcon fontSize="large" style={{marginRight: "10px"}}/>) }
                    {rowDataStatic.display_id}
                </Button>
                <Button
                    style={{margin: 0, padding: 0}}
                    variant="contained"
                    aria-controls={dropdownOpen ? 'split-button-menu' : undefined}
                    aria-expanded={dropdownOpen ? 'true' : undefined}
                    color={rowDataStatic.integrity_level > 2 ? "error" : "primary"} 
                    aria-haspopup="menu"
                    onClick={handleDropdownToggle}
                >
                <ArrowDropDownIcon/>
                </Button>
            </ButtonGroup>
            <Popper open={dropdownOpen} anchorEl={dropdownAnchorRef.current} role={undefined} transition style={{zIndex: 200}}>
                {({ TransitionProps, placement }) => (
                <Grow
                    {...TransitionProps}
                    style={{
                    transformOrigin: placement === 'bottom' ? 'top left' : 'top center',
                    }}
                >
                    <Paper className={"dropdownMenuColored"} elevation={5}>
                    <ClickAwayListener onClickAway={handleClose} mouseEvent={"onMouseDown"}>
                        <MenuList id="split-button-menu">
                        {options.map((option, index) => (
                            <MenuItem
                            key={option.name}
                            onClick={(event) => handleMenuItemClick(event, index)}
                            >
                            {option.icon}{option.name}
                            </MenuItem>
                        ))}
                        </MenuList>
                    </ClickAwayListener>
                    </Paper>
                </Grow>
                )}
            </Popper>     
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
            {openMetaDialog && 
                <MythicDialog fullWidth={true} maxWidth="lg" open={openMetaDialog}
                    onClose={()=>{setOpenMetaDialog(false);}} 
                    innerDialog={<DetailedCallbackTable onClose={()=>{setOpenMetaDialog(false);}} callback_id={rowDataStatic.id} />}
                />
            }
            {openEditDescriptionDialog &&
                <MythicDialog 
                    fullWidth={true} 
                    open={openEditDescriptionDialog}  
                    onClose={() => {setOpenEditDescriptionDialog(false);}}
                    innerDialog={
                        <MythicModifyStringDialog title={"Edit Callback's Description"} 
                            onClose={() => {setOpenEditDescriptionDialog(false);}} 
                            value={rowDataStatic.description} 
                            onSubmit={editDescriptionSubmit} 
                        />
                    }
                />
            }
            {openEditMythicTreeGroupsDialog &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth={"lg"}
                    open={openEditMythicTreeGroupsDialog}
                    onClose={() => {setOpenEditMythicTreeGroupsDialog(false);}}
                    innerDialog={
                        <ModifyCallbackMythicTreeGroupsDialog callback_id={rowDataStatic.id}
                            onClose={() => {setOpenEditMythicTreeGroupsDialog(false);}} />
                    }
                />
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
        if(newTime.includes("54 years")){
            return "Streaming Now"
        }else if(newTime === "a few seconds"){
            moment.relativeTimeThreshold('s', 60);
            moment.relativeTimeThreshold('ss', 0);
            return moment(rowData.last_checkin + "Z", "YYYY-MM-DDTHH:mm:ss.SSSSSSZ").fromNow(true)
        }
        return newTime;
    }
    if(rowData?.payload?.payloadtype?.agent_type !== "agent"){
        return ""
    }
    return (
        <div>
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
        <MythicStyledTooltip title={rowData?.payload?.payloadtype?.name}>
            <img
                style={{width: "35px", height: "35px"}}
                src={"/static/" + rowData?.payload?.payloadtype?.name + ".svg"}
            />
        </MythicStyledTooltip>
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
            return <FontAwesomeIcon icon={faRobot} size="2x" style={{cursor: "pointer"}} onClick={displayOSInfo} />
        }
        switch(rowData.payload.os.toLowerCase()){
            case "windows":
                return <FontAwesomeIcon icon={faWindows} size="2x" style={{cursor: "pointer"}} onClick={displayOSInfo} />
            case "linux":
            case "centos":
            case "redhat":
            case "debian":
            case "fedora":
            case "freebsd":
                return <FontAwesomeIcon icon={faLinux} size="2x" style={{cursor: "pointer"}} onClick={displayOSInfo} />
            case "macos":
                return <FontAwesomeIcon icon={faApple} size="2x" style={{cursor: "pointer"}} onClick={displayOSInfo}/>
            case "chrome":
                return <FontAwesomeIcon icon={faChrome} size="2x" style={{cursor: "pointer"}} onClick={displayOSInfo} />
            case "android":
                return <FontAwesomeIcon icon={faAndroid} size="2x" style={{cursor: "pointer"}} onClick={displayOSInfo} />
            default:
                return <FontAwesomeIcon icon={faQuestion} size="2x" style={{cursor: "pointer"}} onClick={displayOSInfo} />
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
        <div>
            <SnoozeIcon onClick={onOpenSleepDialog} 
                style={{color: cellData === "" ? theme.palette.warning.main : theme.palette.info.main, cursor: "pointer"}}
            />
            { openSleepDialog &&
                <MythicDialog fullWidth={true} open={openSleepDialog}  onClose={() => {setOpenSleepDialog(false);}}
                    innerDialog={
                        <MythicModifyStringDialog title={"View Sleep Information"} multiline maxRows={10}
                            onClose={() => {setOpenSleepDialog(false);}} 
                            value={cellData} 
                            onSubmit={editSleepSubmit} />
                    }
                />
            }
        </div>
        
            
    )
}, areEqual)