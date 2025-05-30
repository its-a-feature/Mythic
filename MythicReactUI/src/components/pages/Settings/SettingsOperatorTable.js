import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import {
    SettingsOperatorTableRow,
} from './SettingsOperatorTableRow';
import Typography from '@mui/material/Typography';
import { SettingsOperatorDialog, SettingsBotDialog } from './SettingsOperatorDialog';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {snackActions} from '../../utilities/Snackbar';
import {useTheme} from '@mui/material/styles';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TuneIcon from '@mui/icons-material/Tune';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import { IconButton } from '@mui/material';
import {GET_GLOBAL_SETTINGS, SettingsGlobalDialog} from "./SettingsGlobalDialog";
import SmartToyTwoToneIcon from '@mui/icons-material/SmartToyTwoTone';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SearchIcon from '@mui/icons-material/Search';
import {SettingsOperatorAPITokenSearchDialog} from "./SettingsOperatorAPITokenSearchDialog";
import ForwardToInboxTwoToneIcon from '@mui/icons-material/ForwardToInboxTwoTone';
import {InviteLinksDialog} from "./InviteLinksDialog";
import {useLazyQuery} from '@apollo/client';



export function SettingsOperatorTable(props){
    const theme = useTheme();
    const [openNew, setOpenNewDialog] = React.useState(false);
    const [openNewBot, setOpenNewBotDialog] = React.useState(false);
    const [openAPITokenSearch, setOpenAPITokenSearch] = React.useState(false);
    const onSubmitNewOperator = (id, username, passwordOld, passwordNew, email) => {
        if(passwordNew.length === 0){
            snackActions.error("Password must not be empty");
        }
        if(passwordOld !== passwordNew){
            snackActions.error("Passwords don't match");
        }
        if(username.length === 0){
            snackActions.error("Username must not be empty");
            return
        }else{
            props.onNewOperator(username, passwordNew, email);
            setOpenNewDialog(false);
        }
    }
    const onSubmitNewBot = (id, username) => {
        if(username.length === 0){
            snackActions.error("Username must not be empty")
            return;
        }
        props.onNewBot(username);
        setOpenNewBotDialog(false);
    }
    const userData = props.operators.filter(o => o.id === props.me?.user?.id)
    const userIsAdmin = userData.length > 0 ? userData[0].admin : false;
    const [showDeleted, setShowDeleted] = React.useState(false);
    const [openGlobalSettingsDialog, setOpenGlobalSettingsDialog] = React.useState(false);
    const [openInviteLinksDialog, setOpenInviteLinksDialog] = React.useState(false);
    const [inviteLinksEnabled, setInviteLinksEnabled] = React.useState(false);
    const [getGlobalSettings] = useLazyQuery(GET_GLOBAL_SETTINGS, {fetchPolicy: "no-cache",
    });
    const closeGlobalSettingsDialog = () => {
        getGlobalSettings().then(({data}) => setInviteLinksEnabled(data.getGlobalSettings.settings["MYTHIC_SERVER_ALLOW_INVITE_LINKS"]));
        setOpenGlobalSettingsDialog(false);
    }
    React.useEffect( () => {
        getGlobalSettings().then(({data}) => setInviteLinksEnabled(data.getGlobalSettings.settings["MYTHIC_SERVER_ALLOW_INVITE_LINKS"]));
    }, []);
    return (
    <div style={{display: "flex", flexDirection: "column", height: "100%"}}>
        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main}} variant={"elevation"}>
            <Typography variant="h5" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                Settings
            </Typography>
            <MythicStyledTooltip title={"Adjust Global Settings"} tooltipStyle={{float: "right", marginRight: "10px", marginLeft: "5px"}}>
                <IconButton size="small" variant="contained"
                            onClick={() => setOpenGlobalSettingsDialog(!openGlobalSettingsDialog)} >
                    <TuneIcon />
                </IconButton>
            </MythicStyledTooltip>
            {showDeleted ? (
                <MythicStyledTooltip title={"Hide Deleted Operators"} tooltipStyle={{float: "right"}}>
                    <IconButton size="small"  variant="contained" onClick={() => setShowDeleted(!showDeleted)}><VisibilityIcon /></IconButton>
                </MythicStyledTooltip>
            ) : (
                <MythicStyledTooltip title={"Show Deleted Operators"} tooltipStyle={{float: "right"}}>
                    <IconButton size="small"  variant="contained" onClick={() => setShowDeleted(!showDeleted)} ><VisibilityOffIcon /></IconButton>
                </MythicStyledTooltip>
            )}
            {openGlobalSettingsDialog &&
                <MythicDialog open={openGlobalSettingsDialog} fullWidth={true} maxWidth={"md"}
                              onClose={closeGlobalSettingsDialog}
                              innerDialog={<SettingsGlobalDialog
                                  onClose={closeGlobalSettingsDialog}  />}
                />
            }
            <MythicStyledTooltip title={"Search for API Tokens"}  tooltipStyle={{float: "right", marginRight: "5px",}} >
                <IconButton size={"small"}  variant="contained"
                onClick={() => setOpenAPITokenSearch(true)}>
                    <SearchIcon />
                </IconButton>
            </MythicStyledTooltip>
            {openAPITokenSearch &&
                <MythicDialog open={openAPITokenSearch} maxWidth={"xl"} fullWidth={true}
                              onClose={()=>{setOpenAPITokenSearch(false);}}
                              innerDialog={<SettingsOperatorAPITokenSearchDialog
                                  onClose={()=>{setOpenAPITokenSearch(false);}}  />}
                />
            }
            <MythicStyledTooltip title={"Create new Bot account"} tooltipStyle={{float: "right", marginLeft: "5px"}}>
                <IconButton size={"small"}
                            onClick={()=>{setOpenNewBotDialog(true);}}  variant="contained">
                    <SmartToyTwoToneIcon />
                </IconButton>
            </MythicStyledTooltip>
            <MythicStyledTooltip title={"Create new user account"} tooltipStyle={{float: "right", marginLeft: "5px"}}>
                <IconButton size="small" onClick={()=>{setOpenNewDialog(true);}}  variant="contained">
                    <PersonAddIcon/>
                </IconButton>
            </MythicStyledTooltip>
            <MythicStyledTooltip title={"Manage Invite Links"} tooltipStyle={{float: "right", marginLeft: "5px"}}>
                <IconButton size={"small"} disabled={!inviteLinksEnabled || !userIsAdmin}
                            onClick={()=>{setOpenInviteLinksDialog(true);}} variant={"contained"} >
                    <ForwardToInboxTwoToneIcon />
                </IconButton>
            </MythicStyledTooltip>
            {openInviteLinksDialog &&
                <MythicDialog open={openInviteLinksDialog} maxWidth={"xl"} fullWidth={true}
                              onClose={()=>{setOpenInviteLinksDialog(false);}}
                              innerDialog={<InviteLinksDialog
                                  onClose={()=>{setOpenInviteLinksDialog(false);}}  />}
                />
            }
            {openNew &&
                <MythicDialog open={openNew}
                              maxWidth={"md"}
                              onClose={()=>{setOpenNewDialog(false);}}
                              innerDialog={<SettingsOperatorDialog title="New Operator" onAccept={onSubmitNewOperator} handleClose={()=>{setOpenNewDialog(false);}}  {...props}/>}
                />
            }
            {openNewBot &&
                <MythicDialog open={openNewBot}
                              maxWidth={"md"}
                              fullWidth={true}
                              onClose={()=>{setOpenNewBotDialog(false);}}
                              innerDialog={<SettingsBotDialog title="New Bot Account" onAccept={onSubmitNewBot} handleClose={()=>{setOpenNewBotDialog(false);}}  {...props}/>}
                />
            }
        </Paper>
        <div style={{display: "flex", flexGrow: 1, overflowY: "auto", alignItems: "flex-start"}}>
            <Table stickyHeader size="small" style={{"tableLayout": "fixed",}}>
                <TableHead >
                    <TableRow>
                        <TableCell style={{width: "3rem"}}></TableCell>
                        <TableCell >Username</TableCell>
                        <TableCell style={{width: "4rem"}}>Login</TableCell>
                        <TableCell style={{width: "6rem"}}>Use UTC</TableCell>
                        <TableCell style={{width: "10rem"}}>Preferences</TableCell>
                        <TableCell style={{width: "6rem"}}>Active</TableCell>
                        <TableCell >Login Info</TableCell>
                        <TableCell >Email</TableCell>
                        <TableCell style={{width: "6rem"}}>Admin</TableCell>
                        <TableCell style={{width: "6rem"}}>More...</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody  >
                {props.operators.map( (op) => (
                    (showDeleted || !op.deleted) &&
                        <SettingsOperatorTableRow
                            me={props.me}
                            userIsAdmin={userIsAdmin}
                            onViewUTCChanged={props.onViewUTCChanged}
                            onAdminChanged={props.onAdminChanged}
                            onActiveChanged={props.onActiveChanged}
                            onDeleteOperator={props.onDeleteOperator}
                            onUsernameChanged={props.onUsernameChanged}
                            onPasswordChanged={props.onPasswordChanged}
                            key={"operator" + op.id}
                            {...op}
                        />


                ))}
                </TableBody>
            </Table>
        </div>
    </div>
    )
}

