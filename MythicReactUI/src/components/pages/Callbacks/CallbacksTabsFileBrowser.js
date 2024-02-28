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

const fileDataFragment = gql`
    fragment fileObjData on mythictree {
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
    query myFolderQuery($parent_path_text: String!) {
        mythictree(
            where: { parent_path_text: { _eq: $parent_path_text }, tree_type: {_eq: "file"} }
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
                            title={"Edit Tab's Description"}
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
    const [fromNow, setFromNow] = React.useState((new Date()));
    const [backdropOpen, setBackdropOpen] = React.useState(false);
    const treeRootDataRef = React.useRef({}); // hold all of the actual data
    const [treeAdjMtx, setTreeAdjMtx] = React.useState({}); // hold the simple adjacency matrix for parent/child relationships
    const [selectedFolderData, setSelectedFolderData] = React.useState({
        full_path_text: '.',
        host: "",
        id: "",
    });
    const [showDeletedFiles, setShowDeletedFiles] = React.useState(false);
    const [openTaskingButton, setOpenTaskingButton] = React.useState(false);
    const taskingData = React.useRef({"parameters": "", "ui_feature": "file_browser:list"});
    const mountedRef = React.useRef(true);
    const tableOpenedPathIdRef = React.useRef(0);
    useQuery(rootFileQuery, {
        onCompleted: (data) => {
           // use an adjacency matrix but only for full_path_text -> children, not both directions
           // create the top level data in the treeRootDataRef
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
                    treeRootDataRef.current[currentGroups[j]][data.mythictree[i]["host"]][data.mythictree[i]["full_path_text"]] = {...data.mythictree[i]}
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
        },
        fetchPolicy: 'no-cache',
    });
    useSubscription(fileDataSubscription, {
        variables: {now: fromNow},
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
                    treeRootDataRef.current[currentGroups[j]][data.data.mythictree_stream[i]["host"]][data.data.mythictree_stream[i]["full_path_text"]] = {...data.data.mythictree_stream[i]};
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
    const [getFolderData] = useLazyQuery(folderQuery, {
        onError: (data) => {
            console.error(data);
        },
        fetchPolicy: 'no-cache',
        notifyOnNetworkStatusChange: true,
        onCompleted: (data) => {
            //console.log("getFolderData", data)
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
                    treeRootDataRef.current[currentGroups[j]][data.mythictree[i]["host"]][data.mythictree[i]["full_path_text"]] = {...data.mythictree[i]}
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
            //console.log("just set treeAdjMtx, about to close backdrop")
            setBackdropOpen(false);
            
        },
    });
    const onSetTableData = useCallback((nodeData) => {
        //console.log("setTableData", nodeData);
        setSelectedFolderData(nodeData);
    }, []);
    const fetchFolderData = useCallback((nodeData) => {
        getFolderData({
            variables: { parent_path_text: nodeData.full_path_text},
        });
        setBackdropOpen(true);
        tableOpenedPathIdRef.current = nodeData.id;
        setSelectedFolderData(nodeData);
    }, []);
    const localSelectedToken = React.useRef("");
    const onChangeSelectedToken = (token) => {
        localSelectedToken.current = token;
    }
    const onListFilesButton = ({ fullPath, callback_id, callback_display_id, token }) => {
        taskingData.current = ({
            "token": token,
            "parameters": {path: fullPath, full_path: fullPath, host: selectedFolderData.host, file: ""},
            "ui_feature": "file_browser:list", callback_id, callback_display_id});
        setOpenTaskingButton(true);
    };
    const onUploadFileButton = ({ fullPath, callback_id, callback_display_id, token }) => {
        taskingData.current = ({
            "token": token,
            "parameters": {path: fullPath, full_path: fullPath, host: selectedFolderData.host},
            "ui_feature": "file_browser:upload", "openDialog": true,
            callback_id, callback_display_id
        });
        setOpenTaskingButton(true);
    };
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
            "parameters": {path: nodeData.full_path_text, full_path: nodeData.full_path_text, host: selectedFolderData.host, file: ""},
            "ui_feature": "file_browser:list", callback_id, callback_display_id});
        setOpenTaskingButton(true);
    }
    return (
        <MythicTabPanel index={index} value={value}>
            <Split direction="horizontal" style={{width: "100%", height: "100%", display: "flex"}} sizes={[30, 70]} >
                <div className="bg-gray-base" style={{display: "inline-flex"}}>
                    <Backdrop open={backdropOpen} style={{zIndex: 2, position: "absolute"}} invisible={true}>
                        <CircularProgress color="inherit" />
                    </Backdrop>
                    <CallbacksTabsFileBrowserTree
                        tabInfo={tabInfo}
                        showDeletedFiles={showDeletedFiles}
                        treeRootData={treeRootDataRef.current}
                        treeAdjMatrix={treeAdjMtx}
                        fetchFolderData={fetchFolderData}
                        setTableData={onSetTableData}
                        taskListing={taskListing}
                        tableOpenedPathId={tableOpenedPathIdRef.current}
                    />

                </div>
                <div className="bg-gray-light" style={{display: "inline-flex"}}>
                    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                        <div style={{ flexGrow: 0 }}>
                            <FileBrowserTableTop
                                tabInfo={tabInfo}
                                onChangeSelectedToken={onChangeSelectedToken}
                                selectedFolderData={selectedFolderData}
                                onListFilesButton={onListFilesButton}
                                onUploadFileButton={onUploadFileButton}
                                toggleShowDeletedFiles={toggleShowDeletedFiles}
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
                                selectedFolderData={selectedFolderData}
                                onTaskRowAction={onTaskRowAction}
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
    onChangeSelectedToken,
    onListFilesButton,
    onUploadFileButton,
    toggleShowDeletedFiles,
    tabInfo
}) => {
    const [fullPath, setFullPath] = React.useState('');
    const selectedToken = React.useRef("Default Token");
    const [tokenOptions, setTokenOptions] = React.useState([]);
    const [placeHolder, setPlaceHolder] = React.useState(selectedFolderData.host);
    const [showDeletedFiles, setLocalShowDeletedFiles] = React.useState(false);
    const onChangePath = (_, value) => {
        setFullPath(value);
    };
    const changeSelectedToken = (token) => {
        onChangeSelectedToken(token);
        if(token === "Default Token"){
            selectedToken.current = "Default Token";
            return;
        }
        if(token.token_id !== selectedToken.current.token_id){
            selectedToken.current = token;
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
        if (selectedFolderData.full_path_text !== undefined) {
            setFullPath(selectedFolderData.full_path_text);
        }
        const groups = selectedFolderData?.callback?.mythictree_groups?.join(", ") || "";
        if(groups.length > 0 ){
            setPlaceHolder(selectedFolderData.host + " - " + groups);
        } else {
            setPlaceHolder(selectedFolderData.host + groups);
        }

    }, [selectedFolderData]);
    const onLocalListFilesButton = () => {
        if (fullPath === '') {
            snackActions.warning('Must provide a path to list');
            return;
        }
        onListFilesButton({ fullPath, token: selectedToken.current });
    };
    const onLocalUploadFileButton = () => {
        onUploadFileButton({ fullPath, token: selectedToken.current });
    };
    const onLocalToggleShowDeletedFiles = () => {
        setLocalShowDeletedFiles(!showDeletedFiles);
        toggleShowDeletedFiles(!showDeletedFiles);
    };
    return (
        <Grid container spacing={0} style={{ paddingTop: '10px' }}>
            <Grid item xs={12}>
                <MythicTextField
                    placeholder={selectedFolderData.host}
                    value={fullPath}
                    onEnter={onLocalListFilesButton}
                    onChange={onChangePath}
                    name={placeHolder}
                    InputProps={{
                        endAdornment: (
                            <React.Fragment>
                                <MythicStyledTooltip title={`Task current callback (${tabInfo["displayID"]}) to list contents`}>
                                    <IconButton style={{ padding: '3px' }} onClick={onLocalListFilesButton} size="large">
                                        <RefreshIcon color='info' />
                                    </IconButton>
                                </MythicStyledTooltip>
                                <MythicStyledTooltip title={`Upload file to folder via current callback (${tabInfo["displayID"]})`}>
                                    <IconButton style={{ padding: '3px' }} onClick={onLocalUploadFileButton} size="large">
                                        <CloudUploadIcon color="info" />
                                    </IconButton>
                                </MythicStyledTooltip>
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
                            <React.Fragment>
                                {tokenOptions.length > 0 ? (
                                    <CallbacksTabsTaskingInputTokenSelect options={tokenOptions} changeSelectedToken={changeSelectedToken}/>
                                ) : null}
                        </React.Fragment>),
                        style: { padding: 0 },
                    }}
                />
            </Grid>
        </Grid>
    );
};
