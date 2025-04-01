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
import IconButton from '@mui/material/IconButton';
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";
import MythicTextField from "../../MythicComponents/MythicTextField";

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
    const onChangeKey = (value, index) => {
        const newSettings = settings.map( (s, indx) => {
            if(indx === index){
                return [value, s[1]];
            }
            return s;
        });
        setSettings(newSettings);
    }
    const onChangeValue = (value, index) => {
        const newSettings = settings.map( (s, indx) => {
            if(indx === index){
                return [s[0], value];
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
                    <MythicStyledTableCell style={{width: "2rem"}}/>
                    <MythicStyledTableCell style={{width: "30%"}}>Secret Key</MythicStyledTableCell>
                    <MythicStyledTableCell>Secret Value</MythicStyledTableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                  {settings.map( (s, index) => (
                      <TableRow hover key={"secret" + index}>
                          <MythicStyledTableCell>
                              <IconButton color={"error"} onClick={() => removeSecret(index)}>
                                  <DeleteIcon   />
                              </IconButton>
                          </MythicStyledTableCell>
                        <MythicStyledTableCell>
                            <MythicTextField style={{width:"100%"}} size="small" value={s[0]} onChange={(name, value, error) => onChangeKey(value, index)}></MythicTextField>
                        </MythicStyledTableCell>
                        <MythicStyledTableCell>
                            <MythicTextField style={{width:"100%"}} size="small" value={s[1]} onChange={(name, value, error) => onChangeValue(value, index)}></MythicTextField>
                        </MythicStyledTableCell>
                      </TableRow>
                  ))}
                  <TableRow>
                      <MythicStyledTableCell colSpan={2}>
                          <IconButton color={"success"} onClick={addSecret}>
                              <AddCircleOutlineOutlinedIcon    />
                          </IconButton>

                      </MythicStyledTableCell>
                      <MythicStyledTableCell>
                      </MythicStyledTableCell>
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

