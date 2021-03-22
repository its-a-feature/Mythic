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
import { useSnackbar } from 'notistack';


export function SettingsOperatorTable(props){
    const [openNew, setOpenNewDialog] = React.useState(false);
    const { enqueueSnackbar } = useSnackbar();
    const onSubmitNewOperator = (id, username, passwordOld, passwordNew) => {
        if(passwordOld !== passwordNew){
            enqueueSnackbar("Passwords don't match", {variant: "error"});
        }else if(passwordNew.length === 0){
            enqueueSnackbar("Password must not be empty", {variant: "error"});
        }else if(username.length === 0){
            enqueueSnackbar("Username must not be empty", {variant: "error"});
        }else{
            props.onNewOperator(username, passwordNew);
            setOpenNewDialog(false);
        }
    }
    return (
        <TableContainer component={Paper} className="mythicElement">
            <Typography variant="h3" align="left" id="SettingsTable" component="div" 
            style={{"display": "inline-block", "float": "left", "marginLeft": "10px"}}>
              Settings
            </Typography>    
            <Button size="small" onClick={()=>{setOpenNewDialog(true);}} style={{float: "right"}} startIcon={<AddCircleOutlineOutlinedIcon/>} color="primary" variant="contained">New Operator</Button>
            <MythicDialog open={openNew} 
                onClose={()=>{setOpenNewDialog(false);}} 
                innerDialog={<SettingsOperatorDialog title="New Operator" onAccept={onSubmitNewOperator} handleClose={()=>{setOpenNewDialog(false);}}  {...props}/>}
             />
            <Table  size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell>Delete Account</TableCell>
                        <TableCell>Username</TableCell>
                        <TableCell>Modify</TableCell>
                        <TableCell>Use UTC Timestamps</TableCell>
                        <TableCell>Account Active</TableCell>
                        <TableCell>Last Login</TableCell>
                        <TableCell>Account Creation Date</TableCell>
                        <TableCell>Admin Status</TableCell>
                        <TableCell>More...</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                
                {props.operator.map( (op) => (
                    <SettingsOperator
                        onViewUTCChanged={props.onViewUTCChanged}
                        onAdminChanged={props.onAdminChanged}
                        onActiveChanged={props.onActiveChanged} 
                        onDeleteOperator={props.onDeleteOperator}
                        key={"operator" + op.id}
                        {...op}
                    />
                ))}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

