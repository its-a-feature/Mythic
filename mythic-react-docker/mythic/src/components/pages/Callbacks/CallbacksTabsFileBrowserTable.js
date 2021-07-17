import React, {useEffect} from 'react';
import {useMutation, useLazyQuery, gql } from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import { MythicDialog, MythicModifyStringDialog, MythicViewJSONAsTableDialog } from '../../MythicComponents/MythicDialog';
import FolderOpenIcon from '@material-ui/icons/FolderOpen';
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
import BaseTable, {AutoResizer} from 'react-base-table';
import 'react-base-table/styles.css';
import Tooltip from '@material-ui/core/Tooltip';
import {DownloadHistoryDialog} from './DownloadHistoryDialog';
import HistoryIcon from '@material-ui/icons/History';
import VisibilityIcon from '@material-ui/icons/Visibility';
import Divider from '@material-ui/core/Divider';
import ListIcon from '@material-ui/icons/List';
import DeleteIcon from '@material-ui/icons/Delete';
import GetAppIcon from '@material-ui/icons/GetApp';
import { Typography } from '@material-ui/core';

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
export const CallbacksTabsFileBrowserTable = (props) => {
    const [allData, setAllData] = React.useState([]);
    const [defaultSort, setDefaultSort] = React.useState({key: 'name', order: 'asc'});
    const columns = [
        {key: "name_text", numeric: false, dataKey: 'name_text', resizable: true, sortable: true, title: "Name", format: 'name', width: 0, flexGrow: 1, hidden: false},
        {key: "size", numeric: true, dataKey: 'size', resizable: true, sortable: true, title: "Size", format: 'size', width: 100, hidden: false},
        {key: "modify_time", numeric: false, dataKey: 'modify_time', resizable: true, sortable: true, title: "Last Modified",  format: 'date', width: 300, hidden: false},
        {key: "comment", numeric: false, dataKey: 'comment', resizable: true, sortable: true, title: "Comment", format: "string", width: 200, hidden: false},
        {key: "actions", align: "center", numeric: false, dataKey: 'actions', title: "Actions", format: 'actions', width: 100, hidden:false},
    ]
    useEffect( () => {
        console.log("useEffect for props.selectedFolder in filebrowsertable");
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
                    width={width - 10}
                    overscanRowCount={20}
                    height={height - 80}
                    data={allData}
                    sortBy={defaultSort}
                    onColumnSort={onColumnSort}
                    components={components}
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
            if(data.filebrowserobj_by_pk.permissions !== ""){
                setViewPermissionsDialogOpen(true);
            }else{
                snackActions.warning("No permission data available");
            }
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
