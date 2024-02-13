import React from 'react';
import {Button} from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { SettingsOperatorTableRow } from './SettingsOperatorTableRow';
import Typography from '@mui/material/Typography';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import { SettingsOperatorDialog } from './SettingsOperatorDialog';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {snackActions} from '../../utilities/Snackbar';
import {useTheme} from '@mui/material/styles';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TuneIcon from '@mui/icons-material/Tune';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import { IconButton } from '@mui/material';
import {SettingsGlobalDialog} from "./SettingsGlobalDialog";


export function SettingsOperatorTable(props){
    const theme = useTheme();
    const [openNew, setOpenNewDialog] = React.useState(false);
    const onSubmitNewOperator = (id, username, passwordOld, passwordNew) => {
        if(passwordOld !== passwordNew){
            snackActions.error("Passwords don't match");
        }else if(passwordNew.length === 0){
            snackActions.error("Password must not be empty",);
        }else if(username.length === 0){
            snackActions.error("Username must not be empty",);
        }else{
            props.onNewOperator(username, passwordNew);
            setOpenNewDialog(false);
        }
    }
    const userData = props.operators.filter(o => o.id === (props.me?.user?.id || 0))
    const userIsAdmin = userData.length > 0 ? userData[0].admin : false;
    const [showDeleted, setShowDeleted] = React.useState(false);
    const [openGlobalSettingsDialog, setOpenGlobalSettingsDialog] = React.useState(false);
    return (
        <React.Fragment>
        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main, marginBottom: "5px", marginTop: "10px", marginRight: "5px"}} variant={"elevation"}>
            <Typography variant="h3" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                Settings
            </Typography>
            <MythicStyledTooltip title={"Adjust Global Settings"} style={{float: "right", marginRight: "10px", marginLeft: "5px"}}>
                <IconButton size="small" style={{float: "right",  marginTop: "5px"}} variant="contained"
                            onClick={() => setOpenGlobalSettingsDialog(!openGlobalSettingsDialog)} >
                    <TuneIcon />
                </IconButton>
            </MythicStyledTooltip>
            {showDeleted ? (
                <MythicStyledTooltip title={"Hide Deleted Operators"} style={{float: "right"}}>
                    <IconButton size="small" style={{float: "right", marginTop: "5px"}} variant="contained" onClick={() => setShowDeleted(!showDeleted)}><VisibilityIcon /></IconButton>
                </MythicStyledTooltip>

            ) : (
                <MythicStyledTooltip title={"Show Deleted Operators"} style={{float: "right"}}>
                    <IconButton size="small" style={{float: "right",  marginTop: "5px"}} variant="contained" onClick={() => setShowDeleted(!showDeleted)} ><VisibilityOffIcon /></IconButton>
                </MythicStyledTooltip>
            )}
            {openGlobalSettingsDialog &&
                <MythicDialog open={openGlobalSettingsDialog} size={"lg"} fullWidth
                              onClose={()=>{setOpenGlobalSettingsDialog(false);}}
                              innerDialog={<SettingsGlobalDialog
                                  onClose={()=>{setOpenGlobalSettingsDialog(false);}}  />}
                />
            }
        </Paper>
        <TableContainer component={Paper} className="mythicElement">   
            <Button size="small" onClick={()=>{setOpenNewDialog(true);}} style={{float: "right"}} startIcon={<AddCircleOutlineOutlinedIcon/>} color="success" variant="contained">New Operator</Button>
            <MythicDialog open={openNew} 
                onClose={()=>{setOpenNewDialog(false);}} 
                innerDialog={<SettingsOperatorDialog title="New Operator" onAccept={onSubmitNewOperator} handleClose={()=>{setOpenNewDialog(false);}}  {...props}/>}
            />
            <Table  size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "6rem"}}></TableCell>
                        <TableCell >Username</TableCell>
                        <TableCell style={{width: "6rem"}}>Login</TableCell>
                        <TableCell style={{width: "6rem"}}>Use UTC</TableCell>
                        <TableCell style={{width: "10rem"}}>Preferences</TableCell>
                        <TableCell style={{width: "6rem"}}>Active</TableCell>
                        <TableCell >Last Login</TableCell>
                        <TableCell >Creation Date</TableCell>
                        <TableCell style={{width: "6rem"}}>Admin</TableCell>
                        <TableCell style={{width: "6rem"}}>More...</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                
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
                            onDeleteAPIToken={props.onDeleteAPIToken}
                            onCreateAPIToken={props.onCreateAPIToken}
                            key={"operator" + op.id}
                            {...op}
                        />


                ))}
                </TableBody>
            </Table>
        </TableContainer>
    </React.Fragment>
    )
}

