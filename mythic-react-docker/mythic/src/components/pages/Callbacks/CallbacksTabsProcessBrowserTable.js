import React, {useEffect} from 'react';
import {useLazyQuery, gql } from '@apollo/client';
import { MythicDialog, MythicViewObjectPropertiesAsTableDialog } from '../../MythicComponents/MythicDialog';
import Paper from '@material-ui/core/Paper';
import {useTheme} from '@material-ui/core/styles';
import {Button} from '@material-ui/core';
import Grow from '@material-ui/core/Grow';
import Popper from '@material-ui/core/Popper';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import BaseTable, {AutoResizer} from 'react-base-table';
import 'react-base-table/styles.css';
import VisibilityIcon from '@material-ui/icons/Visibility';
import Divider from '@material-ui/core/Divider';
import ListIcon from '@material-ui/icons/List';
import DeleteIcon from '@material-ui/icons/Delete';
import GetAppIcon from '@material-ui/icons/GetApp';
import { snackActions } from '../../utilities/Snackbar';

const getDetailedData = gql`
query getDetailed($process_id: Int!){
    process_by_pk(id: $process_id){
        id
        command_line
        description
        signer
        start_time
        name
        bin_path
    }
}
`;
const getProcessTokenData = gql`
query getDetailed($process_id: Int!){
    process_by_pk(id: $process_id){
        id
        tokens(where: {deleted: {_eq: false}}) {
            Address
            AppContainer
            AppContainerNumber
            AppContainerSid
            AppId
            AppModelPolicies
            AppModelPolicyDictionary
            AttributesFlags
            AuditPolicy
            AuthenticationId_id
            BnoIsolationPrefix
            CanSynchronize
            Capabilities
            CreationTime
            DefaultDacl
            DenyOnlyGroups
            DeviceClaimAttributes
            DeviceGroups
            Elevated
            ElevationType
            EnabledGroups
            ExpirationTime
            Filtered
            Flags
            FullPath
            GrantedAccess
            GrantedAccessGeneric
            GrantedAccessMask
            GroupCount
            Groups
            Handle
            HandleReferenceCount
            HasRestrictions
            ImpersonationLevel
            Inherit
            IntegrityLevel
            IntegrityLevelSid
            IsClosed
            IsContainer
            IsPseudoToken
            IsRestricted
            IsSandbox
            LogonSid
            LowPrivilegeAppContainer
            MandatoryPolicy
            ModifiedId
            Name
            NoChildProcess
            NotLow
            NtType
            NtTypeName
            Owner
            Origin
            PackageFullName
            PackageIdentity
            PackageName
            PointerReferenceCount
            PrimaryGroup
            PrivateNamespace
            Privileges
            ProcessUniqueAttribute
            ProtectFromClose
            Restricted
            RestrictedDeviceClaimAttributes
            RestrictedDeviceGroups
            RestrictedSids
            RestrictedSidsCount
            RestrictedUserClaimAttributes
            SandboxInert
            Sddl
            SecurityAttributes
            SecurityDescriptor
            SessionId
            Source
            ThreadID
            TokenId
            TokenType
            TrustLevel
            UIAccess
            User
            UserClaimAttributes
            VirtualizationAllowed
            VirtualizationEnabled
            WriteRestricted
            callbacktokens {
                callback_id
            }
            logonsession {
                id
            }
            task_id
            timestamp_created
        }
    }
}
`;
export const CallbacksTabsProcessBrowserTable = (props) => {
    const [allData, setAllData] = React.useState([]);
    const [defaultSort, setDefaultSort] = React.useState({key: 'name', order: 'asc'});
    const columns = [
        {key: "actions", align: "center", numeric: false, dataKey: 'actions', title: "Actions", format: 'actions', width: 100, hidden:false, frozen: "left"},
        {key: "parent_process_id", numeric: true, dataKey: 'parent_process_id', resizable: true, sortable: true, title: "PPID", format: 'string', width: 100, hidden: false},
        {key: "process_id", numeric: true, dataKey: 'process_id', resizable: true, sortable: true, title: "PID", format: 'string', width: 100, hidden: false},
        {key: "name", numeric: false, dataKey: 'name', resizable: true, sortable: true, title: "Name",  format: 'string', width: 200, hidden: false},
        {key: "architecture", numeric: false, dataKey: 'architecture', resizable: true, sortable: true, title: "Arch", format: "string", width: 100, hidden: false},
        {key: "user", numeric: false, dataKey: 'user', resizable: true, sortable: true, title: "User", format: "string", width: 200, hidden: false},
        {key: "bin_path", numeric: false, dataKey: 'bin_path', resizable: true, sortable: true, title: "BinPath", format: "string", width: 500, flexGrow: 1, hidden: false}, 
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
        string: FileBrowserTableRowStringCell,
        actions: FileBrowserTableRowActionCell
    }
    const Cell = cellProps => {
        const format = cellProps.column.format || 'string';
        const renderer = renderers[format] || renderers.string;
        return renderer({...cellProps, 
            onTaskRowAction: props.onTaskRowAction,
            os: props.os
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

const FileBrowserTableRowStringCell = ({cellData}) => {
    return (
        <div>
            {cellData}
        </div>
    )
}

const FileBrowserTableRowActionCell = ({rowData, onTaskRowAction, os}) => {
    const dropdownAnchorRef = React.useRef(null);
    const theme = useTheme();
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [viewPermissionsDialogOpen, setViewPermissionsDialogOpen] = React.useState(false);
    const [viewTokensDialogOpen, setViewTokensDialogOpen] = React.useState(false);
    const [permissionData, setPermissionData] = React.useState({});
    const [tokenData, setTokenData] = React.useState({});
    const [getPermissions] = useLazyQuery(getDetailedData, {
        onCompleted: (data) => {
            setPermissionData(data.process_by_pk);
            setViewPermissionsDialogOpen(true);
        },
        fetchPolicy: "network-only"
    });
    const [getTokens] = useLazyQuery(getProcessTokenData, {
        onCompleted: (data) => {
            if(data.process_by_pk.tokens.length === 0){
                snackActions.warning("No Token Data for Process");
            }else{
                setTokenData(data.process_by_pk.tokens);
                setViewPermissionsDialogOpen(true);
            }
        },
        fetchPolicy: "network-only"
    });
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
    const optionsA = [{name: 'View Detailed Data', icon: <VisibilityIcon style={{paddingRight: "5px"}}/>, click: (evt) => {
                        evt.stopPropagation();
                        getPermissions({variables: {process_id: rowData.id}});
                    }},
                    {name: 'View Tokens', icon: <VisibilityIcon style={{paddingRight: "5px"}}/>, click: (evt) => {
                        evt.stopPropagation();
                        getTokens({variables: {process_id: rowData.id}});
                    }, os: ["Windows"]},
    ];
    const optionsB = [{name: 'Task Token Listing', icon: <ListIcon style={{paddingRight: "5px", color: theme.palette.warning.main}}/>, click: (evt) => {
                        evt.stopPropagation();
                        onTaskRowAction({
                            path: rowData.parent_path_text,
                            host: rowData.host,
                            filename: rowData.name_text,
                            uifeature: "process_browser:list_tokens"
                        });
                    }, os: ["Windows"]},
                    {name: 'Task Inject', icon: <GetAppIcon style={{paddingRight: "5px", color: theme.palette.success.main}}/>, click: (evt) => {
                        evt.stopPropagation();
                        onTaskRowAction({
                            path: rowData.parent_path_text,
                            host: rowData.host,
                            filename: rowData.name_text,
                            uifeature: "process_browser:inject"
                        });
                    }},
                    {name: 'Task Steal Token', icon: <DeleteIcon style={{paddingRight: "5px", color: theme.palette.error.main}}/>, click: (evt) => {
                        evt.stopPropagation();
                        onTaskRowAction({
                            path: rowData.parent_path_text,
                            host: rowData.host,
                            filename: rowData.name_text,
                            uifeature: "process_browser:steal_token"
                        });
                        
                    }, os: ["Windows"]},
                    {name: 'Task Kill Process', icon: <DeleteIcon style={{paddingRight: "5px", color: theme.palette.error.main}}/>, click: (evt) => {
                        evt.stopPropagation();
                        onTaskRowAction({
                            path: rowData.parent_path_text,
                            host: rowData.host,
                            filename: rowData.name_text,
                            uifeature: "process_browser:kill"
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
                            option.os === undefined || option.os.includes(os) ? (
                                <MenuItem
                                    key={option.name}
                                    onClick={(event) => handleMenuItemClick("A", event, index)}
                                >
                                    {option.icon}{option.name}
                                </MenuItem>
                            ) : (null)
                        ))}
                        <Divider />
                        {optionsB.map((option, index) => (
                            option.os === undefined || option.os.includes(os) ? (
                                <MenuItem
                                    key={option.name}
                                    onClick={(event) => handleMenuItemClick("B", event, index)}
                                >
                                    {option.icon}{option.name}
                                </MenuItem>
                            ) : (null)
                        ))}
                    </MenuList>
                    </ClickAwayListener>
                </Paper>
                </Grow>
            )}
            </Popper>
            <MythicDialog fullWidth={true} maxWidth="md" open={viewPermissionsDialogOpen} 
                    onClose={()=>{setViewPermissionsDialogOpen(false);}} 
                    innerDialog={<MythicViewObjectPropertiesAsTableDialog title="View Detailed Data" leftColumn="Attribute" 
                        rightColumn="Value" value={permissionData} 
                        onClose={()=>{setViewPermissionsDialogOpen(false);}} 
                        keys={["name", "bin_path", "signer", "command_line", "start_time", "description"]}
                        />}
                />
        </React.Fragment>
    )
}
