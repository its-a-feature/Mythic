import React, {useCallback, useMemo} from 'react';
import { alpha, IconButton } from "@mui/material";
import {useLazyQuery, gql, useMutation } from '@apollo/client';
import { MythicDialog, MythicViewJSONAsTableDialog, MythicModifyStringDialog } from '../../MythicComponents/MythicDialog';
import Paper from '@mui/material/Paper';
import {useTheme} from '@mui/material/styles';
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Divider from '@mui/material/Divider';
import ListIcon from '@mui/icons-material/List';
import DeleteIcon from '@mui/icons-material/Delete';
import GetAppIcon from '@mui/icons-material/GetApp';
import { snackActions } from '../../utilities/Snackbar';
import 'react-virtualized/styles.css';
import MythicResizableGrid from '../../MythicComponents/MythicResizableGrid';
import {TableFilterDialog} from './TableFilterDialog';
import {MythicTransferListDialog} from '../../MythicComponents/MythicTransferList';
import {TagsDisplay, ViewEditTags} from '../../MythicComponents/MythicTag';
import TerminalIcon from '@mui/icons-material/Terminal';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ListSubheader from '@mui/material/ListSubheader';
import {uniqueSplitString} from './CallbacksTabsProcessBrowser';

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



export const CallbacksTabsProcessBrowserTable = ({treeAdjMatrix, treeRootData, me, onRowDoubleClick, onTaskRowAction, host, group, showDeletedFiles, tabInfo}) => {
    //const [allData, setAllData] = React.useState([]);
    //console.log("treeAdjMatrix updated in table", treeAdjMatrix)
    const [sortData, setSortData] = React.useState({"sortKey": null, "sortDirection": null, "sortType": null});
    const [openNodes, setOpenNodes] = React.useState({});
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const [filterOptions, setFilterOptions] = React.useState({});
    const selectedColumn = React.useRef({});
    const [columnVisibility, setColumnVisibility] = React.useState({
        "visible": ["Info","PID", "PPID", "Name", "User", "Arch", "Tags", "Comment"],
        "hidden": [ "Session" ]
    })
    const [singleTreeData, setSingleTreeData] = React.useState({});
    const [viewSingleTreeData, setViewSingleTreeData] = React.useState(false);
    const [openAdjustColumnsDialog, setOpenAdjustColumnsDialog] = React.useState(false);
    const [updatedTreeAdjMatrix, setUpdatedTreeAdjMatrix] = React.useState(treeAdjMatrix);
    const openAllNodes = () => {
        let onodes = {};
        for(const [group, hosts] of Object.entries(updatedTreeAdjMatrix)){
            for(const [host, matrix] of Object.entries(hosts)){
                for(const [key, children] of Object.entries(matrix)){
                    onodes[key] = true;
                    //if(treeRootData[host][key] !== undefined){
                    //onodes[treeRootData[host][key].id] = true;
                    //onodes[parseInt(key)] = true;
                    //}
                }
            }
        }
        setOpenNodes(onodes);
    }
    React.useEffect( () => {
        // need to update the matrix in case there are notes that don't trace back to root
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
                            for(const [i, v] of Object.entries(childrenSearch)){
                                if(i === key){found=true}
                            }
                        }
                        if(!found){
                            if(adjustedMatrix[group][host][""] === undefined){adjustedMatrix[group][host][""] = {}}
                            adjustedMatrix[group][host][""][key] = 1;
                        }
                    }
                }
            }
        }

        //console.log("adjustedMatrix", adjustedMatrix, "realMatrix", treeAdjMatrix)
        setUpdatedTreeAdjMatrix(adjustedMatrix);
    }, [treeAdjMatrix]);
    React.useEffect( () => {
        openAllNodes();
    }, [host, group])
    React.useEffect(() => {
        setViewSingleTreeData(false);
    }, [host]);
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
    const columnDefaults = [
        { name: 'Info', width: 50, disableAutosize: true, disableSort: true, disableFilterMenu: true },
        { name: 'PID', type: 'number', key: 'process_id', inMetadata: true, width: 100},
        { name: 'PPID', type: 'number', key: 'parent_process_id', inMetadata: true, width: 100},
        { name: 'Name', type: 'string', disableSort: false, key: 'name_text', fillWidth: true },
        { name: "User", type: 'string', key: 'user', inMetadata: true, fillWidth: true},
        { name: "Arch", type: 'string', key: 'architecture', inMetadata: true, width: 100},
        { name: 'Tags', type: 'tags', disableSort: true, disableFilterMenu: true, width: 220 },
        { name: 'Comment', type: 'string', key: 'comment', disableSort: false, width: 200 },
        { name: 'Session', type: 'number', key: 'session_id', inMetadata: true, width: 100}
    ];
    const columns = React.useMemo(
        () => 
            columnDefaults.reduce( (prev, cur) => {
                if(columnVisibility.visible.includes(cur.name)){
                    if(filterOptions[cur.key] && String(filterOptions[cur.key]).length > 0){
                        return [...prev, {...cur, filtered: true}];
                    }else{
                        return [...prev, {...cur}];
                    }
                }else{
                    return [...prev];
                }
            }, [])
        , [filterOptions, columnVisibility]
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
    const onSubmitFilterOptions = (newFilterOptions) => {
        setFilterOptions(newFilterOptions);
        openAllNodes();
    }
    const filterRow = (rowData) => {
        if(rowData.root){return true}
        if(!showDeletedFiles &&
            treeRootData[group][host][rowData.full_path_text /*+ uniqueSplitString + rowData.callback_id*/] !== undefined &&
            treeRootData[group][host][rowData.full_path_text /*+ uniqueSplitString + rowData.callback_id*/].deleted){
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
            if(treeRootData[group][host][rowData.full_path_text /*+ uniqueSplitString + rowData.callback_id*/] === undefined){return true}
            if(filterOptionInMetadata[key]){
                if(!String(treeRootData[group][host][rowData.full_path_text /*+ uniqueSplitString + rowData.callback_id*/]?.metadata[key]).toLowerCase().includes(value)){
                    return true;
                }
            }else{
                if(!String(treeRootData[group][host][rowData.full_path_text /*+ uniqueSplitString + rowData.callback_id*/][key]).toLowerCase().includes(value)){
                    return true;
                }
            }
        }
        return false;
    }
    const setSingleTree = (treeElement) => {
        // find all data (ancestor and children) of treeElement and hide all the rest
        // make a new adjacency matrix
        let singleTreeAdjMatrix = {[group]: {[treeElement.host]: {}}};

        // get the parent hierarchy all the way up
        let parent = treeRootData[group][treeElement.host][treeElement.full_path_text /*+ uniqueSplitString + treeElement.callback_id*/].parent_path_text /*+ uniqueSplitString + treeElement.callback_id*/;
        let current = treeElement.full_path_text /*+ uniqueSplitString + treeElement.callback_id*/;
        //console.log("initial parent", parent, "adj", treeAdjMatrix[treeElement.host][parent])
        while(treeAdjMatrix[group][treeElement.host][parent] !== undefined){
            singleTreeAdjMatrix[group][treeElement.host][parent] = {[current]: 1};
            //console.log("tree data of parent", treeRootData[treeElement.host][parent])
            if(treeRootData[group][treeElement.host][parent] === undefined){
                break;
            }
            current = parent;
            parent = treeRootData[group][treeElement.host][parent].parent_path_text /*+ uniqueSplitString + treeRootData[group][treeElement.host][parent].callback_id*/;
        }
        // now get all the descendents of the selected element
        if(treeAdjMatrix[group][treeElement.host][treeElement.full_path_text /*+ uniqueSplitString + treeElement.callback_id*/] !== undefined){
            singleTreeAdjMatrix[group][treeElement.host][treeElement.full_path_text /*+ uniqueSplitString + treeElement.callback_id*/] = treeAdjMatrix[group][treeElement.host][treeElement.full_path_text /*+ uniqueSplitString + treeElement.callback_id*/];
            let leftToProcess = Object.keys(treeAdjMatrix[group][treeElement.host][treeElement.full_path_text /*+ uniqueSplitString + treeElement.callback_id*/]);
            while(leftToProcess.length > 0){
                let nextChild = leftToProcess.shift();
                if(treeAdjMatrix[group][treeElement.host][nextChild] !== undefined){
                    singleTreeAdjMatrix[group][treeElement.host][nextChild] = treeAdjMatrix[group][treeElement.host][nextChild];
                    leftToProcess.push(...Object.keys(treeAdjMatrix[group][treeElement.host][nextChild]));
                }
            }
        }
        for(const [group, hosts] of Object.entries(singleTreeAdjMatrix)){
            if(singleTreeAdjMatrix[group] === undefined){singleTreeAdjMatrix[group] = {}}
            for(const [host, matrix] of Object.entries(hosts)){
                // looping through the hosts to adjust their entries
                if( singleTreeAdjMatrix[group][host] === undefined){singleTreeAdjMatrix[group][host] = {}}
                for(const [key, children] of Object.entries(matrix)){
                    // if key !== "", if key is in another entry, leave it. if it's not anywhere else, add it to ""
                    // key is the parent and children are all the child processes
                    if(singleTreeAdjMatrix[group][host][key] === undefined){singleTreeAdjMatrix[group][host][key] = children}
                    if(key === ""){
                        // add all the children automatically
                        for(const [i, v] of Object.entries(children)){
                            singleTreeAdjMatrix[group][host][key][i] = v
                        }
                    } else {
                        // check if key  is in children anywhere, if not, add it to adjustedMatrix[host][""][key] = 1
                        let found = false;
                        for(const [keySearch, childrenSearch] of Object.entries(matrix)){
                            for(const [i, v] of Object.entries(childrenSearch)){
                                if(i === key){found=true}
                            }
                        }
                        if(!found){
                            if(singleTreeAdjMatrix[group][host][""] === undefined){singleTreeAdjMatrix[group][host][""] = {}}
                            singleTreeAdjMatrix[group][host][""][key] = 1;
                        }
                    }
                }
            }
        }

        setSingleTreeData(singleTreeAdjMatrix);
        onSubmitFilterOptions({});
    }
    const toggleViewSingleTreeData = () => {
        setViewSingleTreeData(!viewSingleTreeData);
    }
    const gridData = React.useMemo(
        () =>
            sortedData.reduce((prev, row) => { 
                if(filterRow(row)){
                    return [...prev];
                }else{
                    return [...prev, columns.map( c => {
                        switch(c.name){
                            case "Info":
                                return  <FileBrowserTableRowActionCell 
                                            treeRootData={treeRootData[group]}
                                            host={host}
                                            group={group}
                                            rowData={row}
                                            tabInfo={tabInfo}
                                            viewSingleTreeData={viewSingleTreeData}
                                            setSingleTree={setSingleTree}
                                            toggleViewSingleTreeData={toggleViewSingleTreeData}
                                            onTaskRowAction={onTaskRowAction} />;
                            case "Name":
                                return <FileBrowserTableRowNameCell 
                                            treeRootData={treeRootData[group]}
                                            host={host}
                                            group={group}
                                            children={updatedTreeAdjMatrix[group][host]?.[row.full_path_text /*+ uniqueSplitString + row.callback_id*/]}
                                            handleOnClickButton={handleOnClickButton}
                                            rowData={row} />;
                            case "User":
                                return <FileBrowserTableRowStringCell
                                    treeRootData={treeRootData[group]}
                                    host={host}
                                    group={group}
                                    cellData={treeRootData[group][host][row.full_path_text /*+ uniqueSplitString + row.callback_id*/]?.metadata?.user || ''}
                                    rowData={row} />;
                            case "Arch":
                                return <FileBrowserTableRowStringCell
                                    treeRootData={treeRootData[group]}
                                    host={host}
                                    group={group}
                                    cellData={treeRootData[group][host][row.full_path_text /*+ uniqueSplitString + row.callback_id*/]?.metadata?.architecture || ''}
                                    rowData={row} />;
                            case "Session":
                                return <FileBrowserTableRowStringCell
                                    treeRootData={treeRootData[group]}
                                    host={host}
                                    group={group}
                                    cellData={treeRootData[group][host][row.full_path_text /*+ uniqueSplitString + row.callback_id*/]?.metadata?.session_id || ''}
                                    rowData={row} />;
                            case "PID":
                                return <FileBrowserTableRowStringCell 
                                            treeRootData={treeRootData[group]}
                                            host={host}
                                            group={group}
                                            rowData={row} 
                                            cellData={treeRootData[group][host][row.full_path_text /*+ uniqueSplitString + row.callback_id*/]?.metadata?.process_id || row.full_path_text} />;
                            case "PPID":
                                return <FileBrowserTableRowStringCell 
                                            treeRootData={treeRootData[group]}
                                            host={host}
                                            group={group}
                                            rowData={row} 
                                            cellData={treeRootData[group][host][row.full_path_text /*+ uniqueSplitString + row.callback_id*/]?.metadata?.parent_process_id || ""} />;
                            case "Tags":
                                return <FileBrowserTagsCell 
                                            rowData={row} 
                                            treeRootData={treeRootData[group]}
                                            host={host}
                                            group={group}
                                            me={me} />
                            case "Comment":
                                return <FileBrowserTableRowStringCell 
                                            treeRootData={treeRootData[group]}
                                            host={host} 
                                            rowData={row}
                                            group={group}
                                            cellData={treeRootData[group][host][row.full_path_text /*+ uniqueSplitString + row.callback_id*/]?.comment}
                                />;
                            default:
                                console.log("hit default case in swith on c.name)")
                        }
                    })];
                }
            }, []),
        [sortedData, onTaskRowAction, filterOptions, columnVisibility, showDeletedFiles]
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
        const rowData = treeRootData[group][host][allData[rowIndex]];
        onRowDoubleClick(rowData);
    };
    const contextMenuOptions = [
        {
            name: 'Filter Column', 
            click: ({event, columnIndex}) => {
                if(columns[columnIndex].disableFilterMenu){
                    snackActions.warning("Can't filter that column");
                    return;
                }
                selectedColumn.current = columns[columnIndex];
                setOpenContextMenu(true);
            }
        },
        {
            name: "Show/Hide Columns",
            click: ({event, columnIndex}) => {
                if(columns[columnIndex].disableFilterMenu){
                    snackActions.warning("Can't filter that column");
                    return;
                }
                setOpenAdjustColumnsDialog(true);
            }
        }
    ];
    const onSubmitAdjustColumns = ({left, right}) => {
        setColumnVisibility({visible: right, hidden: left});
    }
    
    const sortColumn = columns.findIndex((column) => column.key === sortData.sortKey);
    return (
        <div style={{ width: '100%', height: '100%', overflow: "hidden" }}>
            <MythicResizableGrid
                columns={columns}
                sortIndicatorIndex={sortColumn}
                sortDirection={sortData.sortDirection}
                items={gridData}
                rowHeight={35}
                onClickHeader={onClickHeader}
                onDoubleClickRow={localOnDoubleClick}
                contextMenuOptions={contextMenuOptions}
            />
            {openContextMenu &&
                <MythicDialog fullWidth={true} maxWidth="xs" open={openContextMenu} 
                    onClose={()=>{setOpenContextMenu(false);}} 
                    innerDialog={<TableFilterDialog 
                        selectedColumn={selectedColumn.current}
                        filterOptions={filterOptions} 
                        onSubmit={onSubmitFilterOptions} 
                        onClose={()=>{setOpenContextMenu(false);}} />}
                />
            }
            {openAdjustColumnsDialog &&
                <MythicDialog fullWidth={true} maxWidth="md" open={openAdjustColumnsDialog} 
                  onClose={()=>{setOpenAdjustColumnsDialog(false);}} 
                  innerDialog={
                    <MythicTransferListDialog onClose={()=>{setOpenAdjustColumnsDialog(false);}} 
                      onSubmit={onSubmitAdjustColumns} right={columnVisibility.visible} rightTitle="Show these columns"
                      leftTitle={"Hidden Columns"} left={columnVisibility.hidden} dialogTitle={"Edit which columns are shown"}/>}
                />
            }       
        </div>
    )
}
const FileBrowserTableRowNameCell = ({ rowData, treeRootData, host, children, handleOnClickButton }) => {
    const theme = useTheme();
    return (
        <div style={{ alignItems: 'center', display: 'flex', flexGrow: 1, width: "100%", textDecoration: treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/]?.deleted ? 'line-through' : '' }}>
            {[...Array(rowData.depth-1)].map((o, i) => (
                i === rowData.depth-2 && children ? (
                    i === 0 ? (<div key={'folder' + rowData.full_path_text + i} style={{marginLeft: 10, paddingRight: 10}}></div>) : null
                ) : (
                    <div
                    key={'folder' + rowData.full_path_text + 'lines' + i}
                    style={{
                        borderLeft: `2px dashed ${alpha(theme.palette.text.primary, 0.4)}`,
                        marginLeft: i === 0 ? 30 : 10,
                        paddingRight: 8,
                        display: 'inline-block',
                        height: "20px"
                    }}></div>
                )
                
            ))}
            {children === undefined ? (
                <>
                    <div style={{display:"inline-block", width: rowData.depth === 1 ? "1.2rem" : ""}}></div>
                    <TerminalIcon  />
                </>
            ) : rowData.isOpen ? (
                <>
                    <KeyboardArrowDownIcon 
                    style={{
                        
                    }} 
                    onClick={() => {handleOnClickButton(rowData.full_path_text /*+ uniqueSplitString + rowData["callback_id"]*/)}} />
                    <TerminalIcon  />
                  </>
              ) : (
                <>
                <KeyboardArrowRightIcon 
                    style={{ paddingTop: '5px',   }} 
                        onClick={() => {handleOnClickButton(rowData.full_path_text /*+ uniqueSplitString + rowData["callback_id"]*/)}} />
                <TerminalIcon  />
                </>
                  
              )}
            <pre style={{paddingLeft: "2px"}}>
                {treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/]?.name_text || "UNKNOWN - MISSING DATA"}
            </pre>
        </div>
    );
};
const FileBrowserTagsCell = ({rowData, treeRootData, host, me}) => {
    return (
        treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/]?.id ? (
            <>
                <ViewEditTags 
                    target_object={"mythictree_id"} 
                    target_object_id={treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/]?.id || 0}
                    me={me} />
                <TagsDisplay tags={treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/]?.tags || []} />
            </>
        ) : null
    )
}
const FileBrowserTableRowStringCell = ({cellData, treeRootData, host, rowData}) => {
    return (
        <div>{cellData}</div>
    )
}
const FileBrowserTableRowActionCell = ({rowData, onTaskRowAction, treeRootData, host, viewSingleTreeData,setSingleTree, toggleViewSingleTreeData, tabInfo}) => {
    const dropdownAnchorRef = React.useRef(null);
    const theme = useTheme();
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [viewPermissionsDialogOpen, setViewPermissionsDialogOpen] = React.useState(false);
    const [permissionData, setPermissionData] = React.useState({});
    const [fileCommentDialogOpen, setFileCommentDialogOpen] = React.useState(false);
    const [getPermissions] = useLazyQuery(getPermissionsDataQuery, {
        onCompleted: (data) => {
            console.log(rowData);
            setPermissionData({...data.mythictree_by_pk.metadata,
            callback_id: rowData["callback_id"],
            callback_display_id: rowData["callback_display_id"]});
            setViewPermissionsDialogOpen(true);
        },
        onError: (data) => {
          console.log("get permissions error", data);
        },
        fetchPolicy: "network-only"
    });
    const [updateComment] = useMutation(updateFileComment, {
        onCompleted: (data) => {
            snackActions.success('updated comment');
        },
    });
    const onSubmitUpdatedComment = (comment) => {
        updateComment({ variables: { mythictree_id: treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/].id, comment: comment } });
    };
    const handleDropdownToggle = (evt) => {
        evt.stopPropagation();
        setDropdownOpen((prevOpen) => !prevOpen);
    };
    const handleMenuItemClick = (whichOption, event, index, callback_id, callback_display_id) => {
        switch (whichOption){
            case "A":
                optionsA[index].click(event, callback_id, callback_display_id);
                break;
            case "B":
                optionsB[index].click(event, callback_id, callback_display_id);
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
    const optionsA = [
        {
            name: 'View Detailed Data', icon: <VisibilityIcon style={{paddingRight: "5px"}}/>, click: (evt) => {
            evt.stopPropagation();
            getPermissions({variables: {mythictree_id: rowData.id}});
        }},
        {
            name: 'Edit Comment',
            icon: <EditIcon style={{ paddingRight: '5px' }} />,
            click: (evt) => {
                evt.stopPropagation();
                setFileCommentDialogOpen(true);
            },
        },
        {
            name: viewSingleTreeData ? "Stop Single Tree View" : "View Just This Process Tree",
            icon: viewSingleTreeData ?
                <VisibilityOffIcon style={{paddingRight: "5px", color: theme.palette.error.main}}/> :
                <AccountTreeIcon style={{paddingRight: "5px", color: theme.palette.success.main}}/>,
            click: (evt) => {
                setSingleTree(rowData);
                toggleViewSingleTreeData();
            }
        }
    ];
    const optionsB = [
                    {name: 'Task Inject', icon: <GetAppIcon style={{paddingRight: "5px", color: theme.palette.success.main}}/>, click: (evt, callback_id, display_id) => {
                        evt.stopPropagation();
                        onTaskRowAction({
                            process_id: treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/].metadata.process_id,
                            architecture: treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/].metadata.architecture,
                            uifeature: "process_browser:inject", callback_id, display_id
                        });
                    }},
                    {name: 'Task Token Listing', icon: <ListIcon style={{paddingRight: "5px", color: theme.palette.warning.main}}/>, click: (evt, callback_id, display_id) => {
                        evt.stopPropagation();
                        onTaskRowAction({
                            process_id: treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/].metadata.process_id,
                            architecture: treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/].metadata.architecture,
                            uifeature: "process_browser:list_tokens", callback_id, display_id
                        });
                    }, os: ["windows"]},
                    {name: 'Task Steal Token', icon: <DeleteIcon style={{paddingRight: "5px", color: theme.palette.error.main}}/>, click: (evt, callback_id, display_id) => {
                        evt.stopPropagation();
                        onTaskRowAction({
                            process_id: treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/].metadata.process_id,
                            architecture: treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/].metadata.architecture,
                            uifeature: "process_browser:steal_token", callback_id, display_id
                        });
                        
                    }, os: ["windows"]},
                    {name: 'Task Kill Process', icon: <DeleteIcon style={{paddingRight: "5px", color: theme.palette.error.main}}/>, click: (evt, callback_id, display_id) => {
                        evt.stopPropagation();
                        onTaskRowAction({
                            process_id: treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/].metadata.process_id,
                            architecture: treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/].metadata.architecture,
                            uifeature: "process_browser:kill",
                            confirm_dialog: true, callback_id, display_id
                        });
                        
                    }},
    ];
    return (
        treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/]?.id ? (
        <React.Fragment>
            <IconButton
                size="small"
                aria-controls={dropdownOpen ? 'split-button-menu' : undefined}
                aria-expanded={dropdownOpen ? 'true' : undefined}
                aria-haspopup="menu"
                onClick={handleDropdownToggle}
                color="primary"
                variant="contained"
                ref={dropdownAnchorRef}
            >
                <SettingsIcon />
            </IconButton>
            <Popper open={dropdownOpen} anchorEl={dropdownAnchorRef.current} role={undefined} transition style={{zIndex: 4}}
            >

            {({ TransitionProps, placement }) => (
                <Grow
                {...TransitionProps}
                style={{
                    transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                }}
                >
                <Paper className={"dropdownMenuColored"}>
                    <ClickAwayListener onClickAway={handleClose}>
                    <MenuList id="split-button-menu">
                        {optionsA.map((option, index) => (
                            option.os === undefined || option.os.includes(treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/].os) ? (
                                <MenuItem
                                    key={option.name}
                                    onClick={(event) => handleMenuItemClick("A", event, index)}
                                >
                                    {option.icon}{option.name}
                                </MenuItem>
                            ) : null
                        ))}
                        <Divider />
                        <ListSubheader component={"li"} className={"MuiListSubheader-root"}>
                            Act from current Callback: {tabInfo["displayID"]}
                        </ListSubheader>
                        {optionsB.map((option, index) => (
                            option.os === undefined || option.os.includes(treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/].os) ? (
                                <MenuItem
                                    key={option.name}
                                    onClick={(event) => handleMenuItemClick("B", event,
                                        index,
                                        tabInfo["callbackID"],
                                        tabInfo["displayID"])}
                                >
                                    {option.icon}{option.name}
                                </MenuItem>
                            ) : null
                        ))}
                        {
                            treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/]?.callback && treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/]?.callback?.["id"] !== tabInfo["callbackID"] &&
                            <ListSubheader component={"li"} className={"MuiListSubheader-root"}>
                                Act from originating Callback: {treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/]?.callback?.["display_id"] || tabInfo["displayID"]}
                            </ListSubheader>
                        }{
                            treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/]?.callback && treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/]?.callback?.["id"] !== tabInfo["callbackID"] &&
                            optionsB.map((option, index) => (
                                option.os === undefined || option.os.includes(treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/].os) ? (
                                    <MenuItem
                                        key={option.name}
                                        onClick={(event) => handleMenuItemClick('B', event,
                                            index,
                                            treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/]?.["callback"]?.["id"] || tabInfo["callbackID"],
                                            treeRootData[host][rowData["full_path_text"] /*+ uniqueSplitString + rowData["callback_id"]*/]?.["callback"]?.["display_id"] || tabInfo["displayID"])}>
                                        {option.icon}
                                        {option.name}
                                    </MenuItem>
                                ): null
                            ))
                        }
                    </MenuList>
                    </ClickAwayListener>
                </Paper>
                </Grow>
            )}

            </Popper>
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
                            value={rowData.comment}
                            onClose={() => {
                                setFileCommentDialogOpen(false);
                            }}
                        />
                    }
                />
            )}
            {viewPermissionsDialogOpen &&
                <MythicDialog fullWidth={true} maxWidth="md" open={viewPermissionsDialogOpen} 
                    onClose={()=>{setViewPermissionsDialogOpen(false);}} 
                    innerDialog={<MythicViewJSONAsTableDialog title="View Detailed Data" leftColumn="Attribute" 
                        rightColumn="Value" value={permissionData} 
                        onClose={()=>{setViewPermissionsDialogOpen(false);}} 
                        />}
                />
            }
            
        </React.Fragment>
        ) : null
    )
}
