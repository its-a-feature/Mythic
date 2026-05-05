import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import {
    SettingsOperatorTableRow,
} from './SettingsOperatorTableRow';
import { SettingsOperatorDialog, SettingsBotDialog } from './SettingsOperatorDialog';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {snackActions} from '../../utilities/Snackbar';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TuneIcon from '@mui/icons-material/Tune';
import {GET_GLOBAL_SETTINGS, SettingsGlobalDialog} from "./SettingsGlobalDialog";
import SmartToyTwoToneIcon from '@mui/icons-material/SmartToyTwoTone';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ForwardToInboxTwoToneIcon from '@mui/icons-material/ForwardToInboxTwoTone';
import {InviteLinksDialog} from "./InviteLinksDialog";
import {useLazyQuery} from '@apollo/client';
import {MythicPageHeader, MythicPageHeaderChip} from "../../MythicComponents/MythicPageHeader";
import {MythicToolbarButton, MythicToolbarToggle} from "../../MythicComponents/MythicTableToolbar";
import {MythicTableEmptyState} from "../../MythicComponents/MythicStateDisplay";


export function SettingsOperatorTable(props){
    const [openNew, setOpenNewDialog] = React.useState(false);
    const [openNewBot, setOpenNewBotDialog] = React.useState(false);
    const onSubmitNewOperator = (id, username, passwordOld, passwordNew, email) => {
        if(passwordNew.length === 0){
            snackActions.error("Password must not be empty");
        }
        if(passwordOld !== passwordNew){
            snackActions.error("Passwords don't match");
        }
        if(username.length === 0){
            snackActions.error("Username must not be empty");
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
        getGlobalSettings().then(({data}) => setInviteLinksEnabled(data.getGlobalSettings.settings["server_config"]["allow_invite_links"]));
        setOpenGlobalSettingsDialog(false);
    }
    React.useEffect( () => {
        getGlobalSettings().then(({data}) => setInviteLinksEnabled(data.getGlobalSettings.settings["server_config"]["allow_invite_links"]));
    }, []);
    const visibleOperators = props.operators.filter((op) => showDeleted || !op.deleted);
    const activeOperatorCount = props.operators.filter((op) => op.active && !op.deleted).length;
    const operatorCountLabel = visibleOperators.length === 1 ? "1 shown" : `${visibleOperators.length} shown`;
    const activeOperatorLabel = activeOperatorCount === 1 ? "1 active" : `${activeOperatorCount} active`;
    return (
    <>
        <MythicPageHeader
            title={"Settings"}
            subtitle={"Manage operators, bots, invite links, and global Mythic preferences."}
            meta={
                <>
                    <MythicPageHeaderChip label={operatorCountLabel} />
                    <MythicPageHeaderChip label={activeOperatorLabel} />
                    {showDeleted && <MythicPageHeaderChip label="Deleted visible" />}
                </>
            }
            actions={
                <>
                    <MythicToolbarButton
                        disabled={!inviteLinksEnabled || !userIsAdmin}
                        onClick={()=>{setOpenInviteLinksDialog(true);}}
                        startIcon={<ForwardToInboxTwoToneIcon />}
                        variant="outlined"
                    >
                        Invites
                    </MythicToolbarButton>
                    <MythicToolbarButton onClick={()=>{setOpenNewDialog(true);}} startIcon={<PersonAddIcon />} variant="contained">
                        User
                    </MythicToolbarButton>
                    <MythicToolbarButton onClick={()=>{setOpenNewBotDialog(true);}} startIcon={<SmartToyTwoToneIcon />} variant="outlined">
                        Bot
                    </MythicToolbarButton>
                    <MythicToolbarButton onClick={() => setOpenGlobalSettingsDialog(!openGlobalSettingsDialog)} startIcon={<TuneIcon />} variant="outlined">
                        Global
                    </MythicToolbarButton>
                    <MythicToolbarToggle
                        checked={showDeleted}
                        onClick={() => setShowDeleted(!showDeleted)}
                        label="Deleted"
                        activeIcon={<VisibilityIcon fontSize="small" />}
                        inactiveIcon={<VisibilityOffIcon fontSize="small" />}
                    />
                </>
            }
        >
            {openGlobalSettingsDialog &&
                <MythicDialog open={openGlobalSettingsDialog} fullWidth={true} maxWidth={"md"}
                              onClose={closeGlobalSettingsDialog}
                              innerDialog={<SettingsGlobalDialog
                                  onClose={closeGlobalSettingsDialog}  />}
                />
            }
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
        </MythicPageHeader>
        <TableContainer className="mythicElement" style={{display: "flex", flexGrow: 1, overflowY: "auto", alignItems: "flex-start"}}>
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
                {visibleOperators.length === 0 &&
                    <MythicTableEmptyState
                        colSpan={10}
                        compact
                        title={props.operators.length === 0 ? "No operators available" : "No visible operators"}
                        description={props.operators.length === 0 ? "Create a user or bot account to get started." : "Deleted operators are hidden. Toggle Deleted to include them."}
                    />
                }
                {visibleOperators.map( (op) => (
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
        </TableContainer>
    </>
    )
}
