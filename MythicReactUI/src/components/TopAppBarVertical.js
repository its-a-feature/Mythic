import React from 'react';
import { styled } from '@mui/material/styles';
import CameraAltTwoToneIcon from '@mui/icons-material/CameraAltTwoTone';
import { useTheme } from '@mui/material/styles';
import MuiDrawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ManageAccountsTwoToneIcon from '@mui/icons-material/ManageAccountsTwoTone';
import { Link } from 'react-router-dom';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import SportsScoreIcon from '@mui/icons-material/SportsScore';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { FailedRefresh, defaultShortcuts, operatorSettingDefaults} from '../cache';
import { TopAppBarVerticalEventLogNotifications} from './TopAppBarEventLogNotifications';
import { EventFeedNotifications } from './EventFeedNotifications';
import HelpTwoToneIcon from '@mui/icons-material/HelpTwoTone';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import  ReactLogo from '../assets/Mythic_Logo.svg';
import JupyterLogo from '../assets/jupyter.png';
import GraphQLLogo from '../assets/graphql.png';
import SpaceDashboardTwoToneIcon from '@mui/icons-material/SpaceDashboardTwoTone';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import TableChartTwoToneIcon from '@mui/icons-material/TableChartTwoTone';
import PostAddIcon from '@mui/icons-material/PostAdd';
import EditIcon from '@mui/icons-material/Edit';
import { Typography } from '@mui/material';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import HeadsetTwoToneIcon from '@mui/icons-material/HeadsetTwoTone';
import CodeOffIcon from '@mui/icons-material/CodeOff';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faBiohazard} from '@fortawesome/free-solid-svg-icons';
import AttachmentIcon from '@mui/icons-material/Attachment';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import {faSocks} from '@fortawesome/free-solid-svg-icons';
import {mythicUIVersion} from '../index';
import {MythicStyledTooltip} from './MythicComponents/MythicStyledTooltip';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ThumbDownTwoTone from '@mui/icons-material/ThumbDownTwoTone';
import { MythicDialog } from './MythicComponents/MythicDialog';
import {MythicFeedbackDialog} from './MythicComponents/MythicFeedbackDialog';
import LocalOfferTwoToneIcon from '@mui/icons-material/LocalOfferTwoTone';
import LightModeTwoToneIcon from '@mui/icons-material/LightModeTwoTone';
import DarkModeTwoToneIcon from '@mui/icons-material/DarkModeTwoTone';
import PlayCircleFilledTwoToneIcon from '@mui/icons-material/PlayCircleFilledTwoTone';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import {useQuery, gql} from '@apollo/client';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AssignmentIcon from '@mui/icons-material/Assignment';
import {GetMythicSetting, useGetMythicSetting, useSetMythicSetting} from "./MythicComponents/MythicSavedUserSetting";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import TableRow from '@mui/material/TableRow';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import {TableContainer, TableHead, Paper} from '@mui/material';
import Select from '@mui/material/Select';
import Input from '@mui/material/Input';
import DeleteIcon from '@mui/icons-material/Delete';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import MythicStyledTableCell from "./MythicComponents/MythicTableCell";
import {snackActions} from "./utilities/Snackbar";
import {Dropdown, DropdownMenuItem} from "./MythicComponents/MythicNestedMenus";
import ClickAwayListener from '@mui/material/ClickAwayListener';
import {
    Draggable,
    DragDropContext,
    Droppable,
} from "@hello-pangea/dnd";
import {reorder} from "./MythicComponents/MythicDraggableList";
import { useNavigate } from 'react-router-dom';

const PREFIX = 'TopAppBarVertical';

const classes = {
  listSubHeader: `${PREFIX}-listSubHeader`,
};

const openedMixin = (theme) => ({
    width: drawerWidth,
    overflowX: 'hidden',
    borderRadius: "0 !important",
    border: "0px !important",
});
const closedMixin = (theme) => ({
    overflowX: 'hidden',
    width: `calc(${theme.spacing(4)} + 1px)`,
    borderRadius: "0 !important",
     border: "0px !important",
    [theme.breakpoints.up('sm')]: {
      width: `calc(${theme.spacing(5)} + 1px)`,
      borderRadius: "0 !important",
      border: "0px !important",
  },
});
const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
    ({ theme }) => ({
      width: drawerWidth,
      flexShrink: 0,
      whiteSpace: 'nowrap',
      boxSizing: 'border-box',
      [`& .${classes.listSubHeader}`]: {
        //color: ` ${theme.navBarTextIconColor} !important`,
        backgroundColor: `${theme.topAppBarColor} !important`,
      },
      [`& .${classes.listSubHeader}:hover`]: {
        backgroundColor: `${theme.topAppBarColor} !important`,
        filter: `brightness(90%)`,
        color: `${theme.navBarTextIconColor} !important`,
      },
      variants: [
        {
          props: ({ open }) => open,
          style: {
            ...openedMixin(theme),
            '& .MuiDrawer-paper': openedMixin(theme),
          },
        },
        {
          props: ({ open }) => !open,
          style: {
            ...closedMixin(theme),
            '& .MuiDrawer-paper': closedMixin(theme),
          },
        },
      ],
    }),
);
export const StyledListItem = styled(ListItem)(
    ({ theme }) => ({
      paddingTop: "2px",
      paddingLeft: "10px",
      paddingRight: "10px",
      marginTop: 0,
      paddingBottom: "2px",
      color: theme.navBarTextColor,
    }),
);
export const StyledListItemIcon = styled(ListItemIcon)(
    ({ theme }) => ({
        paddingTop:0,
        marginTop: 0,
        paddingBottom: 0,
        minWidth: "45px",
        //color: theme.navBarTextIconColor,
    }),
);

const drawerWidth = 240;
const GET_SETTINGS = gql`
query getGlobalSettings {
  getGlobalSettings {
    settings
  }
}
`;
const Dashboard = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new' key={"home"} >
        <StyledListItemIcon >
            <MythicStyledTooltip title={"Operation Dashboard"} tooltipStyle={{display: "inline-flex"}}>
                <SpaceDashboardTwoToneIcon style={{color: theme.navBarTextIconColor}}  fontSize={"medium"} className="mythicElement" />
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Operation Dashboard"} />
      </StyledListItem>
  )
}
const ActiveCallbacks = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/callbacks' key={"callbacks"} >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Active Callbacks"} tooltipStyle={{display: "inline-flex"}}>
                <PhoneCallbackIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"} className="mythicElement"/>
            </MythicStyledTooltip>

        </StyledListItemIcon>
        <ListItemText primary={"Active Callbacks"} />
      </StyledListItem>
  )
}
const Payloads = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/payloads' key={"payloads"} >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Payloads"} tooltipStyle={{display: "inline-flex"}}>
                <FontAwesomeIcon style={{color: theme.navBarTextIconColor}} icon={faBiohazard} size="lg"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Payloads"} />
      </StyledListItem>
  )
}
const SearchCallbacks = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?tab=callbacks&searchField=Host&search=' >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Callbacks"} tooltipStyle={{display: "inline-flex"}}>
                <PhoneCallbackIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"} className="mythicElement"/>
                <ManageSearchIcon style={{color: theme.navBarTextIconColor, marginLeft: "-8px", marginTop: "7px", borderRadius: "5px"}} fontSize={"small"} />
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Callbacks"} />
      </StyledListItem>
  )
}
const SearchTasks = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?tab=tasks&searchField=Command+and+Parameters&search=&taskStatus=' >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Tasks"} tooltipStyle={{display: "inline-flex"}}>
                <AssignmentIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"} className="mythicElement"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Tasks"} />
      </StyledListItem>
  )
}
const SearchPayloads = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?tab=payloads&searchField=Filename&search=&taskStatus=&c2=All+C2&payloadtype=All+Payload+Types'>
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Payloads"} tooltipStyle={{display: "inline-flex"}}>
                <FontAwesomeIcon style={{color: theme.navBarTextIconColor}} size={"lg"} icon={faBiohazard} />
                <ManageSearchIcon style={{color: theme.navBarTextIconColor, marginLeft: "-8px", marginTop: "7px", borderRadius: "5px"}} fontSize={"small"} />
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Payloads"} />
      </StyledListItem>
  )
}
const SearchFiles = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?searchField=Filename&tab=files&location=Downloads&host=&search=' >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Files"} tooltipStyle={{display: "inline-flex"}}>
                <AttachmentIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"} className="mythicElement"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Files"} />
      </StyledListItem>
  )
}
const SearchScreenshots = () => {
    const theme = useTheme();
    return (
        <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?searchField=Filename&tab=files&location=Screenshots' >
            <StyledListItemIcon>
                <MythicStyledTooltip title={"Search Screenshots"} tooltipStyle={{display: "inline-flex"}}>
                    <CameraAltTwoToneIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"} className="mythicElement"/>
                </MythicStyledTooltip>
            </StyledListItemIcon>
            <ListItemText primary={"Search Screenshots"} />
        </StyledListItem>
    )
}
const SearchCredentials = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?t?searchField=Account&tab=credentials&search='>
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Credentials"} tooltipStyle={{display: "inline-flex"}}>
                <VpnKeyIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"} className="mythicElement" />
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Credentials"} />
      </StyledListItem>
  )
}
const SearchKeylogs = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?tab=keylogs&searchField=Host&search='>
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Keylogs"} tooltipStyle={{display: "inline-flex"}}>
                <KeyboardIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"} className="mythicElement"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Keylogs"} />
      </StyledListItem>
  )
}
const SearchArtifacts = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?tab=artifacts&searchField=Host&search=' >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Artifacts"} tooltipStyle={{display: "inline-flex"}}>
                <FingerprintIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"} className="mythicElement"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Artifacts"} />
      </StyledListItem>
  )
}
const SearchTokens = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?tab=tokens&searchField=Host&search=' >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Tokens"} tooltipStyle={{display: "inline-flex"}}>
                <ConfirmationNumberIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"} className="mythicElement"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Tokens"} />
      </StyledListItem>
  )
}
const SearchProxies = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?tab=socks'>
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Proxies"} tooltipStyle={{display: "inline-flex"}}>
                <FontAwesomeIcon style={{color: theme.navBarTextIconColor}} size={"lg"} icon={faSocks} />
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Proxies"} />
      </StyledListItem>
  )
}
const SearchProcesses = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?tab=processes&searchField=Name&search=&host=' >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Processes"} tooltipStyle={{display: "inline-flex"}}>
                <AccountTreeIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"} className="mythicElement"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Processes"} />
      </StyledListItem>
  )
}
const SearchTags = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?tab=tags&searchField=TagType&search=&host='>
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Tags"} tooltipStyle={{display: "inline-flex"}}>
                <LocalOfferTwoToneIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"} className="mythicElement"/>
                <ManageSearchIcon style={{color: theme.navBarTextIconColor, marginLeft: "-8px", marginTop: "7px", borderRadius: "5px"}} fontSize={"small"} />
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Tags"} />
      </StyledListItem>
  )
}
const Mitre = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/mitre' >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"MITRE ATT&CK"} tooltipStyle={{display: "inline-flex"}}>
                <TableChartTwoToneIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"} className="mythicElement"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"MITRE ATT&CK"} />
      </StyledListItem>
  )
}
const Reporting = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/reporting' >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Reporting"} tooltipStyle={{display: "inline-flex"}}>
                <SportsScoreIcon style={{color: theme.navBarTextIconColor}} size={"medium"} />
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Reporting"} />
      </StyledListItem>
  )
}
const Tags = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/tagtypes' >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Tags"} tooltipStyle={{display: "inline-flex"}}>
                <LocalOfferTwoToneIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"} className="mythicElement"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Tags"} />
      </StyledListItem>
  )
}
const Eventing = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/eventing' >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Eventing"} tooltipStyle={{display: "inline-flex"}}>
                <PlayCircleFilledTwoToneIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"} className="mythicElement"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Eventing"} />
      </StyledListItem>
  )
}
const JupyterNotebook = () => {
  return (
      <StyledListItem className={classes.listSubHeader} target="_blank" component={Link} to='/jupyter' key={"jupyter"} >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Jupyter Notebooks"} tooltipStyle={{display: "inline-flex"}}>
                <img src={JupyterLogo} height={"25px"} width={"25px"} />
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Jupyter Notebooks"} />
      </StyledListItem>
  )
}
const GraphQL = () => {
  return (
      <StyledListItem className={classes.listSubHeader} target="_blank" component={Link} to='/console' key={"console"} >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"GraphQL Console"} tooltipStyle={{display: "inline-flex"}}>
                <img src={GraphQLLogo} height={"25px"} width={"25px"} className="mythicElement"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"GraphQL Console"} />
      </StyledListItem>
  )
}
const CreatePayload = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/createpayload' key={"createpayload"}  state={{from: 'TopAppBar'}}>
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Create Payload"} tooltipStyle={{display: "inline-flex"}}>
                <FontAwesomeIcon style={{color: theme.navBarTextIconColor}} size={"lg"} icon={faBiohazard} />
                <AddCircleIcon color={"success"} style={{marginLeft: "-8px", marginTop: "7px", backgroundColor: "white", borderRadius: "10px"}} fontSize={"small"} />
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Create Payload"} />
      </StyledListItem>
  )
}
const CreateWrapper = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/createwrapper' key={"createwrapper"} >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Create Wrapper"} tooltipStyle={{display: "inline-flex"}}>
                <PostAddIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"} className="mythicElement"/>
                <AddCircleIcon color={"success"} style={{marginLeft: "-8px", marginTop: "7px", backgroundColor: "white", borderRadius: "10px"}} fontSize={"small"} />
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Create Wrapper"} />
      </StyledListItem>
  )
}
const PayloadTypesAndC2 = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/payloadtypes' key={"payloadtypes"}>
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Installed Services"} tooltipStyle={{display: "inline-flex"}}>
                <HeadsetTwoToneIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"} className="mythicElement"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Installed Services"} />
      </StyledListItem>
  )
}
const Operations = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/operations' key={"modifyoperations"}>
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Modify Operations"} tooltipStyle={{display: "inline-flex"}}>
                <EditIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"} className="mythicElement"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Modify Operations"} />
      </StyledListItem>
  )
}
const BrowserScripts = () => {
    const theme = useTheme();
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/browserscripts' key={"browserscripts"} >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Browser Scripts"} tooltipStyle={{display: "inline-flex"}}>
                <CodeOffIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"} className="mythicElement"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"BrowserScripts"} />
      </StyledListItem>
  )
}
const AllSettingOptions = [
    "Dashboard", "ActiveCallbacks", "Payloads", "SearchCallbacks", "SearchTasks", "SearchPayloads",
    "SearchFiles", "SearchScreenshots", "SearchCredentials", "SearchKeylogs", "SearchArtifacts", "SearchTokens", "SearchProxies",
    "SearchProcesses", "SearchTags", "Mitre", "Reporting", "Tags", "Eventing", "JupyterNotebook",
    "GraphQL", "CreatePayload", "CreateWrapper", "PayloadTypesAndC2", "Operations",
    "BrowserScripts"
].sort();

const TopAppBarVerticalAdjustShortcutsDialog = ({onClose}) => {
    const theme = useTheme();
    const sideShortcuts = useGetMythicSetting({setting_name: "sideShortcuts", default_value: defaultShortcuts})
    const [currentShortcuts, setCurrentShortcuts] = React.useState(sideShortcuts);
    const [updateSetting, _] = useSetMythicSetting();
    const reset = () => {
        setCurrentShortcuts(defaultShortcuts);
    }
    const onChangeShortcutValue = (event, i) => {
        if(event.target.value !== " "){
            let newShortcuts = [...currentShortcuts];
            newShortcuts[i] = event.target.value;
            setCurrentShortcuts(newShortcuts);
        }
    }
    const removeShortcut = (i) => {
        const newShortcuts = [...currentShortcuts];
        newShortcuts.splice(i, 1);
        setCurrentShortcuts(newShortcuts);
    }
    const addShortcut = (i) => {
        let index = i;
        if(index < 0){
            index = 0;
        }
        const newShortcuts = [...currentShortcuts];
        newShortcuts.splice(index, 0, AllSettingOptions[0]);
        setCurrentShortcuts(newShortcuts);
    }
    const onUpdate = () => {
        updateSetting({setting_name: "sideShortcuts", value: currentShortcuts});
        snackActions.success("Updated shortcuts!");
        onClose();
    }
    const onDragEnd = ({ destination, source }) => {
        // dropped outside the list
        if (!destination) return;
        const newItems = reorder(currentShortcuts, source.index, destination.index);
        setCurrentShortcuts(newItems);
    };
    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title">Configure Side Shortcuts</DialogTitle>
            <div style={{height: "calc(70vh)", display: "flex", flexDirection: "column"}}>
                <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main, marginBottom: "5px"}}>
                    <Button size={"small"} style={{color: "white", marginRight: "20px",}}
                            onClick={() => addShortcut(currentShortcuts.length)}
                            startIcon={<AddCircleIcon color="success" style={{backgroundColor: "white", borderRadius: "10px"}}/>}
                    >
                        Shortcut
                    </Button>
                    <Button size={"small"} onClick={reset}  color={"warning"}>
                        Reset To Defaults
                    </Button>
                </Paper>
                <TableContainer className="mythicElement" style={{flexGrow: 1}}>
                    <Table size="small" style={{width: "100%", "overflow": "scroll", tableLayout: "fixed"}}>
                        <TableHead>
                            <TableRow>
                                <MythicStyledTableCell style={{width: "2rem"}}></MythicStyledTableCell>
                                <MythicStyledTableCell style={{width: "2rem"}}></MythicStyledTableCell>
                                <MythicStyledTableCell></MythicStyledTableCell>
                            </TableRow>
                        </TableHead>
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="vertical-shortcuts-column-list">
                                {(provided) => (
                                    <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                                        {currentShortcuts.map((c, i) => (
                                            <Draggable key={c + i} draggableId={c} index={i}>
                                                {(provided2, snapshot) => (
                                                    <TableRow hover ref={provided2.innerRef}
                                                              {...provided2.draggableProps}
                                                              {...provided2.dragHandleProps}
                                                    >
                                                        <MythicStyledTableCell style={{width: "2rem"}}>
                                                            <DragHandleIcon/>
                                                        </MythicStyledTableCell>
                                                        <MythicStyledTableCell style={{width: "2rem"}}>
                                                            <IconButton onClick={() => removeShortcut(i)}>
                                                                <DeleteIcon color={"error"}/>
                                                            </IconButton>
                                                        </MythicStyledTableCell>
                                                        <MythicStyledTableCell style={{}}>
                                                            <Select
                                                                value={c}
                                                                onChange={(e) => onChangeShortcutValue(e, i)}
                                                                input={<Input style={{width: "100%"}}/>}
                                                            >
                                                                {AllSettingOptions.map((opt) => (
                                                                    <MenuItem value={opt} key={opt}>{opt}</MenuItem>
                                                                ))}
                                                            </Select>
                                                        </MythicStyledTableCell>
                                                    </TableRow>)}
                                            </Draggable>
                                        ))}
                                    </TableBody>)}
                            </Droppable>
                        </DragDropContext>
                    </Table>
                </TableContainer>
            </div>

            <DialogActions>
                <Button onClick={onClose} variant="contained" color="primary">
                    Cancel
                </Button>
                <Button onClick={onUpdate} variant="contained" color="success">
                    Update
                </Button>
            </DialogActions>
        </React.Fragment>
    )
}

export function TopAppBarVertical(props) {
  const theme = useTheme();
  const me = props.me;
  const navigate = useNavigate();
  const initialNavBarOpen = GetMythicSetting({setting_name: 'navBarOpen', default_value: operatorSettingDefaults.navBarOpen});
  const [updateSetting] = useSetMythicSetting();
  const [menuOpen, setMenuOpen] = React.useState(initialNavBarOpen);
  const [openExtra, setOpenExtra] = React.useState(false);
  const [openEditDialog, setOpenEditDialog ] = React.useState(false);
  const sideShortcuts = useGetMythicSetting({setting_name: "sideShortcuts", default_value: defaultShortcuts})
  const [serverVersion, setServerVersion] = React.useState("...");
  const [serverName, setServerName] = React.useState("...");
  useQuery(GET_SETTINGS, {fetchPolicy: "no-cache",
    onCompleted: (data) => {
      setServerVersion(data.getGlobalSettings.settings["MYTHIC_SERVER_VERSION"]);
      setServerName(data.getGlobalSettings.settings["MYTHIC_GLOBAL_SERVER_NAME"]);
    }
  });
  const toggleDrawerOpen = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setMenuOpen(!menuOpen);
      updateSetting({setting_name: "navBarOpen", value: !menuOpen})
  };
  const handleDrawerClose = () => {
      setMenuOpen(false);
      updateSetting({setting_name: "navBarOpen", value: false})
  }
  const handleToggleExtra = () => {
        setOpenExtra(!openExtra);
    }
  const getShortcuts = ({shortcuts}) => {
      return shortcuts.map( (c, i) => {
          switch (c) {
              case "Dashboard":
                  return <Dashboard key={c + i} />
              case "ActiveCallbacks":
                  return <ActiveCallbacks key={c + i} />
              case "Payloads":
                  return <Payloads key={c + i} />
              case "SearchCallbacks":
                  return <SearchCallbacks key={c + i} />
              case "SearchTasks":
                  return <SearchTasks key={c + i} />
              case "SearchPayloads":
                  return <SearchPayloads key={c + i} />
              case "SearchFiles":
                  return <SearchFiles key={c + i} />
              case "SearchScreenshots":
                  return <SearchScreenshots key={c + i} />
              case "SearchCredentials":
                  return <SearchCredentials key={c + i} />
              case "SearchKeylogs":
                  return <SearchKeylogs key={c + i} />
              case "SearchArtifacts":
                  return <SearchArtifacts key={c + i} />
              case "SearchTokens":
                  return <SearchTokens key={c + i} />
              case "SearchProxies":
                  return <SearchProxies key={c + i} />
              case "SearchProcesses":
                  return <SearchProcesses key={c + i} />
              case "SearchTags":
                  return <SearchTags key={c + i} />
              case "Mitre":
                  return <Mitre key={c + i} />
              case "Reporting":
                  return <Reporting key={c + i} />
              case "Tags":
                  return <Tags key={c + i} />
              case "Eventing":
                  return <Eventing key={c + i} />
              case "JupyterNotebook":
                  return <JupyterNotebook key={c + i} />
              case "GraphQL":
                  return <GraphQL key={c + i} />
              case "CreatePayload":
                  return <CreatePayload key={c + i} />
              case "CreateWrapper":
                  return <CreateWrapper key={c + i} />
              case "PayloadTypesAndC2":
                  return <PayloadTypesAndC2 key={c + i} />
              case "Operations":
                  return <Operations key={c + i} />
              case "BrowserScripts":
                  return <BrowserScripts key={c + i} />
          }
      })
  }
  const getExtraShortcuts = () => {
      const extraShortcuts = AllSettingOptions.reduce( (prev, cur) => {
          if(sideShortcuts.includes(cur)){
              return [...prev];
          }
          return [...prev, cur];
      }, []);
      return getShortcuts({shortcuts: extraShortcuts})
  }
  const openEditShortcuts = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setOpenEditDialog(true);
  }
  return (
    <>
      {me?.user?.current_operation_id ? (<EventFeedNotifications me={me} />) : null }
      <Drawer anchor="left" variant="permanent" open={menuOpen} onClose={handleDrawerClose}
        style={{borderRight: "1px solid grey !important"}}>
        <List style={{paddingTop: 0, marginTop: 0, height: "100%", display: "flex", flexDirection: "column",
            backgroundColor: theme.topAppBarColor,
            borderBottom: "unset !important", borderLeft: "unset !important", borderTop: "unset !important"}}>
          <ListItem className={classes.listSubHeader} style={{marginTop:0, paddingTop: 0, paddingLeft: "2px", paddingBottom: 0}}>
            <ListItemIcon >
                <img src={ReactLogo} onClick={()=>navigate('/new')} width={"40px"} height={"35px"}/>
            </ListItemIcon>
            <ListItemText style={{margin: 0}} primary={
                <>
                    <Typography style={{ fontSize: 12, color: theme.navBarTextColor, display: "inline-block"}}>
                        <b>Mythic:</b> v{serverVersion}<br/>
                        <b>UI:</b> v{mythicUIVersion}<br/>
                    </Typography>
                    <IconButton onClick={props.toggleTheme} style={{float:"right", display: menuOpen ? "" : "none"}} >
                        {theme.palette.mode === 'light' &&
                            <DarkModeTwoToneIcon style={{color: "#2f0e67"}} fontSize={"medium"} className="mythicElement" />
                        }
                        {theme.palette.mode === 'dark' &&
                            <LightModeTwoToneIcon style={{color: '#eacc1b'}} fontSize={"medium"} className="mythicElement" />
                        }
                    </IconButton>
                </>
            } />
          </ListItem>
          <StyledListItem className={classes.listSubHeader} onClick={toggleDrawerOpen} style={{height: "30px"}} >
            <StyledListItemIcon ><MenuIcon style={{color: theme.navBarTextIconColor}} onClick={toggleDrawerOpen} fontSize={"medium"} className="mythicElement" /></StyledListItemIcon>
            <ListItemText primary={
              <>
                <MythicStyledTooltip title={"Edit Shortcuts"} tooltipStyle={{float: menuOpen ? 'right' : '', margin: 0, padding: 0}}>
                    <Button onClick={openEditShortcuts} style={{color: theme.navBarTextColor}}>
                        <EditIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"}/> Edit
                    </Button>

                </MythicStyledTooltip>
              </>
            } />
          </StyledListItem>
            {openEditDialog &&
                <MythicDialog open={openEditDialog} fullWidth={true} maxWidth={"sm"}
                              onClose={()=>{setOpenEditDialog(false);}}
                              innerDialog={<TopAppBarVerticalAdjustShortcutsDialog
                                  onClose={()=>{setOpenEditDialog(false);}}  />}
                />
            }
        <StyledListItem className={classes.listSubHeader} style={{display: me?.user?.current_operation_id === 0 ? "" : "none"}}>
            <ListItemText primary={
                <>
                    <Link style={{display: "inline-flex", alignItems: "center", paddingRight: "10px", color: "#f84d4d",
                        fontWeight: "bold",}} to="/new/operations">
                        {"CLICK TO SET OPERATION!"}
                    </Link>
                </>

            } />
        </StyledListItem>
            <Divider style={{borderColor: "white"}} />
            <div style={{flexGrow: 1, overflowY: "auto", overflowX: "hidden"}}>
                {getShortcuts({shortcuts: sideShortcuts})}
                <Divider style={{borderColor: "white"}} />
                <StyledListItem className={classes.listSubHeader} onClick={handleToggleExtra}>
                    <StyledListItemIcon>
                        <MoreHorizIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"} />
                    </StyledListItemIcon>
                    <ListItemText>Extra Shortcuts</ListItemText>
                    {openExtra ? <ExpandLess /> : <ExpandMore />}
                </StyledListItem>
                {openExtra &&  getExtraShortcuts()}
                <Divider style={{borderColor: "white"}} />
                <div className={classes.listSubHeader} style={{ flexGrow: 1}}></div>
            </div>
          <TopBarRightShortcutsVertical me={me} menuOpen={menuOpen} serverName={serverName} />
        </List>
      </Drawer>
    </>
  );
}

function TopBarRightShortcutsVertical({me, menuOpen, serverName}){
    const theme = useTheme();
  const documentationRef = React.useRef(null);
  const [documentationOpen, setDocumentationOpen] = React.useState(false);
  const settingsRef = React.useRef(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [openFeedbackForm, setOpenFeedbackForm] = React.useState(false);
  const handleLogout = () => {
    FailedRefresh(true);
  }
  const handleSettingsMenu = (event) => {
      settingsRef.current = {
          currentTarget: event.currentTarget,
          absoluteX: event.clientX,
          absoluteY: event.clientY,
      };
      setSettingsOpen(true);
  };
  const handleSettingsClose = (evt) => {
      setSettingsOpen(false);
  };
  const handleDocumentationMenu = (event) => {
      documentationRef.current = {
          currentTarget: event.currentTarget,
          absoluteX: event.clientX,
          absoluteY: event.clientY,
      };
      setDocumentationOpen(true);
  };
  const handleDocumentationClose = (evt) => {
      setDocumentationOpen(false);
  };
  const documentationOptions = [
      {
          name: "Agent Documentation",
          to: "/docs/agents",
      },
      {
          name: "Wrapper Documentation",
          to: "/docs/wrappers"
      },
      {
          name: "C2 Profile Documentation",
          to: "/docs/c2-profiles"
      },
      {
          name: "Mythic Documentation",
          to:  "https://docs.mythic-c2.net"
      }
  ]
  const settingsOptions = [
      {
          name: (
              <>
                  <Typography paragraph={true} variant={"caption"} style={{marginBottom: "0"}}>Server Name:</Typography>
                  <Typography paragraph={true} variant={"body1"} style={{marginBottom: "0", fontWeight: 600}}>{serverName}</Typography>
              </>),
          disabled: true,
          click: handleSettingsClose
      },
      {
          name: (
              <>
                  <Typography paragraph={true} variant="caption" style={{marginBottom: "0"}}>Signed in as:</Typography>
                  <Typography paragraph={true} variant="body1"  style={{marginBottom: "0", fontWeight: 600}}> {me?.user?.username || "" } </Typography>
              </>
          ),
          to: "/new/settings",
          component: Link,
          click: handleSettingsClose
      },
      {
          name: "Logout",
          click: handleLogout,
          to: "",
      }
  ]
    return (
        <>
            {documentationOpen &&
                <ClickAwayListener onClickAway={handleDocumentationClose} mouseEvent={"onMouseDown"}>
                    <Dropdown
                        isOpen={documentationRef.current.currentTarget}
                        onOpen={setDocumentationOpen}
                        externallyOpen={documentationOpen}
                        absoluteY={documentationRef.current.absoluteY}
                        absoluteX={documentationRef.current.absoluteX}
                        anchorReference={"anchorPosition"}
                        transformOrigin={{
                            vertical: 'bottom',
                            horizontal: 'left',
                        }}
                        anchorOrigin={{
                            vertical: 'top',
                            horizontal: 'left',
                        }}
                        menu={
                            documentationOptions.map(option => (
                                <DropdownMenuItem
                                    key={option.name}
                                    disabled={option.disabled}
                                    onClick={handleDocumentationClose}
                                    component={Link}
                                    target={"_blank"}
                                    to={option.to}
                                >
                                    {option.name}
                                </DropdownMenuItem>
                            ))
                        }
                    />
                </ClickAwayListener>
            }
            {settingsOpen &&
                <ClickAwayListener onClickAway={handleSettingsClose} mouseEvent={"onMouseDown"}>
                    <Dropdown
                        isOpen={settingsRef.current}
                        onOpen={setSettingsOpen}
                        externallyOpen={settingsOpen}
                        absoluteY={settingsRef.current.absoluteY}
                        absoluteX={settingsRef.current.absoluteX}
                        anchorReference={"anchorPosition"}
                        transformOrigin={{
                            vertical: 'bottom',
                            horizontal: 'left',
                        }}
                        anchorOrigin={{
                            vertical: 'top',
                            horizontal: 'left',
                        }}
                        menu={
                            settingsOptions.map(option => (
                                <DropdownMenuItem
                                    key={option.name}
                                    disabled={option.disabled}
                                    onClick={option.click}
                                    component={option.component}
                                    style={{display: "block"}}
                                    to={option.to}
                                    divider={true}
                                >
                                    {option.name}
                                </DropdownMenuItem>
                            ))
                        }
                    />
                </ClickAwayListener>
            }
          <StyledListItem className={classes.listSubHeader} onClick={() => setOpenFeedbackForm(true)} >
            <StyledListItemIcon>
                <MythicStyledTooltip title={"Submit feedback via Webhook"} tooltipStyle={{display: "inline-flex"}}>
                    <ThumbDownTwoTone style={{color: theme.navBarTextIconColor}} fontSize={"medium"} className="mythicElement" />
                </MythicStyledTooltip>
            </StyledListItemIcon>
            <ListItemText primary={"Send Feedback"} />
          </StyledListItem>
            {openFeedbackForm &&
                <MythicDialog fullWidth={true} maxWidth="md" open={openFeedbackForm}
                              onClose={()=>{setOpenFeedbackForm(false);}}
                              innerDialog={<MythicFeedbackDialog
                                  title={"Submit Feedback via Webhook"}
                                  onClose={()=>{setOpenFeedbackForm(false);}} />}
                />
            }
          <StyledListItem className={classes.listSubHeader} onClick={handleDocumentationMenu} >
            <StyledListItemIcon>
                <MythicStyledTooltip title={"Documentation Links"} tooltipStyle={{display: "inline-flex"}}>
                  <HelpTwoToneIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"} className="mythicElement"/>
                  <KeyboardArrowDownIcon style={{color: theme.navBarTextIconColor, display: menuOpen ? "" : "none"}} />
                </MythicStyledTooltip>
            </StyledListItemIcon>
            <ListItemText primary={"Help"} />
          </StyledListItem>

          <StyledListItem className={classes.listSubHeader} component={Link} to='/new/EventFeed' >
            <StyledListItemIcon>
                <MythicStyledTooltip title={"Event Feed"} tooltipStyle={{display: "inline-flex"}}>
                    <TopAppBarVerticalEventLogNotifications />
                </MythicStyledTooltip>
            </StyledListItemIcon>
            <ListItemText primary={"Event Feed"} />
          </StyledListItem>

          <StyledListItem className={classes.listSubHeader} onClick={handleSettingsMenu} >
            <StyledListItemIcon>
                <MythicStyledTooltip title={"User Settings"} tooltipStyle={{display: "inline-flex"}}>
                    <ManageAccountsTwoToneIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"} className="mythicElement" />
                    <KeyboardArrowDownIcon style={{color: theme.navBarTextIconColor, display: menuOpen ? "" : "none"}} />
                </MythicStyledTooltip>
            </StyledListItemIcon>
            <ListItemText primary={"Settings"} />
          </StyledListItem>
        </>
    )
}