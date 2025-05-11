import { MythicTabPanel, MythicTabLabel } from '../../MythicComponents/MythicTabPanel';
import React, { useEffect, useCallback } from 'react';
import { gql, useLazyQuery, useQuery, useSubscription } from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import MythicTextField from '../../MythicComponents/MythicTextField';
import Grid from '@mui/material/Grid';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RefreshIcon from '@mui/icons-material/Refresh';
import IconButton from '@mui/material/IconButton';
import { CallbacksTabsFileBrowserTree } from './CallbacksTabsFileBrowserTree';
import { CallbacksTabsFileBrowserTable } from './CallbacksTabsFileBrowserTable';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { MythicModifyStringDialog } from '../../MythicComponents/MythicDialog';
import { Backdrop } from '@mui/material';
import {CircularProgress} from '@mui/material';
import {TaskFromUIButton} from './TaskFromUIButton';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import Split from 'react-split';
import {subscriptionCallbackTokens} from "./CallbacksTabsTaskingInput";
import {CallbacksTabsTaskingInputTokenSelect} from "./CallbacksTabsTaskingInputTokenSelect";
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {b64DecodeUnicode} from "./ResponseDisplay";
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import {useGetMythicSetting, useSetMythicSetting} from "../../MythicComponents/MythicSavedUserSetting";
import {RenderSingleTask} from "../SingleTaskView/SingleTaskView";
import {loadedCommandsQuery} from "./CallbacksTabsProcessBrowser";
import {getSkewedNow} from "../../utilities/Time";

const fileDataFragment = gql`
    fragment fileObjData on mythictree {
        comment
        deleted
        task_id
        filemeta {
            id
            agent_file_id
            filename_text
        }
        tags {
            tagtype {
                name
                color
                id
            }
        }
        host
        id
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
const rootFileQuery = gql`
    ${fileDataFragment}
    query myRootFolderQuery {
        mythictree(where: { parent_path_text: { _eq: "" }, tree_type: {_eq: "file"} }) {
            ...fileObjData
        }
    }
`;
const folderQuery = gql`
    ${fileDataFragment}
    query myFolderQuery($parent_path_text: String!, $parents: [String]) {
        children: mythictree(
            where: { parent_path_text: { _eq: $parent_path_text }, tree_type: {_eq: "file"} }
            order_by: { can_have_children: asc, name: asc }
        ) {
            ...fileObjData
        }
        parents: mythictree(
            where: { full_path_text: { _in: $parents }, tree_type: {_eq: "file"} }
            order_by: { can_have_children: asc, name: asc }
        ) {
            ...fileObjData
        }
        self: mythictree(
            where: { full_path_text: { _eq: $parent_path_text }, tree_type: {_eq: "file"} }
            order_by: { can_have_children: asc, name: asc }
        ) {
            ...fileObjData
        }
    }
`;
const fileDataSubscription = gql`
    ${fileDataFragment}
    subscription liveData($now: timestamp!) {
        mythictree_stream(
            batch_size: 1000,
            cursor: {initial_value: {timestamp: $now}},
            where: {tree_type: {_eq: "file"} }
        ) {
            ...fileObjData
        }
    }
`;
const fileBrowserTaskSub = gql`
    subscription fileBrowserTasks($now: timestamp!, $callback_id: Int!){
        task_stream(
            batch_size: 10,
            cursor: {initial_value: {timestamp: $now}},
            where: {tasking_location: {_eq: "file_browser"}, callback_id: {_eq: $callback_id}}
        ){
            id
            status
            completed
        }
    }
`;
export const getAllParentNodes = (node) => {
    let linuxPathSeparatorIndex = node.full_path_text.indexOf("/");
    let windowsPathSeparatorIndex = node.full_path_text.indexOf("\\");
    let newNodes = [node.full_path_text];
    if(linuxPathSeparatorIndex !== -1){
        let pieces = node.full_path_text.split("/");
        newNodes.push("/");
        for(let i = 0; i < pieces.length; i++){
            let newElement = pieces.slice(0, i).join("/");
            if(newElement === ""){continue}
            newNodes.push(newElement)
        }
    }
    if(windowsPathSeparatorIndex !== -1){
        let pieces = node.full_path_text.split("\\");
        for(let i = 0; i < pieces.length; i++){
            newNodes.push(pieces.slice(0, i).join("\\"))
        }
    }
    return newNodes;
}
export function CallbacksTabsFileBrowserLabel(props) {
    const [description, setDescription] = React.useState('File Browser: ' + props.tabInfo.displayID);
    const [openEditDescriptionDialog, setOpenEditDescriptionDialog] = React.useState(false);
    useEffect(() => {
        if (props.tabInfo.customDescription !== '' && props.tabInfo.customDescription !== undefined) {
            setDescription(props.tabInfo.customDescription);
        } else {
            setDescription('File Browser: ' + props.tabInfo.displayID);
        }
    }, [props.tabInfo.payloadDescription, props.tabInfo.customDescription]);
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

    const contextMenuOptions = props.contextMenuOptions.concat([
        {
            name: 'Set Tab Description', 
            click: ({event}) => {
                setOpenEditDescriptionDialog(true);
            }
        },
    ]);
    return (
        <React.Fragment>
            <MythicTabLabel label={description} onDragTab={props.onDragTab}  {...props} contextMenuOptions={contextMenuOptions} />
            {openEditDescriptionDialog && (
                <MythicDialog
                    fullWidth={true}
                    open={openEditDescriptionDialog}
                    onClose={() => {
                        setOpenEditDescriptionDialog(false);
                    }}
                    innerDialog={
                        <MythicModifyStringDialog
                            title={"Edit Tab's Description - Displays as one line"}
                            onClose={() => {
                                setOpenEditDescriptionDialog(false);
                            }}
                            value={description}
                            onSubmit={editDescriptionSubmit}
                        />
                    }
                />
            )}
        </React.Fragment>
    );
}
export const CallbacksTabsFileBrowserPanel = ({ index, value, tabInfo, me }) => {
    const fromNow = React.useRef(getSkewedNow());
    const [backdropOpen, setBackdropOpen] = React.useState(false);
    const treeRootDataRef = React.useRef({}); // hold all of the actual data
    // hold the simple adjacency matrix for parent/child relationships
    const [treeAdjMtx, setTreeAdjMtx] = React.useState({});
    const [selectedFolderData, setSelectedFolderData] = React.useState({
        full_path_text: '',
        host: tabInfo.host,
        group: "Default",
        parent_path_text: ""
    });
    const [showDeletedFiles, setShowDeletedFiles] = React.useState(false);
    const [openTaskingButton, setOpenTaskingButton] = React.useState(false);
    const taskingTableTopTypedDataRef = React.useRef({
        path: "",
        token: 0,
    });
    const autoTaskLsOnEmptyDirectoriesRef = React.useRef(false);
    const taskingData = React.useRef({"parameters": "", "ui_feature": "file_browser:list"});
    const mountedRef = React.useRef(true);
    const tableOpenedPathIdRef = React.useRef({
        host: "",
        group: "",
        full_path_text: ""
    });
    const loadedCommandsRef = React.useRef({});
    const loadingCommandsRef = React.useRef(false);
    useQuery(rootFileQuery, {
        onCompleted: (data) => {
           // use an adjacency matrix but only for full_path_text -> children, not both directions
           // create the top level data in the treeRootDataRef
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
                    if(treeRootDataRef.current[currentGroups[j]][data.mythictree[i]["host"]][data.mythictree[i]["full_path_text"]] === undefined){
                        treeRootDataRef.current[currentGroups[j]][data.mythictree[i]["host"]][data.mythictree[i]["full_path_text"]] = {...data.mythictree[i]};
                    } else {
                        if(treeRootDataRef.current[currentGroups[j]][data.mythictree[i]["host"]][data.mythictree[i]["full_path_text"]].success === null){
                            treeRootDataRef.current[currentGroups[j]][data.mythictree[i]["host"]][data.mythictree[i]["full_path_text"]] = {...data.mythictree[i]}
                        }
                    }
                }
           }
           // create the top level data in the adjacency matrix
           const newMatrix = data.mythictree.reduce( (prev, cur) => {
               let currentGroups = cur?.["callback"]?.["mythictree_groups"] || ["Unknown Callbacks"];
               for(let j = 0; j < currentGroups.length; j++) {
                   if (prev[currentGroups[j]] === undefined) {
                       prev[currentGroups[j]] = {};
                   }
                   if (prev[currentGroups[j]][cur["host"]] === undefined) {
                       // the current host isn't tracked in the adjacency matrix, so add it
                       prev[currentGroups[j]][cur["host"]] = {}
                   }
                   if (prev[currentGroups[j]][cur["host"]][cur["parent_path_text"]] === undefined) {
                       // the current parent's path isn't tracked, so add it and ourselves as children
                       prev[currentGroups[j]][cur["host"]][cur["parent_path_text"]] = {};
                   }
                   prev[currentGroups[j]][cur["host"]][cur["parent_path_text"]][cur["full_path_text"]] = 1;
               }
                return prev;
           }, {...treeAdjMtx});
           //console.log(treeRootDataRef.current);
           setTreeAdjMtx(newMatrix);
            setSelectedFolderData({
                full_path_text: '',
                host: tabInfo.host,
                group: defaultGroup,
                parent_path_text: "",
            });
        },
        fetchPolicy: 'no-cache',
    });
    useSubscription(fileDataSubscription, {
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
                        treeRootDataRef.current[currentGroups[j]][data.data.mythictree_stream[i]["host"]][data.data.mythictree_stream[i]["full_path_text"]] = {...data.data.mythictree_stream[i]};
                        treeRootDataRef.current[currentGroups[j]][data.data.mythictree_stream[i]["host"]][data.data.mythictree_stream[i]["full_path_text"]].filemeta = treeRootDataRef.current[currentGroups[j]][data.data.mythictree_stream[i]["host"]][data.data.mythictree_stream[i]["full_path_text"]].filemeta.map(f => {
                            return {...f, filename_text: b64DecodeUnicode(f.filename_text)}
                        })
                        if(selectedFolderData.group === currentGroups[j] && selectedFolderData.host === data.data.mythictree_stream[i]["host"] &&
                            selectedFolderData.full_path_text === data.data.mythictree_stream[i]["full_path_text"]){
                            setSelectedFolderData({...treeRootDataRef.current[currentGroups[j]][data.data.mythictree_stream[i]["host"]][data.data.mythictree_stream[i]["full_path_text"]],
                                group: currentGroups[j], fromHistory: selectedFolderData.fromHistory});
                        }
                    } else {
                        // we need to merge data in because we already have some info
                        let existingData = treeRootDataRef.current[currentGroups[j]][data.data.mythictree_stream[i]["host"]][data.data.mythictree_stream[i]["full_path_text"]];
                        if(existingData.task_id < data.data.mythictree_stream[i].task_id){
                            existingData.deleted = data.data.mythictree_stream[i].deleted;
                        }
                        if( (existingData.success === null || !existingData.success) && data.data.mythictree_stream[i].success !== null){
                            existingData.success = data.data.mythictree_stream[i].success;
                            existingData.task_id = data.data.mythictree_stream[i].task_id;
                        }
                        existingData.comment += data.data.mythictree_stream[i].comment;
                        existingData.tags = [...existingData.tags, ...data.data.mythictree_stream[i].tags];
                        if(!existingData.metadata.has_children){
                            existingData.metadata.has_children = data.data.mythictree_stream[i].metadata.has_children;
                        }
                        existingData.metadata.permissions = {...existingData.metadata.permissions, ...data.data.mythictree_stream[i].metadata.permissions};
                        let newfileData = data.data.mythictree_stream[i].filemeta.map(f => {
                            return {...f, filename_text: b64DecodeUnicode(f.filename_text)};
                        })
                        existingData.filemeta = [...existingData.filemeta, ...newfileData]
                        existingData.filemeta.sort((a,b) => a.id > b.id ? 1 : -1);
                        treeRootDataRef.current[currentGroups[j]][data.data.mythictree_stream[i]["host"]][data.data.mythictree_stream[i]["full_path_text"]] = {...existingData};
                        if(selectedFolderData.group === currentGroups[j] && selectedFolderData.host === data.data.mythictree_stream[i]["host"] &&
                            selectedFolderData.full_path_text === data.data.mythictree_stream[i]["full_path_text"]){
                            setSelectedFolderData({...existingData, group: currentGroups[j], fromHistory: selectedFolderData.fromHistory});
                        }
                    }
                }
            }
            const newMatrix = data.data.mythictree_stream.reduce( (prev, cur) => {
                let currentGroups = cur?.["callback"]?.["mythictree_groups"] || ["Unknown Callbacks"];
                for(let j = 0; j < currentGroups.length; j++) {
                    if (prev[currentGroups[j]] === undefined) {
                        prev[currentGroups[j]] = {};
                    }
                    if (prev[currentGroups[j]][cur["host"]] === undefined) {
                        // the current host isn't tracked in the adjacency matrix, so add it
                        prev[currentGroups[j]][cur["host"]] = {}
                    }
                    if (prev[currentGroups[j]][cur["host"]][cur["parent_path_text"]] === undefined) {
                        // the current parent's path isn't tracked, so add it and ourselves as children
                        prev[currentGroups[j]][cur["host"]][cur["parent_path_text"]] = {};
                    }
                    prev[currentGroups[j]][cur["host"]][cur["parent_path_text"]][cur["full_path_text"]] = 1;
                }
                return prev;
            }, {...treeAdjMtx});
            setTreeAdjMtx(newMatrix);
            
        }
    })
    useSubscription(fileBrowserTaskSub, {
        variables: {now: fromNow.current, callback_id: tabInfo.callbackID},
        fetchPolicy: "no-cache",
        onData: ({data}) => {
            for(let i = 0; i < data.data.task_stream.length; i++){
                if(data.data.task_stream[i].status.toLowerCase().includes("error") && data.data.task_stream[i].completed){
                    snackActions.warning(<RenderSingleTask task_id={data.data.task_stream[i].id} />,
                        {toastId: data.data.task_stream[i].id, autoClose: false, closeOnClick: false});
                }
            }
        }
    })
    const [getLoadedCommandsQuery] = useLazyQuery(loadedCommandsQuery, {
        fetchPolicy: 'no-cache',
        onCompleted: (data) => {
            if(data.loadedcommands.length > 0){
                loadedCommandsRef.current[data.loadedcommands[0].callback_id] = [...data.loadedcommands];
            }
            loadingCommandsRef.current = false;
        },
        onError: (data) => {
            console.log(data);
            loadingCommandsRef.current = false;
        }
    });
    async function getLoadedCommandForUIFeature (callback_id, uifeature){
        while(loadingCommandsRef.current){
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        if(loadedCommandsRef.current[callback_id] === undefined){
            loadingCommandsRef.current = true;
            getLoadedCommandsQuery({variables: {callback_id: callback_id}});
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
    const [getFolderData] = useLazyQuery(folderQuery, {
        onError: (data) => {
            console.error(data);
        },
        fetchPolicy: 'no-cache',
        notifyOnNetworkStatusChange: true,
        onCompleted: (data) => {
            //console.log("getFolderData", data)
            let mythictree = [...data.parents, ...data.children];
            snackActions.dismiss();
            // add in all of the raw data
            for(let i = 0; i < mythictree.length; i++){
                let currentGroups = mythictree[i]?.["callback"]?.["mythictree_groups"] || ["Unknown Callbacks"];
                for(let j = 0; j < currentGroups.length; j++){
                    if(treeRootDataRef.current[currentGroups[j]] === undefined){
                        treeRootDataRef.current[currentGroups[j]] = {};
                    }
                    if( treeRootDataRef.current[currentGroups[j]][mythictree[i]["host"]] === undefined) {
                        // new host discovered
                        treeRootDataRef.current[currentGroups[j]][mythictree[i]["host"]] = {};
                    }
                    if(treeRootDataRef.current[currentGroups[j]][mythictree[i]["host"]][mythictree[i]["full_path_text"]] === undefined){
                        // first time we're seeing this file data, just add it
                        treeRootDataRef.current[currentGroups[j]][mythictree[i]["host"]][mythictree[i]["full_path_text"]] = {...mythictree[i]};
                        treeRootDataRef.current[currentGroups[j]][mythictree[i]["host"]][mythictree[i]["full_path_text"]].filemeta = treeRootDataRef.current[currentGroups[j]][mythictree[i]["host"]][mythictree[i]["full_path_text"]].filemeta.map(f => {
                            return {...f, filename_text: b64DecodeUnicode(f.filename_text)}
                        })
                        if(selectedFolderData.group === currentGroups[j] && selectedFolderData.host === mythictree[i]["host"] &&
                            selectedFolderData.full_path_text === mythictree[i]["full_path_text"]){
                            setSelectedFolderData({...treeRootDataRef.current[currentGroups[j]][mythictree[i]["host"]][mythictree[i]["full_path_text"]],
                                group: currentGroups[j], fromHistory: selectedFolderData.fromHistory});
                        }
                    } else {
                        // we need to merge data in because we already have some info
                        let existingData = treeRootDataRef.current[currentGroups[j]][mythictree[i]["host"]][mythictree[i]["full_path_text"]];
                        if(existingData.task_id < mythictree[i].task_id){
                            existingData.deleted = mythictree[i].deleted;
                        }
                        if( (existingData.success === null || !existingData.success) && mythictree[i].success !== null){
                            existingData.success = mythictree[i].success;
                            existingData.task_id = mythictree[i].task_id;
                        }
                        existingData.comment += mythictree[i].comment;
                        existingData.tags = [...existingData.tags, ...mythictree[i].tags];
                        if(!existingData.metadata.has_children){
                            existingData.metadata.has_children = mythictree[i].metadata.has_children;
                        }
                        existingData.metadata.permissions = {...existingData.metadata.permissions, ...mythictree[i].metadata.permissions};
                        let newfileData = mythictree[i].filemeta.map(f => {
                            return {...f, filename_text: b64DecodeUnicode(f.filename_text)};
                        })
                        existingData.filemeta = [...existingData.filemeta, ...newfileData]
                        existingData.filemeta.sort((a,b) => a.id > b.id ? 1 : -1);
                        treeRootDataRef.current[currentGroups[j]][mythictree[i]["host"]][mythictree[i]["full_path_text"]] = {...existingData};
                        if(selectedFolderData.group === currentGroups[j] && selectedFolderData.host === mythictree[i]["host"] &&
                            selectedFolderData.full_path_text === mythictree[i]["full_path_text"]){
                            setSelectedFolderData({...existingData,
                                group: currentGroups[j],
                                fromHistory: selectedFolderData.fromHistory});
                        }
                    }
                }
            }
            // create the top level data in the adjacency matrix
            const newMatrix = mythictree.reduce( (prev, cur) => {
                let currentGroups = cur?.["callback"]?.["mythictree_groups"] || ["Unknown Callbacks"];
                for(let j = 0; j < currentGroups.length; j++) {
                    if (prev[currentGroups[j]] === undefined) {
                        prev[currentGroups[j]] = {};
                    }
                    if (prev[currentGroups[j]][cur["host"]] === undefined) {
                        // the current host isn't tracked in the adjacency matrix, so add it
                        prev[currentGroups[j]][cur["host"]] = {}
                    }
                    if (prev[currentGroups[j]][cur["host"]][cur["parent_path_text"]] === undefined) {
                        // the current parent's path isn't tracked, so add it and ourselves as children
                        prev[currentGroups[j]][cur["host"]][cur["parent_path_text"]] = {};
                    }
                    prev[currentGroups[j]][cur["host"]][cur["parent_path_text"]][cur["full_path_text"]] = 1;
                }
                return prev;
            }, {...treeAdjMtx});
            //console.log(treeRootDataRef.current);
            setTreeAdjMtx(newMatrix);
            //console.log("just set treeAdjMtx, about to close backdrop")
            setBackdropOpen(false);
            if(data.self.length > 0){
                //setSelectedFolderData({...selectedFolderData, task_id: data.self[0].task_id, success: data.self[0].success});
                // this path exists, let's see if we have data for it and if the user wants us to auto-issue an ls for the path
                let newAllData = Object.keys(newMatrix[selectedFolderData.group]?.[selectedFolderData.host]?.[data.self[0].full_path_text] || {});
                if(autoTaskLsOnEmptyDirectoriesRef.current){
                    if(newAllData.length === 0 && data.self[0].full_path_text !== "" && data.self[0].success === null){
                        onListFilesButtonFromTableWithNoEntries()
                    }
                }
            } else {
                // we couldn't find the path specified, so we must not have data for it, so check if the user wants us to auto issue an ls
                if(autoTaskLsOnEmptyDirectoriesRef.current){
                    // don't want to auto ls when we get to the root/host object in the view
                    if(selectedFolderData.full_path_text !== ""){
                        onListFilesButtonFromTableWithNoEntries()
                    }
                }
            }
        },
    });
    const onSetTableData = useCallback((nodeData) => {
        //console.log("setTableData", nodeData);
        setSelectedFolderData(nodeData);
    }, []);
    const fetchFolderData = useCallback((nodeData, fromHistory) => {
        let parentNodes = getAllParentNodes(nodeData);
        getFolderData({
            variables: { parent_path_text: nodeData.full_path_text, parents: parentNodes},
        });
        setBackdropOpen(true);
        setSelectedFolderData({...nodeData, fromHistory: fromHistory});
    }, []);
    const fetchParentFolderData = (nodeData) => {
        let parentNodes = getAllParentNodes(nodeData);
        getFolderData({
            variables: { parent_path_text: nodeData.parent_path_text, parents: parentNodes},
        });
        setBackdropOpen(true);
        let parentData = treeRootDataRef.current[nodeData.group][nodeData.host][nodeData.parent_path_text];
        parentData.group = nodeData.group;
        tableOpenedPathIdRef.current = {
            group: parentData.group,
            host: parentData.host,
            full_path_text: parentData.full_path_text
        };
        setSelectedFolderData({...parentData, fromHistory: false});
    };
    const localSelectedToken = React.useRef("");
    const onChangeSelectedToken = (token) => {
        localSelectedToken.current = token;
    }
    const onListFilesButton = ({ fullPath, callback_id, callback_display_id, token }) => {
        let path = fullPath;
        if(path === ""){
            path = ".";
        }
        taskingData.current = ({
            "token": token,
            "parameters": {path: path, full_path: path, host: selectedFolderData.host, file: ""},
            "ui_feature": "file_browser:list", callback_id, callback_display_id});
        setOpenTaskingButton(true);
    };
    const onListFilesButtonFromTableWithNoEntries = () => {
        taskingData.current = ({
            "token": taskingTableTopTypedDataRef.current.token === "Default Token" ? 0 : taskingTableTopTypedDataRef.current.token,
            "parameters": {
                path: taskingTableTopTypedDataRef.current.path,
                full_path: taskingTableTopTypedDataRef.current.path,
                host: selectedFolderData.host,
                file: ""
            },
            "ui_feature": "file_browser:list",
            callback_id: tabInfo.callbackID,
            callback_display_id: tabInfo.displayID});
        setOpenTaskingButton(true);
    }
    const onUploadFileButton = ({ fullPath, callback_id, callback_display_id, token }) => {
        taskingData.current = ({
            "token": token,
            "parameters": {path: fullPath, full_path: fullPath, host: selectedFolderData.host},
            "ui_feature": "file_browser:upload", "openDialog": true,
            callback_id, callback_display_id
        });
        setOpenTaskingButton(true);
    };
    const multipleTasks = React.useRef([]);
    const onTaskRowActions = useCallback( (tasks) => {
        let updatedTasks = [];
        for(let i = 0; i < tasks.length; i++){
            updatedTasks.push({
                "token": localSelectedToken.current,
                "parameters": {
                    host: selectedFolderData.host,
                    path: tasks[i].path,
                    full_path: tasks[i].full_path,
                    file: tasks[i].filename,
                },
                "ui_feature": tasks[i].uifeature,
                openDialog: tasks[i].openDialog,
                getConfirmation: tasks[i].getConfirmation,
                callback_id: tasks[i].callback_id,
                callback_display_id: tasks[i].callback_display_id});
        }
        multipleTasks.current = updatedTasks;
        taskingData.current = multipleTasks.current.pop()
        setOpenTaskingButton(true);
    }, [selectedFolderData, localSelectedToken.current]);
    React.useEffect( () => {
        if(!openTaskingButton){
            if(multipleTasks.current.length > 0){
                taskingData.current = multipleTasks.current.pop()
                setOpenTaskingButton(true);
            }
        }
    }, [openTaskingButton]);
    const onTaskRowAction = useCallback(({ path, full_path, filename, uifeature, openDialog, getConfirmation, callback_id, callback_display_id }) => {
        taskingData.current = ({
            "token": localSelectedToken.current,
            "parameters": {
                host: selectedFolderData.host,
                path: path,
                full_path: full_path,
                file: filename,
            }, "ui_feature": uifeature,
            openDialog, getConfirmation, callback_id, callback_display_id});
        setOpenTaskingButton(true);
    }, [selectedFolderData, localSelectedToken.current]);
    const toggleShowDeletedFiles = (showStatus) => {
        setShowDeletedFiles(showStatus);
    };
    React.useEffect( () => {
        return() => {
            mountedRef.current = false;
        }
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const taskListing = (nodeData, callback_id, callback_display_id) => {
        taskingData.current = ({
            "token": localSelectedToken.current,
            "parameters": {path: nodeData.full_path_text, full_path: nodeData.full_path_text, host: nodeData.host, file: ""},
            "ui_feature": "file_browser:list", callback_id, callback_display_id});
        setOpenTaskingButton(true);
    }
    const openDirectoryPath = ({group, host, path}) => {
        let parentNodes = getAllParentNodes({full_path_text: path});
        getFolderData({
            variables: {parent_path_text: path, parents: parentNodes}
        })
        setBackdropOpen(true);
        setSelectedFolderData({host, group, full_path_text: path, id: 0, success: null});
        tableOpenedPathIdRef.current = {
            group: group,
            host: host,
            full_path_text: path
        };
    }
    return (
        <MythicTabPanel index={index} value={value}>
            <Split direction="horizontal" style={{width: "100%", height: "100%", display: "flex", overflow: "hidden"}} sizes={[30, 70]} >
                <div className="bg-gray-base" style={{display: "inline-flex"}}>
                    <Backdrop open={backdropOpen} style={{zIndex: 2, position: "absolute"}} invisible={true}>
                        <CircularProgress color="inherit" />
                    </Backdrop>
                    <CallbacksTabsFileBrowserTree
                        tabInfo={tabInfo}
                        showDeletedFiles={showDeletedFiles}
                        treeRootData={treeRootDataRef.current}
                        treeAdjMatrix={treeAdjMtx}
                        selectedFolderData={selectedFolderData}
                        fetchFolderData={fetchFolderData}
                        setTableData={onSetTableData}
                        taskListing={taskListing}
                        tableOpenedPathId={tableOpenedPathIdRef.current}
                        getLoadedCommandForUIFeature={getLoadedCommandForUIFeature}
                    />

                </div>
                <div className="bg-gray-light" style={{display: "inline-flex"}}>
                    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: "hidden" }}>
                        <div style={{ flexGrow: 0 }}>
                            <FileBrowserTableTop
                                tabInfo={tabInfo}
                                taskingTableTopTypedDataRef={taskingTableTopTypedDataRef}
                                autoTaskLsOnEmptyDirectoriesRef={autoTaskLsOnEmptyDirectoriesRef}
                                onChangeSelectedToken={onChangeSelectedToken}
                                selectedFolderData={selectedFolderData}
                                onListFilesButton={onListFilesButton}
                                onUploadFileButton={onUploadFileButton}
                                toggleShowDeletedFiles={toggleShowDeletedFiles}
                                fetchParentFolderData={fetchParentFolderData}
                                fetchFolderData={fetchFolderData}
                                openDirectoryPath={openDirectoryPath}
                            />
                        </div>
                        <div style={{ flexGrow: 1 }}>
                            <Backdrop open={backdropOpen} style={{zIndex: 2, position: "absolute"}} invisible={true}>
                                <CircularProgress color="inherit" />
                            </Backdrop>
                            <CallbacksTabsFileBrowserTable
                                tabInfo={tabInfo}
                                showDeletedFiles={showDeletedFiles}
                                onRowDoubleClick={fetchFolderData}
                                treeRootData={treeRootDataRef.current}
                                treeAdjMatrix={treeAdjMtx}
                                onListFilesButtonFromTableWithNoEntries={onListFilesButtonFromTableWithNoEntries}
                                selectedFolderData={selectedFolderData}
                                autoTaskLsOnEmptyDirectories={autoTaskLsOnEmptyDirectoriesRef.current}
                                onTaskRowAction={onTaskRowAction}
                                onTaskRowActions={onTaskRowActions}
                                getLoadedCommandForUIFeature={getLoadedCommandForUIFeature}
                                me={me}
                            />
                        </div>
                    </div>
                </div>
            </Split>
            {openTaskingButton && 
                <TaskFromUIButton
                    token={taskingData.current?.token || undefined}
                    ui_feature={taskingData.current?.ui_feature || " "}
                    callback_id={taskingData.current?.callback_id || tabInfo.callbackID}
                    parameters={taskingData.current?.parameters || ""}
                    tasking_location={"file_browser"}
                    openDialog={taskingData.current?.openDialog || false}
                    getConfirmation={taskingData.current?.getConfirmation || false}
                    selectCallback={taskingData.current?.selectCallback || false}
                    onTasked={() => setOpenTaskingButton(false)}/>
            }
        </MythicTabPanel>
    );
};
const FileBrowserTableTop = ({
    selectedFolderData,
    taskingTableTopTypedDataRef,
    autoTaskLsOnEmptyDirectoriesRef,
    onChangeSelectedToken,
    onListFilesButton,
    onUploadFileButton,
    toggleShowDeletedFiles,
    fetchParentFolderData,
    fetchFolderData,
    openDirectoryPath,
    tabInfo
}) => {
    const autoTaskLsOnEmptyDirectories = useGetMythicSetting({
        setting_name: "autoTaskLsOnEmptyDirectories", default_value: false
    });
    const [updateMythicSetting] = useSetMythicSetting();
    const [fullPath, setFullPath] = React.useState('');
    const selectedToken = React.useRef("Default Token");
    const [tokenOptions, setTokenOptions] = React.useState([]);
    const [placeHolder, setPlaceHolder] = React.useState(selectedFolderData.host);
    const [showDeletedFiles, setLocalShowDeletedFiles] = React.useState(false);
    const [history, setHistory] = React.useState([]);
    const [historyIndex, setHistoryIndex] = React.useState(0);
    const onChangePath = (_, value) => {
        setFullPath(value);
        taskingTableTopTypedDataRef.current.path = value;
        taskingTableTopTypedDataRef.current.token = selectedToken;

    };
    const changeSelectedToken = (token) => {
        onChangeSelectedToken(token);
        if(token === "Default Token"){
            selectedToken.current = "Default Token";
            taskingTableTopTypedDataRef.current.token = selectedToken;
            return;
        }
        if(token.token_id !== selectedToken.current.token_id){
            selectedToken.current = token;
            taskingTableTopTypedDataRef.current.token = selectedToken;
        }
    }
    useSubscription(subscriptionCallbackTokens, {
        variables: {callback_id: tabInfo.callbackID}, fetchPolicy: "no-cache",
        shouldResubscribe: true,
        onData: ({data}) => {
            setTokenOptions(data.data.callbacktoken);
        }
    });
    useEffect(() => {
        if(selectedFolderData.root) {
            setFullPath("");
            taskingTableTopTypedDataRef.current.path = "";
        } else if (selectedFolderData.full_path_text !== undefined) {
            setFullPath(selectedFolderData.full_path_text);
            taskingTableTopTypedDataRef.current.path = selectedFolderData.full_path_text;
        }
        const groups = selectedFolderData?.callback?.mythictree_groups?.join(", ") || "";
        if(groups.length > 0 ){
            setPlaceHolder(selectedFolderData.host + " - " + groups);
        } else {
            setPlaceHolder(selectedFolderData.host + groups);
        }
    }, [selectedFolderData]);
    useEffect( () => {
        if(selectedFolderData.fromHistory){
            return;
        }
        if(selectedFolderData.id !== ""){
            if(history[0]?.full_path_text !== selectedFolderData.full_path_text){
                // always add newest things to the bottom of the stack
                setHistory([selectedFolderData, ...history]);
                if(history.length > 20){
                    // pop off from the top (the oldest) if we get more than 50
                    setHistory([selectedFolderData, ...history.splice(history.length-1, 1)])
                }
            }
        }
    }, [selectedFolderData, history])
    const moveIndexToPreviousListing = () => {
        // we're getting closer to the end of the historyRef.current, the oldest listing
        if(historyIndex >= history.length -1){
            return
        }
        setHistoryIndex(historyIndex + 1);
        fetchFolderData(history[historyIndex + 1], true);
    }
    const moveIndexToNextListing = () => {
        // we're getting close to index 0, the newest listing
        //console.log(historyIndex, history);
        if(historyIndex <= 0){
            return
        }
        setHistoryIndex(historyIndex - 1);
        fetchFolderData(history[historyIndex - 1], true);
    }
    const onLocalListFilesButton = () => {
        let tempPath = fullPath;
        if (tempPath === "") {
            tempPath = ".";
        }
        if(tempPath.length > 1){
            if(tempPath[tempPath.length-1] === "/" || tempPath[tempPath.length-1] === "\\"){
                let newFullPath = tempPath.slice(0, tempPath.length-1);
                setFullPath(newFullPath);
                onListFilesButton({ fullPath: newFullPath, token: selectedToken.current });
                return
            }
        }
        onListFilesButton({ fullPath: tempPath, token: selectedToken.current });
    };
    const onLocalUploadFileButton = () => {
        onUploadFileButton({ fullPath, token: selectedToken.current });
    };
    const onLocalToggleShowDeletedFiles = () => {
        setLocalShowDeletedFiles(!showDeletedFiles);
        toggleShowDeletedFiles(!showDeletedFiles);
    };
    const onLocalMoveUpDirectoryButton = () => {
        if(selectedFolderData.parent_path_text !== ""){
            fetchParentFolderData(selectedFolderData)
        }
    };
    const onToggleAutoTaskLsOnEmptyDirectories = () => {
        updateMythicSetting({setting_name: "autoTaskLsOnEmptyDirectories", value: !autoTaskLsOnEmptyDirectories});
        if(autoTaskLsOnEmptyDirectories){
            snackActions.info("No longer auto issuing listings for empty paths");
        } else {
            snackActions.success("Now starting to auto issue listings for empty paths");
        }
    }
    const goToDirectory = () => {
        if(fullPath === ""){return}
        if(fullPath.length > 1){
            if(fullPath[fullPath.length-1] === "/" || fullPath[fullPath.length-1] === "\\"){
                let newFullPath = fullPath.slice(0, fullPath.length-1);
                setFullPath(newFullPath);
                openDirectoryPath({
                    group: selectedFolderData.group,
                    host: selectedFolderData.host,
                    path: newFullPath,
                })
                return
            }
        }
        openDirectoryPath({
            group:selectedFolderData.group,
            host: selectedFolderData.host,
            path: fullPath,
        })
    }
    useEffect( () => {
        autoTaskLsOnEmptyDirectoriesRef.current = autoTaskLsOnEmptyDirectories;
    }, [autoTaskLsOnEmptyDirectories]);
    return (
        <Grid container spacing={0} style={{ paddingTop: '10px' }}>
            <Grid size={12}>
                <MythicTextField
                    placeholder={selectedFolderData.host}
                    value={fullPath}
                    onEnter={goToDirectory}
                    onChange={onChangePath}
                    name={placeHolder}
                    InputProps={{
                        endAdornment: (
                            <React.Fragment>
                                <MythicStyledTooltip title={`Task current callback (${tabInfo["displayID"]}) to list contents`}>
                                    <IconButton style={{ padding: '3px' }}
                                                onClick={onLocalListFilesButton}
                                                size="large">
                                        <RefreshIcon color='info' />
                                    </IconButton>
                                </MythicStyledTooltip>
                                <MythicStyledTooltip title={`Upload file to folder via current callback (${tabInfo["displayID"]})`}>
                                    <IconButton style={{ padding: '3px' }}
                                                onClick={onLocalUploadFileButton}
                                                size="large">
                                        <CloudUploadIcon color="info" />
                                    </IconButton>
                                </MythicStyledTooltip>
                                {autoTaskLsOnEmptyDirectories ? (
                                    <MythicStyledTooltip title={"Currently tasking listing on empty directories, click to toggle off"} >
                                        <IconButton style={{padding: "3px"}}
                                                    onClick={onToggleAutoTaskLsOnEmptyDirectories}
                                                    size={"large"}>
                                            <PlaylistAddIcon color={"success"} ></PlaylistAddIcon>
                                        </IconButton>
                                    </MythicStyledTooltip>
                                ) : (
                                    <MythicStyledTooltip title={"Currently not tasking listing on empty directories, click to toggle on"} >
                                        <IconButton style={{padding: "3px"}}
                                                    onClick={onToggleAutoTaskLsOnEmptyDirectories}
                                                    size={"large"}>
                                            <PlaylistRemoveIcon color={"secondary"} ></PlaylistRemoveIcon>
                                        </IconButton>
                                    </MythicStyledTooltip>
                                )}
                                <MythicStyledTooltip title={showDeletedFiles ? 'Hide Deleted Files' : 'Show Deleted Files'}>
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
                        ),
                        startAdornment: (
                            <div style={{display: "inline-flex",
                                alignItems: "center",
                                borderRight: "1px solid grey",
                                marginRight: "10px",
                                padding: "0 5px 0 0"}}>
                                {tokenOptions.length > 0 ? (
                                    <CallbacksTabsTaskingInputTokenSelect options={tokenOptions} changeSelectedToken={changeSelectedToken}/>
                                ) : null}
                                <MythicStyledTooltip title={`Move back to previous listing`}>
                                    <IconButton style={{ padding: '3px' }}
                                                disabled={historyIndex >= history.length -1 }
                                                onClick={moveIndexToPreviousListing}
                                                color='info'
                                                size="large">
                                        <ArrowBackIcon />
                                    </IconButton>
                                </MythicStyledTooltip>
                                <MythicStyledTooltip title={`Move to next listing`}>
                                    <IconButton style={{ padding: '3px' }}
                                                disabled={historyIndex <= 0}
                                                onClick={moveIndexToNextListing}
                                                size="large"
                                                color='info'>
                                        <ArrowForwardIcon  />
                                    </IconButton>
                                </MythicStyledTooltip>
                                <MythicStyledTooltip title={"Move up a directory"} >
                                    <IconButton style={{padding: "0 0 0 0"}}
                                                onClick={onLocalMoveUpDirectoryButton}
                                                disabled={!selectedFolderData?.parent_path_text || selectedFolderData?.parent_path_text?.length === 0 || selectedFolderData.root || fullPath === ""}
                                    >
                                        <KeyboardReturnIcon style={{rotate: "90deg"}} ></KeyboardReturnIcon>
                                    </IconButton>
                                </MythicStyledTooltip>

                        </div>),
                        style: {  },
                    }}
                />
            </Grid>
        </Grid>
    );
};
