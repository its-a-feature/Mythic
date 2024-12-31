import React from 'react';
import { styled } from '@mui/material/styles';
import CameraAltTwoToneIcon from '@mui/icons-material/CameraAltTwoTone';
import { useTheme } from '@mui/material/styles';
import MuiDrawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ManageAccountsTwoToneIcon from '@mui/icons-material/ManageAccountsTwoTone';
import Menu from '@mui/material/Menu';
import { Link } from 'react-router-dom';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import SportsScoreIcon from '@mui/icons-material/SportsScore';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { useReactiveVar } from '@apollo/client';
import {menuOpen, FailedRefresh} from '../cache';
import { TopAppBarVerticalEventLogNotifications} from './TopAppBarEventLogNotifications';
import { EventFeedNotifications } from './EventFeedNotifications';
import HelpTwoToneIcon from '@mui/icons-material/HelpTwoTone';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import  ReactLogo from '../assets/Mythic_Logo.svg';
import JupyterLogo from '../assets/jupyter.png';
import GraphQLLogo from '../assets/graphql.png';
import SpaceDashboardTwoToneIcon from '@mui/icons-material/SpaceDashboardTwoTone';
import Collapse from '@mui/material/Collapse';
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
import PublicIcon from '@mui/icons-material/Public';
import LightModeTwoToneIcon from '@mui/icons-material/LightModeTwoTone';
import DarkModeTwoToneIcon from '@mui/icons-material/DarkModeTwoTone';
import PlayCircleFilledTwoToneIcon from '@mui/icons-material/PlayCircleFilledTwoTone';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import {useQuery, gql} from '@apollo/client';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VerifiedTwoToneIcon from '@mui/icons-material/VerifiedTwoTone';
import {useGetMythicSetting, useSetMythicSetting} from "./MythicComponents/MythicSavedUserSetting";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import TableRow from '@mui/material/TableRow';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import Select from '@mui/material/Select';
import Input from '@mui/material/Input';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import MythicStyledTableCell from "./MythicComponents/MythicTableCell";
import {snackActions} from "./utilities/Snackbar";
import {Dropdown, DropdownMenuItem} from "./MythicComponents/MythicNestedMenus";
import ClickAwayListener from '@mui/material/ClickAwayListener';

const PREFIX = 'TopAppBarVertical';

const classes = {
  root: `${PREFIX}-root`,
  title: `${PREFIX}-title`,
  hide: `${PREFIX}-hide`,
  drawer: `${PREFIX}-drawer`,
  drawerPaper: `${PREFIX}-drawerPaper`,
  drawerHeader: `${PREFIX}-drawerHeader`,
  listSubHeader: `${PREFIX}-listSubHeader`,
  appBar: `${PREFIX}-appBar`,
  appBarShift: `${PREFIX}-appBarShift`,
  nested: `${PREFIX}-nested`,
  mythicElement: `${PREFIX}-mythicElement`,
  menuButton: `${PREFIX}-menuButton`,
};

const openedMixin = (theme) => ({
    width: drawerWidth,
    overflowX: 'hidden',
    borderRadius: "0 !important",
    border: "0px !important"
});
const closedMixin = (theme) => ({
    overflowX: 'hidden',
    width: `calc(${theme.spacing(5)} + 1px)`,
    borderRadius: "0 !important",
     border: "0px !important",
    [theme.breakpoints.up('sm')]: {
      width: `calc(${theme.spacing(6)} + 1px)`,
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
      [`& .${classes.nested}`]: {
        paddingLeft: "20px",
      },
      [`& .${classes.listSubHeader}`]: {
        backgroundColor: `${theme.topAppBarColor} !important`,
        color: "white !important",
      },
      [`& .${classes.listSubHeader}:hover`]: {
        backgroundColor: `${theme.topAppBarColor} !important`,
        filter: `brightness(90%)`,
        color: "white !important",
      },
      [`& .${classes.listSubHeader}:state(hover)`]: {
        backgroundColor: `${theme.topAppBarColor} !important`,
        filter: `brightness(90%)`,
        color: "white !important",
      },
      [`& .${classes.nested}`]: {
        backgroundColor: `${theme.topAppBarColor} !important`,
        color: "white !important",
        paddingLeft: theme.spacing(4),
      },
      [`& .${classes.nested}:hover`]: {
        backgroundColor: `${theme.topAppBarColor} !important`,
        filter: `brightness(90%)`,
        color: "white !important",
        paddingLeft: theme.spacing(4),
      },
      [`& .${classes.nested}:state(hover)`]: {
        backgroundColor: `${theme.topAppBarColor} !important`,
        filter: `brightness(90%)`,
        color: "white !important",
        paddingLeft: theme.spacing(4),
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
      paddingTop:0,
      paddingLeft: "12px",
      marginTop: 0,
      paddingBottom: 0,
      color: "white",
    }),
);
export const StyledListItemIcon = styled(ListItemIcon)(
    ({ theme }) => ({
        paddingTop:0,
        marginTop: 0,
        paddingBottom: 0,
        minWidth: "45px",
        color: "white",
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
  return (
      <StyledListItem className={classes.listSubHeader} button component={Link} to='/new' key={"home"} >
        <StyledListItemIcon ><SpaceDashboardTwoToneIcon style={{color: "white"}}  fontSize={"medium"} className="mythicElement" /></StyledListItemIcon>
        <ListItemText primary={"Operation Dashboard"} />
      </StyledListItem>
  )
}
const ActiveCallbacks = () => {
  return (
      <StyledListItem className={classes.listSubHeader} button component={Link} to='/new/callbacks' key={"callbacks"} >
        <StyledListItemIcon><PhoneCallbackIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></StyledListItemIcon>
        <ListItemText primary={"Active Callbacks"} />
      </StyledListItem>
  )
}
const Payloads = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/payloads' key={"payloads"} >
        <StyledListItemIcon><FontAwesomeIcon style={{color: "white"}} icon={faBiohazard} size="lg"/></StyledListItemIcon>
        <ListItemText primary={"Payloads"} />
      </StyledListItem>
  )
}
const SearchCallbacks = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?tab=callbacks&searchField=Host&search=' >
        <StyledListItemIcon>
            <PhoneCallbackIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/>
            <ManageSearchIcon color={"info"} style={{marginLeft: "-8px", marginTop: "7px", backgroundColor: "white", borderRadius: "5px"}} fontSize={"small"} />
        </StyledListItemIcon>
        <ListItemText primary={"Search Callbacks"} />
      </StyledListItem>
  )
}
const SearchTasks = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?tab=tasks&searchField=Command+and+Parameters&search=&taskStatus=' >
        <StyledListItemIcon>
            <AssignmentIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/>
        </StyledListItemIcon>
        <ListItemText primary={"Search Tasks"} />
      </StyledListItem>
  )
}
const SearchPayloads = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?tab=payloads&searchField=Filename&search=&taskStatus=&c2=All+C2&payloadtype=All+Payload+Types'>
        <StyledListItemIcon>
            <FontAwesomeIcon style={{color: "white"}} size={"lg"} icon={faBiohazard} />
            <ManageSearchIcon color={"info"} style={{marginLeft: "-8px", marginTop: "7px", backgroundColor: "white", borderRadius: "5px"}} fontSize={"small"} />
        </StyledListItemIcon>
        <ListItemText primary={"Search Payloads"} />
      </StyledListItem>
  )
}
const SearchFiles = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?searchField=Filename&tab=files&location=Downloads&host=&search=' >
        <StyledListItemIcon><AttachmentIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></StyledListItemIcon>
        <ListItemText primary={"Search Files"} />
      </StyledListItem>
  )
}
const SearchScreenshots = () => {
    return (
        <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?searchField=Filename&tab=files&location=Screenshots' >
            <StyledListItemIcon><CameraAltTwoToneIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></StyledListItemIcon>
            <ListItemText primary={"Search Screenshots"} />
        </StyledListItem>
    )
}
const SearchCredentials = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?t?searchField=Account&tab=credentials&search='>
        <StyledListItemIcon><VpnKeyIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement" /></StyledListItemIcon>
        <ListItemText primary={"Search Credentials"} />
      </StyledListItem>
  )
}
const SearchKeylogs = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?tab=keylogs&searchField=Host&search='>
        <StyledListItemIcon><KeyboardIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></StyledListItemIcon>
        <ListItemText primary={"Search Keylogs"} />
      </StyledListItem>
  )
}
const SearchArtifacts = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?tab=artifacts&searchField=Host&search=' >
        <StyledListItemIcon><FingerprintIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></StyledListItemIcon>
        <ListItemText primary={"Search Artifacts"} />
      </StyledListItem>
  )
}
const SearchTokens = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?tab=tokens&searchField=Host&search=' >
        <StyledListItemIcon><ConfirmationNumberIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></StyledListItemIcon>
        <ListItemText primary={"Search Tokens"} />
      </StyledListItem>
  )
}
const SearchProxies = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?tab=socks'>
        <StyledListItemIcon><FontAwesomeIcon style={{color: "white"}} size={"lg"} icon={faSocks} /></StyledListItemIcon>
        <ListItemText primary={"Search Proxies"} />
      </StyledListItem>
  )
}
const SearchProcesses = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?tab=processes&searchField=Name&search=&host=' >
        <StyledListItemIcon><AccountTreeIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></StyledListItemIcon>
        <ListItemText primary={"Search Processes"} />
      </StyledListItem>
  )
}
const SearchTags = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?tab=tags&searchField=TagType&search=&host='>
        <StyledListItemIcon>
            <LocalOfferTwoToneIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/>
            <ManageSearchIcon color={"info"} style={{marginLeft: "-8px", marginTop: "7px", backgroundColor: "white", borderRadius: "5px"}} fontSize={"small"} />
        </StyledListItemIcon>
        <ListItemText primary={"Search Tags"} />
      </StyledListItem>
  )
}
const Mitre = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/mitre' >
        <StyledListItemIcon><TableChartTwoToneIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></StyledListItemIcon>
        <ListItemText primary={"MITRE ATT&CK"} />
      </StyledListItem>
  )
}
const Reporting = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/reporting' >
        <StyledListItemIcon><SportsScoreIcon style={{color: "white"}} size={"medium"} /></StyledListItemIcon>
        <ListItemText primary={"Reporting"} />
      </StyledListItem>
  )
}
const Tags = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/tagtypes' >
        <StyledListItemIcon><LocalOfferTwoToneIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></StyledListItemIcon>
        <ListItemText primary={"Tags"} />
      </StyledListItem>
  )
}
const Eventing = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/eventing' >
        <StyledListItemIcon><PlayCircleFilledTwoToneIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></StyledListItemIcon>
        <ListItemText primary={"Eventing"} />
      </StyledListItem>
  )
}
const JupyterNotebook = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} target="_blank" component={Link} to='/jupyter' key={"jupyter"} >
        <StyledListItemIcon><img src={JupyterLogo} height={"25px"} width={"25px"} /></StyledListItemIcon>
        <ListItemText primary={"Jupyter Notebooks"} />
      </StyledListItem>
  )
}
const GraphQL = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} target="_blank" component={Link} to='/console' key={"console"} >
        <StyledListItemIcon><img src={GraphQLLogo} height={"25px"} width={"25px"} className="mythicElement"/></StyledListItemIcon>
        <ListItemText primary={"GraphQL Console"} />
      </StyledListItem>
  )
}
const ConsumingServices = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/consuming_services' key={"consuming"} >
        <StyledListItemIcon><PublicIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></StyledListItemIcon>
        <ListItemText primary={"Consuming Services"} />
      </StyledListItem>
  )
}
const CreatePayload = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/createpayload' key={"createpayload"}  state={{from: 'TopAppBar'}}>
        <StyledListItemIcon>
            <FontAwesomeIcon style={{color: "white"}} size={"lg"} icon={faBiohazard} />
            <AddCircleIcon color={"success"} style={{marginLeft: "-8px", marginTop: "7px", backgroundColor: "white", borderRadius: "10px"}} fontSize={"small"} />
        </StyledListItemIcon>
        <ListItemText primary={"Create Payload"} />
      </StyledListItem>
  )
}
const CreateWrapper = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/createwrapper' key={"createwrapper"} >
        <StyledListItemIcon>
            <PostAddIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/>
            <AddCircleIcon color={"success"} style={{marginLeft: "-8px", marginTop: "7px", backgroundColor: "white", borderRadius: "10px"}} fontSize={"small"} />
        </StyledListItemIcon>
        <ListItemText primary={"Create Wrapper"} />
      </StyledListItem>
  )
}
const PayloadTypesAndC2 = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/payloadtypes' key={"payloadtypes"}>
        <StyledListItemIcon><HeadsetTwoToneIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></StyledListItemIcon>
        <ListItemText primary={"Payload Types & C2"} />
      </StyledListItem>
  )
}
const Operations = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/operations' key={"modifyoperations"}>
        <StyledListItemIcon><EditIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></StyledListItemIcon>
        <ListItemText primary={"Modify Operations"} />
      </StyledListItem>
  )
}
const BrowserScripts = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/browserscripts' key={"browserscripts"} >
        <StyledListItemIcon><CodeOffIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></StyledListItemIcon>
        <ListItemText primary={"BrowserScripts"} />
      </StyledListItem>
  )
}
const AllSettingOptions = [
    "Dashboard", "ActiveCallbacks", "Payloads", "SearchCallbacks", "SearchTasks", "SearchPayloads",
    "SearchFiles", "SearchScreenshots", "SearchCredentials", "SearchKeylogs", "SearchArtifacts", "SearchTokens", "SearchProxies",
    "SearchProcesses", "SearchTags", "Mitre", "Reporting", "Tags", "Eventing", "JupyterNotebook",
    "GraphQL", "ConsumingServices", "CreatePayload", "CreateWrapper", "PayloadTypesAndC2", "Operations",
    "BrowserScripts"
].sort();
const defaultShortcuts = [
    "PayloadTypesAndC2", "Payloads", "SearchCallbacks", "SearchFiles", "SearchArtifacts", "SearchProxies",
    "SearchScreenshots", "SearchCredentials", "ActiveCallbacks", "Reporting",  "Mitre",
    "Tags", "Eventing",
].sort();
const TopAppBarVerticalAdjustShortcutsDialog = ({onClose}) => {
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
    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title">Configure Side Shortcuts</DialogTitle>
            <TableContainer  className="mythicElement">
                <Table size="small" style={{ width: "100%", "overflow": "scroll", tableLayout: "fixed"}}>
                    <TableBody>
                        {currentShortcuts.map( (c, i) => (
                            <TableRow hover key={c + i} >
                                <MythicStyledTableCell style={{width: "2rem"}}>
                                    <MythicStyledTooltip title={"Insert Above"}>
                                        <IconButton onClick={() => addShortcut(i )} style={{padding: 0}} disableFocusRipple={true}>
                                            <ArrowUpwardIcon fontSize={"medium"}/>
                                            <AddCircleIcon color={"success"} style={{marginLeft: "-10px", marginTop: "20px"}} fontSize={"small"} />
                                        </IconButton>
                                    </MythicStyledTooltip>
                                </MythicStyledTableCell>
                                <MythicStyledTableCell style={{width: "2rem"}}>
                                    <IconButton onClick={() => removeShortcut(i)}>
                                        <DeleteIcon color={"error"} />
                                    </IconButton>
                                </MythicStyledTableCell>
                                <MythicStyledTableCell style={{}}>
                                    <Select
                                        value={c}
                                        onChange={(e) => onChangeShortcutValue(e,i)}
                                        input={<Input style={{width: "100%"}}/>}
                                    >
                                        {AllSettingOptions.map( (opt) => (
                                            <MenuItem value={opt} key={opt}>{opt}</MenuItem>
                                        ) )}
                                    </Select>
                                </MythicStyledTableCell>

                            </TableRow>
                        ))}
                        <TableRow hover>
                            <MythicStyledTableCell></MythicStyledTableCell>
                            <MythicStyledTableCell></MythicStyledTableCell>
                            <MythicStyledTableCell >
                                <Button color={"success"} onClick={() => addShortcut(currentShortcuts.length)} >
                                    Add Shortcut to Bottom
                                </Button>
                                <Button onClick={reset} color={"warning"}>
                                    Reset To Defaults
                                </Button>
                            </MythicStyledTableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
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
  const isOpen = useReactiveVar(menuOpen);
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
  const toggleDrawerOpen = () => {
    menuOpen(!isOpen);
  };
  const handleDrawerClose = () => {
    menuOpen(false);
  }
  const handleToggleExtra = () => {
        setOpenExtra(!openExtra);
    }
  const getShortcuts = ({shortcuts}) => {
      return shortcuts.map( c => {
          switch (c) {
              case "Dashboard":
                  return <Dashboard />
              case "ActiveCallbacks":
                  return <ActiveCallbacks />
              case "Payloads":
                  return <Payloads />
              case "SearchCallbacks":
                  return <SearchCallbacks />
              case "SearchTasks":
                  return <SearchTasks />
              case "SearchPayloads":
                  return <SearchPayloads />
              case "SearchFiles":
                  return <SearchFiles />
              case "SearchScreenshots":
                  return <SearchScreenshots />
              case "SearchCredentials":
                  return <SearchCredentials />
              case "SearchKeylogs":
                  return <SearchKeylogs />
              case "SearchArtifacts":
                  return <SearchArtifacts />
              case "SearchTokens":
                  return <SearchTokens />
              case "SearchProxies":
                  return <SearchProxies />
              case "SearchProcesses":
                  return <SearchProcesses />
              case "SearchTags":
                  return <SearchTags />
              case "Mitre":
                  return <Mitre />
              case "Reporting":
                  return <Reporting />
              case "Tags":
                  return <Tags />
              case "Eventing":
                  return <Eventing />
              case "JupyterNotebook":
                  return <JupyterNotebook />
              case "GraphQL":
                  return <GraphQL />
              case "ConsumingServices":
                  return <ConsumingServices />
              case "CreatePayload":
                  return <CreatePayload />
              case "CreateWrapper":
                  return <CreateWrapper />
              case "PayloadTypesAndC2":
                  return <PayloadTypesAndC2 />
              case "Operations":
                  return <Operations />
              case "BrowserScripts":
                  return <BrowserScripts />
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
  return (
    <>
      {me?.user?.current_operation_id ? (<EventFeedNotifications me={me} />) : null }
      <Drawer anchor="left" variant="permanent" open={isOpen} onClose={handleDrawerClose} >
        <List style={{paddingTop: 0, marginTop: 0, height: "100%", display: "flex", flexDirection: "column", backgroundColor: theme.topAppBarColor, border: "unset !important"}}>
          <ListItem className={classes.listSubHeader} style={{marginTop:0, paddingTop: 0, paddingLeft: "2px", paddingBottom: 0}}>
            <ListItemIcon ><img src={ReactLogo} width={"40px"} height={"35px"}/></ListItemIcon>
            <ListItemText primary={
                <>
                    <Typography style={{ fontSize: 12, color: "white", display: "inline-block"}}>
                        <b>Mythic:</b> v{serverVersion}<br/>
                        <b>UI:</b> v{mythicUIVersion}<br/>
                    </Typography>
                    <IconButton onClick={props.toggleTheme} style={{float: isOpen? "right" :""}} >
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
          <StyledListItem className={classes.listSubHeader} button style={{height: "20px"}} >
            <StyledListItemIcon ><MenuIcon style={{color: "white"}} onClick={toggleDrawerOpen} fontSize={"medium"} className="mythicElement" /></StyledListItemIcon>
            <ListItemText primary={
              <>
                <MythicStyledTooltip title={"Edit Shortcuts"} tooltipStyle={{float: isOpen ? 'right' : '', margin: 0, padding: 0}}>
                    <Button onClick={() => setOpenEditDialog(true)} style={{color: "white"}}>
                        <EditIcon style={{color: "white"}} fontSize={"medium"}/> Edit
                    </Button>

                </MythicStyledTooltip>
              </>
            } />
          </StyledListItem>
            {openEditDialog &&
                <MythicDialog open={openEditDialog} fullWidth={true} maxWidth={"md"}
                              onClose={()=>{setOpenEditDialog(false);}}
                              innerDialog={<TopAppBarVerticalAdjustShortcutsDialog
                                  onClose={()=>{setOpenEditDialog(false);}}  />}
                />
            }
        <StyledListItem className={classes.listSubHeader} style={{display: isOpen ? "" : "none"}}>
            <ListItemText primary={
                <>
                    {me?.user?.current_operation_id === 0 ? (
                        <Link style={{display: "inline-flex", alignItems: "center", paddingRight: "10px", color: "#f84d4d",
                            fontWeight: "bold",}} to="/new/operations">
                            {"CLICK HERE TO SET OPERATION!"}
                        </Link>
                    ) : (
                        <Link style={{wordBreak: "break-all", color: "white",
                            textDecoration: "none"}} to="/new/operations">
                            {me?.user?.current_operation}
                            {me?.user?.current_operation_complete &&
                                <IconButton disabled>
                                    <VerifiedTwoToneIcon style={{padding: 0, color: "white"}} />
                                </IconButton>
                            }
                        </Link>
                    )}
                </>

            } />
        </StyledListItem>
          <Divider style={{borderColor: "white"}} />
            {getShortcuts({shortcuts: sideShortcuts})}
          <Divider style={{borderColor: "white"}} />
            <StyledListItem button className={classes.listSubHeader} onClick={handleToggleExtra}>
                <StyledListItemIcon>
                    <MoreHorizIcon style={{color: "white"}} fontSize={"medium"} />
                </StyledListItemIcon>
                <ListItemText>Extra Shortcuts</ListItemText>
                {openExtra ? <ExpandLess /> : <ExpandMore />}
            </StyledListItem>
            <Collapse in={openExtra} unmountOnExit style={{overflowY: "auto", overflowX: "hidden"}}>
                <List component="div" disablePadding style={{border: 0, backgroundColor: theme.topAppBarColor}}>
                    {getExtraShortcuts()}
                </List>
            </Collapse>
            <Divider style={{borderColor: "white"}} />
          <div style={{ flexGrow: 1}}></div>
          <TopBarRightShortcutsVertical me={me} isOpen={isOpen} serverName={serverName} />
        </List>
      </Drawer>
    </>
  );
}

function TopBarRightShortcutsVertical({me, isOpen, serverName}){
  const documentationRef = React.useRef(null);
  const [documentationOpen, setDocumentationOpen] = React.useState(false);
  const settingsRef = React.useRef(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [openFeedbackForm, setOpenFeedbackForm] = React.useState(false);
  const handleLogout = () => {
    menuOpen(false);
    FailedRefresh();
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
          <StyledListItem button className={classes.listSubHeader} onClick={() => setOpenFeedbackForm(true)} >
            <StyledListItemIcon> <ThumbDownTwoTone style={{color: "white"}} fontSize={"medium"} className="mythicElement" /> </StyledListItemIcon>
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
          <StyledListItem button className={classes.listSubHeader} onClick={handleDocumentationMenu} >
            <StyledListItemIcon>
                  <HelpTwoToneIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/>
                  <KeyboardArrowDownIcon style={{color: "white", display: isOpen ? "" : "none"}} />
            </StyledListItemIcon>
            <ListItemText primary={"Help"} />
          </StyledListItem>

          <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/EventFeed' >
            <StyledListItemIcon>
              <TopAppBarVerticalEventLogNotifications />
            </StyledListItemIcon>
            <ListItemText primary={"Event Feed"} />
          </StyledListItem>

          <StyledListItem button className={classes.listSubHeader} onClick={handleSettingsMenu} >
            <StyledListItemIcon>
                  <ManageAccountsTwoToneIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement" />
                <KeyboardArrowDownIcon style={{color: "white", display: isOpen ? "" : "none"}} />
            </StyledListItemIcon>
            <ListItemText primary={"Settings"} />
          </StyledListItem>
        </>
    )
}