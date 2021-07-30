import React from 'react';
import {Button} from '@material-ui/core';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import { SettingsOperator } from './SettingsOperator';
import Typography from '@material-ui/core/Typography';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { SettingsOperatorDialog } from './SettingsOperatorDialog';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {snackActions} from '../../utilities/Snackbar';
import {useTheme} from '@material-ui/core/styles';


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
    return (
        <React.Fragment>
        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main, marginBottom: "5px", marginTop: "10px", marginRight: "5px"}} variant={"elevation"}>
            <Typography variant="h3" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                Settings
            </Typography>
        </Paper>
        <TableContainer component={Paper} className="mythicElement">   
        <Button size="small" onClick={()=>{setOpenNewDialog(true);}} style={{float: "right"}} startIcon={<AddCircleOutlineOutlinedIcon/>} color="primary" variant="contained">New Operator</Button>
        <MythicDialog open={openNew} 
            onClose={()=>{setOpenNewDialog(false);}} 
            innerDialog={<SettingsOperatorDialog title="New Operator" onAccept={onSubmitNewOperator} handleClose={()=>{setOpenNewDialog(false);}}  {...props}/>}
         />
        <Table  size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "scroll"}}>
            <TableHead>
                <TableRow>
                    <TableCell style={{width: "9rem"}}>Delete Account</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell style={{width: "6rem"}}>Modify</TableCell>
                    <TableCell style={{width: "10rem"}}>UTC Timestamps</TableCell>
                    <TableCell style={{width: "9rem"}}>Account Active</TableCell>
                    <TableCell>Last Login</TableCell>
                    <TableCell>Account Creation Date</TableCell>
                    <TableCell style={{width: "9rem"}}>Admin Status</TableCell>
                    <TableCell style={{width: "5rem"}}>More...</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
            
            {props.operator.map( (op) => (
                <SettingsOperator
                    onViewUTCChanged={props.onViewUTCChanged}
                    onAdminChanged={props.onAdminChanged}
                    onActiveChanged={props.onActiveChanged} 
                    onDeleteOperator={props.onDeleteOperator}
                    onUsernameChanged={props.onUsernameChanged}
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

