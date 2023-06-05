import React, { useEffect } from 'react';
import { useMutation, useLazyQuery, gql } from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import {
    MythicDialog,
    MythicModifyStringDialog,
    MythicViewJSONAsTableDialog,
} from '../../MythicComponents/MythicDialog';
import {faFolder} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Paper from '@mui/material/Paper';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorIcon from '@mui/icons-material/Error';
import { useTheme } from '@mui/material/styles';
import { IconButton } from '@mui/material';
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import EditIcon from '@mui/icons-material/Edit';
import { DownloadHistoryDialog } from './DownloadHistoryDialog';
import HistoryIcon from '@mui/icons-material/History';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Divider from '@mui/material/Divider';
import ListIcon from '@mui/icons-material/List';
import DeleteIcon from '@mui/icons-material/Delete';
import GetAppIcon from '@mui/icons-material/GetApp';
import 'react-virtualized/styles.css';
import FileCopyOutlinedIcon from '@mui/icons-material/FileCopyOutlined';
import { copyStringToClipboard } from '../../utilities/Clipboard';
import MythicResizableGrid from '../../MythicComponents/MythicResizableGrid';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import {TableFilterDialog} from './TableFilterDialog';
import {MythicTransferListDialog} from '../../MythicComponents/MythicTransferList';
import {TagsDisplay, ViewEditTags} from '../../MythicComponents/MythicTag';
import SettingsIcon from '@mui/icons-material/Settings';
import { toLocalTime } from '../../utilities/Time';


const getPermissionsDataQuery = gql`
    query getPermissionsQuery($mythictree_id: Int!) {
        mythictree_by_pk(id: $mythictree_id) {
            id
            metadata
        }
    }
`;
const getFileDownloadHistory = gql`
    query getFileDownloadHistory($mythictree_id: Int!) {
        mythictree_by_pk(id: $mythictree_id) {
            filemeta {
                id
                comment
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
    mutation updateCommentMutation($mythictree_id: Int!, $comment: String!) {
        update_mythictree_by_pk(pk_columns: { id: $mythictree_id }, _set: { comment: $comment }) {
            comment
            id
        }
    }
`;


export const CallbacksTabsFileBrowserTable = (props) => {
    const [allData, setAllData] = React.useState([]);
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const [filterOptions, setFilterOptions] = React.useState({});
    const [selectedColumn, setSelectedColumn] = React.useState({});
    const [sortData, setSortData] = React.useState({"sortKey": null, "sortDirection": null, "sortType": null})
    const [columnVisibility, setColumnVisibility] = React.useState({
        "visible": ["Info", "Name", "Size","Comment", "Last Modify"],
        "hidden": ["Tags"]
    });
    const [openAdjustColumnsDialog, setOpenAdjustColumnsDialog] = React.useState(false);
    const columns = React.useMemo(
        () =>
            [
                { name: 'Info', width: 50, disableAutosize: true, disableSort: true, disableFilterMenu: true },
                { name: 'Name', type: 'string', key: 'name_text', fillWidth: true },
                { name: "Size", type: "size", key: "size", inMetadata: true},
                { name: "Last Modify", type: "date", key: "modify_time", inMetadata: true, width: 300},
                { name: 'Tags', type: 'tags', disableSort: true, disableFilterMenu: true, width: 220 },
                { name: 'Comment', type: 'string', key: 'comment', width: 200 },
            ].reduce( (prev, cur) => {
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
    const sortedData = React.useMemo(() => {
        if (sortData.sortKey === null || sortData.sortType === null) {
            return allData;
        }
        const tempData = [...allData];
        if (sortData.sortType === 'number' || sortData.sortType === 'size' || sortData.sortType === 'date') {
            tempData.sort((a, b) => {
                if(sortData.inMetadata){
                    return parseInt(props.treeRootData[props.selectedFolderData.host][a]?.metadata[sortData.sortKey]) > 
                    parseInt(props.treeRootData[props.selectedFolderData.host][b]?.metadata[sortData.sortKey]) ? 1 : -1
                } else {
                    return parseInt(props.treeRootData[props.selectedFolderData.host][a][sortData.sortKey]) > parseInt(props.treeRootData[props.selectedFolderData.host][b][sortData.sortKey]) ? 1 : -1
                }
            })
        } else if (sortData.sortType === 'string') {
            tempData.sort((a, b) => (props.treeRootData[props.selectedFolderData.host][a][sortData.sortKey].toLowerCase() > props.treeRootData[props.selectedFolderData.host][b][sortData.sortKey].toLowerCase() ? 1 : -1));
        }
        if (sortData.sortDirection === 'DESC') {
            tempData.reverse();
        }
        return tempData;
    }, [allData, sortData]);
    const onSubmitFilterOptions = (newFilterOptions) => {
        setFilterOptions(newFilterOptions);
    }
    const filterRow = (row) => {
        if(!props.showDeletedFiles && props.treeRootData[props.selectedFolderData.host][row]?.deleted){
            return true;
        }
        for(const [key,value] of Object.entries(filterOptions)){
            if(!String(props.treeRootData[props.selectedFolderData.host][row][key]).toLowerCase().includes(value)){
                return true;
            }
        }
        return false;
    }
    const gridData = React.useMemo(
        () =>
            // row is just the name
            sortedData.reduce((prev, row) => {
                if(filterRow(row)){
                    return [...prev];
                }else{
                    return [...prev, columns.map( c => {
                        switch(c.name){
                            case "Info":
                                return  <FileBrowserTableRowActionCell 
                                            treeRootData={props.treeRootData} 
                                            selectedFolderData={props.selectedFolderData} 
                                            rowData={props.treeRootData[props.selectedFolderData.host][row]} 
                                            cellData={row}
                                            me={props.me}
                                            onTaskRowAction={props.onTaskRowAction} />;
                            case "Name":
                                return <FileBrowserTableRowNameCell 
                                            treeRootData={props.treeRootData} 
                                            selectedFolderData={props.selectedFolderData} 
                                            cellData={row}
                                            rowData={props.treeRootData[props.selectedFolderData.host][row]} />;
                            case "Size":
                                return TableRowSizeCell({ cellData: props.treeRootData[props.selectedFolderData.host][row]?.metadata?.size, rowData: props.treeRootData[props.selectedFolderData.host][row] });
                            case "Tags":
                                return <FileBrowserTagsCell 
                                            rowData={props.treeRootData[props.selectedFolderData.host][row]} 
                                            treeRootData={props.treeRootData} 
                                            cellData={row}
                                            selectedFolderData={props.selectedFolderData} 
                                            me={props.me} />
                            case "Last Modify":
                                return TableRowDateCell({ cellData: props.treeRootData[props.selectedFolderData.host][row]?.metadata?.modify_time,
                                    rowData: props.treeRootData[props.selectedFolderData.host][row],
                                    view_utc_time: props.me?.user?.view_utc_time
                                });
                            case "Comment":
                                return <FileBrowserTableRowStringCell cellData={row.comment} rowData={props.treeRootData[props.selectedFolderData.host][row]} />
                        }
                    })];
                }
                
        }, []),
        [sortedData, props.onTaskRowAction, filterOptions, columnVisibility, props.showDeletedFiles]
    );

    useEffect(() => {
        // when the folder changes, we need to aggregate all of the entries
        //console.log(props.selectedFolderData, props.treeAdjMatrix, props.treeRootData)
        let desiredPath = props.selectedFolderData.full_path_text;
        if(props.selectedFolderData.id === props.selectedFolderData.host){
            desiredPath = "";
        }
        setAllData(Object.keys(props.treeAdjMatrix[props.selectedFolderData.host]?.[desiredPath] || {}));
        //console.log("just set all data")
    }, [props.selectedFolderData, props.treeAdjMatrix]);

    const onRowDoubleClick = (e, rowIndex) => {
        const rowData = props.treeRootData[props.selectedFolderData.host][allData[rowIndex]];
        if (!rowData.can_have_children) {
            return;
        }
        snackActions.info('Fetching contents from database...');
        props.onRowDoubleClick(rowData);

        setSortData({"sortKey": null, "sortType":null, "sortDirection": "ASC"});
    };

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
    const contextMenuOptions = [
        {
            name: 'Filter Column', 
            click: ({event, columnIndex}) => {
                if(columns[columnIndex].disableFilterMenu){
                    snackActions.warning("Can't filter that column");
                    return;
                }
                setSelectedColumn(columns[columnIndex]);
                setOpenContextMenu(true);
            }
        },
        {
            name: "Show/Hide Columns",
            click: ({event, columnIndex}) => {
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
                onDoubleClickRow={onRowDoubleClick}
                contextMenuOptions={contextMenuOptions}
            />
            {openContextMenu &&
                <MythicDialog fullWidth={true} maxWidth="xs" open={openContextMenu} 
                    onClose={()=>{setOpenContextMenu(false);}} 
                    innerDialog={<TableFilterDialog 
                        selectedColumn={selectedColumn} 
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
    );
};
const FileBrowserTableRowNameCell = ({cellData,  rowData, treeRootData, selectedFolderData }) => {
    const theme = useTheme();
    return (
        <div style={{ alignItems: 'center', display: 'flex', textDecoration: treeRootData[selectedFolderData.host][cellData]?.deleted ? 'line-through' : '' }}>
            {!treeRootData[selectedFolderData.host][cellData]?.can_have_children ? (
                <DescriptionIcon style={{ marginRight: '5px' }} />
            ) : (
                <FontAwesomeIcon 
                    icon={faFolder}
                    size={"lg"}
                    style={{
                        marginRight: '5px',
                        color:
                        treeRootData[selectedFolderData.host][cellData]?.success !== null
                                ? theme.folderColor
                                : 'grey',
                    }}
                />
            )}
            {treeRootData[selectedFolderData.host][cellData]?.filemeta.length > 0 ? <GetAppIcon color="success" /> : null}
            <pre 
                style={{
                    color:
                    treeRootData[selectedFolderData.host][cellData]?.success !== null
                            ? theme.palette.text.primary
                            : theme.palette.text.secondary,
                }}>
                {treeRootData[selectedFolderData.host][cellData]?.name_text}
            </pre>
            {treeRootData[selectedFolderData.host][cellData]?.success === true ? (
                <MythicStyledTooltip title='Successfully listed contents of folder'>
                    <CheckCircleOutlineIcon color="success" fontSize='small' />
                </MythicStyledTooltip>
            ) : treeRootData[selectedFolderData.host][cellData]?.success === false ? (
                <MythicStyledTooltip title='Failed to list contents of folder'>
                    <ErrorIcon fontSize='small' color="error" />
                </MythicStyledTooltip>
            ) : null}
        </div>
    );
};
const FileBrowserTagsCell = ({rowData, cellData, treeRootData, selectedFolderData, me}) => {
    return (
        <>
            <ViewEditTags target_object={"mythictree_id"} target_object_id={treeRootData[selectedFolderData.host][cellData]?.id} me={me} />
            <TagsDisplay tags={treeRootData[selectedFolderData.host][cellData]?.tags} />
        </>
    )
}
const FileBrowserTableRowStringCell = ({ cellData }) => {
    return (
        <>
        {cellData}
        </>
    )
};
export const TableRowDateCell = ({ cellData, rowData, view_utc_time }) => {
    
    try{
        let cellDataInt = parseInt(cellData)
        if(cellData === "" || cellData === undefined || cellDataInt <= 0){
            return "";
        }
        let view_utc = true;
        if(view_utc_time !== undefined){
            view_utc = view_utc_time
        }
        // handle Unix epoch timestamps
        if (view_utc) {
            let init_date = new Date(cellDataInt);
            return init_date.toDateString() + " " + init_date.toTimeString().substring(0, 8) + " UTC";
        } else {
            let timezoneDate = new Date(cellDataInt);
            timezoneDate.setTime(timezoneDate.getTime() - (timezoneDate.getTimezoneOffset() *60*1000));
            return timezoneDate.toLocaleDateString() + " " + timezoneDate.toLocaleString([], {hour12: true, hour: "2-digit", minute: "2-digit"});
        }
        //const dateData = new Date(cellDataInt).toISOString();
        //return toLocalTime(dateData.slice(0, 10) + " " + dateData.slice(11,-1), view_utc_time);
    }catch(error){
        try{
            let cellDataInt = parseInt(cellData)
            // handle windows FILETIME values
            const dateData = new Date( ((cellDataInt / 10000000) - 11644473600) * 1000).toISOString();
            return toLocalTime(dateData.slice(0, 10) + " " + dateData.slice(11,-1), view_utc_time);
        }catch(error2){
            console.log("error with timestamp: ", cellData);
            return String(cellData);
        }
        
    }
    
};
export const TableRowSizeCell = ({ cellData, rowData }) => {
    const getStringSize = () => {
        try {
            // process for getting human readable string from bytes: https://stackoverflow.com/a/18650828
            let bytes = parseInt(cellData);
            if (cellData === '' || cellData === undefined) return '';
            if (bytes === 0) return '0 B';
            const decimals = 2;
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

            const i = Math.floor(Math.log(bytes) / Math.log(k));

            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        } catch (error) {
            return cellData;
        }
    };
    return getStringSize(cellData);
};
const FileBrowserTableRowActionCell = ({ rowData, cellData, onTaskRowAction, treeRootData, selectedFolderData, me }) => {
    const dropdownAnchorRef = React.useRef(null);
    const theme = useTheme();
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [fileCommentDialogOpen, setFileCommentDialogOpen] = React.useState(false);
    const [viewPermissionsDialogOpen, setViewPermissionsDialogOpen] = React.useState(false);
    const [fileHistoryDialogOpen, setFileHistoryDialogOpen] = React.useState(false);
    const [permissionData, setPermissionData] = React.useState('');
    const [downloadHistory, setDownloadHistory] = React.useState([]);
    const [getPermissions] = useLazyQuery(getPermissionsDataQuery, {
        onCompleted: (data) => {
            let newPermissions = {};
            /*
            Object.keys(data.mythictree_by_pk.metadata).forEach( (key) => {
                if( key.includes("time") ){
                    try{
                        newPermissions[key] = TableRowDateCell({cellData: data.mythictree_by_pk.metadata[key], view_utc_time: me?.user?.view_utc_time})
                    }catch(error){
                        console.log("failed to parse metadata as date", key, data.mythictree_by_pk.metadata[key]);
                        newPermissions[key] = data.mythictree_by_pk.metadata[key];
                    }
                } else if( key.includes("size") ){
                    try{
                        console.log(data.mythictree_by_pk.metadata, data.mythictree_by_pk.metadata[key])
                        newPermissions[key] = TableRowSizeCell({cellData: data.mythictree_by_pk.metadata[key]})
                    }catch(error){
                        console.log("failed to parse metadata as size", key, data.mythictree_by_pk.metadata[key]);
                        newPermissions[key] = data.mythictree_by_pk.metadata[key];
                    }
                } else {
                    newPermissions[key] = data.mythictree_by_pk.metadata[key];
                }
            });

             */
            setPermissionData(data.mythictree_by_pk.metadata);
            if (data.mythictree_by_pk.metadata !== '') {
                setViewPermissionsDialogOpen(true);
            } else {
                snackActions.warning('No metadata data available');
            }
        },
        fetchPolicy: 'network-only',
    });
    const [getHistory] = useLazyQuery(getFileDownloadHistory, {
        onCompleted: (data) => {
            //console.log(data);
            if (data.mythictree_by_pk.filemeta.length === 0) {
                snackActions.warning('No download history recorded');
            } else {
                setDownloadHistory(data.mythictree_by_pk.filemeta);
                setFileHistoryDialogOpen(true);
            }
        },
        fetchPolicy: 'network-only',
    });
    const [updateComment] = useMutation(updateFileComment, {
        onCompleted: (data) => {
            snackActions.success('updated comment');
        },
    });
    const onSubmitUpdatedComment = (comment) => {
        updateComment({ variables: { mythictree_id: treeRootData[selectedFolderData.host][cellData].id, comment: comment } });
    };
    const handleDropdownToggle = (evt) => {
        evt.stopPropagation();
        setDropdownOpen((prevOpen) => !prevOpen);
    };
    const handleMenuItemClick = (whichOption, event, index) => {
        switch (whichOption) {
            case 'A':
                optionsA[index].click(event);
                break;
            case 'B':
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
    const copyToClipboard = () => {
        let result = copyStringToClipboard(treeRootData[selectedFolderData.host][cellData].full_path_text);
        if (result) {
            snackActions.success('Copied text!');
        } else {
            snackActions.error('Failed to copy text');
        }
    };
    const optionsA = [
        {
            name: 'View Permissions',
            icon: <VisibilityIcon style={{ paddingRight: '5px' }} />,
            click: (evt) => {
                evt.stopPropagation();
                getPermissions({ variables: { mythictree_id: treeRootData[selectedFolderData.host][cellData].id } });
            },
        },
        {
            name: 'Download History',
            icon: <HistoryIcon style={{ paddingRight: '5px' }} />,
            click: (evt) => {
                evt.stopPropagation();
                getHistory({ variables: { mythictree_id: treeRootData[selectedFolderData.host][cellData].id } });
            },
        },
        {
            name: 'Edit Comment',
            icon: <EditIcon style={{ paddingRight: '5px' }} />,
            click: (evt) => {
                evt.stopPropagation();
                setFileCommentDialogOpen(true);
            },
        },
        {
            name: 'Copy Path to Clipboard',
            icon: <FileCopyOutlinedIcon style={{ paddingRight: '5px' }} />,
            click: (evt) => {
                evt.stopPropagation();
                copyToClipboard();
            },
        },
    ];
    const optionsB = [
        {
            name: 'Task Listing',
            icon: <ListIcon color="warning" style={{ paddingRight: '5px'}} />,
            click: (evt) => {
                evt.stopPropagation();
                onTaskRowAction({
                    path: treeRootData[selectedFolderData.host][cellData].parent_path_text,
                    full_path: treeRootData[selectedFolderData.host][cellData].full_path_text,
                    host: treeRootData[selectedFolderData.host][cellData].host,
                    filename: treeRootData[selectedFolderData.host][cellData].name_text,
                    uifeature: 'file_browser:list',
                });
            },
        },
        {
            name: 'Task Download',
            icon: <GetAppIcon color="success" style={{ paddingRight: '5px' }} />,
            click: (evt) => {
                evt.stopPropagation();
                onTaskRowAction({
                    path: treeRootData[selectedFolderData.host][cellData].parent_path_text,
                    full_path: treeRootData[selectedFolderData.host][cellData].full_path_text,
                    host: treeRootData[selectedFolderData.host][cellData].host,
                    filename: treeRootData[selectedFolderData.host][cellData].name_text,
                    uifeature: 'file_browser:download',
                });
            },
        },
        {
            name: 'Task Removal',
            icon: <DeleteIcon color="error" style={{ paddingRight: '5px' }} />,
            click: (evt) => {
                evt.stopPropagation();
                onTaskRowAction({
                    path: treeRootData[selectedFolderData.host][cellData].parent_path_text,
                    full_path: treeRootData[selectedFolderData.host][cellData].full_path_text,
                    host: treeRootData[selectedFolderData.host][cellData].host,
                    filename: treeRootData[selectedFolderData.host][cellData].name_text,
                    uifeature: 'file_browser:remove',
                    getConfirmation: true
                });
            },
        },
    ];
    return (
        <React.Fragment>
            <IconButton
                style={{ }}
                size='small'
                aria-controls={dropdownOpen ? 'split-button-menu' : undefined}
                aria-expanded={dropdownOpen ? 'true' : undefined}
                aria-haspopup='menu'
                onClick={handleDropdownToggle}
                color='primary'
                variant='contained'
                ref={dropdownAnchorRef}>
                <SettingsIcon />
            </IconButton>
            <Popper
                open={dropdownOpen}
                anchorEl={dropdownAnchorRef.current}
                role={undefined}
                transition
                style={{ zIndex: 4000 }}>
                {({ TransitionProps, placement }) => (
                    <Grow
                        {...TransitionProps}
                        style={{
                            transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                        }}>
                        <Paper
                            style={{
                                backgroundColor:
                                    theme.palette.mode === 'dark'
                                        ? theme.palette.primary.dark
                                        : theme.palette.primary.light,
                                color: 'white',
                            }}>
                            <ClickAwayListener onClickAway={handleClose}>
                                <MenuList id='split-button-menu'>
                                    {optionsA.map((option, index) => (
                                        <MenuItem
                                            key={option.name}
                                            onClick={(event) => handleMenuItemClick('A', event, index)}>
                                            {option.icon}
                                            {option.name}
                                        </MenuItem>
                                    ))}
                                    <Divider />
                                    {optionsB.map((option, index) => (
                                        <MenuItem
                                            key={option.name}
                                            onClick={(event) => handleMenuItemClick('B', event, index)}>
                                            {option.icon}
                                            {option.name}
                                        </MenuItem>
                                    ))}
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
            {viewPermissionsDialogOpen && (
                <MythicDialog
                    fullWidth={true}
                    maxWidth='lg'
                    open={viewPermissionsDialogOpen}
                    onClose={() => {
                        setViewPermissionsDialogOpen(false);
                    }}
                    innerDialog={
                        <MythicViewJSONAsTableDialog
                            title='View Metadata'
                            leftColumn='Attribute'
                            rightColumn='Value'
                            me={me}
                            value={permissionData}
                            onClose={() => {
                                setViewPermissionsDialogOpen(false);
                            }}
                        />
                    }
                />
            )}
            {fileHistoryDialogOpen && (
                <MythicDialog
                    fullWidth={true}
                    maxWidth='md'
                    open={fileHistoryDialogOpen}
                    onClose={() => {
                        setFileHistoryDialogOpen(false);
                    }}
                    innerDialog={
                        <DownloadHistoryDialog
                            title='Download History'
                            value={downloadHistory}
                            onClose={() => {
                                setFileHistoryDialogOpen(false);
                            }}
                        />
                    }
                />
            )}
        </React.Fragment>
    );
};
