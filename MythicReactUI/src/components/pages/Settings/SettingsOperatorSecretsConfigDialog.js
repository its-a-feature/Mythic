import React from 'react';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import {TextField, Button} from '@mui/material';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import {snackActions} from "../../utilities/Snackbar";
import {useMutation, useQuery, gql} from '@apollo/client';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';

const getCurrentSecrets = gql`
query gettingOperatorSecrets($operator_id: Int) {
    getOperatorSecrets(operator_id: $operator_id) {
        status
        error
        secrets
    }
}
`;
const updateCurrentSecrets = gql`
mutation updateOperatorSecrets( $secrets: jsonb!, $operator_id: Int ){
    updateOperatorSecrets(secrets: $secrets, operator_id: $operator_id){
        status
        error
    }
}
`;
export function SettingsOperatorSecretsConfigDialog(props) {
    const [settings, setSettings] = React.useState([]);
    const [updateSettings] = useMutation(updateCurrentSecrets, {
        onCompleted: (result) => {
            if(result.updateOperatorSecrets.status === "success"){
                snackActions.success("Updated secrets");
            }else{
                snackActions.warning(result.updateOperatorSecrets.error);
            }
            props.onClose();

        },
        onError: (err) => {
            console.log(err);
            snackActions.error("Unable to update operator secrets");
        }
    });
    const onAccept = () => {
        let newSettings = {};
        for(let i = 0; i < settings.length; i++){
            if(settings[i][0].trim().length > 0){
                newSettings[settings[i][0].trim()] = settings[i][1].trim();
            }
        }
        updateSettings({variables: {secrets: newSettings, operator_id: props.id}});
    }
    useQuery(getCurrentSecrets, {fetchPolicy: "no-cache",
        variables: {operator_id: props.id},
        onCompleted: (data) => {
            if(data.getOperatorSecrets.status === "success"){
                let tempSettings = [];
                for (const [key, value] of Object.entries(data.getOperatorSecrets.secrets)) {
                    tempSettings.push([key, value]);
                }
                setSettings(tempSettings);
            } else {
                snackActions.warning(data.getOperatorSecrets.error);
            }
        }
    });
    const addSecret = () => {
        setSettings( [...settings, ["", ""]]);
    }
    const removeSecret = (index) => {
        let array = [...settings];
        array.splice(index, 1);
        setSettings( array );
    }
    const onChangeKey = (evt, index) => {
        const newSettings = settings.map( (s, indx) => {
            if(indx === index){
                return [evt.target.value, s[1]];
            }
            return s;
        });
        setSettings(newSettings);
    }
    const onChangeValue = (evt, index) => {
        const newSettings = settings.map( (s, indx) => {
            if(indx === index){
                return [s[0], evt.target.value];
            }
            return s;
        });
        setSettings(newSettings);
    }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Configure Secrets</DialogTitle>

        <DialogContent dividers={true} >
            These secrets are sent down with tasking to allow per-operator authentication if needed during a tasks' processing.
        </DialogContent>
        <TableContainer className="mythicElement">
          <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
              <TableHead>
                <TableRow>
                    <TableCell style={{width: "2rem"}}/>
                    <TableCell style={{width: "30%"}}>Secret Key</TableCell>
                    <TableCell>Secret Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                  {settings.map( (s, index) => (
                      <TableRow hover key={"secret" + index}>
                          <TableCell>
                              <DeleteIcon style={{cursor: "pointer"}} color={"error"} onClick={() => removeSecret(index)} />
                          </TableCell>
                        <TableCell>
                            <TextField style={{width:"100%"}} size="small" value={s[0]} onChange={(e) => onChangeKey(e, index)}></TextField>
                        </TableCell>
                        <TableCell>
                            <TextField style={{width:"100%"}} size="small" value={s[1]} onChange={(e) => onChangeValue(e, index)}></TextField>
                        </TableCell>
                      </TableRow>
                  ))}
                  <TableRow>
                      <TableCell colSpan={2}>
                          <AddCircleOutlineOutlinedIcon color={"success"} style={{cursor: "pointer"}} onClick={addSecret} />
                      </TableCell>
                      <TableCell>
                      </TableCell>
                  </TableRow>
              </TableBody>
            </Table>
        </TableContainer>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Cancel
          </Button>
          <Button onClick={onAccept} variant="contained" color="success">
            Update
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

