import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import {useMutation, useQuery, gql} from '@apollo/client';
import {snackActions} from "../../utilities/Snackbar";

const GET_SETTINGS = gql`
query getGlobalSettings {
  getGlobalSettings {
    settings
  }
}
`;
const UpdateGlobalSettingsMutation = gql`
mutation updateGlobalSettings($settings: jsonb!) {
    updateGlobalSettings(settings: $settings){
        status
        error
    }
}
`;
export function SettingsGlobalDialog(props) {
    const [debugAgentMessage, setDebugAgentMessage] = React.useState(false);
    useQuery(GET_SETTINGS, {fetchPolicy: "no-cache",
        onCompleted: (data) => {
            console.log(data);
            setDebugAgentMessage(data.getGlobalSettings.settings["MYTHIC_DEBUG_AGENT_MESSAGE"]);
        }
    });
    const [updateGlobalSettings] = useMutation(UpdateGlobalSettingsMutation, {
        onCompleted: (result) => {
            if(result.updateGlobalSettings.status === "success"){
                snackActions.success("Successfully updated");
            } else {
                snackActions.error(result.updateGlobalSettings.error);
            }
            props.onClose();
        },
        onError: (err) => {
            console.log(err);
            snackActions.error("Unable to update global without Admin permissions");
            props.onClose();
        }
    });
    const onDebugAgentMessageChange = (evt) => {
        setDebugAgentMessage(!debugAgentMessage);
    }

    const onAccept = () => {
      updateGlobalSettings({variables:{
          settings: {
              "MYTHIC_DEBUG_AGENT_MESSAGE": debugAgentMessage
          }
      }});
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Configure Global Settings</DialogTitle>
          <TableContainer component={Paper} className="mythicElement">
          <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
              <TableBody>
                <TableRow hover>
                  <TableCell style={{width: "60%"}}>Emit detailed agent message parsing information to the event logs. This is very noisy and can slow down the server. Also set by the MYTHIC_DEBUG_AGENT_MESSAGE config variable.</TableCell>
                  <TableCell>
                      <Switch
                          checked={debugAgentMessage}
                          onChange={onDebugAgentMessageChange}
                          color="primary"
                          inputProps={{ 'aria-label': 'primary checkbox' }}
                      />
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

