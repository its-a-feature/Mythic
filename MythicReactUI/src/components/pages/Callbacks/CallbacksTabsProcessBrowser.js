import {MythicTabPanel, MythicTabLabel} from '../../MythicComponents/MythicTabPanel';
import React, {useEffect, useRef} from 'react';
import {gql, useQuery, useSubscription } from '@apollo/client';
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

const treeFragment = gql`
fragment treeObjData on mythictree {
    comment
    deleted
    task_id
    filemeta {
        id
    }
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
}
`;
const treeSubscription = gql`
    ${treeFragment}
    subscription liveData($now: timestamp!, $operation_id: Int!) {
        mythictree_stream(
            batch_size: 1000,
            cursor: {initial_value: {timestamp: $now}},
            where: { operation_id: { _eq: $operation_id }, tree_type: {_eq: "process"} }
        ) {
            ...treeObjData
        }
    }
`;
const rootQuery = gql`
    ${treeFragment}
    query myRootFolderQuery($operation_id: Int!) {
        mythictree(where: { operation_id: { _eq: $operation_id }, tree_type: {_eq: "process"} }) {
            ...treeObjData
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
    const editDescriptionSubmit = (description) => {
        props.onEditTabDescription(props.tabInfo, description);
    }
    return (
        <React.Fragment>
            <MythicTabLabel label={description} onDragTab={props.onDragTab}  {...props} contextMenuOptions={contextMenuOptions}/>
            {openEditDescriptionDialog &&
                <MythicDialog fullWidth={true} open={openEditDescriptionDialog}  onClose={() => {setOpenEditDescriptionDialog(false);}}
                    innerDialog={
                        <MythicModifyStringDialog title={"Edit Tab's Description"} onClose={() => {setOpenEditDescriptionDialog(false);}} value={description} onSubmit={editDescriptionSubmit} />
                    }
                />
            }
        </React.Fragment>  
    )
}
export const CallbacksTabsProcessBrowserPanel = ({index, value, tabInfo, me}) =>{
    const [fromNow, setFromNow] = React.useState((new Date()));
    const treeRootDataRef = React.useRef({}); // hold all of the actual data
    const [treeAdjMtx, setTreeAdjMtx] = React.useState({}); // hold the simple adjacency matrix for parent/child relationships
    const [openTaskingButton, setOpenTaskingButton] = React.useState(false);
    const taskingData = React.useRef({"parameters": "", "ui_feature": "process_browser:list"});
    const mountedRef = React.useRef(true);
    const [showDeletedFiles, setShowDeletedFiles] = React.useState(false);
    const [selectedHost, setSelectedHost] = React.useState("");
    useQuery(rootQuery, {
        variables: { operation_id: me?.user?.current_operation_id ||0},
        onCompleted: (data) => {
           // use an adjacency matrix but only for full_path_text -> children, not both directions
           for(let i = 0; i < data.mythictree.length; i++){
                if(selectedHost === ""){
                    setSelectedHost(data.mythictree[i]["host"]);
                }
                if( treeRootDataRef.current[data.mythictree[i]["host"]] === undefined) {
                    // new host discovered 
                    treeRootDataRef.current[data.mythictree[i]["host"]] = {};
                }
                treeRootDataRef.current[data.mythictree[i]["host"]][data.mythictree[i]["full_path_text"]] = {...data.mythictree[i]}
           }
           const newMatrix = data.mythictree.reduce( (prev, cur) => {
                if( prev[cur["host"]] === undefined) {
                    // the current host isn't tracked in the adjacency matrix, so add it
                    prev[cur["host"]] = {}
                }
                if( prev[cur["host"]][cur["parent_path_text"]] === undefined) {
                    // the current parent's path isn't tracked, so add it and ourselves as children
                    prev[cur["host"]][cur["parent_path_text"]] = {};
                } 
                prev[cur["host"]][cur["parent_path_text"]][cur["full_path_text"]] = 1;
                
                return prev;
           }, {...treeAdjMtx});
           setTreeAdjMtx(newMatrix);
        },
        fetchPolicy: 'no-cache',
    });
    useSubscription(treeSubscription, {
        variables: {now: fromNow, operation_id: me?.user?.current_operation_id ||0},
        fetchPolicy: "no-cache",
        onData: ({data}) => {
            for(let i = 0; i < data.data.mythictree_stream.length; i++){
                if( treeRootDataRef.current[data.data.mythictree_stream[i]["host"]] === undefined) {
                    // new host discovered 
                    treeRootDataRef.current[data.data.mythictree_stream[i]["host"]] = {};
                }
                treeRootDataRef.current[data.data.mythictree_stream[i]["host"]][data.data.mythictree_stream[i]["full_path_text"]] = {...data.data.mythictree_stream[i]}
            }
            const newMatrix = data.data.mythictree_stream.reduce( (prev, cur) => {
                    if( prev[cur["host"]] === undefined) {
                        // the current host isn't tracked in the adjacency matrix, so add it
                        prev[cur["host"]] = {}
                    }
                    if( prev[cur["host"]][cur["parent_path_text"]] === undefined) {
                        // the current parent's path isn't tracked, so add it and ourselves as children
                        prev[cur["host"]][cur["parent_path_text"]] = {};
                    } 
                    prev[cur["host"]][cur["parent_path_text"]][cur["full_path_text"]] = 1;
                    
                    return prev;
            }, {...treeAdjMtx});
            setTreeAdjMtx(newMatrix);
            
        }
    })
    const onListFilesButton = () => {
        taskingData.current = ({"parameters": "", "ui_feature": "process_browser:list"});
        setOpenTaskingButton(true);
    }
    const onTaskRowAction = ({process_id, architecture, uifeature, openDialog, getConfirmation}) => {
        taskingData.current = {"parameters": {host: selectedHost, process_id, architecture}, "ui_feature": uifeature, openDialog, getConfirmation};
        setOpenTaskingButton(true);
    }
    const toggleShowDeletedFiles = (showStatus) => {
        setShowDeletedFiles(showStatus);
    };
    const updateSelectedHost = (host) => {
        setSelectedHost(host);
    }
    React.useEffect( () => {
        return() => {
            mountedRef.current = false;
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return (
        <MythicTabPanel index={index} value={value} >
            <div style={{display: "flex", flexGrow: 1, overflowY: "auto"}}>
                <div style={{width: "100%", display: "flex", flexDirection: "column", flexGrow: 1}}>
                    <ProcessBrowserTableTop 
                        onListFilesButton={onListFilesButton}
                        host={selectedHost}
                        toggleShowDeletedFiles={toggleShowDeletedFiles}
                        updateSelectedHost={updateSelectedHost}
                        hostOptions={treeRootDataRef.current}
                    />
                    <CallbacksTabsProcessBrowserTable 
                        showDeletedFiles={showDeletedFiles}
                        onRowDoubleClick={() => {}}
                        treeRootData={treeRootDataRef.current}
                        treeAdjMatrix={treeAdjMtx}
                        host={selectedHost}
                        onTaskRowAction={onTaskRowAction}
                        me={me}/>
                  
                </div>
                {openTaskingButton && 
                    <TaskFromUIButton ui_feature={taskingData.current?.ui_feature || " "} 
                        callback_id={tabInfo.callbackID} 
                        parameters={taskingData.current?.parameters || ""}
                        openDialog={taskingData.current?.openDialog || false}
                        getConfirmation={taskingData.current?.getConfirmation || false}
                        onTasked={() => setOpenTaskingButton(false)}/>
                    }
            </div>            
        </MythicTabPanel>
    )
}
const ProcessBrowserTableTop = ({
    onListFilesButton,
    updateSelectedHost,
    toggleShowDeletedFiles,
    host,
    hostOptions
}) => {
    const theme = useTheme();
    const [showDeletedFiles, setLocalShowDeletedFiles] = React.useState(false);
    const inputRef = useRef(null); 
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
    return (
        <Grid container spacing={0} style={{paddingTop: "10px"}}>
            <Grid item xs={12}>
                <FormControl style={{width: "100%"}}>
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
                    <MythicStyledTooltip title={showDeletedFiles ? 'Hide Deleted Processes' : 'Show Deleted Processes'}>
                            <IconButton
                                style={{ padding: '3px' }}
                                onClick={onLocalToggleShowDeletedFiles}
                                size="large">
                                {showDeletedFiles ? (
                                    <VisibilityIcon color="success" />
                                ) : (
                                    <VisibilityOffIcon color="error"  />
                                )}
                            </IconButton>
                        </MythicStyledTooltip>
                </React.Fragment>
                    }
                  >
                    {Object.keys(hostOptions).map( (opt) => (
                        <MenuItem value={opt} key={opt}>{opt}</MenuItem>
                    ) )}
                  </Select>
                </FormControl>
                
            </Grid>
        </Grid>
    );
}
