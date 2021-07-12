import {MythicTabPanel, MythicTabLabel} from '../../../components/MythicComponents/MythicTabPanel';
import React, {useEffect, useCallback} from 'react';
import {gql, useMutation, useLazyQuery, subscribeToMore, useQuery } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import { MythicDialog, MythicModifyStringDialog, MythicViewJSONAsTableDialog } from '../../MythicComponents/MythicDialog';
import {MythicSelectFromListDialog} from '../../MythicComponents/MythicSelectFromListDialog';
import MythicTextField from '../../MythicComponents/MythicTextField';
import { useReactiveVar } from '@apollo/client';
import { meState } from '../../../cache';
import { makeStyles, fade } from '@material-ui/core/styles';
import FolderIcon from '@material-ui/icons/Folder';
import FolderOpenIcon from '@material-ui/icons/FolderOpen';
import ComputerIcon from '@material-ui/icons/Computer';
import Paper from '@material-ui/core/Paper';
import DescriptionIcon from '@material-ui/icons/Description';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import {useTheme} from '@material-ui/core/styles';
import {Button} from '@material-ui/core';
import Grow from '@material-ui/core/Grow';
import Popper from '@material-ui/core/Popper';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import EditIcon from '@material-ui/icons/Edit';
import {FixedSizeTree} from 'react-vtree';
import Autosizer from 'react-virtualized-auto-sizer';
import BaseTable, {AutoResizer} from 'react-base-table';
import 'react-base-table/styles.css';
import Grid from '@material-ui/core/Grid';
import Tooltip from '@material-ui/core/Tooltip';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import RefreshIcon from '@material-ui/icons/Refresh';
import IconButton from '@material-ui/core/IconButton';
import RotateLeftIcon from '@material-ui/icons/RotateLeft';
import {createTaskingMutation} from './CallbacksTabsTasking';
import {TaskParametersDialog} from './TaskParametersDialog';
import {DownloadHistoryDialog} from './DownloadHistoryDialog';
import HistoryIcon from '@material-ui/icons/History';
import VisibilityIcon from '@material-ui/icons/Visibility';
import Divider from '@material-ui/core/Divider';
import ListIcon from '@material-ui/icons/List';
import DeleteIcon from '@material-ui/icons/Delete';
import GetAppIcon from '@material-ui/icons/GetApp';
import Badge from '@material-ui/core/Badge';
import { Typography } from '@material-ui/core';

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
query myQuery($operation_id: Int!) {
    filebrowserobj(where: {operation_id: {_eq: $operation_id}, parent_id: {_is_null: true}}) {
      ...fileObjData
    }
  }
`;
const folderQuery = gql`
${fileDataFragment}
query myQuery($filebrowserobj_id: Int!) {
    filebrowserobj(where: {parent_id: {_eq: $filebrowserobj_id}}, order_by: {is_file: asc, name: asc}) {
      ...fileObjData
    }
  }
`;
const fileDataSubscription = gql`
${fileDataFragment}
subscription liveData($now: timestamp!){
    filebrowserobj(distinct_on: id, order_by: {id: asc}, where: {timestamp: {_gt: $now}}, limit: 10){
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
const getPermissionsDataQuery = gql`
query getPermissionsQuery($filebrowserobj_id: Int!){
    filebrowserobj_by_pk(id: $filebrowserobj_id){
        id
        permissions
    }
}
`;
const getFileDownloadHistory = gql`
query getFileDownloadHistory($filebrowserobj_id: Int!){
    filebrowserobj_by_pk(id: $filebrowserobj_id){
        filemeta {
            id
            agent_file_id
            chunks_received
            complete
            total_chunks
            timestamp
            task {
                id
                comment
            }
        }
    }
}
`;
const updateFileComment = gql`
mutation updateCommentMutation($filebrowserobj_id: Int!, $comment: String!){
    update_filebrowserobj_by_pk(pk_columns: {id: $filebrowserobj_id}, _set: {comment: $comment}) {
        comment
        id
    }
}
`;
export function CallbacksTabsFileBrowserLabel(props){
    return (
        <MythicTabLabel label={"File Browser"} {...props}/>
    )
}
const useStyles = makeStyles((theme) => ({
    root: {
      width: '99%',
      marginTop: "3px",
      marginBottom: "2px",
      marginLeft: "3px",
      marginRight: "0px",
      height: "auto",
    },
    heading: {
      fontSize: theme.typography.pxToRem(15),
      whiteSpace: "pre-line"
    },
    secondaryHeading: {
      fontSize: theme.typography.pxToRem(15),
      //color: theme.palette.text.secondary,
      overflow: "hidden", 
      display: "block", 
      textOverflow: "ellipsis", 
      maxWidth: "calc(90vw)", 
      whiteSpace: "nowrap"
    },
    taskAndTimeDisplay: {
      fontSize: theme.typography.pxToRem(12),
      color: theme.palette.text.secondary,
      overflow: "hidden", 
      display: "block", 
      textOverflow: "ellipsis", 
      maxWidth: "calc(90vw)", 
      whiteSpace: "nowrap"
    },
    secondaryHeadingExpanded: {
      fontSize: theme.typography.pxToRem(15),
      //color: theme.palette.text.secondary,
      display: "block", 
      overflow: "auto",
      maxWidth: "calc(90vw)", 
      whiteSpace: "break-word"
    },
    icon: {
      verticalAlign: 'middle',
      height: 20,
      width: 20,
    },
    details: {
      alignItems: 'center',
    },
    column: {
      padding: "0 5px 0 0",
      display: "inline-block",
      margin: 0,
      height: "auto"
    },
    paper: {
        width: '100%',
        marginBottom: theme.spacing(2),
      },
      table: {
        minWidth: 750,
      },
      visuallyHidden: {
        border: 0,
        clip: 'rect(0 0 0 0)',
        height: 1,
        margin: -1,
        overflow: 'hidden',
        padding: 0,
        position: 'absolute',
        top: 20,
        width: 1,
      },
  }));
export const CallbacksTabsFileBrowserPanel = (props) =>{
    const theme = useTheme();
    const me = useReactiveVar(meState);
    const [fileBrowserRoots, setFileBrowserRoots] = React.useState([]);
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
    const {subscribeToMore} = useQuery(rootFileQuery, {
        variables: {operation_id: me.user.current_operation_id},
        onCompleted: (data) => {
            const roots = data.filebrowserobj.reduce( (prev, cur) => {
                return [...prev, {...cur, id: cur.host, filebrowserobjs: [{...cur,  parent_id: cur.host, filebrowserobjs: []}]} ]
            }, []);
            setFileBrowserRoots(roots);
        }, fetchPolicy: "network-only"
    });
    const [getFolderData] = useLazyQuery(folderQuery, {
        onError: data => {
            console.error(data)
        },
        fetchPolicy: "network-only",
        onCompleted: (data) => {
            let found = false;
            if(data.filebrowserobj.length === 0){
                snackActions.dismiss();
                snackActions.info("Empty folder");
                return;
            }
            snackActions.dismiss();
            const newRoots = fileBrowserRoots.map( (root) => {
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
            setFileBrowserRoots(newRoots);
        }
    });
    const mergeData = (search, parent_id, all_objects) => {
        //merge the obj into fileBrowserRoots
        // might need to do a recursive call
        // if this is a folder with children, check the children
        if(parent_id === search.id){
            for(let i = 0; i < all_objects.length; i++){
                let found = false;
                for(let j = 0; j < search.filebrowserobjs.length; j++){
                    if(search.filebrowserobjs[j].id === all_objects[i].id){
                        found = true;
                        //console.log("found element, updating search.filebrowserobjs[j]");
                        search.filebrowserobjs[j] = {...search.filebrowserobjs[j], ...all_objects[i], filebrowserobjs: search.filebrowserobjs[j].filebrowserobjs};
                        break; // break out of this search and hop onto the next element
                    }
                }
                if(!found){
                    //console.log("didn't find element, adding it to array");
                    search.filebrowserobjs.push({...all_objects[i], filebrowserobjs: []});
                }
            }
            //console.log("found parent, set children, returning");
            return true;
        }
        for(let i = 0; i < search.filebrowserobjs.length; i++){
            if(all_objects[0].parent_path_text.startsWith(search.full_path_text)){
                // only search the children if the path for my obj starts with this parent path
                for(let i = 0; i < search.filebrowserobjs.length; i++){
                    //console.log("recursively calling children");
                    let found = mergeData(search.filebrowserobjs[i], parent_id, all_objects);
                    if(found){ return true};
                }
            }
        }
        return false;
    }
    const [createTask] = useMutation(createTaskingMutation, {
        update: (cache, {data}) => {
            if(data.createTask.status === "error"){
                snackActions.error(data.createTask.error);
            }else{
                snackActions.success("Issued \"" + selectedCommand["cmd"] + "\" to Callback " + searchCallback.id);
            }
            setSearchCallback({});
            setSelectedCommand({});
            setUIFeature("");
        },
        onError: data => {
            console.error(data);
            setSearchCallback({});
            setSelectedCommand({});
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
        if(selectedCommand["cmd"] !== undefined){
            switch(uiFeature){
                case "file_browser:list":
                    // static parameters passed
                    if(taskInfo.path === undefined){
                        // this is an ls from the top table bar
                        createTask({variables: {callback_id: searchCallback.id, command: selectedCommand["cmd"], params: JSON.stringify({
                            "host": searchCallback["host"],
                            "path": selectedFolderData.full_path_text,
                            "file": "",
                        })}});
                    }else{
                        // this is an ls from the action menu of a row
                        createTask({variables: {callback_id: currentCallbackIDSetInTable.current, command: selectedCommand["cmd"], params: JSON.stringify({
                            "host": taskInfo.host,
                            "path": taskInfo.path,
                            "file": taskInfo.filename,
                        })}});
                        setTaskInfo({});
                    }
                    break;
                case "file_browser:upload":
                        // need to do a popup for the user to select the file
                        setOpenParametersDialog(true);
                        break;
                case "file_browser:download":
                    // static parameters passed
                case "file_browser:remove":
                    // static parameters passed
                    createTask({variables: {callback_id: currentCallbackIDSetInTable.current, command: selectedCommand["cmd"], params: JSON.stringify({
                        "host": taskInfo.host,
                        "path": taskInfo.path,
                        "file": taskInfo.filename,
                    })}});
                    setTaskInfo({});
                    break;
                
                default:
                    break;
            }
        }
    }, [selectedCommand]);
    useEffect( () => {
        if(searchCallback.id !== undefined){
            getCommandOptions({variables: {callback_id: searchCallback.id, payloadtype: searchCallback.payload.payloadtype.ptype, ui_feature: searchCallback.ui_feature}});
        }
    }, [searchCallback]);
    const onSetTableData = (filebrowserobj) => {
        setSelectedFolder([...filebrowserobj.filebrowserobjs]);
        setSelectedFolderData(filebrowserobj);
    }
    const fetchFolderData = (filebrowserobj_id) => {
        getFolderData({variables: {filebrowserobj_id}})
    }
    const onListFilesButton = ({callbackID}) => {
        const callbackData = props.getCallbackData({callbackID});
        // clear out commands and re-fetch
        setFileBrowserCommands([]);
        if(callbackData.length > 0){
            setSearchCallback({...callbackData[0], "ui_feature": ".*file_browser:list.*"});
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
    const onTaskRowAction = ({path, host, filename, uifeature}) => {
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
        console.log("current roots", fileBrowserRoots);
        let updatingData = [...fileBrowserRoots];
        subscriptionData.data.filebrowserobj.forEach( (obj) => {
            let found = false;
            updatingData.forEach( (root) => {
                if(root["host"] === obj["host"]){
                    found = true;
                    mergeData(root, obj.parent_id, [obj]);
                }
            });
            if(!found){
                console.log("adding new root")
                updatingData.push({...obj, filebrowserobjs: []});
            }
        })
        console.log("updatingData", updatingData);
        setFileBrowserRoots(updatingData);
    }, [fileBrowserRoots])
    return (
        <MythicTabPanel {...props} >
            <div style={{maxHeight: `calc(${props.maxHeight}vh)`, overflow: "auto", height: `calc(${props.maxHeight-1}vh)`, width: `calc(34vw)`, display: "inline-block"}}>
                <VirtualizedTree treeRoot={fileBrowserRoots} fetchFolderData={fetchFolderData} setTableData={onSetTableData} theme={theme} />
            </div>
            <div style={{maxHeight: `calc(${props.maxHeight}vh)`, overflow: "auto", height: `calc(${props.maxHeight-1}vh)`, width: `calc(62vw)`, display: "inline-block"}}>
                <FileBrowserTableTop selectedFolderData={selectedFolderData} onListFilesButton={onListFilesButton} onUploadFileButton={onUploadFileButton} onChangeCallbackID={onChangeCallbackID}
                    subscribeToNewFileBrowserObjs={() => subscribeToMore({
                        document: fileDataSubscription,
                        variables: {now: (new Date()).toISOString()},
                        updateQuery:subscribeToMoreCallback})}/>
                <FileBrowserTable selectedFolder={selectedFolder} onTaskRowAction={onTaskRowAction}/>
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
        </MythicTabPanel>
    )
}
const getNodeData = (node, nestingLevel, fetchFolderData, setTableData, theme) => ({
    data: {
        id: node.id.toString(), // mandatory
        isLeaf: node.filebrowserobjs === undefined || node.filebrowserobjs.length === 0,
        isOpenByDefault: true, //mandatory
        name: node.name_text,
        nestingLevel,
        fetchFolderData,
        setTableData,
        theme,
        ...node
    },
    nestingLevel,
    node
});
const VirtualizedTree = ({treeRoot, fetchFolderData, setTableData, theme}) => {
    const treeWalker = useCallback(
        function* treeWalker() {
            for(let i = 0; i < treeRoot.length; i++){
                yield getNodeData(treeRoot[i], 0, fetchFolderData, setTableData, theme);
            }
            while(true){
                const parent = yield;
                for(let i = 0; i < parent.node.filebrowserobjs.length; i++){
                    if(parent.node.filebrowserobjs[i].is_file){
                        continue;
                    }
                    yield getNodeData(parent.node.filebrowserobjs[i], parent.nestingLevel + 1, fetchFolderData, setTableData, theme);
                }
            }
        }, [treeRoot],
    );
    return (
        <Autosizer>
            {({height, width}) => (
                treeRoot.length === 0 ? (null) : (
                    <FixedSizeTree
                        treeWalker={treeWalker}
                        height={height }
                        width={width - 10}
                        itemSize={30}
                        async
                        placeholder={<div>placeholder</div>}
                    >
                        {FileBrowserNode}
                    </FixedSizeTree>
                )
            )}
        </Autosizer>
    )
}
const FileBrowserNode = ({data, isOpen, style, setOpen}) => {
    
    return (
        <div style={{...style, 
                    width: "100%", display: "inline-flex", overflow:"auto"}}>
            {[...Array(data.nestingLevel)].map((o, i) => (
                <div key={"folder" + data.id + "lines" + i} style={{borderLeft: `1px dashed ${fade(data.theme.palette.text.primary, 0.4)}`, marginLeft: 15, paddingRight: 15, height: "100%", display: "inline-block"}}></div>
            ))}
            <FileBrowserRow filebrowserobj={data} isOpen={isOpen} setOpen={setOpen}/>
        </div>
    )
    
}
const FileBrowserRow = (props) => {
    const classes = useStyles();
    const theme = useTheme();
    const fetchItems = () => {
        if(props.filebrowserobj.is_file){return}
        snackActions.info("fetching elements...", {persist: true});
        props.filebrowserobj.fetchFolderData(props.filebrowserobj.id);
        if(!props.isOpen){
            props.filebrowserobj.fetchFolderData(props.filebrowserobj.id);
        }
        //props.setOpen(!props.isOpen);
        //props.toggleSelection(props.filebrowserobj.id, !isOpen);
    }
    const setTableData = () => {
        props.filebrowserobj.setTableData(props.filebrowserobj);
    }
    const clickIcon = (evt) => {
        evt.stopPropagation();
        fetchItems();
        if(props.isOpen){
            props.setOpen(!props.isOpen);
        }else{
            fetchItems();
            props.setOpen(!props.isOpen);
        }
    }
    return (
        <Paper className={classes.root} elevation={5} style={{backgroundColor: theme.body, color: theme.text, alignItems: "center", display: "flex"}} onClick={setTableData}>
            {
                props.filebrowserobj.parent_id === null ? (<ComputerIcon style={{marginLeft: "3px", marginRight:"5px"}} />) :(
                props.filebrowserobj.is_file ? (<DescriptionIcon style={{marginLeft: "3px", marginRight:"5px"}} />) : (
                    props.isOpen ? (<FolderOpenIcon style={{marginLeft: "3px", marginRight:"5px", color: props.filebrowserobj.filebrowserobjs_aggregate.aggregate.count > 0 || props.filebrowserobj.success !== null ? theme.folderColor : "grey"}} onClick={clickIcon}/>) : (<FolderIcon style={{paddingTop: "5px", marginLeft: "3px", marginRight:"5px"}} onClick={clickIcon}/>)
                )
                )}
            {props.filebrowserobj.nestingLevel > 0 && props.filebrowserobj.filebrowserobjs_aggregate.aggregate.count > 999 ? (<Tooltip title="Number of known children">
                <Badge style={{left: -50}} max={999}
                    badgeContent={props.filebrowserobj.filebrowserobjs_aggregate.aggregate.count} color="primary" anchorOrigin={{vertical: "bottom", horizontal: "left"}}></Badge>
                </Tooltip>) : (null)}
            <Typography style={{color:props.filebrowserobj.filebrowserobjs_aggregate.aggregate.count > 0 ||  props.filebrowserobj.success !== null ? theme.palette.text.primary : theme.palette.text.secondary}}>
                {props.filebrowserobj.parent_id === null ? (props.filebrowserobj.host) : (props.filebrowserobj.name_text)}
            </Typography>
            
            {props.filebrowserobj.success === true && props.filebrowserobj.nestingLevel > 0 ? (
                <Tooltip title="Successfully listed contents of folder">
                    <CheckCircleIcon fontSize="small" style={{ color: theme.palette.success.main}}/>
                </Tooltip>) : (
                props.filebrowserobj.success === false && props.filebrowserobj.nestingLevel > 0 ? (
                    <Tooltip title="Failed to list contents of folder">
                        <ErrorIcon fontSize="small" style={{ color: theme.palette.danger.main}} />
                    </Tooltip>
                ) : (
                    null
                )
            )}
        </Paper>
    )
}

const FileBrowserTableTop = (props) => {
    const theme = useTheme();
    const [hostname, setHostname] = React.useState("");
    const [fullPath, setFullPath] = React.useState("");
    const [callbackID, setCallbackID] = React.useState(0);
    const [manuallySetCallbackID, setManuallySetCallbackID] = React.useState(false);
    const onChange = (name, value, error) => {
        if(name === "Host Name"){
            setHostname(value);
        }else if(name === "Path"){
            setFullPath(value);
        }else{
            setManuallySetCallbackID(true);
            setCallbackID(parseInt(value));
        }
    }
    const revertCallbackID = () => {
        setManuallySetCallbackID(false);
        if(props.selectedFolderData.task){
            setCallbackID(props.selectedFolderData.task.callback.id);
            
        }else{
            setCallbackID(0);
            props.onChangeCallbackID(0);
        }
    }
    useEffect( () => {
        if(props.selectedFolderData.host !== undefined){
            setHostname(props.selectedFolderData.host);
        }
        if(props.selectedFolderData.full_path_text !== undefined){
            setFullPath(props.selectedFolderData.full_path_text);
        }
        if(!manuallySetCallbackID){
            if(props.selectedFolderData.task !== undefined){
                setCallbackID(props.selectedFolderData.task.callback.id);
            }
            
        }
    }, [props.selectedFolderData]);
    const onListFilesButton = () => {
        if(callbackID > 0){
            props.onListFilesButton({callbackID})
        }else{
            snackActions.warning("Must select a folder or set callback number first");
        }
    }
    const onUploadFileButton = () => {
        if(callbackID > 0){
            props.onUploadFileButton({callbackID});
        }else{
            snackActions.warning("Must select a folder or set a callback number first");
        }
    }
    useEffect( () => {
        props.onChangeCallbackID(callbackID);
    }, [callbackID])
    useEffect( () => {
        props.subscribeToNewFileBrowserObjs();
    }, []);
    return (
        <Grid container spacing={0} style={{paddingTop: "10px"}}>
            <Grid item xs={4}>
                <MythicTextField placeholder="Host Name" value={hostname}
                    onChange={onChange} name="Host Name"/>
            </Grid>
            <Grid item xs={7}>
                    <MythicTextField placeholder="Path" value={fullPath}
                        onChange={onChange} name="Path" InputProps={{
                            endAdornment: 
                            <React.Fragment>
                                <Tooltip title="Task callback to list contents">
                                    <IconButton style={{padding: "3px"}} onClick={onListFilesButton}><RefreshIcon style={{color: theme.palette.info.main}}/></IconButton>
                                </Tooltip>
                                <Tooltip title="Upload file to folder via callback">
                                    <IconButton style={{padding: "3px"}} onClick={onUploadFileButton}><CloudUploadIcon style={{color: theme.palette.info.main}}/></IconButton>
                                </Tooltip>
                            </React.Fragment>,
                            style: {padding: 0}
                        }}/>
            </Grid>
            <Grid item xs={1}>
                <MythicTextField type="number" placeholder="Callback" name="Callback" value={0}
                    onChange={onChange} value={callbackID} InputProps={{
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
const FileBrowserTable = (props) => {
    const [allData, setAllData] = React.useState([]);
    const [defaultSort, setDefaultSort] = React.useState({key: 'name', order: 'asc'});
    const columns = [
        {key: "name_text", numeric: false, dataKey: 'name_text', resizable: true, sortable: true, title: "Name", format: 'name', width: 0, flexGrow: 1, flexShrink: 1},
        {key: "size", numeric: true, dataKey: 'size', resizable: true, sortable: true, title: "Size", format: 'size', width: 0, flexGrow: 1},
        {key: "modify_time", numeric: false, dataKey: 'modify_time', resizable: true, sortable: true, title: "Last Modified",  format: 'date', width: 0, flexGrow: 1},
        {key: "comment", numeric: false, dataKey: 'comment', resizable: true, sortable: true, title: "Comment", format: "string", width: 0, flexGrow: 1},
        {key: "actions", align: "center", numeric: false, dataKey: 'actions', title: "Actions", format: 'actions', width: 0, flexGrow: 1},
    ]
    useEffect( () => {
        setAllData(props.selectedFolder);
    }, [props.selectedFolder]);
    const onColumnSort = sortBy => {
        try{
            const order = sortBy.order === 'asc' ? 1 : -1;
            const data = [...allData];
            if(sortBy.column.numeric){
                data.sort((a, b) => (parseInt(a[sortBy.key]) > parseInt(b[sortBy.key]) ? order : -order));
            }else if(sortBy.column.format === "date"){
                data.sort((a,b) => ( (new Date(a[sortBy.key])) > (new Date(b[sortBy.key])) ? order: -order));
            }else{
                data.sort((a, b) => (a[sortBy.key] > b[sortBy.key] ? order : -order));
            }
            setDefaultSort({key: sortBy.key, order: sortBy.order});
            setAllData(data);
        }catch(error){
            console.log(error);
        }
        
      }
    const renderers = {
        name: FileBrowserTableRowNameCell,
        string: FileBrowserTableRowStringCell,
        size: FileBrowserTableRowSizeCell,
        actions: FileBrowserTableRowActionCell
    }
    const Cell = cellProps => {
        const format = cellProps.column.format || 'string';
        const renderer = renderers[format] || renderers.string;
        return renderer({...cellProps, 
            onTaskRowAction: props.onTaskRowAction,
            });
    }
    const components = {
        TableCell: Cell
    }
    return (
        <AutoResizer>
            {({height, width}) => (
                <BaseTable
                    columns={columns}
                    width={width}
                    overscanRowCount={20}
                    height={height - 80}
                    data={allData}
                    sortBy={defaultSort}
                    onColumnSort={onColumnSort}
                    components={components}
                    rowHeight={35}
                    />
            )}
        </AutoResizer>
    )
}
const FileBrowserTableRowNameCell = ({cellData, rowData}) => {
    const theme = useTheme();
    return (
        <div style={{alignItems: "center", display: "flex", textDecoration: rowData.deleted ? 'line-through': ''}}>
            {rowData.is_file ? (<DescriptionIcon style={{marginRight: "5px"}}/>) : (<FolderOpenIcon style={{marginRight: "5px", color: rowData.filebrowserobjs_aggregate.aggregate.count > 0 || rowData.success !== null ? theme.folderColor : "grey"}}/>)}
            {rowData.filemeta.length > 0 ? (<GetAppIcon style={{color: theme.palette.success.main}}/>) : (null)}
            <Typography style={{color:rowData.filebrowserobjs_aggregate.aggregate.count > 0 ||  rowData.success !== null ? theme.palette.text.primary : theme.palette.text.secondary}}>
                {cellData}
            </Typography>
            {rowData.success === true ? (
                <Tooltip title="Successfully listed contents of folder">
                    <CheckCircleIcon fontSize="small" style={{ color: theme.palette.success.main}}/>
                </Tooltip>) : (
                rowData.success === false ? (
                    <Tooltip title="Failed to list contents of folder">
                        <ErrorIcon fontSize="small" style={{ color: theme.palette.danger.main}} />
                    </Tooltip>
                ) : (
                    null
                )
            )}
        </div>
    )
}
const FileBrowserTableRowStringCell = ({cellData}) => {
    return (
        <div>
            {cellData}
        </div>
    )
}
const FileBrowserTableRowSizeCell = ({cellData}) => {
    const getStringSize = () => {
        try{
            // process for getting human readable string from bytes: https://stackoverflow.com/a/18650828
            let bytes = parseInt(cellData);
            if (cellData === '') return '';
            if (bytes === 0) return '0 Bytes';
            const decimals = 2;
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

            const i = Math.floor(Math.log(bytes) / Math.log(k));

            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        }catch(error){
            return cellData;
        }
    }
    return (
        <div>
            {getStringSize(cellData)}
        </div>
    )
}
const FileBrowserTableRowActionCell = ({rowData, onTaskRowAction}) => {
    const dropdownAnchorRef = React.useRef(null);
    const theme = useTheme();
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [fileCommentDialogOpen, setFileCommentDialogOpen] = React.useState(false);
    const [viewPermissionsDialogOpen, setViewPermissionsDialogOpen] = React.useState(false);
    const [fileHistoryDialogOpen, setFileHistoryDialogOpen] = React.useState(false);
    const [permissionData, setPermissionData] = React.useState("");
    const [downloadHistory, setDownloadHistory] = React.useState([]);
    const [getPermissions] = useLazyQuery(getPermissionsDataQuery, {
        onCompleted: (data) => {
            setPermissionData(data.filebrowserobj_by_pk.permissions);
            setViewPermissionsDialogOpen(true);
        },
        fetchPolicy: "network-only"
    });
    const [getHistory] = useLazyQuery(getFileDownloadHistory, {
        onCompleted: (data) => {
            console.log(data);
            if(data.filebrowserobj_by_pk.filemeta.length === 0){
                snackActions.warning("File has no download history");
            }else{
                setDownloadHistory(data.filebrowserobj_by_pk.filemeta);
                setFileHistoryDialogOpen(true);
            }
        },
        fetchPolicy: "network-only"
    })
    const [updateComment] = useMutation(updateFileComment, {
        onCompleted: (data) => {
            snackActions.success("updated comment");
        }
    });
    const onSubmitUpdatedComment = (comment) => {
        updateComment({variables: {filebrowserobj_id: rowData.id, comment: comment}})
    }
    const handleDropdownToggle = (evt) => {
        evt.stopPropagation();
        setDropdownOpen((prevOpen) => !prevOpen);
    };
    const handleMenuItemClick = (whichOption, event, index) => {
        switch (whichOption){
            case "A":
                optionsA[index].click(event);
                break;
            case "B":
                optionsB[index].click(event);
                break;
            default:
                break;
        }
        setDropdownOpen(false);
    };
    const handleClose = (event) => {
        if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
          return;
        }
        setDropdownOpen(false);
    };
    const optionsA = [{name: 'View Permissions', icon: <VisibilityIcon style={{paddingRight: "5px"}}/>, click: (evt) => {
                        evt.stopPropagation();
                        getPermissions({variables: {filebrowserobj_id: rowData.id}});
                    }},
                    {name: 'Download History', icon: <HistoryIcon style={{paddingRight: "5px"}}/>, click: (evt) => {
                        evt.stopPropagation();
                        getHistory({variables: {filebrowserobj_id: rowData.id}});
                    }},
                    {name: 'Edit Comment', icon: <EditIcon style={{paddingRight: "5px"}}/>, click: (evt) => {
                        evt.stopPropagation();
                        setFileCommentDialogOpen(true);
                    }},
    ];
    const optionsB = [{name: 'Task File Listing', icon: <ListIcon style={{paddingRight: "5px", color: theme.palette.warning.main}}/>, click: (evt) => {
                        evt.stopPropagation();
                        onTaskRowAction({
                            path: rowData.parent_path_text,
                            host: rowData.host,
                            filename: rowData.name_text,
                            uifeature: "file_browser:list"
                        });
                    }},
                    {name: 'Task Download', icon: <GetAppIcon style={{paddingRight: "5px", color: theme.palette.success.main}}/>, click: (evt) => {
                        evt.stopPropagation();
                        onTaskRowAction({
                            path: rowData.parent_path_text,
                            host: rowData.host,
                            filename: rowData.name_text,
                            uifeature: "file_browser:download"
                        });
                    }},
                    {name: 'Task File Removal', icon: <DeleteIcon style={{paddingRight: "5px", color: theme.palette.error.main}}/>, click: (evt) => {
                        evt.stopPropagation();
                        onTaskRowAction({
                            path: rowData.parent_path_text,
                            host: rowData.host,
                            filename: rowData.name_text,
                            uifeature: "file_browser:remove"
                        });
                        
                    }},
    ];
    return (
        <React.Fragment>
            <Button
                style={{padding:0}} 
                size="small"
                aria-controls={dropdownOpen ? 'split-button-menu' : undefined}
                aria-expanded={dropdownOpen ? 'true' : undefined}
                aria-haspopup="menu"
                onClick={handleDropdownToggle}
                color="primary"
                variant="contained"
                ref={dropdownAnchorRef}
            >
                Actions
            </Button>
            <Popper open={dropdownOpen} anchorEl={dropdownAnchorRef.current} role={undefined} transition disablePortal style={{zIndex: 4}}>
            {({ TransitionProps, placement }) => (
                <Grow
                {...TransitionProps}
                style={{
                    transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                }}
                >
                <Paper>
                    <ClickAwayListener onClickAway={handleClose}>
                    <MenuList id="split-button-menu">
                        {optionsA.map((option, index) => (
                        <MenuItem
                            key={option.name}
                            onClick={(event) => handleMenuItemClick("A", event, index)}
                        >
                            {option.icon}{option.name}
                        </MenuItem>
                        ))}
                        <Divider />
                        {optionsB.map((option, index) => (
                        <MenuItem
                            key={option.name}
                            onClick={(event) => handleMenuItemClick("B", event, index)}
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
            <MythicDialog fullWidth={true} maxWidth="md" open={fileCommentDialogOpen} 
                    onClose={()=>{setFileCommentDialogOpen(false);}} 
                    innerDialog={<MythicModifyStringDialog title="Edit File Browser Comment" onSubmit={onSubmitUpdatedComment} value={rowData.comment} onClose={()=>{setFileCommentDialogOpen(false);}} />}
                />
            <MythicDialog fullWidth={true} maxWidth="md" open={viewPermissionsDialogOpen} 
                    onClose={()=>{setViewPermissionsDialogOpen(false);}} 
                    innerDialog={<MythicViewJSONAsTableDialog title="View Permissions Data" leftColumn="Permission" rightColumn="Value" value={permissionData} onClose={()=>{setViewPermissionsDialogOpen(false);}} />}
                />
            <MythicDialog fullWidth={true} maxWidth="md" open={fileHistoryDialogOpen} 
                    onClose={()=>{setFileHistoryDialogOpen(false);}} 
                    innerDialog={<DownloadHistoryDialog title="Download History" value={downloadHistory} onClose={()=>{setFileHistoryDialogOpen(false);}} />}
                />
        </React.Fragment>
    )
}
