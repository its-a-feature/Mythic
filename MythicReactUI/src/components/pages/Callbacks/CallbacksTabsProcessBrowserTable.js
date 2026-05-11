import React, {useCallback, useMemo} from 'react';
import { IconButton } from "@mui/material";
import {useLazyQuery, gql, useMutation } from '@apollo/client';
import { MythicDialog, MythicViewJSONAsTableDialog, MythicModifyStringDialog } from '../../MythicComponents/MythicDialog';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ListIcon from '@mui/icons-material/List';
import { snackActions } from '../../utilities/Snackbar';
import 'react-virtualized/styles.css';
import MythicResizableGrid from '../../MythicComponents/MythicResizableGrid';
import {TagsDisplay, ViewEditTags} from '../../MythicComponents/MythicTag';
import TerminalIcon from '@mui/icons-material/Terminal';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FilterListIcon from '@mui/icons-material/FilterList';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import {Dropdown, DropdownMenuItem, DropdownNestedMenuItem} from "../../MythicComponents/MythicNestedMenus";
import {faSkullCrossbones, faSyringe, faKey,} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    GetComputedFontSize,
    GetMythicSetting,
    useSetMythicSetting
} from "../../MythicComponents/MythicSavedUserSetting";
import {CallbacksTableColumnsReorderDialog} from "./CallbacksTableColumnsReorderDialog";
import {
    GridColumnFilterDialog,
    getUpdatedGridFilterOptions,
    gridValuePassesFilter,
    isGridColumnFilterActive
} from "../../MythicComponents/MythicResizableGrid/GridColumnFilterDialog";

const getPermissionsDataQuery = gql`
    query getPermissionsQuery($mythictree_id: Int!) {
        mythictree_by_pk(id: $mythictree_id) {
            id
            metadata
        }
    }
`;
const updateFileComment = gql`
    mutation updateCommentMutation($mythictree_id: Int!, $comment: String!) {
        update_mythictree_by_pk(pk_columns: { id: $mythictree_id }, _set: { comment: $comment }) {
            comment
            id
        }
    }
`;
const ProcessMenuIcon = ({children, tone="neutral"}) => (
    <span className={`mythic-process-menu-icon mythic-process-menu-icon-${tone}`}>
        {children}
    </span>
);
const normalizeProcessSearchValue = (value) => {
    if(value === undefined || value === null){
        return "";
    }
    if(Array.isArray(value)){
        return value.map(normalizeProcessSearchValue).join(" ");
    }
    if(typeof value === "object"){
        return Object.values(value).map(normalizeProcessSearchValue).join(" ");
    }
    return `${value}`.toLowerCase();
};
const getProcessSearchText = (nodeData, rowData) => {
    const metadata = nodeData?.metadata || {};
    const callbacks = nodeData?.callbacks || [];
    return [
        nodeData?.name_text,
        nodeData?.comment,
        rowData?.name_text,
        metadata.process_id,
        metadata.parent_process_id,
        metadata.architecture,
        metadata.integrity_level,
        metadata.session_id,
        metadata.user,
        metadata.command_line,
        callbacks.map((callback) => callback?.id || callback?.display_id).join(" "),
    ].map(normalizeProcessSearchValue).join(" ");
};
const getProcessMetadata = (nodeData, key, fallback = "") => nodeData?.metadata?.[key] ?? fallback;
const getProcessIntegrity = (nodeData) => Number(getProcessMetadata(nodeData, "integrity_level", 0)) || 0;
const getProcessCallbackCount = (nodeData) => Array.isArray(nodeData?.callbacks) ? nodeData.callbacks.length : 0;
const getUniqueCallbackLabels = (nodeData) => {
    return [...new Set((nodeData?.callbacks || [])
        .map((callback) => callback?.display_id || callback?.id)
        .filter(Boolean)
        .map((callback) => `${callback}`))];
};
const processFilterMatchChecks = [
    {label: "name", value: (nodeData, rowData) => [nodeData?.name_text, rowData?.name_text]},
    {label: "pid", value: (nodeData) => getProcessMetadata(nodeData, "process_id")},
    {label: "ppid", value: (nodeData) => getProcessMetadata(nodeData, "parent_process_id")},
    {label: "user", value: (nodeData) => getProcessMetadata(nodeData, "user")},
    {label: "arch", value: (nodeData) => getProcessMetadata(nodeData, "architecture")},
    {label: "session", value: (nodeData) => getProcessMetadata(nodeData, "session_id")},
    {label: "integrity", value: (nodeData) => getProcessMetadata(nodeData, "integrity_level")},
    {label: "cmd", value: (nodeData) => getProcessMetadata(nodeData, "command_line")},
    {label: "comment", value: (nodeData) => nodeData?.comment},
    {label: "callback", value: (nodeData) => getUniqueCallbackLabels(nodeData)},
];
const getProcessQuickFilterMatches = (nodeData, rowData, normalizedQuickFilter) => {
    if(normalizedQuickFilter === "" || !nodeData){
        return [];
    }
    return processFilterMatchChecks.reduce((matches, check) => {
        const values = normalizeProcessSearchValue(check.value(nodeData, rowData));
        return values.includes(normalizedQuickFilter) ? [...matches, check.label] : matches;
    }, []);
};
const buildProcessRowMenuOptions = async ({
    rowData,
    treeRootData,
    host,
    viewSingleTreeData,
    onToggleSingleTreeView,
    tabInfo,
    getLoadedCommandForUIFeature,
    onTaskRowAction,
    onViewDetailedData,
    onEditComment,
}) => {
    const currentNodeData = treeRootData?.[host]?.[rowData?.full_path_text];
    if(rowData?.root || !currentNodeData?.id){
        return [];
    }
    const optionsA = [
        {
            name: 'View Detailed Data',
            icon: <ProcessMenuIcon><VisibilityIcon fontSize="small" /></ProcessMenuIcon>,
            type: "item",
            disabled: false,
            click: ({event}) => {
                event.stopPropagation();
                onViewDetailedData(rowData);
            }
        },
        {
            name: 'Edit Comment',
            type: "item",
            disabled: false,
            icon: <ProcessMenuIcon><EditIcon fontSize="small" /></ProcessMenuIcon>,
            click: ({event}) => {
                event.stopPropagation();
                onEditComment(rowData);
            },
        },
        {
            name: viewSingleTreeData ? "Stop Single Tree View" : "View Just This Process Tree",
            icon: viewSingleTreeData ?
                <ProcessMenuIcon tone="warning"><VisibilityOffIcon fontSize="small" /></ProcessMenuIcon> :
                <ProcessMenuIcon tone="success"><AccountTreeIcon fontSize="small" /></ProcessMenuIcon>,
            type: "item",
            disabled: false,
            click: ({event}) => {
                event.stopPropagation();
                onToggleSingleTreeView(rowData);
            }
        }
    ];
    async function optionsB(callback_id, callback_display_id){
        const injectCommand = await getLoadedCommandForUIFeature(callback_id, "process_browser:inject");
        let injectDisplay = "Task Inject unavailable: process_browser:inject";
        if(injectCommand !== undefined){
            injectDisplay = `Task Inject (${injectCommand.command.cmd})`
        }
        const tokenListCommand = await getLoadedCommandForUIFeature(callback_id, "process_browser:list_tokens");
        let tokenListDisplay = "Task Token Listing unavailable: process_browser:list_tokens";
        if(tokenListCommand !== undefined){
            tokenListDisplay = `Task Token Listing (${tokenListCommand.command.cmd})`
        }
        const stealTokenCommand = await getLoadedCommandForUIFeature(callback_id, "process_browser:steal_token");
        let stealTokenDisplay = "Task Steal Token unavailable: process_browser:steal_token";
        if(stealTokenCommand !== undefined){
            stealTokenDisplay = `Task Steal Token (${stealTokenCommand.command.cmd})`
        }
        const killProcessCommand = await getLoadedCommandForUIFeature(callback_id, "process_browser:kill");
        let killProcessDisplay = "Task Kill Process unavailable: process_browser:kill";
        if(killProcessCommand !== undefined){
            killProcessDisplay = `Task Kill Process (${killProcessCommand.command.cmd})`
        }
        return [
            {
                name: injectDisplay,
                icon: <ProcessMenuIcon tone="warning"><FontAwesomeIcon icon={faSyringe} /></ProcessMenuIcon>,
                type: "item",
                disabled: injectCommand === undefined,
                click: ({event}) => {
                    event.stopPropagation();
                    onTaskRowAction({
                        process_id: currentNodeData.metadata.process_id,
                        architecture: currentNodeData.metadata.architecture,
                        uifeature: "process_browser:inject",
                        callback_id,
                        display_id: callback_display_id
                    });
                }
            },
            {
                name: tokenListDisplay,
                icon: <ProcessMenuIcon tone="warning"><ListIcon fontSize="small" /></ProcessMenuIcon>,
                type: "item",
                disabled: tokenListCommand === undefined,
                click: ({event}) => {
                    event.stopPropagation();
                    onTaskRowAction({
                        process_id: currentNodeData.metadata.process_id,
                        architecture: currentNodeData.metadata.architecture,
                        uifeature: "process_browser:list_tokens",
                        callback_id,
                        display_id: callback_display_id
                    });
                },
                os: ["Windows"]
            },
            {
                name: stealTokenDisplay,
                icon: <ProcessMenuIcon tone="error"><FontAwesomeIcon icon={faKey} /></ProcessMenuIcon>,
                type: "item",
                disabled: stealTokenCommand === undefined,
                click: ({event}) => {
                    event.stopPropagation();
                    onTaskRowAction({
                        process_id: currentNodeData.metadata.process_id,
                        architecture: currentNodeData.metadata.architecture,
                        uifeature: "process_browser:steal_token",
                        callback_id,
                        display_id: callback_display_id
                    });
                },
                os: ["Windows"]},
            {
                name: killProcessDisplay,
                icon: <ProcessMenuIcon tone="error"><FontAwesomeIcon icon={faSkullCrossbones} /></ProcessMenuIcon>,
                type: "item",
                disabled: killProcessCommand === undefined,
                click: ({event}) => {
                    event.stopPropagation();
                    onTaskRowAction({
                        process_id: currentNodeData.metadata.process_id,
                        architecture: currentNodeData.metadata.architecture,
                        uifeature: "process_browser:kill",
                        confirm_dialog: true,
                        callback_id,
                        display_id: callback_display_id
                    });
                }
            },
        ];
    }
    let options = [...optionsA];
    options.push(...(await optionsB(tabInfo["callbackID"], tabInfo["displayID"])));
    if(currentNodeData?.callback?.id !== undefined && currentNodeData.callback.id !== tabInfo["callbackID"]){
        options.push({
            name: `Original Callback: ${currentNodeData.callback.id}`,
            icon: null,
            click: () => {},
            type: "menu",
            menuItems: [
                ...(await optionsB(currentNodeData.callback.id, currentNodeData.callback.display_id))
            ]
        })
    }
    return options;
};
const columnDefaults = [
    { name: 'Info', width: 50, disableAutosize: true, disableSort: true, disableFilterMenu: true, key: "info", visible: true },
    { name: 'PID', type: 'number', key: 'process_id', inMetadata: true, width: 100, visible: true},
    { name: 'PPID', type: 'number', key: 'parent_process_id', inMetadata: true, width: 100, visible: true},
    { name: 'Name', type: 'string', disableSort: false, key: 'name_text', fillWidth: true, visible: true },
    { name: "Arch", type: 'string', key: 'architecture', inMetadata: true, width: 70, visible: true},
    { name: "Integrity", type: "number", key: "integrity_level", inMetadata: true, width: 100, visible: false },
    { name: 'Session', type: 'number', key: 'session_id', inMetadata: true, width: 100, visible: true},
    { name: "User", type: 'string', key: 'user', inMetadata: true, fillWidth: true, visible: true},
    { name: 'Tags', type: 'tags', disableSort: true, disableFilterMenu: true, width: 220, key: "tags", visible: false },
    { name: 'Comment', type: 'string', key: 'comment', disableSort: false, width: 200, visible: false },
    { name: "CMD", type: "string", key: 'command_line', inMetadata: true, fillWidth: true, visible: true},
];
const defaultVisibleColumns = ["Info","PID", "PPID", "Name",  "Arch", "Session", "User", "CMD"];
export const CallbacksTabsProcessBrowserTable = ({treeAdjMatrix, treeRootData, me, onRowDoubleClick,
                                                     onTaskRowAction, host, group, showDeletedFiles, tabInfo,
                                                     expandOrCollapseAll, getLoadedCommandForUIFeature, quickFilter = ""}) => {
    //const [allData, setAllData] = React.useState([]);
    //console.log("treeAdjMatrix updated in table", treeAdjMatrix)
    const [updateSetting, updateSettings] = useSetMythicSetting();
    const [loading, setLoading] = React.useState(true);
    const [sortData, setSortData] = React.useState({"sortKey": null, "sortDirection": null, "sortType": null});
    const [openNodes, setOpenNodes] = React.useState({});
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const [filterOptions, setFilterOptions] = React.useState({});
    const selectedColumn = React.useRef({});
    const [columnVisibility, setColumnVisibility] = React.useState({
        "visible": defaultVisibleColumns,
        "hidden": [ "Comment", "Tags" ]
    })
    const [singleTreeData, setSingleTreeData] = React.useState({});
    const [viewSingleTreeData, setViewSingleTreeData] = React.useState(false);
    const [openReorderDialog, setOpenReorderDialog] = React.useState(false);
    const [columnOrder, setColumnOrder] = React.useState(columnDefaults);
    const [updatedTreeAdjMatrix, setUpdatedTreeAdjMatrix] = React.useState(treeAdjMatrix);
    const [selectedProcessPath, setSelectedProcessPath] = React.useState("");
    const [viewPermissionsDialogOpen, setViewPermissionsDialogOpen] = React.useState(false);
    const [permissionData, setPermissionData] = React.useState({});
    const [fileCommentDialogOpen, setFileCommentDialogOpen] = React.useState(false);
    const commentDataRef = React.useRef({id: 0, value: ""});
    const permissionRowDataRef = React.useRef({});
    const normalizedQuickFilter = React.useMemo(() => quickFilter.trim().toLowerCase(), [quickFilter]);
    const [getPermissions] = useLazyQuery(getPermissionsDataQuery, {
        onCompleted: (data) => {
            const rowData = permissionRowDataRef.current || {};
            setPermissionData({
                ...data.mythictree_by_pk.metadata,
                callback_id: rowData.callback_id || rowData.callback?.id || tabInfo["callbackID"],
                callback_display_id: rowData.callback_display_id || rowData.callback?.display_id || tabInfo["displayID"],
                callbacks: rowData.callbacks || []
            });
            setViewPermissionsDialogOpen(true);
        },
        onError: (data) => {
          console.log("get permissions error", data);
        },
        fetchPolicy: "network-only"
    });
    const [updateComment] = useMutation(updateFileComment, {
        onCompleted: () => {
            snackActions.success('updated comment');
        },
    });
    const openAllNodes = (state) => {
        let onodes = {};
        for(const [group, hosts] of Object.entries(updatedTreeAdjMatrix)){
            for(const [host, matrix] of Object.entries(hosts)){
                for(const [key, children] of Object.entries(matrix)){
                    onodes[key] = state;
                }
            }
        }
        setOpenNodes(onodes);
    }
    React.useEffect( () => {
        // need to update the matrix in case there are nodes that don't trace back to root
        let adjustedMatrix = {};
        // check for cycles
        let tempMatrix = {...treeAdjMatrix};
        for(const[group, groupMatrix] of Object.entries(tempMatrix)){
            for(const[host, hostMatrix] of Object.entries(tempMatrix[group])){
                for(const[key, val] of Object.entries(tempMatrix[group][host])){
                    for(const[key2, val2] of Object.entries(tempMatrix[group][host])){
                        if(val2[key] !== undefined && val[key2] !== undefined){
                            let tmp = {...val2};
                            delete tmp[key];
                            tempMatrix[group][host][key2] = tmp;
                        }
                    }
                }
            }
        }
        //console.log("treeAdjMatrix updated", treeAdjMatrix)
        for(const [group, hosts] of Object.entries(tempMatrix)){
            if(adjustedMatrix[group] === undefined){adjustedMatrix[group] = {}}
            for(const [host, matrix] of Object.entries(hosts)){
                // looping through the hosts to adjust their entries
                if( adjustedMatrix[group][host] === undefined){adjustedMatrix[group][host] = {}}
                for(const [key, children] of Object.entries(matrix)){
                    // if key !== "", if key is in another entry, leave it. if it's not anywhere else, add it to ""
                    // key is the parent and children are all the child processes
                    if(adjustedMatrix[group][host][key] === undefined){adjustedMatrix[group][host][key] = children}
                    if(key === ""){
                        // add all the children automatically
                        for(const [i, v] of Object.entries(children)){
                            adjustedMatrix[group][host][key][i] = v
                        }
                    } else {
                        // check if key  is in children anywhere, if not, add it to adjustedMatrix[host][""][key] = 1
                        let found = false;
                        for(const [keySearch, childrenSearch] of Object.entries(matrix)){
                            if(childrenSearch.hasOwnProperty(key)){
                                found=true;
                            }
                            //for(const [i, v] of Object.entries(childrenSearch)){
                            //    if(i === key){found=true}
                            //}
                        }
                        if(!found){
                            if(adjustedMatrix[group][host][""] === undefined){adjustedMatrix[group][host][""] = {}}
                            adjustedMatrix[group][host][""][key] = 1;
                        }
                    }
                }
                // check for loops in our adjusted matrix
                for(const [key, _] of Object.entries(adjustedMatrix[group][host])){
                    // key == 540
                    // does anything have 540 has a child? 760 does - 760 is visited
                    // does anything have 760 as a child? 676 does
                    // does anything have 676 as a child? 540 does - X loop detected
                    // let badKey = checkLoop(540, adjustedMatrix[group][host], [540]);
                    let removeKey = checkLoop(adjustedMatrix[group][host], [key]);
                    if(adjustedMatrix[group][host][removeKey]){
                        delete adjustedMatrix[group][host][removeKey][key];
                        adjustedMatrix[group][host][""][key] = 1;
                    }
                }
            }
        }

        setUpdatedTreeAdjMatrix(adjustedMatrix);
    }, [treeAdjMatrix]);
    const checkLoop = (nodes, visited) => {
        let found = false;
        let checkingKey = visited[visited.length-1]; // the latest thing we've seen
        for(const [testKey, testNodes] of Object.entries(nodes)){
            if(testNodes.hasOwnProperty(checkingKey)){
                // we found a new node that has the last node we saw as a child
                found = true;
                //console.log("found", testNodes, "has", checkingKey, "visited", visited, "testKey", testKey)
                if(visited.includes(testKey)){
                    // we found a loop
                    //console.log("found loop", visited, testKey)
                    return true;
                }
                visited.push(testKey);
                if(checkLoop(nodes, visited)){
                    return visited.pop()
                }
            }
        }
        if(!found){
            //console.log("didn't find", checkingKey, "in any edges")
        } else {
            //console.log("found nested, but no loop with", checkingKey)
        }
        return false;
    }
    React.useEffect( () => {
        openAllNodes(true);
        setViewSingleTreeData(false);
        setSelectedProcessPath("");
    }, [host, group])
    React.useEffect( () => {
        if(normalizedQuickFilter !== ""){
            openAllNodes(true);
        }
    }, [normalizedQuickFilter, updatedTreeAdjMatrix]);
    const onExpandNode = (nodeId) => {
        setOpenNodes({
          ...openNodes,
          [nodeId]: true
        });
      };
    const onCollapseNode = (nodeId) => {
        setOpenNodes({
          ...openNodes,
          [nodeId]: false
        });
      };
    const handleOnClickButton = (nodeId) => {
        //console.log("handleOnClickButton", "nodeId", nodeId, "openNodes", openNodes)
        //if(openNodes[nodeId] !== undefined){
            if (openNodes[nodeId]) {
                onCollapseNode(nodeId);
            } else {
                onExpandNode(nodeId);
            }
       // }
        
    };

    const columns = React.useMemo(
        () =>
            columnOrder.reduce( (prev, cur) => {
                if(columnVisibility.visible.includes(cur.name)){
                    if(isGridColumnFilterActive(filterOptions[cur.key])){
                        return [...prev, {...cur, filtered: true}];
                    }else{
                        return [...prev, {...cur}];
                    }
                }else{
                    return [...prev];
                }
            }, [])
        , [filterOptions, columnVisibility, columnOrder]
    );
    const flattenNode = useCallback(
        (node, host, group, depth = 0) => {
            let treeToUse = updatedTreeAdjMatrix;
            if(viewSingleTreeData){
                treeToUse = singleTreeData;
            }
          if(depth === 0){
            return [
              {
                id: treeRootData[group][host][node]?.id || node,
                name: treeRootData[group][host][node]?.full_path_text || node,
                full_path_text: treeRootData[group][host][node]?.full_path_text || node,
                name_text: treeRootData[group][host][node]?.name_text || node,
                deleted: treeRootData[group][host][node]?.deleted || true,
                depth,
                isLeaf: Object.keys(treeToUse[group]?.[host]?.[node] || {}).length === 0,
                can_have_children: treeRootData[group][host][node]?.can_have_children || true,
                isOpen: true,
                children: (treeToUse[group]?.[host]?.[node] || {}),
                host,
                group,
                root: true
              },
              ...(Object.keys(treeToUse[group]?.[host]?.[node] || {})).reduce( (prev, cur) => {
                if(!(treeRootData[group][host][cur]?.can_have_children || true)){return [...prev]}
                return [...prev, flattenNode(cur, host, group, depth+1)];
            }, []).flat()
            ];
          }
          //console.log("openNodes", openNodes, "node", node, "nodeid", treeRootData[host][node])
          //if (openNodes[treeRootData[host][node]?.id] === true) {
            if(openNodes[node] === true){
            return [
              {
                id: treeRootData[group][host][node]?.id || node ,
                name: treeRootData[group][host][node]?.full_path_text || node + " - " + treeRootData[group][host][node]?.name_text || "UNKNOWN",
                full_path_text: treeRootData[group][host][node]?.full_path_text || node,
                name_text: treeRootData[group][host][node]?.name_text || node,
                deleted: treeRootData[group][host][node]?.deleted || true,
                depth,
                isLeaf: Object.keys(treeToUse[group][host]?.[node] || {}).length === 0,
                can_have_children: treeRootData[group][host]?.[node]?.can_have_children || true,
                isOpen: true,
                children: (treeToUse[group][host]?.[node] || {}),
                host,
                group,
                root: false,
              },
              ...(Object.keys(treeToUse[group]?.[host]?.[node] || {})).reduce( (prev, cur) => {
                if(!(treeRootData[group][host][cur]?.can_have_children || true)){return [...prev]}
                return [...prev, flattenNode(cur, host, group, depth+1)];
            }, []).flat()
            ];
          }
          return [
            {
              id: treeRootData[group][host][node]?.id || node,
              name: treeRootData[group][host][node]?.full_path_text || node  + " - " + treeRootData[group][host][node]?.name_text || "UNKNOWN",
              full_path_text: treeRootData[group][host][node]?.full_path_text || node,
              name_text: treeRootData[group][host][node]?.name_text || node,
              deleted: treeRootData[group][host][node]?.deleted || true,
              depth,
              isLeaf: Object.keys(treeToUse[group]?.[host]?.[node] || {}).length === 0,
              can_have_children: treeRootData[group][host][node]?.can_have_children || true,
              isOpen: false,
              children: (treeToUse[group]?.[host]?.[node] || {}),
              host,
              group,
              root: false,
            }
          ];
         
        },
        [openNodes, updatedTreeAdjMatrix, singleTreeData, viewSingleTreeData] // eslint-disable-line react-hooks/exhaustive-deps
    );
    const allData = useMemo(() => {
        // need to return an array
        let finalData = [];
        let treeToUse = updatedTreeAdjMatrix;
        if(viewSingleTreeData){
            treeToUse = singleTreeData;
        }
        //console.log("in useMemo", updatedTreeAdjMatrix, "host", host)
        if(host === "" || treeToUse[group]?.[host] === undefined){return finalData}
        finalData.push({
        id: host,
        name: host,
        depth: 0,
        isLeaf: false,
        isOpen: true,
        can_have_children: true,
        host,
        group,
        root: true,
        deleted: false,
        success: true,
        children: treeToUse[group][host][""],
        full_path_text: host,
        });
        finalData.push(...Object.keys(treeToUse[group][host][""] === undefined ? {} : treeToUse[group][host][""]).map(c => flattenNode(c, host, group, 1)).flat())
        return finalData;
    },[flattenNode, treeRootData, host, group, updatedTreeAdjMatrix, openNodes, singleTreeData, viewSingleTreeData],
    );
    const sortedData = React.useMemo(() => {
        if (sortData.sortKey === null || sortData.sortType === null) {
            return allData;
        }
        let tempData = [...allData];

        if (sortData.sortType === 'number' || sortData.sortType === 'size' || sortData.sortType === 'date') {
            tempData.sort((a, b) => {
                if(a.root){
                    if(b.root){return 0}
                    return 1
                }
                else if(b.root){return -1}
                else if(sortData.inMetadata){
                    let aData = parseInt(treeRootData[group][host][a.full_path_text /*+ uniqueSplitString + a.callback_id*/]?.metadata[sortData.sortKey] || a.full_path_text);
                    let bData = parseInt(treeRootData[group][host][b.full_path_text /*+ uniqueSplitString + b.callback_id*/]?.metadata[sortData.sortKey] || b.full_path_text);
                    return aData > bData ? 1 : bData > aData ? -1 : 0;
                } else {
                    let aData = parseInt(treeRootData[group][host][a.full_path_text /*+ uniqueSplitString + a.callback_id*/][sortData.sortKey]);
                    let bData = parseInt(treeRootData[group][host][b.full_path_text /*+ uniqueSplitString + b.callback_id*/][sortData.sortKey]);
                    return aData > bData ? 1 : bData > aData ? -1 : 0;
                }
                
            });
        } else if (sortData.sortType === 'string') {
            tempData.sort((a, b) => {
                //console.log(treeRootData[host][a.full_path_text], treeRootData[host][b.full_path_text])
                if(treeRootData[group][host][a.full_path_text /*+ uniqueSplitString + a.callback_id*/] === undefined){
                    if(treeRootData[group][host][b.full_path_text /*+ uniqueSplitString + b.callback_id*/] === undefined){
                        return 0;
                    }
                    return -1;
                }
                if(treeRootData[group][host][b.full_path_text /*+ uniqueSplitString + b.callback_id*/] === undefined){
                    return 1
                }
                let aData = treeRootData[group][host][a.full_path_text /*+ uniqueSplitString + a.callback_id*/][sortData.sortKey];
                let bData = treeRootData[group][host][b.full_path_text /*+ uniqueSplitString + b.callback_id*/][sortData.sortKey];
                if(sortData.inMetadata){
                    aData = treeRootData[group][host][a.full_path_text /*+ uniqueSplitString + a.callback_id*/]?.metadata[sortData.sortKey];
                    bData = treeRootData[group][host][b.full_path_text /*+ uniqueSplitString + b.callback_id*/]?.metadata[sortData.sortKey];
                }
                if(aData === undefined){
                    if(bData === undefined){
                        return 0;
                    }
                    return -1
                }
                if(bData === undefined){
                    return 1
                }
                aData = aData.toLowerCase();
                bData = bData.toLowerCase();
                //console.log(aData, bData)
                return aData > bData ? 1 : bData > aData ? -1 : 0
            });
        }
        if (sortData.sortDirection === 'DESC') {
            tempData.reverse();
        }
        return tempData;
    }, [allData, sortData]);
    const quickFilterMatchInfo = React.useMemo(() => {
        const keepPaths = new Set();
        const directMatches = {};
        if(normalizedQuickFilter === "" || !treeRootData[group]?.[host]){
            return {keepPaths, directMatches};
        }
        for(const [path, nodeData] of Object.entries(treeRootData[group][host])){
            if(!showDeletedFiles && nodeData?.deleted){
                continue;
            }
            const matchLabels = getProcessQuickFilterMatches(nodeData, {full_path_text: path}, normalizedQuickFilter);
            if(matchLabels.length === 0 && !getProcessSearchText(nodeData, {full_path_text: path}).includes(normalizedQuickFilter)){
                continue;
            }
            directMatches[path] = matchLabels.length > 0 ? matchLabels : ["metadata"];
            let currentPath = path;
            let guard = 0;
            while(currentPath && guard < 5000){
                keepPaths.add(currentPath);
                currentPath = treeRootData[group][host]?.[currentPath]?.parent_path_text || "";
                guard += 1;
            }
        }
        return {keepPaths, directMatches};
    }, [group, host, normalizedQuickFilter, showDeletedFiles, treeRootData, updatedTreeAdjMatrix]);
    const onSubmitFilterOptions = (value) => {
        const nextFilterOptions = getUpdatedGridFilterOptions(filterOptions, selectedColumn.current?.key, value);
        setFilterOptions(nextFilterOptions);
        try{
            updateSetting({setting_name: `process_browser_filter_options`, value: nextFilterOptions, broadcast: false});
        }catch(error){
            console.log("failed to save filter options");
        }
        if(viewSingleTreeData){
            return
        }
        openAllNodes(true);
    }
    const filterRow = React.useCallback((rowData) => {
        if(rowData.root){return true}
        if(!showDeletedFiles &&
            treeRootData[group][host][rowData.full_path_text] !== undefined &&
            treeRootData[group][host][rowData.full_path_text ].deleted){
            return true;
        }
        if(normalizedQuickFilter !== "" && !quickFilterMatchInfo.keepPaths.has(rowData.full_path_text)){
            return true;
        }
        let filterOptionInMetadata = {}
        for(const [key, value] of Object.entries(filterOptions)){
            for(let i = 0; i < columnDefaults.length; i++){
                if(columnDefaults[i].key === key){
                    filterOptionInMetadata[key] = columnDefaults[i].inMetadata
                }
            }
        }
        for(const [key,value] of Object.entries(filterOptions)){
            if(treeRootData[group][host][rowData.full_path_text] === undefined){return true}
            if(filterOptionInMetadata[key]){
                if(!gridValuePassesFilter(treeRootData[group][host][rowData.full_path_text ]?.metadata[key], value)){
                    return true;
                }
            }else{
                if(!gridValuePassesFilter(treeRootData[group][host][rowData.full_path_text][key], value)){
                    return true;
                }
            }
        }
        return false;
    }, [filterOptions, group, host, normalizedQuickFilter, quickFilterMatchInfo, showDeletedFiles, treeRootData]);
    const buildSingleTreeData = React.useCallback((treeElement) => {
        const targetHost = treeElement?.host || host;
        const targetPath = treeElement?.full_path_text;
        const hostMatrix = updatedTreeAdjMatrix[group]?.[targetHost] || {};
        const hostTreeData = treeRootData[group]?.[targetHost] || {};
        const singleTreeAdjMatrix = {[group]: {[targetHost]: {"": {}}}};
        if(!targetPath || !hostTreeData[targetPath]){
            return singleTreeAdjMatrix;
        }

        let topVisiblePath = targetPath;
        let childPath = targetPath;
        let parentPath = hostTreeData[targetPath]?.parent_path_text || "";
        let guard = 0;
        while(parentPath && hostMatrix[parentPath] !== undefined && guard < 5000){
            singleTreeAdjMatrix[group][targetHost][parentPath] = {[childPath]: 1};
            topVisiblePath = parentPath;
            childPath = parentPath;
            parentPath = hostTreeData[parentPath]?.parent_path_text || "";
            guard += 1;
        }
        singleTreeAdjMatrix[group][targetHost][""] = {[topVisiblePath]: 1};

        const leftToProcess = [targetPath];
        const processedNodes = new Set();
        while(leftToProcess.length > 0){
            const nextPath = leftToProcess.shift();
            if(processedNodes.has(nextPath)){
                continue;
            }
            processedNodes.add(nextPath);
            const children = hostMatrix[nextPath] || {};
            singleTreeAdjMatrix[group][targetHost][nextPath] = children;
            leftToProcess.push(...Object.keys(children));
        }
        return singleTreeAdjMatrix;
    }, [group, host, treeRootData, updatedTreeAdjMatrix]);
    const showSingleTree = React.useCallback((treeElement) => {
        setSingleTreeData(buildSingleTreeData(treeElement));
        setViewSingleTreeData(true);
    }, [buildSingleTreeData]);
    const stopSingleTree = React.useCallback(() => {
        setViewSingleTreeData(false);
    }, []);
    const onToggleSingleTreeView = React.useCallback((treeElement) => {
        if(viewSingleTreeData){
            stopSingleTree();
            return;
        }
        showSingleTree(treeElement);
    }, [showSingleTree, stopSingleTree, viewSingleTreeData]);
    const getNodeDataForRow = React.useCallback((rowData) => {
        return treeRootData[group]?.[host]?.[rowData?.full_path_text];
    }, [group, host, treeRootData]);
    const onViewDetailedData = React.useCallback((rowData) => {
        const nodeData = getNodeDataForRow(rowData);
        if(!nodeData?.id){
            return;
        }
        permissionRowDataRef.current = {
            ...rowData,
            callback: nodeData.callback,
            callbacks: nodeData.callbacks || [],
        };
        getPermissions({variables: {mythictree_id: nodeData.id}});
    }, [getNodeDataForRow, getPermissions]);
    const onEditComment = React.useCallback((rowData) => {
        const nodeData = getNodeDataForRow(rowData);
        if(!nodeData?.id){
            return;
        }
        commentDataRef.current = {
            id: nodeData.id,
            value: nodeData.comment || rowData.comment || ""
        };
        setFileCommentDialogOpen(true);
    }, [getNodeDataForRow]);
    const onSubmitUpdatedComment = (comment) => {
        if(!commentDataRef.current?.id){
            snackActions.warning("No process selected for comment update");
            return;
        }
        updateComment({ variables: { mythictree_id: commentDataRef.current.id, comment } });
    };
    const getProcessRowMenuOptions = React.useCallback((rowData) => {
        return buildProcessRowMenuOptions({
            rowData,
            treeRootData: treeRootData[group],
            host,
            viewSingleTreeData,
            onToggleSingleTreeView,
            tabInfo,
            getLoadedCommandForUIFeature,
            onTaskRowAction,
            onViewDetailedData,
            onEditComment,
        });
    }, [getLoadedCommandForUIFeature, group, host, onEditComment, onTaskRowAction, onViewDetailedData,
        onToggleSingleTreeView, tabInfo, treeRootData, viewSingleTreeData]);
    const visibleRows = React.useMemo(() => {
        return sortedData.filter((row) => !filterRow(row));
    }, [filterRow, sortedData]);
    const selectedNodeData = selectedProcessPath ? treeRootData[group]?.[host]?.[selectedProcessPath] : undefined;
    const selectedRowData = React.useMemo(() => {
        if(!selectedNodeData){
            return undefined;
        }
        const visibleRow = visibleRows.find((row) => row.full_path_text === selectedProcessPath);
        return visibleRow || {
            id: selectedNodeData.id,
            full_path_text: selectedNodeData.full_path_text,
            name_text: selectedNodeData.name_text,
            host,
            group,
            root: false,
        };
    }, [group, host, selectedNodeData, selectedProcessPath, visibleRows]);
    const processSummary = React.useMemo(() => {
        const hostNodes = Object.values(treeRootData[group]?.[host] || {});
        const activeNodes = hostNodes.filter((node) => showDeletedFiles || !node?.deleted);
        const visibleNodeData = visibleRows
            .map((row) => treeRootData[group]?.[host]?.[row.full_path_text])
            .filter(Boolean);
        const uniqueUsers = new Set(visibleNodeData.map((node) => getProcessMetadata(node, "user", "")).filter(Boolean));
        return {
            total: activeNodes.length,
            visible: visibleRows.length,
            elevated: visibleNodeData.filter((node) => getProcessIntegrity(node) > 3).length,
            deleted: hostNodes.filter((node) => node?.deleted).length,
            users: uniqueUsers.size,
            quickFiltered: normalizedQuickFilter !== "",
            columnFiltered: Object.keys(filterOptions).length > 0,
            filtered: normalizedQuickFilter !== "" || Object.keys(filterOptions).length > 0,
            singleTree: viewSingleTreeData,
        };
    }, [filterOptions, group, host, normalizedQuickFilter, showDeletedFiles, treeRootData, viewSingleTreeData, visibleRows]);
    const gridData = React.useMemo(
        () =>
            visibleRows.reduce((prev, row) => { 
                    const filterMatchLabels = quickFilterMatchInfo.directMatches[row.full_path_text] || [];
                    const filterAncestor = normalizedQuickFilter !== "" &&
                        quickFilterMatchInfo.keepPaths.has(row.full_path_text) &&
                        filterMatchLabels.length === 0;
                    const renderedRow = {
                        ...row,
                        selected: row.full_path_text === selectedProcessPath,
                        filterMatchLabels,
                        filterAncestor,
                        rowClassName: [
                            filterMatchLabels.length > 0 ? "mythic-process-filter-match-row" : "",
                            filterAncestor ? "mythic-process-filter-ancestor-row" : "",
                        ].filter(Boolean).join(" ")
                    };
                    return [...prev, columns.map( c => {
                        switch(c.name){
                            case "Info":
                                return  <FileBrowserTableRowActionCell 
                                            treeRootData={treeRootData[group]}
                                            host={host}
                                            rowData={renderedRow}
                                            getProcessRowMenuOptions={getProcessRowMenuOptions} />;
                            case "Name":
                                return <FileBrowserTableRowNameCell 
                                            treeRootData={treeRootData[group]}
                                            host={host}
                                            group={group}
                                            children={updatedTreeAdjMatrix[group][host]?.[renderedRow.full_path_text ]}
                                            handleOnClickButton={handleOnClickButton}
                                            rowData={renderedRow} />;
                            case "User":
                                return <FileBrowserTableRowStringCell
                                    treeRootData={treeRootData[group]}
                                    host={host}
                                    group={group}
                                    cellData={treeRootData[group][host][renderedRow.full_path_text]?.metadata?.user ?? ''}
                                    rowData={renderedRow} />;
                            case "Arch":
                                return <FileBrowserTableRowStringCell
                                    treeRootData={treeRootData[group]}
                                    host={host}
                                    group={group}
                                    cellData={treeRootData[group][host][renderedRow.full_path_text]?.metadata?.architecture ?? ''}
                                    rowData={renderedRow} />;
                            case "Session":
                                return <FileBrowserTableRowStringCell
                                    treeRootData={treeRootData[group]}
                                    host={host}
                                    group={group}
                                    cellData={treeRootData[group][host][renderedRow.full_path_text ]?.metadata?.session_id ?? ''}
                                    rowData={renderedRow} />;
                            case "PID":
                                return <FileBrowserTableRowStringCell 
                                            treeRootData={treeRootData[group]}
                                            host={host}
                                            group={group}
                                            rowData={renderedRow} 
                                            cellData={renderedRow.full_path_text} />;
                            case "PPID":
                                return <FileBrowserTableRowStringCell 
                                            treeRootData={treeRootData[group]}
                                            host={host}
                                            group={group}
                                            rowData={renderedRow} 
                                            cellData={treeRootData[group][host][renderedRow.full_path_text]?.parent_path_text ?? ""} />;
                            case "Integrity":
                                return <FileBrowserTableRowStringCell
                                    treeRootData={treeRootData[group]}
                                    host={host}
                                    group={group}
                                    rowData={renderedRow}
                                    cellData={treeRootData[group][host][renderedRow.full_path_text ]?.metadata?.integrity_level ?? ''} />;
                            case "Tags":
                                return <FileBrowserTagsCell 
                                            rowData={renderedRow} 
                                            treeRootData={treeRootData[group]}
                                            host={host}
                                            group={group}
                                            me={me} />
                            case "Comment":
                                return <FileBrowserTableRowStringCell 
                                            treeRootData={treeRootData[group]}
                                            host={host} 
                                            rowData={renderedRow}
                                            group={group}
                                            cellData={treeRootData[group][host][renderedRow.full_path_text]?.comment ?? ""}
                                />;
                            case "CMD":
                                return <FileBrowserTableRowStringCell
                                    treeRootData={treeRootData[group]}
                                    host={host}
                                    rowData={renderedRow}
                                    group={group}
                                    cellData={treeRootData[group][host][renderedRow.full_path_text ]?.metadata?.command_line ?? ""}
                                />;
                            default:
                                console.log("hit default case in switch on c.name)", c.name)
                        }
                    })];
            }, []),
        [columns, getProcessRowMenuOptions, group, host, normalizedQuickFilter, quickFilterMatchInfo,
            selectedProcessPath, treeRootData, updatedTreeAdjMatrix, visibleRows]
    );
    const onClickHeader = (e, columnIndex) => {
        const column = columns[columnIndex];
        if(column.disableSort){
            return;
        }
        if (!column.key) {
            setSortData({"sortKey": null, "sortType":null, "sortDirection": "ASC", "inMetadata": false});
        }
        if (sortData.sortKey === column.key) {
            if (sortData.sortDirection === 'ASC') {
                setSortData({...sortData, "sortDirection": "DESC"});
            } else {
                setSortData({"sortKey": null, "sortType":null, "sortDirection": "ASC", "inMetadata": false});
            }
        } else {
            setSortData({"sortKey": column.key, "inMetadata": column.inMetadata, "sortType":column.type, "sortDirection": "ASC"});
        }
    };
    const localOnDoubleClick = (e, rowIndex) => {
        const row = visibleRows[rowIndex];
        if(!row){
            return;
        }
        const rowData = treeRootData[group][host][row["full_path_text"]];
        onRowDoubleClick(rowData);
    };
    const localOnRowClick = ({rowDataStatic}) => {
        if(rowDataStatic?.root || !rowDataStatic?.full_path_text){
            return;
        }
        if(treeRootData[group]?.[host]?.[rowDataStatic.full_path_text]){
            setSelectedProcessPath((current) => current === rowDataStatic.full_path_text ? "" : rowDataStatic.full_path_text);
        }
    };
    const onRowContextClick = React.useCallback(({rowDataStatic}) => {
        return getProcessRowMenuOptions(rowDataStatic);
    }, [getProcessRowMenuOptions]);
    const contextMenuOptions = [
        {
            name: 'Filter Column',
            type: "item",
            icon: <ProcessMenuIcon><FilterListIcon fontSize="small" /></ProcessMenuIcon>,
            click: ({event, columnIndex}) => {
                if(event){
                    event.stopPropagation();
                    event.preventDefault();
                }
                if(columns[columnIndex].disableFilterMenu){
                    snackActions.warning("Can't filter that column");
                    return;
                }
                selectedColumn.current = columns[columnIndex];
                setOpenContextMenu(true);
            }
        },
        {
            name: "Reorder Columns and Adjust Visibility",
            type: "item",
            icon: <ProcessMenuIcon><ViewColumnIcon fontSize="small" /></ProcessMenuIcon>,
            click: ({event, columnIndex}) => {
                if(event){
                    event.stopPropagation();
                    event.preventDefault();
                }
                if(columns[columnIndex].disableFilterMenu){
                    snackActions.warning("Can't filter that column");
                    return;
                }
                setOpenReorderDialog(true);
            }
        }
    ];
    React.useEffect( () => {
        try {
            const storageItem = GetMythicSetting({setting_name: `process_browser_table_columns`, default_value: defaultVisibleColumns});
            if(storageItem !== null){
                let allColumns = [...columnVisibility["visible"].map(c => c), ...columnVisibility["hidden"].map(c => c)];
                let newHidden = [];
                allColumns.forEach((v,i,a) => {
                    if(!storageItem.includes(v)){
                        newHidden.push(v);
                    }
                });
                if(storageItem.length !== 0){
                    setColumnVisibility({visible: storageItem, hidden: newHidden});
                }
            }
        }catch(error){
            console.log("Failed to load custom browser_table_columns", error);
        }
        try {
            const storageItemOptions = GetMythicSetting({setting_name: `process_browser_filter_options`, default_value: {}});
            if(storageItemOptions !== null){
                setFilterOptions(storageItemOptions);
            }
        }catch(error){
            console.log("Failed to load custom browser_table_filter_options", error);
        }
        try {
            const storageColumnOrder = GetMythicSetting({setting_name: `process_browser_column_order`, default_value: columns.map(c => c.name)});
            if(storageColumnOrder !== null){
                let newOrder = [];
                for(let i = 0; i < storageColumnOrder.length; i++){
                    for(let j = 0; j < columnOrder.length; j++){
                        if(columnOrder[j].name === storageColumnOrder[i]){
                            newOrder.push(columnOrder[j]);
                            break;
                        }
                    }
                }
                setColumnOrder(newOrder);
            }
        }catch(error){
            console.log("Failed to load process_browser_table_filter_options", error);
        }
        setLoading(false);
    }, []);
    const onSubmitColumnReorder = (newOrder) => {
        let newVisible = [];
        let newHidden = [];
        for(let i = 0; i < newOrder.length; i++){
            if(newOrder[i].visible){
                newVisible.push(newOrder[i].name);
            } else {
                newHidden.push(newOrder[i].name);
            }
        }
        if(newVisible.length === 0){
            snackActions.error("Can't update to show no fields");
            return;
        }
        setColumnOrder(newOrder);
        setColumnVisibility({visible: newVisible, hidden: newHidden});
        updateSettings({
            settings: {
                process_browser_column_order: newOrder.map(c => c.name),
                process_browser_table_columns: newVisible,
            },
            broadcast: false,
        });
        setOpenReorderDialog(false);
    }
    const onResetColumnReorder = () => {
        onSubmitColumnReorder(columnDefaults);
    }
    const sortColumn = columns.findIndex((column) => column.key === sortData.sortKey);
    React.useEffect( () => {
        if(viewSingleTreeData){
            return;
        }
        if(expandOrCollapseAll){
            openAllNodes(true);
        } else {
            openAllNodes(false);
        }
    }, [expandOrCollapseAll, updatedTreeAdjMatrix]);
    if(loading){
        return (
            <div className="mythic-process-browser-table-shell">
                <ProcessBrowserSummaryStrip summary={processSummary} quickFilter={quickFilter} />
                <div style={{overflowY: "hidden", flexGrow: 1, position: "relative"}}>
                    <div style={{
                        position: "absolute",
                        left: "35%",
                        top: "40%"
                    }}>
                        {"Loading Saved Browser Customizations..."}
                    </div>
                </div>
            </div>
        )
    }
    return (
        <div className="mythic-process-browser-table-shell">
            <ProcessBrowserSummaryStrip summary={processSummary} quickFilter={quickFilter} />
            <div className="mythic-process-browser-grid-shell">
                <MythicResizableGrid
                    columns={columns}
                    sortIndicatorIndex={sortColumn}
                    sortDirection={sortData.sortDirection}
                    items={gridData}
                    rowHeight={Math.max(32, GetComputedFontSize() + 10)}
                    onClickHeader={onClickHeader}
                    onDoubleClickRow={localOnDoubleClick}
                    onRowClick={localOnRowClick}
                    contextMenuOptions={contextMenuOptions}
                    onRowContextMenuClick={onRowContextClick}
                />
            </div>
            {selectedNodeData &&
                <ProcessBrowserInspector
                    nodeData={selectedNodeData}
                    rowData={selectedRowData}
                    host={host}
                    group={group}
                    me={me}
                    treeRootData={treeRootData[group]}
                    getProcessRowMenuOptions={getProcessRowMenuOptions}
                    onClose={() => setSelectedProcessPath("")}
                />
            }
            {fileCommentDialogOpen && (
                <MythicDialog
                    fullWidth={true}
                    maxWidth='md'
                    open={fileCommentDialogOpen}
                    onClose={() => {
                        setFileCommentDialogOpen(false);
                    }}
                    innerDialog={
                        <MythicModifyStringDialog
                            title='Edit Comment'
                            onSubmit={onSubmitUpdatedComment}
                            value={commentDataRef.current?.value || ""}
                            onClose={() => {
                                setFileCommentDialogOpen(false);
                            }}
                        />
                    }
                />
            )}
            {viewPermissionsDialogOpen &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={viewPermissionsDialogOpen}
                    onClose={()=>{setViewPermissionsDialogOpen(false);}}
                    innerDialog={<MythicViewJSONAsTableDialog title="View Detailed Data" leftColumn="Attribute"
                        rightColumn="Value" value={permissionData}
                        onClose={()=>{setViewPermissionsDialogOpen(false);}}
                        />}
                />
            }
            {openContextMenu &&
                <MythicDialog fullWidth={true} maxWidth="sm" open={openContextMenu}
                              onClose={()=>{setOpenContextMenu(false);}}
                              innerDialog={
                                  <GridColumnFilterDialog
                                      onSubmit={onSubmitFilterOptions}
                                      filterValue={filterOptions[selectedColumn.current?.key]}
                                      selectedColumn={selectedColumn.current}
                                      onClose={() => {
                                          setOpenContextMenu(false);
                                      }}
                                  />
                              }
                />
            }
            {openReorderDialog &&
                <MythicDialog fullWidth={true} maxWidth="sm" open={openReorderDialog}
                              onClose={()=>{setOpenReorderDialog(false);}}
                              innerDialog={
                                  <CallbacksTableColumnsReorderDialog
                                      onClose={()=>{setOpenReorderDialog(false);}}
                                      visible={columnVisibility.visible}
                                      hidden={columnVisibility.hidden}
                                      onReset={onResetColumnReorder}
                                      onSubmit={onSubmitColumnReorder}
                                      initialItems={columnOrder}
                                  />}
                />
            }
        </div>
    )
}
const ProcessBrowserSummaryStrip = ({summary, quickFilter}) => {
    const quickFilterLabel = quickFilter?.trim() ? `Quick: ${quickFilter.trim()}` : "No quick filter";
    const chips = [
        {label: `${summary.visible} visible`, tone: summary.filtered ? "info" : "neutral"},
        {label: `${summary.total} total`, tone: "neutral"},
        {label: `${summary.elevated} elevated`, tone: summary.elevated > 0 ? "warning" : "muted"},
        {label: `${summary.users} users`, tone: summary.users > 0 ? "neutral" : "muted"},
        {label: `${summary.deleted} deleted`, tone: summary.deleted > 0 ? "warning" : "muted"},
        {label: summary.singleTree ? "Single tree" : "All trees", tone: summary.singleTree ? "info" : "muted"},
        {label: quickFilterLabel, tone: summary.quickFiltered ? "info" : "muted"},
        {label: summary.columnFiltered ? "Column filters" : "No column filters", tone: summary.columnFiltered ? "info" : "muted"},
    ];
    return (
        <div className="mythic-process-summary-strip">
            {chips.map((chip) => (
                <span
                    className={`mythic-process-summary-chip mythic-process-summary-chip-${chip.tone}`}
                    key={chip.label}
                    title={chip.label}>
                    {chip.label}
                </span>
            ))}
        </div>
    );
};
const ProcessBrowserDetail = ({label, value, wide=false}) => (
    <div className={`mythic-process-inspector-detail ${wide ? "mythic-process-inspector-detailWide" : ""}`}>
        <span>{label}</span>
        <strong title={value === undefined || value === null || value === "" ? "-" : `${value}`}>
            {value === undefined || value === null || value === "" ? "-" : value}
        </strong>
    </div>
);
const ProcessBrowserInspector = ({nodeData, rowData, treeRootData, host, group, me,
                                     getProcessRowMenuOptions, onClose}) => {
    const metadata = nodeData?.metadata || {};
    const callbackIds = getUniqueCallbackLabels(nodeData).join(", ");
    const inspectorRowData = {
        ...(rowData || {}),
        id: nodeData?.id,
        full_path_text: nodeData?.full_path_text || rowData?.full_path_text,
        name_text: nodeData?.name_text || rowData?.name_text,
        comment: nodeData?.comment || "",
        host,
        group,
    };
    return (
        <div className="mythic-process-inspector">
            <div className="mythic-process-inspector-header">
                <div className="mythic-process-inspector-title">
                    <TerminalIcon fontSize="small" />
                    <span title={nodeData?.name_text || ""}>{nodeData?.name_text || "Selected process"}</span>
                    {getProcessIntegrity(nodeData) > 3 &&
                        <span className="mythic-process-indicator mythic-process-indicator-warning" title={`Integrity ${getProcessIntegrity(nodeData)}`}>
                            <WarningAmberIcon fontSize="inherit" />
                            Elevated
                        </span>
                    }
                    {nodeData?.deleted &&
                        <span className="mythic-process-indicator mythic-process-indicator-deleted">
                            <DeleteOutlineIcon fontSize="inherit" />
                            Deleted
                        </span>
                    }
                </div>
                <div className="mythic-process-inspector-actions">
                    <FileBrowserTableRowActionCell
                        treeRootData={treeRootData}
                        host={host}
                        group={group}
                        rowData={inspectorRowData}
                        getProcessRowMenuOptions={getProcessRowMenuOptions}
                    />
                    <IconButton
                        className="mythic-file-browser-iconButton mythic-file-browser-hoverError"
                        onClick={onClose}
                        size="small">
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </div>
            </div>
            <div className="mythic-process-inspector-body">
                <div className="mythic-process-inspector-details">
                    <ProcessBrowserDetail label="PID" value={metadata.process_id || nodeData?.full_path_text} />
                    <ProcessBrowserDetail label="PPID" value={metadata.parent_process_id || nodeData?.parent_path_text} />
                    <ProcessBrowserDetail label="User" value={metadata.user} />
                    <ProcessBrowserDetail label="Arch" value={metadata.architecture} />
                    <ProcessBrowserDetail label="Session" value={metadata.session_id} />
                    <ProcessBrowserDetail label="Integrity" value={metadata.integrity_level} />
                    <ProcessBrowserDetail label="Callbacks" value={callbackIds || getProcessCallbackCount(nodeData)} wide />
                    <ProcessBrowserDetail label="Comment" value={nodeData?.comment} wide />
                </div>
                <div className="mythic-process-inspector-side">
                    <div className="mythic-process-inspector-tags">
                        {nodeData?.id &&
                            <ViewEditTags
                                target_object={"mythictree_id"}
                                target_object_id={nodeData.id || 0}
                                me={me} />
                        }
                        <div className="mythic-process-tags-list">
                            <TagsDisplay tags={nodeData?.tags || []} />
                        </div>
                    </div>
                    <div className="mythic-process-inspector-command" title={metadata.command_line || ""}>
                        {metadata.command_line || "No command line recorded."}
                    </div>
                </div>
            </div>
        </div>
    );
};
const FileBrowserTableRowNameCell = ({ rowData, treeRootData, host, children, handleOnClickButton }) => {
    const nodeData = treeRootData?.[host]?.[rowData["full_path_text"]];
    const displayName = rowData.root && rowData.depth === 0 ? rowData.host : nodeData?.name_text || rowData.name_text || "UNKNOWN - MISSING DATA";
    const hasChildren = children !== undefined;
    const indentWidth = Math.max(0, rowData.depth - 1) * 16;
    const elevated = getProcessIntegrity(nodeData) > 3;
    const matchLabels = rowData.filterMatchLabels || [];
    const extraMatchCount = Math.max(0, matchLabels.length - 3);
    return (
        <div className={`mythic-process-name-cell ${nodeData?.deleted ? "mythic-process-row-deleted" : ""}`}>
            <span className="mythic-process-indent" style={{width: `${indentWidth}px`}} />
            {hasChildren ? (
                <IconButton
                    className="mythic-process-expand-button"
                    onClick={(event) => {
                        event.stopPropagation();
                        handleOnClickButton(rowData.full_path_text);
                    }}
                    size="small"
                    tabIndex={-1}
                >
                    {rowData.isOpen ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                </IconButton>
            ) : (
                <span className="mythic-process-expand-spacer" />
            )}
            <TerminalIcon className="mythic-process-name-icon" fontSize="small" />
            <span className="mythic-process-name-text" title={displayName}>
                {displayName}
            </span>
            {elevated &&
                <span className="mythic-process-indicator mythic-process-indicator-warning" title={`Integrity ${getProcessIntegrity(nodeData)}`}>
                    <WarningAmberIcon fontSize="inherit" />
                </span>
            }
            {nodeData?.deleted &&
                <span className="mythic-process-indicator mythic-process-indicator-deleted" title="Deleted process entry">
                    <DeleteOutlineIcon fontSize="inherit" />
                </span>
            }
            {matchLabels.length > 0 &&
                <span className="mythic-process-match-chips" title={`Matched: ${matchLabels.join(", ")}`}>
                    {matchLabels.slice(0, 3).map((label) => (
                        <span className="mythic-process-match-chip" key={label}>{label}</span>
                    ))}
                    {extraMatchCount > 0 &&
                        <span className="mythic-process-match-chip">+{extraMatchCount}</span>
                    }
                </span>
            }
            {rowData.filterAncestor &&
                <span className="mythic-process-match-chip mythic-process-match-chip-ancestor" title="Visible because a descendant matched the quick filter">
                    ancestor
                </span>
            }
        </div>
    );
};
const FileBrowserTagsCell = ({rowData, treeRootData, host, me}) => {
    const nodeData = treeRootData?.[host]?.[rowData["full_path_text"]];
    return (
        nodeData?.id ? (
            <div className="mythic-process-tags-cell">
                <ViewEditTags 
                    target_object={"mythictree_id"} 
                    target_object_id={nodeData?.id || 0}
                    me={me} />
                <div className="mythic-process-tags-list">
                    <TagsDisplay tags={nodeData?.tags || []} />
                </div>
            </div>
        ) : null
    )
}
const FileBrowserTableRowStringCell = ({cellData, treeRootData, host, rowData}) => {
    const displayValue = cellData === null || cellData === undefined ? "" : cellData;
    return (
        <div className="mythic-process-string-cell" title={`${displayValue}`}>{displayValue}</div>
    )
}
const FileBrowserTableRowActionCell = ({rowData, treeRootData, host, getProcessRowMenuOptions}) => {
    const dropdownAnchorRef = React.useRef(null);
    const loadingMenuDisplay = {
        name: "Loading Dynamic Menu Items...", icon: null,
        type: "item",
        disabled: true,
        click: ({event}) => {
            event.stopPropagation();
        }
    };
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [customMenuOptions, setCustomMenuOptions] = React.useState([loadingMenuDisplay]);
    const currentNodeData = treeRootData?.[host]?.[rowData?.["full_path_text"]];

    const handleMenuItemClick = (event, click) => {
        click({event});
        setDropdownOpen(false);
    };
    const handleClose = (event) => {
        if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
          return;
        }
        setDropdownOpen(false);
        setCustomMenuOptions([loadingMenuDisplay]);
    };
    const handleDropdownToggle = (evt) => {
        evt.stopPropagation();
        setDropdownOpen((prevOpen) => !prevOpen);
        if(!dropdownOpen){
            getProcessRowMenuOptions(rowData).then(r => {
                if(r){
                    setCustomMenuOptions(r);
                }
            });
        } else {
            setCustomMenuOptions([loadingMenuDisplay]);
        }
    };
    return (
        currentNodeData?.id ? (
        <React.Fragment>
            <IconButton
                size="small"
                className="mythic-process-action-button"
                aria-controls={dropdownOpen ? 'split-button-menu' : undefined}
                aria-expanded={dropdownOpen ? 'true' : undefined}
                aria-haspopup="menu"
                onClick={handleDropdownToggle}
                ref={dropdownAnchorRef}
            >
                <SettingsIcon fontSize="small" />
            </IconButton>
            {dropdownOpen &&
                <ClickAwayListener onClickAway={handleClose} mouseEvent={"onMouseDown"}>
                    <Dropdown
                        isOpen={dropdownAnchorRef.current}
                        onOpen={setDropdownOpen}
                        externallyOpen={dropdownOpen}
                        anchorReference={"anchorEl"}
                        menu={[
                            ...customMenuOptions.map((option, index) => (
                                option.type === 'item' ? (
                                    <DropdownMenuItem
                                        key={option.name}
                                        disabled={option.disabled}
                                        onClick={(event) => handleMenuItemClick(event, option.click)}
                                    >
                                        {option.icon}
                                        <span>{option.name}</span>
                                    </DropdownMenuItem>
                                ) : option.type === 'menu'  ? (
                                    <DropdownNestedMenuItem
                                        label={option.name}
                                        disabled={option.disabled}
                                        menu={
                                            option.menuItems.map((menuOption, indx) => (
                                                <DropdownMenuItem
                                                    key={menuOption.name}
                                                    disabled={menuOption.disabled}
                                                    onClick={(event) => handleMenuItemClick(event, menuOption.click)}
                                                >
                                                    {menuOption.icon}
                                                    <span>{menuOption.name}</span>
                                                </DropdownMenuItem>
                                            ))
                                        }
                                    />
                                ) : null))
                        ]}/>
                </ClickAwayListener>
            }
        </React.Fragment>
        ) : null
    )
}
