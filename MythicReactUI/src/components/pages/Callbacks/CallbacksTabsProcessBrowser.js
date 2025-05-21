import {MythicTabPanel, MythicTabLabel} from '../../MythicComponents/MythicTabPanel';
import React, {useEffect, useRef} from 'react';
import {gql, useQuery, useSubscription, useLazyQuery } from '@apollo/client';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {useTheme} from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import IconButton from '@mui/material/IconButton';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {CallbacksTabsProcessBrowserTable} from './CallbacksTabsProcessBrowserTable';
import {MythicModifyStringDialog} from '../../MythicComponents/MythicDialog';
import {TaskFromUIButton} from './TaskFromUIButton';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import Input from '@mui/material/Input';
import {ViewCallbackMythicTreeGroupsDialog} from "./ViewCallbackMythicTreeGroupsDialog";
import WidgetsIcon from '@mui/icons-material/Widgets';
import {snackActions} from "../../utilities/Snackbar";
import { Backdrop, Typography } from '@mui/material';
import {CircularProgress} from '@mui/material';
import ExpandIcon from '@mui/icons-material/Expand';
import {useMythicLazyQuery} from "../../utilities/useMythicLazyQuery";

const treeFragment = gql`
fragment treeObjData on mythictree {
    comment
    deleted
    task_id
    tags {
        tagtype {
            name
            color
            id
        }
        id
    }
    host
    id
    os
    can_have_children
    success
    full_path_text
    name_text
    timestamp
    parent_path_text
    tree_type
    metadata
    callback {
        id
        display_id
        mythictree_groups
    }
}
`;
const treeSubscription = gql`
    ${treeFragment}
    subscription liveData($now: timestamp!) {
        mythictree_stream(
            batch_size: 1000,
            cursor: {initial_value: {timestamp: $now}}, 
            where: {tree_type: {_eq: "process"}, deleted: {_eq: false} }
        ) {
            ...treeObjData
        }
    }
`;
const rootQuery = gql`
    ${treeFragment}
    query myRootProcessesQuery {
        mythictree(where: {parent_path_text: { _eq: "" }, tree_type: {_eq: "process"} }, order_by: {id: asc}) {
            ...treeObjData
        }
    }
`;
const treeHostQuery = gql`
    ${treeFragment}
    query processesPerHostQuery($host: String!){
        mythictree(where: {host: {_eq: $host}, tree_type: {_eq: "process"}, deleted: {_eq: false} }, order_by: {id: asc}) {
            ...treeObjData
        }
    }
`;
export const loadedCommandsQuery = gql`
query loadedCommandUIFeatures($callback_id: Int!){
    loadedcommands(where: {callback_id: {_eq: $callback_id}}){
        callback_id
        command {
            supported_ui_features
            cmd
            id
            payloadtype {
                name
                id
            }
        }
        id
        version
    }
}
`;
export function CallbacksTabsProcessBrowserLabel(props){
    const [description, setDescription] = React.useState("Processes: " + props.tabInfo.displayID)
    const [openEditDescriptionDialog, setOpenEditDescriptionDialog] = React.useState(false);
    const contextMenuOptions = props.contextMenuOptions.concat([
        {
            name: 'Set Tab Description', 
            click: ({event}) => {
                setOpenEditDescriptionDialog(true);
            }
        },
    ]);
    useEffect( () => {
        if(props.tabInfo.customDescription !== "" && props.tabInfo.customDescription !== undefined){
            setDescription(props.tabInfo.customDescription);
        }else{
            setDescription("Processes: " + props.tabInfo.displayID);
        }
    }, [props.tabInfo.customDescription])
    useEffect( () => {
        let savedDescription = localStorage.getItem(`${props.me.user.id}-${props.tabInfo.operation_id}-${props.tabInfo.tabID}`);
        if(savedDescription && savedDescription !== ""){
            setDescription(savedDescription);
        }
    }, []);
    const editDescriptionSubmit = (description) => {
        props.onEditTabDescription(props.tabInfo, description);
        localStorage.setItem(`${props.me.user.id}-${props.tabInfo.operation_id}-${props.tabInfo.tabID}`, description);
    }
    return (
        <React.Fragment>
            <MythicTabLabel label={description} onDragTab={props.onDragTab}  {...props} contextMenuOptions={contextMenuOptions}/>
            {openEditDescriptionDialog &&
                <MythicDialog fullWidth={true} open={openEditDescriptionDialog}  onClose={() => {setOpenEditDescriptionDialog(false);}}
                    innerDialog={
                        <MythicModifyStringDialog title={"Edit Tab's Description - Displays as one line"} onClose={() => {setOpenEditDescriptionDialog(false);}} value={description} onSubmit={editDescriptionSubmit} />
                    }
                />
            }
        </React.Fragment>  
    )
}
export const CallbacksTabsProcessBrowserPanel = ({index, value, tabInfo, me}) =>{
    const fromNow = React.useRef((new Date()));
    const [backdropOpen, setBackdropOpen] = React.useState(false);
    const [expandOrCollapseAll, setExpandOrCollapseAll] = React.useState(false);
    const treeRootDataRef = React.useRef({}); // hold all the actual data
    const [treeAdjMtx, setTreeAdjMtx] = React.useState({}); // hold the simple adjacency matrix for parent/child relationships
    const [openTaskingButton, setOpenTaskingButton] = React.useState(false);
    const taskingData = React.useRef({"parameters": "", "ui_feature": "process_browser:list"});
    const mountedRef = React.useRef(true);
    const [showDeletedFiles, setShowDeletedFiles] = React.useState(false);
    const [selectedHost, setSelectedHost] = React.useState("");
    const [selectedGroup, setSelectedGroup] = React.useState("");
    const loadedCommandsRef = React.useRef({});
    const loadingCommandsRef = React.useRef(false);
    const getNewMatrix = () => {
        let newMatrix = {};
        for(const[group, groupMatrix] of Object.entries(treeRootDataRef.current)){
            if(newMatrix[group] === undefined){newMatrix[group] = {}}
            for(const[host, hostMatrix] of Object.entries(treeRootDataRef.current[group])){
                if(newMatrix[group][host] === undefined){newMatrix[group][host] = {"":{}}}
                for(const[full_path_text, node] of Object.entries(treeRootDataRef.current[group][host])){
                    if(newMatrix[group][host][ node["parent_path_text"] ] === undefined){
                        newMatrix[group][host][ node["parent_path_text"] ] = {}
                    }
                    newMatrix[group][host][ node["parent_path_text"] ][full_path_text] = 1
                }
            }
        }
        return newMatrix;
    }
    useQuery(rootQuery, {
        onCompleted: (data) => {
           // use an adjacency matrix but only for full_path_text -> children, not both directions
            let defaultGroup = "Default";
            for(let i = 0; i < data.mythictree.length; i++){
                let currentGroups = data.mythictree[i]?.["callback"]?.["mythictree_groups"] || ["Unknown Callbacks"];
                try{
                    if(data.mythictree[i]?.['callback']?.['id'] === tabInfo.callbackID){
                        if(!currentGroups.includes(defaultGroup, 0)){
                            defaultGroup = currentGroups[0];
                        }
                    }
                }catch(error){
                    console.log(error);
                }
                for(let j = 0; j < currentGroups.length; j++){
                    if(treeRootDataRef.current[currentGroups[j]] === undefined){
                        treeRootDataRef.current[currentGroups[j]] = {};
                    }
                    if( treeRootDataRef.current[currentGroups[j]][data.mythictree[i]["host"]] === undefined) {
                        // new host discovered
                        treeRootDataRef.current[currentGroups[j]][data.mythictree[i]["host"]] = {};
                    }
                    treeRootDataRef.current[currentGroups[j]][data.mythictree[i]["host"]][data.mythictree[i]["full_path_text"]] = {...data.mythictree[i]}
                    treeRootDataRef.current[currentGroups[j]][data.mythictree[i]["host"]][data.mythictree[i]["full_path_text"]].callbacks = [data.mythictree[i].callback]
                }
            }
            // create the top level data in the adjacency matrix
            const newMatrix = getNewMatrix();
           setTreeAdjMtx(newMatrix);
           // first see if we can find a group that matches our host, if not, then we can do first of each
           let groups = Object.keys(newMatrix).sort();
           if(groups.length > 0){
               if(groups.includes(defaultGroup)){
                   setSelectedGroup(defaultGroup);
                   const hosts = Object.keys(newMatrix[defaultGroup]).sort();
                   if(hosts.length > 0){
                       if(hosts.includes(tabInfo.host)){
                           setSelectedHost(tabInfo.host);
                       } else {
                           setSelectedHost(hosts[0]);
                       }
                   }
                   return
               }
               for(let i = 0; i < groups.length; i++){
                   const hosts = Object.keys(newMatrix[groups[i]]).sort();
                   if(hosts.length > 0){
                       if(hosts.includes(tabInfo.host)){
                           setSelectedGroup(groups[i]);
                           setSelectedHost(tabInfo.host);
                           return;
                       }
                   }
               }
               setSelectedGroup(groups[0]);
               const hosts = Object.keys(newMatrix[groups[0]]).sort();
               if(hosts.length > 0){
                   setSelectedHost(hosts[0]);
               }
           }
        },
        fetchPolicy: 'no-cache',
    });
    const getLoadedCommandsQuerySuccess = (data) => {
        if(data.loadedcommands.length > 0){
            loadedCommandsRef.current[data.loadedcommands[0].callback_id] = [...data.loadedcommands];
        }
        loadingCommandsRef.current = false;
    }
    const getLoadedCommandsQueryError = (data) => {
        console.log(data);
        loadingCommandsRef.current = false;
    }
    const getLoadedCommandsQuery = useMythicLazyQuery(loadedCommandsQuery, {
        fetchPolicy: 'no-cache',
    });
    useSubscription(treeSubscription, {
        variables: {now: fromNow.current},
        fetchPolicy: "no-cache",
        onData: ({data}) => {
            for(let i = 0; i < data.data.mythictree_stream.length; i++){
                let currentGroups = data.data.mythictree_stream[i]?.["callback"]?.["mythictree_groups"] || ["Unknown Callbacks"];
                for(let j = 0; j < currentGroups.length; j++) {
                    if (treeRootDataRef.current[currentGroups[j]] === undefined) {
                        treeRootDataRef.current[currentGroups[j]] = {};
                    }
                    if (treeRootDataRef.current[currentGroups[j]][data.data.mythictree_stream[i]["host"]] === undefined) {
                        // new host discovered
                        treeRootDataRef.current[currentGroups[j]][data.data.mythictree_stream[i]["host"]] = {};
                    }
                    if(treeRootDataRef.current[currentGroups[j]][data.data.mythictree_stream[i]["host"]][data.data.mythictree_stream[i]["full_path_text"]] === undefined){
                        // first time we're seeing this file data, just add it
                        if(data.data.mythictree_stream[i].deleted){continue}
                        treeRootDataRef.current[currentGroups[j]][data.data.mythictree_stream[i]["host"]][data.data.mythictree_stream[i]["full_path_text"]] = {...data.data.mythictree_stream[i]};
                        treeRootDataRef.current[currentGroups[j]][data.data.mythictree_stream[i]["host"]][data.data.mythictree_stream[i]["full_path_text"]].callbacks = [data.data.mythictree_stream[i].callback]
                    } else {
                        // we need to merge data in because we already have some info
                        if(data.data.mythictree_stream[i].deleted){
                            delete treeRootDataRef.current[currentGroups[j]][data.data.mythictree_stream[i]["host"]][data.data.mythictree_stream[i]["full_path_text"]];
                            continue;
                        }
                        let existingData = treeRootDataRef.current[currentGroups[j]][data.data.mythictree_stream[i]["host"]][data.data.mythictree_stream[i]["full_path_text"]];
                        existingData.callbacks.push(data.data.mythictree_stream[i].callback)
                        existingData.comment += data.data.mythictree_stream[i].comment;
                        existingData.tags = [...existingData.tags, ...data.data.mythictree_stream[i].tags];
                        if(existingData.task_id > data.data.mythictree_stream[i].task_id){
                            existingData.metadata = {...data.data.mythictree_stream[i].metadata, ...existingData.metadata};
                        } else {
                            existingData.metadata = {...existingData.metadata, ...data.data.mythictree_stream[i].metadata};
                        }
                        treeRootDataRef.current[currentGroups[j]][data.data.mythictree_stream[i]["host"]][data.data.mythictree_stream[i]["full_path_text"]] = {...existingData};
                    }
                }
            }
            const newMatrix = getNewMatrix();
            setTreeAdjMtx(newMatrix);
        }
    });
    const getHostProcessesQuerySuccess = (data) => {
        snackActions.dismiss();
        // add in all of the raw data
        for(let i = 0; i < data.mythictree.length; i++){
            let currentGroups = data.mythictree[i]?.["callback"]?.["mythictree_groups"] || ["Unknown Callbacks"];
            for(let j = 0; j < currentGroups.length; j++){
                if(treeRootDataRef.current[currentGroups[j]] === undefined){
                    treeRootDataRef.current[currentGroups[j]] = {};
                }
                if( treeRootDataRef.current[currentGroups[j]][data.mythictree[i]["host"]] === undefined) {
                    // new host discovered
                    treeRootDataRef.current[currentGroups[j]][data.mythictree[i]["host"]] = {};
                }
                if(treeRootDataRef.current[currentGroups[j]][data.mythictree[i]["host"]][data.mythictree[i]["full_path_text"]] === undefined){
                    // first time we're seeing this file data, just add it
                    treeRootDataRef.current[currentGroups[j]][data.mythictree[i]["host"]][data.mythictree[i]["full_path_text"]] = {...data.mythictree[i]};
                    treeRootDataRef.current[currentGroups[j]][data.mythictree[i]["host"]][data.mythictree[i]["full_path_text"]].callbacks = [data.mythictree[i].callback];
                } else {
                    // we need to merge data in because we already have some info
                    if(data.mythictree[i].deleted){
                        delete treeRootDataRef.current[currentGroups[j]][data.mythictree[i]["host"]][data.mythictree[i]["full_path_text"]];
                        continue;
                    }
                    let existingData = treeRootDataRef.current[currentGroups[j]][data.mythictree[i]["host"]][data.mythictree[i]["full_path_text"]];
                    existingData.comment += data.mythictree[i].comment;
                    existingData.callbacks.push(data.mythictree[i].callback)
                    existingData.tags = [...existingData.tags, ...data.mythictree[i].tags];
                    if(existingData.task_id > data.mythictree[i].task_id){
                        existingData.metadata = {...data.mythictree[i].metadata, ...existingData.metadata};
                    } else {
                        existingData.metadata = {...existingData.metadata, ...data.mythictree[i].metadata};
                    }
                    treeRootDataRef.current[currentGroups[j]][data.mythictree[i]["host"]][data.mythictree[i]["full_path_text"]] = {...existingData};
                }
            }
        }
        // create the top level data in the adjacency matrix
        const newMatrix = getNewMatrix();
        //console.log(treeRootDataRef.current);
        setTreeAdjMtx(newMatrix);
        //console.log("just set treeAdjMtx, about to close backdrop")
        setBackdropOpen(false);
    }
    const getHostProcessesQuery = useMythicLazyQuery(treeHostQuery, {
        fetchPolicy: 'no-cache',
    })
    const onListFilesButton = () => {
        taskingData.current = ({parameters: "",
            ui_feature: "process_browser:list",
            callback_id: tabInfo["callbackID"],
            callback_display_id: tabInfo["displayID"]});
        setOpenTaskingButton(true);
    }
    const onTaskRowAction = ({process_id, architecture, uifeature, openDialog, getConfirmation, callback_id, callback_display_id}) => {
        taskingData.current = {"parameters": {host: selectedHost, process_id, architecture},
            "ui_feature": uifeature, openDialog, getConfirmation, callback_id, callback_display_id};
        setOpenTaskingButton(true);
    }
    const toggleShowDeletedFiles = (showStatus) => {
        setShowDeletedFiles(showStatus);
    };
    const updateSelectedHost = (host) => {
        setSelectedHost(host);
    }
    const updateSelectedGroup = (group) => {
        setSelectedGroup(group);
        const hosts = Object.keys(treeAdjMtx[group]);
        if(hosts.length > 0){
            setSelectedHost(hosts[0]);
        } else {
            setSelectedHost("");
        }
    }
    async function getLoadedCommandForUIFeature (callback_id, uifeature){
        while(loadingCommandsRef.current){
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        if(loadedCommandsRef.current[callback_id] === undefined){
            loadingCommandsRef.current = true;
            getLoadedCommandsQuery({variables: {callback_id: callback_id}})
                .then(({data}) => getLoadedCommandsQuerySuccess(data)).catch(({data}) => getLoadedCommandsQueryError(data));
            while(loadingCommandsRef.current){
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        if(loadedCommandsRef.current[callback_id] === undefined){
            return undefined;
        }
        for(let i = 0; i < loadedCommandsRef.current[callback_id].length; i++){
            if(loadedCommandsRef.current[callback_id][i].command.supported_ui_features.includes(uifeature)){
                return loadedCommandsRef.current[callback_id][i];
            }
        }
        return undefined;
    }
    React.useEffect( () => {
        getHostProcessesQuery({variables: {host: selectedHost}})
            .then(({data}) => getHostProcessesQuerySuccess(data)).catch(({data}) => console.log(data));
        setBackdropOpen(true);
    }, [selectedHost]);
    React.useEffect( () => {
        return() => {
            mountedRef.current = false;
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return (
        <MythicTabPanel index={index} value={value} >
            <div style={{display: "flex", flexGrow: 1, overflowY: "auto", position: "relative"}}>

                <div style={{width: "100%", display: "flex", flexDirection: "column", flexGrow: 1}}>
                    <Backdrop open={backdropOpen} style={{zIndex: 2, position: "absolute",}} invisible={false}>
                        <div style={{
                            borderRadius: "4px",
                            border: "1px solid black",
                            padding: "5px",
                            backgroundColor: "rgba(37,37,37,0.92)", color: "white",
                            alignItems: "center",
                            display: "flex", flexDirection: "column"}}>
                            <CircularProgress color="inherit" />
                            <Typography variant={"h5"}>
                                Gathering Processes from database for {selectedHost}...
                            </Typography>
                        </div>
                    </Backdrop>
                    <ProcessBrowserTableTop 
                        onListFilesButton={onListFilesButton}
                        tabInfo={tabInfo}
                        host={selectedHost}
                        group={selectedGroup}
                        toggleShowDeletedFiles={toggleShowDeletedFiles}
                        updateSelectedHost={updateSelectedHost}
                        updateSelectedGroup={updateSelectedGroup}
                        groupOptions={treeRootDataRef.current}
                        hostOptions={treeRootDataRef.current[selectedGroup] || {}}
                        expandOrCollapseAll={expandOrCollapseAll}
                        setExpandOrCollapseAll={setExpandOrCollapseAll}
                    />
                    <CallbacksTabsProcessBrowserTable 
                        showDeletedFiles={showDeletedFiles}
                        tabInfo={tabInfo}
                        onRowDoubleClick={() => {}}
                        treeRootData={treeRootDataRef.current}
                        treeAdjMatrix={treeAdjMtx}
                        host={selectedHost}
                        group={selectedGroup}
                        expandOrCollapseAll={expandOrCollapseAll}
                        onTaskRowAction={onTaskRowAction}
                        getLoadedCommandForUIFeature={getLoadedCommandForUIFeature}
                        me={me}/>
                  
                </div>
                {openTaskingButton && 
                    <TaskFromUIButton ui_feature={taskingData.current?.ui_feature || " "} 
                        callback_id={taskingData.current?.callback_id || tabInfo.callbackID}
                        parameters={taskingData.current?.parameters || ""}
                        openDialog={taskingData.current?.openDialog || false}
                        getConfirmation={taskingData.current?.getConfirmation || false}
                        selectCallback={taskingData.current?.selectCallback || false}
                        tasking_location={"process_browser"}
                        onTasked={() => setOpenTaskingButton(false)}/>
                    }
            </div>            
        </MythicTabPanel>
    )
}
const ProcessBrowserTableTop = ({
    onListFilesButton,
    updateSelectedHost,
    updateSelectedGroup,
    toggleShowDeletedFiles,
    host,
    group,
    hostOptions,
    groupOptions,
    expandOrCollapseAll,
    setExpandOrCollapseAll
}) => {
    const theme = useTheme();
    const [showDeletedFiles, setLocalShowDeletedFiles] = React.useState(false);
    const [openViewGroupsDialog, setOpenViewGroupDialog] = React.useState(false);
    const inputRef = useRef(null);
    const inputGroupRef = useRef(null);
    const onLocalListFilesButton = () => {
        onListFilesButton()
    }
    const onLocalToggleShowDeletedFiles = () => {
        setLocalShowDeletedFiles(!showDeletedFiles);
        toggleShowDeletedFiles(!showDeletedFiles);
    };
    const handleChange = (event) => {
        updateSelectedHost(event.target.value);
    }
    const handleGroupChange = (event) => {
        updateSelectedGroup(event.target.value);
    }
    const onLocalExpandOrCollapseAllButton = () => {
        setExpandOrCollapseAll(!expandOrCollapseAll);
    }
    return (
        <Grid container spacing={0} style={{paddingTop: "10px"}}>
            <Grid size={12}>
                <FormControl style={{width: "30%"}}>
                    <InputLabel ref={inputGroupRef}>Available Groups</InputLabel>
                    <Select
                        labelId="demo-dialog-select-label"
                        id="demo-dialog-select"
                        value={group}
                        onChange={handleGroupChange}
                        input={<Input style={{width: "100%"}}/>}
                        endAdornment={
                            <React.Fragment>
                                <MythicStyledTooltip title="View Callbacks associated with this group">
                                    <IconButton style={{padding: "3px", paddingRight: "25px"}} onClick={() => {setOpenViewGroupDialog(true);}} size="large"><WidgetsIcon style={{color: theme.palette.info.main}}/></IconButton>
                                </MythicStyledTooltip>
                            </React.Fragment>
                        }
                    >
                        {Object.keys(groupOptions).sort().map( (opt) => (
                            <MenuItem value={opt} key={opt}>{opt}</MenuItem>
                        ) )}
                    </Select>
                </FormControl>
                <FormControl style={{width: "70%"}}>
                  <InputLabel ref={inputRef}>Available Hosts</InputLabel>
                  <Select
                    labelId="demo-dialog-select-label"
                    id="demo-dialog-select"
                    value={host}
                    onChange={handleChange}
                    input={<Input style={{width: "100%"}}/>}
                    endAdornment={
                <React.Fragment>
                    <MythicStyledTooltip title="Task Callback to List Processes">
                        <IconButton style={{padding: "3px"}} onClick={onLocalListFilesButton} size="large"><RefreshIcon style={{color: theme.palette.info.main}}/></IconButton>
                    </MythicStyledTooltip>
                    <MythicStyledTooltip title={expandOrCollapseAll ? "Collapse all processes" : "Expand all processes"} >
                        <IconButton style={{padding: "3px"}}
                                    onClick={onLocalExpandOrCollapseAllButton} size={"large"}>
                            <ExpandIcon color={expandOrCollapseAll ? "info" : "success"} />
                        </IconButton>
                    </MythicStyledTooltip>
                    <div style={{paddingRight: "20px"}} />
                </React.Fragment>
                    }
                  >
                    {Object.keys(hostOptions).sort().map( (opt) => (
                        <MenuItem value={opt} key={opt}>{opt}</MenuItem>
                    ) )}
                  </Select>
                </FormControl>
                {openViewGroupsDialog &&
                    <MythicDialog
                        fullWidth={true}
                        maxWidth={"xl"}
                        open={openViewGroupsDialog}
                        onClose={() => {setOpenViewGroupDialog(false);}}
                        innerDialog={
                            <ViewCallbackMythicTreeGroupsDialog group_name={group}
                                                                onClose={() => {setOpenViewGroupDialog(false);}} />
                        }
                    />
                }
            </Grid>
        </Grid>
    );
}
