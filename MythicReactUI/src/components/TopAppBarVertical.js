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
import EditNoteIcon from '@mui/icons-material/EditNote';
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
    border: "unset !important"
});
const closedMixin = (theme) => ({
    overflowX: 'hidden',
    width: `calc(${theme.spacing(5)} + 1px)`,
    borderRadius: "0 !important",
    [theme.breakpoints.up('sm')]: {
      width: `calc(${theme.spacing(6)} + 1px)`,
      borderRadius: "0 !important",
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
        <ListItemIcon ><SpaceDashboardTwoToneIcon style={{color: "white"}}  fontSize={"medium"} className="mythicElement" /></ListItemIcon>
        <ListItemText primary={"Operation Dashboard"} />
      </StyledListItem>
  )
}
const ActiveCallbacks = () => {
  return (
      <StyledListItem className={classes.listSubHeader} button component={Link} to='/new/callbacks' key={"callbacks"} >
        <ListItemIcon><PhoneCallbackIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></ListItemIcon>
        <ListItemText primary={"Active Callbacks"} />
      </StyledListItem>
  )
}
const Payloads = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/payloads' key={"payloads"} >
        <ListItemIcon><FontAwesomeIcon style={{color: "white"}} icon={faBiohazard} size="lg"/></ListItemIcon>
        <ListItemText primary={"Payloads"} />
      </StyledListItem>
  )
}
const SearchCallbacks = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?tab=callbacks&searchField=Host&search=' >
        <ListItemIcon>
            <PhoneCallbackIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/>
            <ManageSearchIcon color={"info"} style={{marginLeft: "-8px", marginTop: "7px", backgroundColor: "white", borderRadius: "5px"}} fontSize={"small"} />
        </ListItemIcon>
        <ListItemText primary={"Search Callbacks"} />
      </StyledListItem>
  )
}
const SearchTasks = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?tab=tasks&searchField=Command+and+Parameters&search=&taskStatus=' >
        <ListItemIcon>
            <AssignmentIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/>
        </ListItemIcon>
        <ListItemText primary={"Search Tasks"} />
      </StyledListItem>
  )
}
const SearchPayloads = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?tab=payloads&searchField=Filename&search=&taskStatus=&c2=All+C2&payloadtype=All+Payload+Types'>
        <ListItemIcon>
            <FontAwesomeIcon style={{color: "white"}} size={"lg"} icon={faBiohazard} />
            <ManageSearchIcon color={"info"} style={{marginLeft: "-8px", marginTop: "7px", backgroundColor: "white", borderRadius: "5px"}} fontSize={"small"} />
        </ListItemIcon>
        <ListItemText primary={"Search Payloads"} />
      </StyledListItem>
  )
}
const SearchFiles = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?searchField=Filename&tab=files&location=Downloads&host=&search=' >
        <ListItemIcon><AttachmentIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></ListItemIcon>
        <ListItemText primary={"Search Files"} />
      </StyledListItem>
  )
}
const SearchScreenshots = () => {
    return (
        <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?searchField=Filename&tab=files&location=Screenshots' >
            <ListItemIcon><CameraAltTwoToneIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></ListItemIcon>
            <ListItemText primary={"Search Screenshots"} />
        </StyledListItem>
    )
}
const SearchCredentials = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?t?searchField=Account&tab=credentials&search='>
        <ListItemIcon><VpnKeyIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement" /></ListItemIcon>
        <ListItemText primary={"Search Credentials"} />
      </StyledListItem>
  )
}
const SearchKeylogs = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?tab=keylogs&searchField=Host&search='>
        <ListItemIcon><KeyboardIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></ListItemIcon>
        <ListItemText primary={"Search Keylogs"} />
      </StyledListItem>
  )
}
const SearchArtifacts = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?tab=artifacts&searchField=Host&search=' >
        <ListItemIcon><FingerprintIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></ListItemIcon>
        <ListItemText primary={"Search Artifacts"} />
      </StyledListItem>
  )
}
const SearchTokens = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?tab=tokens&searchField=Host&search=' >
        <ListItemIcon><ConfirmationNumberIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></ListItemIcon>
        <ListItemText primary={"Search Tokens"} />
      </StyledListItem>
  )
}
const SearchProxies = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?tab=socks'>
        <ListItemIcon><FontAwesomeIcon style={{color: "white"}} size={"lg"} icon={faSocks} /></ListItemIcon>
        <ListItemText primary={"Search Proxies"} />
      </StyledListItem>
  )
}
const SearchProcesses = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?tab=processes&searchField=Name&search=&host=' >
        <ListItemIcon><AccountTreeIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></ListItemIcon>
        <ListItemText primary={"Search Processes"} />
      </StyledListItem>
  )
}
const SearchTags = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/search?tab=tags&searchField=TagType&search=&host='>
        <ListItemIcon>
            <LocalOfferTwoToneIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/>
            <ManageSearchIcon color={"info"} style={{marginLeft: "-8px", marginTop: "7px", backgroundColor: "white", borderRadius: "5px"}} fontSize={"small"} />
        </ListItemIcon>
        <ListItemText primary={"Search Tags"} />
      </StyledListItem>
  )
}
const Mitre = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/mitre' >
        <ListItemIcon><TableChartTwoToneIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></ListItemIcon>
        <ListItemText primary={"MITRE ATT&CK"} />
      </StyledListItem>
  )
}
const Reporting = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/reporting' >
        <ListItemIcon><SportsScoreIcon style={{color: "white"}} size={"medium"} /></ListItemIcon>
        <ListItemText primary={"Reporting"} />
      </StyledListItem>
  )
}
const Tags = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/tagtypes' >
        <ListItemIcon><LocalOfferTwoToneIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></ListItemIcon>
        <ListItemText primary={"Tags"} />
      </StyledListItem>
  )
}
const Eventing = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/eventing' >
        <ListItemIcon><PlayCircleFilledTwoToneIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></ListItemIcon>
        <ListItemText primary={"Eventing"} />
      </StyledListItem>
  )
}
const JupyterNotebook = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} target="_blank" component={Link} to='/jupyter' key={"jupyter"} >
        <ListItemIcon><img src={JupyterLogo} height={"25px"} width={"25px"} /></ListItemIcon>
        <ListItemText primary={"Jupyter Notebooks"} />
      </StyledListItem>
  )
}
const GraphQL = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} target="_blank" component={Link} to='/console' key={"console"} >
        <ListItemIcon><img src={GraphQLLogo} height={"25px"} width={"25px"} className="mythicElement"/></ListItemIcon>
        <ListItemText primary={"GraphQL Console"} />
      </StyledListItem>
  )
}
const ConsumingServices = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/consuming_services' key={"consuming"} >
        <ListItemIcon><PublicIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></ListItemIcon>
        <ListItemText primary={"Consuming Services"} />
      </StyledListItem>
  )
}
const CreatePayload = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/createpayload' key={"createpayload"}  state={{from: 'TopAppBar'}}>
        <ListItemIcon>
            <FontAwesomeIcon style={{color: "white"}} size={"lg"} icon={faBiohazard} />
            <AddCircleIcon color={"success"} style={{marginLeft: "-8px", marginTop: "7px", backgroundColor: "white", borderRadius: "10px"}} fontSize={"small"} />
        </ListItemIcon>
        <ListItemText primary={"Create Payload"} />
      </StyledListItem>
  )
}
const CreateWrapper = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/createwrapper' key={"createwrapper"} >
        <ListItemIcon>
            <PostAddIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/>
            <AddCircleIcon color={"success"} style={{marginLeft: "-8px", marginTop: "7px", backgroundColor: "white", borderRadius: "10px"}} fontSize={"small"} />
        </ListItemIcon>
        <ListItemText primary={"Create Wrapper"} />
      </StyledListItem>
  )
}
const PayloadTypesAndC2 = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/payloadtypes' key={"payloadtypes"}>
        <ListItemIcon><HeadsetTwoToneIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></ListItemIcon>
        <ListItemText primary={"Payload Types & C2"} />
      </StyledListItem>
  )
}
const Operations = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/operations' key={"modifyoperations"}>
        <ListItemIcon><EditIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></ListItemIcon>
        <ListItemText primary={"Modify Operations"} />
      </StyledListItem>
  )
}
const BrowserScripts = () => {
  return (
      <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/browserscripts' key={"browserscripts"} >
        <ListItemIcon><CodeOffIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/></ListItemIcon>
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
            let newShortcuts = [...sideShortcuts];
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
                                        <IconButton onClick={() => addShortcut(i )}>
                                            <ArrowUpwardIcon />
                                            <AddCircleIcon color={"success"} style={{marginLeft: "-8px", marginTop: "7px", backgroundColor: "white", borderRadius: "10px"}} fontSize={"small"} />
                                        </IconButton>
                                    </MythicStyledTooltip>
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
                                <MythicStyledTableCell style={{width: "3rem"}}>
                                    <IconButton onClick={() => removeShortcut(i)}>
                                        <DeleteIcon color={"error"} />
                                    </IconButton>
                                </MythicStyledTableCell>
                            </TableRow>
                        ))}
                        <TableRow hover>
                            <MythicStyledTableCell></MythicStyledTableCell>
                            <MythicStyledTableCell >
                                <Button color={"success"} onClick={() => addShortcut(currentShortcuts.length)} >
                                    Add Shortcut to Bottom
                                </Button>
                                <Button onClick={reset} color={"warning"}>
                                    Reset To Defaults
                                </Button>
                            </MythicStyledTableCell>
                            <MythicStyledTableCell> </MythicStyledTableCell>
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
        <List style={{paddingTop: 0, marginTop: 0, height: "100%", display: "flex", flexDirection: "column", backgroundColor: theme.topAppBarColor}}>
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
            <ListItemIcon ><MenuIcon style={{color: "white"}} onClick={toggleDrawerOpen} fontSize={"medium"} className="mythicElement" /></ListItemIcon>
            <ListItemText primary={
              <>
                <MythicStyledTooltip title={"Edit Shortcuts"} tooltipStyle={{float: isOpen ? 'right' : '', margin: 0, padding: 0}}>
                    <IconButton onClick={() => setOpenEditDialog(true)} >
                        <EditNoteIcon style={{color: "white"}} fontSize={"medium"}/>
                    </IconButton>
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
                <ListItemIcon>
                    <MoreHorizIcon style={{color: "white"}} fontSize={"medium"} />
                </ListItemIcon>
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
          <TopBarRightShortcutsVertical me={me} toggleTheme={props.toggleTheme} serverName={serverName} />
        </List>
      </Drawer>
    </>
  );
}

function TopBarRightShortcutsVertical({me, toggleTheme, serverName}){
  const theme = useTheme();
  const documentationRef = React.useRef(null);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [documentationAnchorEl, setDocumentationAnchorEl] = React.useState(null);
  const [openFeedbackForm, setOpenFeedbackForm] = React.useState(false);
  const handleLogout = () => {
    menuOpen(false);
    FailedRefresh();
  }
  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = (evt) => {
    setAnchorEl(null);
  };
  const handleDocumentationMenu = (event) => {
    setDocumentationAnchorEl(event.currentTarget);
  };
  const handleDocumentationClose = (evt) => {
    setDocumentationAnchorEl(null);
  };
    return (
        <>
          <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'center',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}

          >
            <MenuItem disabled divider={true} style={{display: "block"}}>
              <Typography paragraph={true} variant={"caption"} style={{marginBottom: "0"}}>Server Name:</Typography>
              <Typography paragraph={true} variant={"body1"} style={{marginBottom: "0", fontWeight: 600}}>{serverName}</Typography>
            </MenuItem>
            <MenuItem divider={true} style={{display: "block"}} component={Link} to="/new/settings" onClick={handleClose} name="settings">
              <Typography paragraph={true} variant="caption" style={{marginBottom: "0"}}>Signed in as:</Typography>
              <Typography paragraph={true} variant="body1"  style={{marginBottom: "0", fontWeight: 600}}> {me?.user?.username || "" } </Typography>
            </MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
          <StyledListItem button className={classes.listSubHeader} onClick={() => setOpenFeedbackForm(true)} >
            <ListItemIcon> <ThumbDownTwoTone style={{color: "white"}} fontSize={"medium"} className="mythicElement" /> </ListItemIcon>
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
          <StyledListItem button className={classes.listSubHeader} onClick={handleDocumentationMenu} ref={documentationRef} >
            <ListItemIcon>
                  <HelpTwoToneIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement"/>
                  <KeyboardArrowDownIcon style={{color: "white"}} />
            </ListItemIcon>
            <ListItemText primary={"Help"} />
          </StyledListItem>
            <Menu
                id="menu-appbar"
                anchorEl={documentationAnchorEl}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'center',
                }}
                open={Boolean(documentationAnchorEl)}
                onClose={handleDocumentationClose}
            >
              <MenuItem component={Link} target="_blank" to="/docs/agents" onClick={handleDocumentationClose}>Agent Documentation</MenuItem>
              <MenuItem component={Link} target="_blank" to="/docs/wrappers" onClick={handleDocumentationClose}>Wrapper Documentation</MenuItem>
              <MenuItem component={Link} target="_blank" to="/docs/c2-profiles" onClick={handleDocumentationClose}>C2 Profile Documentation</MenuItem>
              <MenuItem component={Link} to={{pathname: "https://docs.mythic-c2.net"}} target="_blank" onClick={handleDocumentationClose}>Mythic Documentation</MenuItem>
            </Menu>
          <StyledListItem button className={classes.listSubHeader} component={Link} to='/new/EventFeed' >
            <ListItemIcon>
              <TopAppBarVerticalEventLogNotifications />
            </ListItemIcon>
            <ListItemText primary={"Event Feed"} />
          </StyledListItem>

          <StyledListItem button className={classes.listSubHeader} onClick={handleMenu} >
            <ListItemIcon>
                  <ManageAccountsTwoToneIcon style={{color: "white"}} fontSize={"medium"} className="mythicElement" />
                  <KeyboardArrowDownIcon style={{color: "white"}} />
            </ListItemIcon>
            <ListItemText primary={"Settings"} />
          </StyledListItem>
        </>
    )
}