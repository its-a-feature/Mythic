import {MythicTabPanel, MythicTabLabel} from '../../../components/MythicComponents/MythicTabPanel';
import React, {useEffect, useCallback} from 'react';
import {gql, useMutation, useLazyQuery, useQuery } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import { MythicConfirmDialog } from '../../MythicComponents/MythicConfirmDialog';
import {MythicSelectFromListDialog} from '../../MythicComponents/MythicSelectFromListDialog';
import MythicTextField from '../../MythicComponents/MythicTextField';
import { useReactiveVar } from '@apollo/client';
import { meState } from '../../../cache';
import {useTheme} from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Tooltip from '@material-ui/core/Tooltip';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import RefreshIcon from '@material-ui/icons/Refresh';
import IconButton from '@material-ui/core/IconButton';
import RotateLeftIcon from '@material-ui/icons/RotateLeft';
import {createTaskingMutation} from './CallbacksTabsTasking';
import {TaskParametersDialog} from './TaskParametersDialog';
import {CallbacksTabsFileBrowserTree} from './CallbacksTabsFileBrowserTree';
import {CallbacksTabsFileBrowserTable} from './CallbacksTabsFileBrowserTable';

const fileDataFragment = gql`
fragment fileObjData on filebrowserobj {
    access_time
    comment
    deleted
    filemeta {
        id
    }
    host
    id
    is_file
    modify_time
    parent_id
    size
    success
    task {
        callback {
            id
        }
    }
    full_path_text
    name_text
    parent_path_text
    filebrowserobjs_aggregate {
        aggregate {
            count
        }   
    }
}
`;
const rootFileQuery = gql`
${fileDataFragment}
query myRootFolderQuery($operation_id: Int!) {
    filebrowserobj(where: {operation_id: {_eq: $operation_id}, parent_id: {_is_null: true}}) {
      ...fileObjData
    }
  }
`;
const folderQuery = gql`
${fileDataFragment}
query myFolderQuery($filebrowserobj_id: Int!) {
    filebrowserobj(where: {parent_id: {_eq: $filebrowserobj_id}}, order_by: {is_file: asc, name: asc}) {
      ...fileObjData
    }
  }
`;
const fileDataSubscription = gql`
${fileDataFragment}
subscription liveData($now: timestamp!){
    filebrowserobj(distinct_on: id, order_by: {id: desc}, where: {timestamp: {_gt: $now}}, limit: 10){
        ...fileObjData
    }
}
`;
const getLoadedCommandsQuery = gql`
query GetLoadedCommandsQuery($callback_id: Int!, $payloadtype: String!, $ui_feature: String!) {
  loadedcommands(where: {callback_id: {_eq: $callback_id}, command: {supported_ui_features: {_iregex: $ui_feature}}}) {
    id
    command {
      cmd
      help_cmd
      description
      id
      needs_admin
      payload_type_id
      attributes
      commandparameters {
        id
        type 
      }
      supported_ui_features
    }
  }
  command(where: {payloadtype: {ptype: {_eq: $payloadtype}}, script_only: {_eq: true}, deleted: {_eq: false}, supported_ui_features: {_iregex: $ui_feature }}){
      id
      cmd
      help_cmd
      description
      needs_admin
      attributes
      payload_type_id
      commandparameters {
          id
          type
      }
      supported_ui_features
    }
}
`;

export function CallbacksTabsFileBrowserLabel(props){
    return (
        <MythicTabLabel label={"File Browser"} {...props}/>
    )
}
export const CallbacksTabsFileBrowserPanel = (props) =>{
    const theme = useTheme();
    const me = useReactiveVar(meState);
    const fileBrowserRoots = React.useRef([]);
    const [fileBrowserRootsState, setFileBrowserRootsState] = React.useState([]);
    const [selectedFolder, setSelectedFolder] = React.useState([]);
    const [selectedFolderData, setSelectedFolderData] = React.useState({});
    const [fileBrowserCommands, setFileBrowserCommands] = React.useState({});
    const [openSelectCommandDialog, setOpenSelectCommandDialog] = React.useState(false);
    const [openParametersDialog, setOpenParametersDialog] = React.useState(false);
    const [selectedCommand, setSelectedCommand] = React.useState({});
    const [searchCallback, setSearchCallback] = React.useState({});
    const [taskInfo, setTaskInfo] = React.useState({});
    const [uiFeature, setUIFeature] = React.useState("");
    const currentCallbackIDSetInTable = React.useRef();
    const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);
    const [savedStateForConfirmDialog, setSavedStateForConfirmDialog] = React.useState({});
    const {subscribeToMore} = useQuery(rootFileQuery, {
        variables: {operation_id: me.user.current_operation_id},
        onCompleted: (data) => {
            const roots = data.filebrowserobj.reduce( (prev, cur) => {
                return [...prev, {...cur, id: cur.host, filebrowserobjs: [{...cur,  parent_id: cur.host, filebrowserobjs: []}]} ]
            }, []);
            setFileBrowserRootsState(roots);
        }, fetchPolicy: "network-only"
    });
    useEffect( () => {
        fileBrowserRoots.current = fileBrowserRootsState;
    }, [fileBrowserRootsState])
    const [getFolderData] = useLazyQuery(folderQuery, {
        onError: data => {
            console.error(data)
        },
        fetchPolicy: "no-cache",
        notifyOnNetworkStatusChange: true,
        onCompleted: (data) => {
            let found = false;
            if(data.filebrowserobj.length === 0){
                snackActions.dismiss();
                snackActions.info("Empty folder");
                return;
            }
            snackActions.dismiss();
            snackActions.success("Fetched data");
            const newRoots = fileBrowserRootsState.map( (root) => {
                if(data.filebrowserobj[0]["host"] === root["host"]){
                    // for each element we get back, add to this root
                    let workingSet = {...root};
                    mergeData(workingSet, data.filebrowserobj[0].parent_id, data.filebrowserobj);
                    return workingSet;
                }else{
                    return {...root};
                }
            });
            if(!found){
                // we need to add this as a root element
            }
            console.log("setting new roots");
            setFileBrowserRootsState(newRoots);
        }
    });
    const mergeData = useCallback( (search, parent_id, all_objects) => {
        //merge the obj into fileBrowserRoots
        console.log('in mergeData');
        // might need to do a recursive call
        // if this is a folder with children, check the children
        if(parent_id === search.id){
            // iterate for each child we're trying to update/insert
            console.log("found parent, setting children");
            for(let i = 0; i < all_objects.length; i++){
               if(search.filebrowserobjs[all_objects[i].id] === undefined){
                search.filebrowserobjs[all_objects[i].id] = {...all_objects[i], filebrowserobjs: {}}
               }else{
                search.filebrowserobjs[all_objects[i].id] = {...all_objects[i], filebrowserobjs: search.filebrowserobjs[all_objects[i].id].filebrowserobjs}
               }
            }
            console.log("found parent, set children, returning");
            return true;
        }
        // this current search isn't all_object's parent, so check search's children for our parent
       for(const [key, value] of Object.entries(search.filebrowserobjs)){
           if(all_objects[0].parent_path_text.startsWith(value.full_path_text)){
               let found = mergeData(value, parent_id, all_objects);
               if(found){return true};
           }
       }
        return false;
    }, []);
    const [createTask] = useMutation(createTaskingMutation, {
        update: (cache, {data}) => {
            if(data.createTask.status === "error"){
                snackActions.error(data.createTask.error);
            }else{
                snackActions.success("Issued \"" + selectedCommand["cmd"] + "\" to Callback " + searchCallback.id);
            }
            setSelectedCommand({});
            setSearchCallback({});
            
            setTaskInfo({});
            setUIFeature("");
        },
        onError: data => {
            console.error(data);
            setSelectedCommand({});
            setSearchCallback({});
            setTaskInfo({});
            setUIFeature("");
        }
    });
    const [getCommandOptions] = useLazyQuery(getLoadedCommandsQuery, {
        onCompleted: (data) => {
            const availableCommands = data.loadedcommands.reduce( (prev, cur) => {
                return [...prev, cur.command];
            }, []);
            const finalCommands = data.command.reduce( (prev, cur) => {
                return [...prev, cur];
            }, [...availableCommands]);
            setFileBrowserCommands(finalCommands);
            if(finalCommands.length === 0){
                snackActions.warning("No commands currently loaded that support that feature");
            }else if(finalCommands.length === 1){
                setSelectedCommand({...finalCommands[0]});
            }else{
                setSelectedCommand({});
                setOpenSelectCommandDialog(true);
            }
        },
        fetchPolicy: "network-only"
    });
    useEffect( () => {
        console.log("useEffect for many things");
        if(selectedCommand["cmd"] !== undefined){
            switch(uiFeature){
                case "file_browser:list":
                    // static parameters passed
                    if(taskInfo.path === undefined){
                        // this is an ls from the top table bar
                        createTask({variables: {callback_id: searchCallback.id, command: selectedCommand["cmd"], params: JSON.stringify({
                            "host": searchCallback["host"],
                            "path": searchCallback.fullPath,
                            "file": "",
                        })}});
                    }else{
                        // this is an ls from the action menu of a row
                        createTask({variables: {callback_id: currentCallbackIDSetInTable.current, command: selectedCommand["cmd"], params: JSON.stringify({
                            "host": taskInfo.host,
                            "path": taskInfo.path,
                            "file": taskInfo.filename,
                        })}});
                    }
                    break;
                case "file_browser:upload":
                    // need to do a popup for the user to select the file
                    setOpenParametersDialog(true);
                    break;
                case "file_browser:download":
                    // static parameters passed
                    // fallsthrough
                case "file_browser:remove":
                    // static parameters passed
                    createTask({variables: {callback_id: currentCallbackIDSetInTable.current, command: selectedCommand["cmd"], params: JSON.stringify({
                        "host": taskInfo.host,
                        "path": taskInfo.path,
                        "file": taskInfo.filename,
                    })}});
                    break;
                
                default:
                    break;
            }
        }
    }, [selectedCommand, createTask, searchCallback, selectedFolderData.full_path_text, taskInfo.filename, taskInfo.host, taskInfo.path, uiFeature]);
    useEffect( () => {
        if(searchCallback.id !== undefined){
            getCommandOptions({variables: {callback_id: searchCallback.id, payloadtype: searchCallback.payload.payloadtype.ptype, ui_feature: searchCallback.ui_feature}});
        }
    }, [searchCallback]);
    const onSetTableData = (filebrowserobj) => {
        setSelectedFolder(Object.values(filebrowserobj.filebrowserobjs))
        //setSelectedFolder([...filebrowserobj.filebrowserobjs]);
        setSelectedFolderData({...filebrowserobj});
    }
    const fetchFolderData = (filebrowserobj_id) => {
        getFolderData({variables: {filebrowserobj_id}})
    }
    const onListFilesButton = ({callbackID, fullPath}) => {
        const callbackData = props.getCallbackData({callbackID});
        // clear out commands and re-fetch
        setFileBrowserCommands([]);
        if(callbackData.length > 0){
            setSearchCallback({...callbackData[0], "ui_feature": ".*file_browser:list.*", fullPath});
            setUIFeature("file_browser:list");
        }else{
            snackActions.warning("Callback doesn't exist or isn't active");
        }
    }
    const onUploadFileButton = ({callbackID}) => {
        const callbackData = props.getCallbackData({callbackID});
        // clear out commands and re-fetch
        setFileBrowserCommands([]);
        if(callbackData.length > 0){
            setSearchCallback({...callbackData[0], "ui_feature": ".*file_browser:upload.*"});
            setUIFeature("file_browser:upload")
        }else{
            snackActions.warning("Callback doesn't exist or isn't active");
        }
    }
    const onTaskRowAction = ({path, host, filename, uifeature, confirmed}) => {
        if(uifeature === "file_browser:remove" && !confirmed){
            setSavedStateForConfirmDialog({path, host, filename, uifeature});
            setOpenConfirmDialog(true);
        }else{
            setSavedStateForConfirmDialog({});
            const callbackData = props.getCallbackData({callbackID: currentCallbackIDSetInTable.current});
            // clear out commands and re-fetch
            setFileBrowserCommands([]);
            if(callbackData.length > 0){
                setTaskInfo({
                    path, host, filename
                });
                setSearchCallback({...callbackData[0], "ui_feature": ".*" + uifeature + ".*"});
                setUIFeature(uifeature);
            }else{
                snackActions.warning("Callback doesn't exist or isn't active");
            }
        }
    }
    const onSubmitSelectedCommand = (cmd) => {
        setSelectedCommand(cmd);
    }
    const submitParametersDialog = (cmd, parameters, files) => {
        setOpenParametersDialog(false);
        createTask({variables: {callback_id: searchCallback.id, command: cmd, params: parameters, files}});
    }
    const onChangeCallbackID = (callbackID) => {
        currentCallbackIDSetInTable.current = callbackID;
    }
    const subscribeToMoreCallback = useCallback( (prev, {subscriptionData}) => {
        console.log("new data:", subscriptionData);
        let updatingData = [...fileBrowserRoots.current];
        subscriptionData.data.filebrowserobj.forEach( (obj) => {
            let found = false;
            updatingData.forEach( (root) => {
                if(root["host"] === obj["host"]){
                    found = true;
                    mergeData(root, obj.parent_id, [obj]);
                }
            });
            if(!found && obj.parent_id === null){
                updatingData.push({...obj, filebrowserobjs: []});
            }
        });
        setFileBrowserRootsState(updatingData);
    }, [mergeData])
    return (
        <MythicTabPanel {...props} >
            <div style={{maxHeight: `calc(${props.maxHeight}vh)`, overflow: "auto", height: `calc(${props.maxHeight-1}vh)`, width: `calc(31vw)`, display: "inline-block"}}>
                <CallbacksTabsFileBrowserTree treeRoot={fileBrowserRootsState} fetchFolderData={fetchFolderData} setTableData={onSetTableData} theme={theme} />
            </div>
            <div style={{maxHeight: `calc(${props.maxHeight}vh)`, overflow: "auto", height: `calc(${props.maxHeight-1}vh)`, width: `calc(64vw)`, display: "inline-block"}}>
                <FileBrowserTableTop selectedFolderData={selectedFolderData} onListFilesButton={onListFilesButton} onUploadFileButton={onUploadFileButton} onChangeCallbackID={onChangeCallbackID}
                    subscribeToNewFileBrowserObjs={() => subscribeToMore({
                        document: fileDataSubscription,
                        variables: {now: (new Date()).toISOString()},
                        updateQuery:subscribeToMoreCallback})}/>
                <CallbacksTabsFileBrowserTable selectedFolder={selectedFolder} onTaskRowAction={onTaskRowAction}/>
            </div>
            <MythicDialog fullWidth={true} maxWidth="sm" open={openSelectCommandDialog}
                    onClose={()=>{setOpenSelectCommandDialog(false);}} 
                    innerDialog={<MythicSelectFromListDialog onClose={()=>{setOpenSelectCommandDialog(false);}}
                                        onSubmit={onSubmitSelectedCommand} options={fileBrowserCommands} title={"Select Command"} 
                                        action={"select"} identifier={"id"} display={"cmd"}/>}
                />
            <MythicDialog fullWidth={true} maxWidth="md" open={openParametersDialog} 
                    onClose={()=>{setOpenParametersDialog(false);}} 
                    innerDialog={<TaskParametersDialog command={selectedCommand} callback={searchCallback} onSubmit={submitParametersDialog} onClose={()=>{setOpenParametersDialog(false);}} />}
                />
            <MythicConfirmDialog onSubmit={() => {onTaskRowAction({...savedStateForConfirmDialog, confirmed: true})}} 
                onClose={()=>{setOpenConfirmDialog(false);}} 
                open={openConfirmDialog}/>
        </MythicTabPanel>
    )
}
const FileBrowserTableTop = ({selectedFolderData, onListFilesButton, onUploadFileButton, onChangeCallbackID, subscribeToNewFileBrowserObjs}) => {
    const theme = useTheme();
    const [hostname, setHostname] = React.useState("");
    const [fullPath, setFullPath] = React.useState("");
    const [callbackID, setCallbackID] = React.useState(0);
    const [manuallySetCallbackID, setManuallySetCallbackID] = React.useState(false);
    const onChangeHost = (name, value, error) => {
        setHostname(value);
    }
    const onChangePath = (name, value, error) => {
        setFullPath(value);
    }
    const onChangeID = (name, value, error) => {
        setManuallySetCallbackID(true);
        setCallbackID(parseInt(value));
    }
    const revertCallbackID = () => {
        setManuallySetCallbackID(false);
        if(selectedFolderData.task){
            setCallbackID(selectedFolderData.task.callback.id);
            
        }else{
            setCallbackID(0);
            onChangeCallbackID(0);
        }
    }
    useEffect( () => {
        console.log("tableTop in useEffect selectedFolderDAta");
        if(selectedFolderData.host !== undefined){
            setHostname(selectedFolderData.host);
        }
        if(selectedFolderData.full_path_text !== undefined){
            setFullPath(selectedFolderData.full_path_text);
        }
        if(!manuallySetCallbackID){
            if(selectedFolderData.task !== undefined){
                setCallbackID(selectedFolderData.task.callback.id);
            }
            
        }
    }, [selectedFolderData, manuallySetCallbackID]);
    const onLocalListFilesButton = () => {
        if(callbackID > 0){
            onListFilesButton({callbackID, fullPath})
        }else{
            snackActions.warning("Must select a folder or set a callback number first");
        }
    }
    const onLocalUploadFileButton = () => {
        if(callbackID > 0){
            onUploadFileButton({callbackID});
        }else{
            snackActions.warning("Must select a folder or set a callback number first");
        }
    }
    useEffect( () => {
        console.log("useEffect for onChangeCAllbackID")
        onChangeCallbackID(callbackID);
    }, [callbackID])
    useEffect( () => {
        subscribeToNewFileBrowserObjs();
    }, []);
    return (
        <Grid container spacing={0} style={{paddingTop: "10px"}}>
            <Grid item xs={4}>
                <MythicTextField placeholder="Host Name" value={hostname}
                    onChange={onChangeHost} name="Host Name"/>
            </Grid>
            <Grid item xs={7}>
                    <MythicTextField placeholder="Path" value={fullPath}
                        onChange={onChangePath} name="Path" InputProps={{
                            endAdornment: 
                            <React.Fragment>
                                <Tooltip title="Task callback to list contents">
                                    <IconButton style={{padding: "3px"}} onClick={onLocalListFilesButton}><RefreshIcon style={{color: theme.palette.info.main}}/></IconButton>
                                </Tooltip>
                                <Tooltip title="Upload file to folder via callback">
                                    <IconButton style={{padding: "3px"}} onClick={onLocalUploadFileButton}><CloudUploadIcon style={{color: theme.palette.info.main}}/></IconButton>
                                </Tooltip>
                            </React.Fragment>,
                            style: {padding: 0}
                        }}/>
            </Grid>
            <Grid item xs={1}>
                <MythicTextField type="number" placeholder="Callback" name="Callback"
                    onChange={onChangeID} value={callbackID} InputProps={{
                        endAdornment: manuallySetCallbackID ? (
                            <Tooltip title="Reset Callback ID">
                                <IconButton style={{padding: "3px"}} onClick={revertCallbackID}>
                                    <RotateLeftIcon style={{color: theme.palette.warning.main}}/></IconButton>
                            </Tooltip>
                        ) : (null),
                        style: {padding: 0, margin: 0}
                    }}/>
            </Grid>
        </Grid>
    )
}
