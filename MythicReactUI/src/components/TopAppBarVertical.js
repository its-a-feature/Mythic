import React from 'react';
import { styled } from '@mui/material/styles';
import CameraAltTwoToneIcon from '@mui/icons-material/CameraAltTwoTone';
import MuiDrawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ManageAccountsTwoToneIcon from '@mui/icons-material/ManageAccountsTwoTone';
import { Link } from 'react-router-dom';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import Badge from '@mui/material/Badge';
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
import {faBiohazard} from '@fortawesome/free-solid-svg-icons/faBiohazard';
import AttachmentIcon from '@mui/icons-material/Attachment';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import {faSocks} from '@fortawesome/free-solid-svg-icons/faSocks';
import {mythicUIVersion} from '../index';
import {MythicStyledTooltip} from './MythicComponents/MythicStyledTooltip';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ThumbDownTwoTone from '@mui/icons-material/ThumbDownTwoTone';
import { MythicDialog } from './MythicComponents/MythicDialogBase';
import {MythicFeedbackDialog} from './MythicComponents/MythicFeedbackDialog';
import LocalOfferTwoToneIcon from '@mui/icons-material/LocalOfferTwoTone';
import LightModeTwoToneIcon from '@mui/icons-material/LightModeTwoTone';
import DarkModeTwoToneIcon from '@mui/icons-material/DarkModeTwoTone';
import PlayCircleFilledTwoToneIcon from '@mui/icons-material/PlayCircleFilledTwoTone';
import ForumTwoToneIcon from '@mui/icons-material/ForumTwoTone';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import {useQuery, useSubscription, gql} from '@apollo/client';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AssignmentIcon from '@mui/icons-material/Assignment';
import {GetMythicSetting, useSetMythicSetting} from "./MythicComponents/MythicSavedUserSetting";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import Button from '@mui/material/Button';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Select from '@mui/material/Select';
import DeleteIcon from '@mui/icons-material/Delete';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import {snackActions} from "./utilities/Snackbar";
import {Dropdown, DropdownMenuItem} from "./MythicComponents/MythicNestedMenus";
import ClickAwayListener from '@mui/material/ClickAwayListener';
import {
    Draggable,
    DragDropContext,
    Droppable,
} from "@hello-pangea/dnd";
import {MythicDraggablePortal, reorder} from "./MythicComponents/MythicDraggableList";
import { useNavigate } from 'react-router-dom';
import LogoutIcon from '@mui/icons-material/Logout';
import TuneIcon from '@mui/icons-material/Tune';
import {getSkewedNow} from "./utilities/Time";
import {
    MythicDialogBody,
    MythicDialogButton,
    MythicDialogFooter,
    MythicDialogSection,
} from "./MythicComponents/MythicDialogLayout";

const PREFIX = 'TopAppBarVertical';

const classes = {
  listSubHeader: `${PREFIX}-listSubHeader`,
};

const openedMixin = () => ({
    width: drawerWidth,
    overflowX: 'hidden',
    borderRadius: "0 !important",
    border: "0px !important",
    background: "var(--mythic-nav-background) !important",
    backgroundColor: "var(--mythic-nav-background-color) !important",
});
const closedMixin = () => ({
    overflowX: 'hidden',
    width: "60px",
    borderRadius: "0 !important",
    border: "0px !important",
    background: "var(--mythic-nav-background) !important",
    backgroundColor: "var(--mythic-nav-background-color) !important",
    '@media (min-width: 600px)': {
      width: "60px",
      borderRadius: "0 !important",
      border: "0px !important",
  },
});
const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
    () => ({
      width: drawerWidth,
      flexShrink: 0,
      whiteSpace: 'nowrap',
      boxSizing: 'border-box',
      background: "var(--mythic-nav-background) !important",
      backgroundColor: "var(--mythic-nav-background-color) !important",
      color: "var(--mythic-nav-text)",
      '& .MuiDrawer-paper': {
        border: "0 !important",
        borderRight: "0 !important",
        borderRadius: "0 !important",
        boxShadow: "none !important",
      },
      '& .MuiList-root': {
        border: "0 !important",
        borderRadius: "0 !important",
      },
      [`& .${classes.listSubHeader}`]: {
        backgroundColor: "transparent !important",
        boxSizing: "border-box",
        maxWidth: "calc(100% - 8px)",
        width: "auto",
      },
      [`& .${classes.listSubHeader}:hover`]: {
        color: "var(--mythic-nav-text) !important",
        backgroundColor: "var(--mythic-nav-hover) !important",
      },
      variants: [
        {
          props: ({ open }) => open,
          style: {
            ...openedMixin(),
            '& .MuiDrawer-paper': {
                ...openedMixin(),
                background: "var(--mythic-nav-background) !important",
                backgroundColor: "var(--mythic-nav-background-color) !important",
                border: "0 !important",
                borderRight: "0 !important",
                borderRadius: "0 !important",
                boxShadow: "none !important",
                '& .MuiList-root': {
                    backgroundColor: "transparent !important",
                    border: "0 !important",
                    borderRadius: "0 !important",
                },
            },
          },
        },
        {
          props: ({ open }) => !open,
          style: {
            ...closedMixin(),
            '& .MuiDrawer-paper': {
                ...closedMixin(),
                background: "var(--mythic-nav-background) !important",
                backgroundColor: "var(--mythic-nav-background-color) !important",
                border: "0 !important",
                borderRight: "0 !important",
                borderRadius: "0 !important",
                boxShadow: "none !important",
                '& .MuiList-root': {
                    backgroundColor: "transparent !important",
                    border: "0 !important",
                    borderRadius: "0 !important",
                },
                '& .MuiListItemText-root': {
                    display: "none",
                    margin: "0 !important",
                    maxWidth: 0,
                    minWidth: 0,
                    overflow: "hidden",
                    width: 0,
                },
                '& .MuiListItem-root > .MuiSvgIcon-root': {
                    display: "none",
                },
            },
          },
        },
      ],
    }),
);
export const StyledListItem = styled(ListItem)(
    () => ({
      minHeight: "34px",
      paddingTop: "4px",
      paddingLeft: "8px",
      paddingRight: "8px",
      margin: "2px 4px",
      paddingBottom: "4px",
      borderRadius: "var(--mythic-radius)",
      color: "var(--mythic-nav-text)",
      backgroundColor: "transparent !important",
      boxSizing: "border-box",
      maxWidth: "calc(100% - 8px)",
      width: "auto",
      "& .MuiListItemText-root": {
        marginLeft: "0.35rem",
        minWidth: 0,
      },
      "& .MuiListItemText-primary": {
        fontSize: "0.78125rem",
        fontWeight: 600,
      },
      "&:hover": {
        backgroundColor: "var(--mythic-nav-hover) !important",
      },
    }),
);
export const StyledListItemIcon = styled(ListItemIcon)(
    () => ({
        paddingTop:0,
        marginTop: 0,
        paddingBottom: 0,
        minWidth: "36px",
        width: "36px",
        justifyContent: "center",
        color: "var(--mythic-nav-icon)",
        backgroundColor: "transparent !important",
        overflow: "visible",
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

const CHAT_UNREAD_STATUS_QUERY = gql`
query ChatUnreadStatus {
  chat_channel(where: {last_message_id: {_is_null: false}}) {
    id
    archived
    last_message_id
    updated_at
  }
  chat_read_state {
    channel_id
    last_read_message_id
    updated_at
  }
}
`;

const CHAT_UNREAD_CHANNELS_STREAM_SUBSCRIPTION = gql`
subscription ChatUnreadChannelsStream($now: timestamp!) {
  chat_channel_stream(batch_size: 50, cursor: {initial_value: {updated_at: $now}, ordering: ASC}, where: {last_message_id: {_is_null: false}}) {
    id
    archived
    last_message_id
    updated_at
  }
}
`;

const CHAT_UNREAD_READ_STATE_STREAM_SUBSCRIPTION = gql`
subscription ChatUnreadReadStateStream($now: timestamp!) {
  chat_read_state_stream(batch_size: 50, cursor: {initial_value: {updated_at: $now}, ordering: ASC}) {
    channel_id
    last_read_message_id
    updated_at
  }
}
`;

const unreadTimestampValue = (timestamp) => {
    if(!timestamp){ return 0; }
    const value = new Date(timestamp).getTime();
    return Number.isNaN(value) ? 0 : value;
};

const mergeUnreadChannels = (current, incoming) => {
    if(!incoming || incoming.length === 0){ return current; }
    const rowsByID = new Map((current || []).map((channel) => [channel.id, channel]));
    incoming.forEach((channel) => {
        const existing = rowsByID.get(channel.id);
        if(!existing || unreadTimestampValue(channel.updated_at) >= unreadTimestampValue(existing.updated_at)){
            rowsByID.set(channel.id, {...existing, ...channel});
        }
    });
    return [...rowsByID.values()];
};

const mergeUnreadReadStates = (current, incoming) => {
    if(!incoming || incoming.length === 0){ return current; }
    return incoming.reduce((prev, readState) => ({
        ...prev,
        [readState.channel_id]: Math.max(prev[readState.channel_id] || 0, readState.last_read_message_id || 0),
    }), current);
};

const getUnreadChatCount = (channels, readState) => {
    return (channels || []).reduce((count, channel) => {
        if(channel.archived){ return count; }
        const latestMessageID = channel.last_message_id || 0;
        const lastReadMessageID = readState[channel.id] || 0;
        return latestMessageID > lastReadMessageID ? count + 1 : count;
    }, 0);
};

const Dashboard = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new' key={"home"} >
        <StyledListItemIcon >
            <MythicStyledTooltip title={"Operation Dashboard"} tooltipStyle={{display: "inline-flex"}}>
                <SpaceDashboardTwoToneIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon" />
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Operation Dashboard"} />
      </StyledListItem>
  )
}
const ActiveCallbacks = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/callbacks' key={"callbacks"} >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Active Callbacks"} tooltipStyle={{display: "inline-flex"}}>
                <PhoneCallbackIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon"/>
            </MythicStyledTooltip>

        </StyledListItemIcon>
        <ListItemText primary={"Active Callbacks"} />
      </StyledListItem>
  )
}
const Payloads = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/payloads' key={"payloads"} >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Payloads"} tooltipStyle={{display: "inline-flex"}}>
                <FontAwesomeIcon className="mythic-navigation-icon" icon={faBiohazard} size="lg"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Payloads"} />
      </StyledListItem>
  )
}
const SearchCallbacks = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?tab=callbacks&searchField=Host&search=' >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Callbacks"} tooltipStyle={{display: "inline-flex"}}>
                <PhoneCallbackIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon"/>
                <ManageSearchIcon className="mythic-navigation-icon" style={{marginLeft: "-8px", marginTop: "7px", borderRadius: "5px"}} fontSize={"small"} />
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Callbacks"} />
      </StyledListItem>
  )
}
const SearchTasks = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?tab=tasks&searchField=Command+and+Parameters&search=&taskStatus=' >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Tasks"} tooltipStyle={{display: "inline-flex"}}>
                <AssignmentIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Tasks"} />
      </StyledListItem>
  )
}
const SearchPayloads = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?tab=payloads&searchField=Filename&search=&taskStatus=&c2=All+C2&payloadtype=All+Payload+Types'>
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Payloads"} tooltipStyle={{display: "inline-flex"}}>
                <FontAwesomeIcon className="mythic-navigation-icon" size={"lg"} icon={faBiohazard} />
                <ManageSearchIcon className="mythic-navigation-icon" style={{marginLeft: "-8px", marginTop: "7px", borderRadius: "5px"}} fontSize={"small"} />
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Payloads"} />
      </StyledListItem>
  )
}
const SearchFiles = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?searchField=Filename&tab=files&location=Downloads&host=&search=' >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Files"} tooltipStyle={{display: "inline-flex"}}>
                <AttachmentIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Files"} />
      </StyledListItem>
  )
}
const SearchScreenshots = () => {
    return (
        <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?searchField=Filename&tab=files&location=Screenshots' >
            <StyledListItemIcon>
                <MythicStyledTooltip title={"Search Screenshots"} tooltipStyle={{display: "inline-flex"}}>
                    <CameraAltTwoToneIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon"/>
                </MythicStyledTooltip>
            </StyledListItemIcon>
            <ListItemText primary={"Search Screenshots"} />
        </StyledListItem>
    )
}
const SearchCredentials = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?t?searchField=Account&tab=credentials&search='>
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Credentials"} tooltipStyle={{display: "inline-flex"}}>
                <VpnKeyIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon" />
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Credentials"} />
      </StyledListItem>
  )
}
const SearchKeylogs = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?tab=keylogs&searchField=Host&search='>
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Keylogs"} tooltipStyle={{display: "inline-flex"}}>
                <KeyboardIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Keylogs"} />
      </StyledListItem>
  )
}
const SearchArtifacts = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?tab=artifacts&searchField=Host&search=' >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Artifacts"} tooltipStyle={{display: "inline-flex"}}>
                <FingerprintIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Artifacts"} />
      </StyledListItem>
  )
}
const SearchTokens = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?tab=tokens&searchField=Host&search=' >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Tokens"} tooltipStyle={{display: "inline-flex"}}>
                <ConfirmationNumberIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Tokens"} />
      </StyledListItem>
  )
}
const SearchProxies = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?tab=proxies'>
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Proxies"} tooltipStyle={{display: "inline-flex"}}>
                <FontAwesomeIcon className="mythic-navigation-icon" size={"lg"} icon={faSocks} />
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Proxies"} />
      </StyledListItem>
  )
}
const SearchProcesses = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?tab=processes&searchField=Name&search=&host=' >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Processes"} tooltipStyle={{display: "inline-flex"}}>
                <AccountTreeIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Processes"} />
      </StyledListItem>
  )
}
const SearchTags = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/search?tab=tags&searchField=TagType&search=&host='>
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Search Tags"} tooltipStyle={{display: "inline-flex"}}>
                <LocalOfferTwoToneIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon"/>
                <ManageSearchIcon className="mythic-navigation-icon" style={{marginLeft: "-8px", marginTop: "7px", borderRadius: "5px"}} fontSize={"small"} />
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Search Tags"} />
      </StyledListItem>
  )
}
const Mitre = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/mitre' >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"MITRE ATT&CK"} tooltipStyle={{display: "inline-flex"}}>
                <TableChartTwoToneIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"MITRE ATT&CK"} />
      </StyledListItem>
  )
}
const Reporting = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/reporting' >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Reporting"} tooltipStyle={{display: "inline-flex"}}>
                <SportsScoreIcon className="mythic-navigation-icon" size={"medium"} />
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Reporting"} />
      </StyledListItem>
  )
}
const Tags = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/tagtypes' >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Tags"} tooltipStyle={{display: "inline-flex"}}>
                <LocalOfferTwoToneIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Tags"} />
      </StyledListItem>
  )
}
const Eventing = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/eventing' >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Eventing"} tooltipStyle={{display: "inline-flex"}}>
                <PlayCircleFilledTwoToneIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Eventing"} />
      </StyledListItem>
  )
}
const Chat = ({me}) => {
    const streamStart = React.useRef(getSkewedNow().toISOString());
    const [channels, setChannels] = React.useState([]);
    const [readState, setReadState] = React.useState({});
    const {data: initialData, error: initialError} = useQuery(CHAT_UNREAD_STATUS_QUERY, {
        skip: !me?.user?.current_operation_id,
        fetchPolicy: "no-cache",
    });
    React.useEffect(() => {
        streamStart.current = getSkewedNow().toISOString();
        setChannels([]);
        setReadState({});
    }, [me?.user?.current_operation_id]);
    React.useEffect(() => {
        if(initialData?.chat_channel){
            setChannels((prev) => mergeUnreadChannels(prev, initialData.chat_channel));
        }
        if(initialData?.chat_read_state){
            setReadState((prev) => mergeUnreadReadStates(prev, initialData.chat_read_state));
        }
    }, [initialData]);
    const {error: channelStreamError} = useSubscription(CHAT_UNREAD_CHANNELS_STREAM_SUBSCRIPTION, {
        variables: {now: streamStart.current},
        skip: !me?.user?.current_operation_id,
        fetchPolicy: "no-cache",
        onData: ({data}) => {
            const updates = data.data?.chat_channel_stream || [];
            if(updates.length > 0){
                setChannels((prev) => mergeUnreadChannels(prev, updates));
            }
        },
        onError: (errorData) => {
            console.log("chat unread channel stream error");
            console.error(errorData);
        },
    });
    const {error: readStateStreamError} = useSubscription(CHAT_UNREAD_READ_STATE_STREAM_SUBSCRIPTION, {
        variables: {now: streamStart.current},
        skip: !me?.user?.current_operation_id,
        fetchPolicy: "no-cache",
        onData: ({data}) => {
            const updates = data.data?.chat_read_state_stream || [];
            if(updates.length > 0){
                setReadState((prev) => mergeUnreadReadStates(prev, updates));
            }
        },
        onError: (errorData) => {
            console.log("chat unread status error");
            console.error(errorData);
        },
    });
    const error = initialError || channelStreamError || readStateStreamError;
    const unreadCount = React.useMemo(() => getUnreadChatCount(channels, readState), [channels, readState]);
    const tooltipTitle = error ? "Operation Chat unread status unavailable" :
        unreadCount > 0 ? `Operation Chat (${unreadCount} unread ${unreadCount === 1 ? "chat" : "chats"})` : "Operation Chat";
    return (
        <StyledListItem className={classes.listSubHeader} component={Link} to='/new/chat' >
            <StyledListItemIcon>
                <MythicStyledTooltip title={tooltipTitle} tooltipStyle={{display: "inline-flex"}}>
                    <Badge
                        badgeContent={error ? "X" : unreadCount}
                        color={error ? "secondary" : "error"}
                        invisible={!error && unreadCount === 0}
                        max={99}
                    >
                        <ForumTwoToneIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon"/>
                    </Badge>
                </MythicStyledTooltip>
            </StyledListItemIcon>
            <ListItemText primary={"Operation Chat"} />
        </StyledListItem>
    )
}
const JupyterNotebook = () => {
  return (
      <StyledListItem className={classes.listSubHeader} target="_blank"  component={Link} to='/jupyter' key={"jupyter"} >
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
      <StyledListItem className={classes.listSubHeader} target="_blank"  component={Link} to='/console' key={"console"} >
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
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/createpayload' key={"createpayload"}  state={{from: 'TopAppBar'}}>
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Create Payload"} tooltipStyle={{display: "inline-flex"}}>
                <FontAwesomeIcon className="mythic-navigation-icon" size={"lg"} icon={faBiohazard} />
                <AddCircleIcon color={"success"} style={{marginLeft: "-8px", marginTop: "7px", backgroundColor: "white", borderRadius: "10px"}} fontSize={"small"} />
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Create Payload"} />
      </StyledListItem>
  )
}
const CreateWrapper = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/createwrapper' key={"createwrapper"} >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Create Wrapper"} tooltipStyle={{display: "inline-flex"}}>
                <PostAddIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon"/>
                <AddCircleIcon color={"success"} style={{marginLeft: "-8px", marginTop: "7px", backgroundColor: "white", borderRadius: "10px"}} fontSize={"small"} />
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Create Wrapper"} />
      </StyledListItem>
  )
}
const PayloadTypesAndC2 = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/payloadtypes' key={"payloadtypes"}>
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Installed Services"} tooltipStyle={{display: "inline-flex"}}>
                <HeadsetTwoToneIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Installed Services"} />
      </StyledListItem>
  )
}
const Operations = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/operations' key={"modifyoperations"}>
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Modify Operations"} tooltipStyle={{display: "inline-flex"}}>
                <EditIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"Modify Operations"} />
      </StyledListItem>
  )
}
const BrowserScripts = () => {
  return (
      <StyledListItem className={classes.listSubHeader} component={Link} to='/new/browserscripts' key={"browserscripts"} >
        <StyledListItemIcon>
            <MythicStyledTooltip title={"Browser Scripts"} tooltipStyle={{display: "inline-flex"}}>
                <CodeOffIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon"/>
            </MythicStyledTooltip>
        </StyledListItemIcon>
        <ListItemText primary={"BrowserScripts"} />
      </StyledListItem>
  )
}
const AllSettingOptions = [
    "Dashboard", "ActiveCallbacks", "Payloads", "SearchCallbacks", "SearchTasks", "SearchPayloads",
    "SearchFiles", "SearchScreenshots", "SearchCredentials", "SearchKeylogs", "SearchArtifacts", "SearchTokens", "SearchProxies",
    "SearchProcesses", "SearchTags", "Mitre", "Reporting", "Tags", "Eventing", "Chat", "JupyterNotebook",
    "GraphQL", "CreatePayload", "CreateWrapper", "PayloadTypesAndC2", "Operations",
    "BrowserScripts"
].sort();

const TopAppBarVerticalAdjustShortcutsDialog = ({onClose, onSave, sideShortcuts}) => {
    const [currentShortcuts, setCurrentShortcuts] = React.useState(sideShortcuts);
    const [updateSetting] = useSetMythicSetting();
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
        updateSetting({setting_name: "sideShortcuts", value: currentShortcuts, broadcast: false});
        onSave(currentShortcuts);
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
            <DialogContent dividers={true} sx={{p: 0, overflow: "hidden"}}>
                <MythicDialogBody sx={{height: "min(70vh, 42rem)", p: 1}}>
                    <MythicDialogSection
                        title="Side Shortcuts"
                        actions={
                            <>
                                <Button
                                    size="small"
                                    onClick={() => addShortcut(currentShortcuts.length)}
                                    startIcon={<AddCircleIcon fontSize="small" />}
                                >
                                    Shortcut
                                </Button>
                                <Button size="small" onClick={reset} color="warning">
                                    Reset
                                </Button>
                            </>
                        }
                        sx={{display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0}}
                    >
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="vertical-shortcuts-column-list">
                                {(provided) => (
                                    <div className="mythic-reorder-list" ref={provided.innerRef} {...provided.droppableProps}>
                                        {currentShortcuts.map((c, i) => (
                                            <Draggable key={c + i} draggableId={`shortcut-${c}-${i}`} index={i}>
                                                {(provided2, snapshot) => {
                                                    const row = (
                                                        <div
                                                            ref={provided2.innerRef}
                                                            className={`mythic-reorder-row${snapshot.isDragging ? " mythic-reorder-row-dragging" : ""}`}
                                                            {...provided2.draggableProps}
                                                        >
                                                            <span className="mythic-reorder-drag-handle" {...provided2.dragHandleProps}>
                                                                <DragHandleIcon fontSize="small" />
                                                            </span>
                                                            <div className="mythic-reorder-row-main">
                                                                <Select
                                                                    className="mythic-reorder-select"
                                                                    fullWidth
                                                                    size="small"
                                                                    value={c}
                                                                    onChange={(e) => onChangeShortcutValue(e, i)}
                                                                >
                                                                    {AllSettingOptions.map((opt) => (
                                                                        <MenuItem value={opt} key={opt}>{opt}</MenuItem>
                                                                    ))}
                                                                </Select>
                                                            </div>
                                                            <div className="mythic-reorder-row-actions">
                                                                <IconButton
                                                                    aria-label={`Remove ${c}`}
                                                                    className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger"
                                                                    size="small"
                                                                    onClick={() => removeShortcut(i)}
                                                                >
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </div>
                                                        </div>
                                                    );
                                                    return (
                                                        <MythicDraggablePortal isDragging={snapshot.isDragging}>
                                                            {row}
                                                        </MythicDraggablePortal>
                                                    );
                                                }}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </MythicDialogSection>
                </MythicDialogBody>
            </DialogContent>
            <MythicDialogFooter>
                <MythicDialogButton onClick={onClose}>
                    Cancel
                </MythicDialogButton>
                <MythicDialogButton onClick={onUpdate} intent="primary">
                    Save
                </MythicDialogButton>
            </MythicDialogFooter>
        </React.Fragment>
    )
}

export function TopAppBarVertical(props) {
  const me = props.me;
  const navigate = useNavigate();
  const initialNavBarOpen = GetMythicSetting({setting_name: 'navBarOpen', default_value: operatorSettingDefaults.navBarOpen});
  const initialSideShortcuts = GetMythicSetting({setting_name: "sideShortcuts", default_value: defaultShortcuts});
  const [updateSetting] = useSetMythicSetting();
  const [menuOpen, setMenuOpen] = React.useState(initialNavBarOpen);
  const [sideShortcuts, setSideShortcuts] = React.useState(initialSideShortcuts);
  const [openExtra, setOpenExtra] = React.useState(false);
  const [openEditDialog, setOpenEditDialog ] = React.useState(false);
  const [serverVersion, setServerVersion] = React.useState("...");
  const [serverName, setServerName] = React.useState("...");
  useQuery(GET_SETTINGS, {fetchPolicy: "no-cache",
    context: {suppressErrorSnackbar: true},
    onCompleted: (data) => {
      const serverConfig = data?.getGlobalSettings?.settings?.["server_config"] || {};
      setServerVersion(serverConfig["version"] || "...");
      setServerName(serverConfig["name"] || "...");
    }
  });
  const toggleDrawerOpen = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const nextMenuOpen = !menuOpen;
      setMenuOpen(nextMenuOpen);
      updateSetting({setting_name: "navBarOpen", value: nextMenuOpen, broadcast: false});
  };
  const handleDrawerClose = () => {
      setMenuOpen(false);
      updateSetting({setting_name: "navBarOpen", value: false, broadcast: false})
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
              case "Chat":
                  return <Chat key={c + i} me={me} />
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
        PaperProps={{sx: {border: "0 !important", borderRight: "0 !important", borderRadius: "0 !important", boxShadow: "none !important"}}}>
        <List style={{paddingTop: 0, marginTop: 0, height: "100%", display: "flex", flexDirection: "column",
            backgroundColor: "transparent !important",
            border: "0 !important", borderRadius: 0}}>
          <ListItem className={classes.listSubHeader} style={{
              alignItems: "center",
              height: "52px",
              margin: "4px 4px 6px",
              minHeight: "52px",
              paddingTop: "5px",
              paddingLeft: "8px",
              paddingRight: "8px",
              paddingBottom: "5px",
              borderRadius: "var(--mythic-radius)",
          }}>
            <StyledListItemIcon>
                <img src={ReactLogo} onClick={()=>navigate('/new')} width={"35px"} height={"35px"} alt="Mythic" style={{cursor: "pointer"}}/>
            </StyledListItemIcon>
            <ListItemText style={{margin: 0}} primary={
                <>
                    <Typography className="mythic-navigation-muted-text" style={{ fontSize: 12, display: "inline-block",
                        marginLeft: "1rem",
                        lineHeight: 1.35}}>
                        <b>Mythic:</b> v{serverVersion}<br/>
                        <b>UI:</b> v{mythicUIVersion}<br/>
                    </Typography>
                    <IconButton onClick={props.toggleTheme} size="small" style={{float:"right", display: menuOpen ? "" : "none"}} >
                        {props.themeMode === 'light' &&
                            <DarkModeTwoToneIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon" />
                        }
                        {props.themeMode === 'dark' &&
                            <LightModeTwoToneIcon fontSize={"medium"} className="mythicElement mythic-navigation-warning-icon" />
                        }
                    </IconButton>
                </>
            } />
          </ListItem>
          <StyledListItem className={classes.listSubHeader} onClick={toggleDrawerOpen} style={{height: "32px"}} >
            <StyledListItemIcon ><MenuIcon onClick={toggleDrawerOpen} fontSize={"medium"} className="mythicElement mythic-navigation-icon" /></StyledListItemIcon>
            <ListItemText primary={
              <>
                <MythicStyledTooltip title={"Edit Shortcuts"} tooltipStyle={{float: menuOpen ? 'right' : '', margin: 0, padding: 0}}>
                    <Button onClick={openEditShortcuts} className="mythic-navigation-action-text">
                        <EditIcon className="mythic-navigation-icon" fontSize={"medium"}/> Edit
                    </Button>

                </MythicStyledTooltip>
              </>
            } />
          </StyledListItem>
            {openEditDialog &&
                <MythicDialog open={openEditDialog} fullWidth={true} maxWidth={"sm"}
                              onClose={()=>{setOpenEditDialog(false);}}
                              innerDialog={<TopAppBarVerticalAdjustShortcutsDialog
                                  sideShortcuts={sideShortcuts}
                                  onSave={setSideShortcuts}
                                  onClose={()=>{setOpenEditDialog(false);}}  />}
                />
            }
        <StyledListItem className={classes.listSubHeader} style={{display: me?.user?.current_operation_id === 0 ? "" : "none"}}>
            <ListItemText primary={
                <>
                    <Link style={{display: "inline-flex", alignItems: "center", paddingRight: "10px", color: "var(--mythic-error-main)",
                        fontWeight: "bold",}} to="/new/operations">
                        {"CLICK TO SET OPERATION!"}
                    </Link>
                </>

            } />
        </StyledListItem>
            <Divider style={{borderColor: "var(--mythic-nav-muted)", margin: "4px 8px"}} />
            <div style={{flexGrow: 1, overflowY: "auto", overflowX: "hidden"}}>
                {getShortcuts({shortcuts: sideShortcuts})}
                <Divider style={{borderColor: "var(--mythic-nav-muted)", margin: "4px 8px"}} />
                <StyledListItem className={classes.listSubHeader} onClick={handleToggleExtra}>
                    <StyledListItemIcon>
                        <MoreHorizIcon className="mythic-navigation-icon" fontSize={"medium"} />
                    </StyledListItemIcon>
                    <ListItemText>Extra Shortcuts</ListItemText>
                    {openExtra ? <ExpandLess /> : <ExpandMore />}
                </StyledListItem>
                {openExtra &&  getExtraShortcuts()}
                <Divider style={{borderColor: "var(--mythic-nav-muted)", margin: "4px 8px"}} />
                <div className={classes.listSubHeader} style={{ flexGrow: 1}}></div>
            </div>
          <TopBarRightShortcutsVertical me={me} menuOpen={menuOpen} serverName={serverName} />
        </List>
      </Drawer>
    </>
  );
}

function TopBarRightShortcutsVertical({me, menuOpen, serverName}){
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
                  <Typography variant={"caption"} style={{marginBottom: "0"}}>Signed in as:</Typography>
                  <Typography variant={"body1"} style={{marginBottom: "0", fontWeight: 600}}>{me?.user?.username}</Typography>
              </>),
          disabled: true,
          click: handleSettingsClose
      },
      {
          name: (
              <div style={{display: "flex", alignItems: "center"}}>
                  <TuneIcon style={{marginRight: "0.5rem"}}/>
                  <Typography variant="body1"  style={{marginBottom: "0", }}> Settings </Typography>
              </div>
          ),
          to: "/new/settings",
          component: Link,
          click: handleSettingsClose
      },
      {
          name: (
              <div style={{display: "flex", alignItems: "center"}}>
                  <LogoutIcon style={{marginRight: "0.5rem"}} /> Logout
              </div>
          ),
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
                    <ThumbDownTwoTone fontSize={"medium"} className="mythicElement mythic-navigation-icon" />
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
                  <HelpTwoToneIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon"/>
                </MythicStyledTooltip>
            </StyledListItemIcon>
            <ListItemText primary={"Help"} />
            <KeyboardArrowDownIcon className="mythic-navigation-icon" style={{display: menuOpen ? "" : "none", flex: "0 0 auto", marginLeft: "auto"}} />
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
                    <ManageAccountsTwoToneIcon fontSize={"medium"} className="mythicElement mythic-navigation-icon" />
                </MythicStyledTooltip>
            </StyledListItemIcon>
            <ListItemText primary={"Settings"} />
            <KeyboardArrowDownIcon className="mythic-navigation-icon" style={{display: menuOpen ? "" : "none", flex: "0 0 auto", marginLeft: "auto"}} />
          </StyledListItem>
        </>
    )
}
