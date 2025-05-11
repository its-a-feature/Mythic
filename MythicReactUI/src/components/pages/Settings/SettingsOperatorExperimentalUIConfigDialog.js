import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import MythicTextField from '../../MythicComponents/MythicTextField';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import {
    GetMythicSetting,
    useSetMythicSetting
} from "../../MythicComponents/MythicSavedUserSetting";
import {snackActions} from "../../utilities/Snackbar";


export function SettingsOperatorExperimentalUIConfigDialog(props) {
    const initialResponseStreamLimit = GetMythicSetting({setting_name: "experiment-responseStreamLimit", default_value: 50})
    const [newResponseStreamLimit, setNewResponseStreamLimit] = React.useState(initialResponseStreamLimit);

    const [updateSetting, _] = useSetMythicSetting();
    const onNewResponseStreamLimitChange = (name, value, error) => {
        setNewResponseStreamLimit(parseInt(value));
    }

    const onAccept = () => {
        if(newResponseStreamLimit < 0){
            updateSetting({setting_name: "experiment-responseStreamLimit", value: 0});
        }else{
            updateSetting({setting_name: "experiment-responseStreamLimit", value: newResponseStreamLimit});
        }
        snackActions.success("Updated settings!");
        props.onClose();
    }
    const setDefaults = () => {
        setNewResponseStreamLimit(50);
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Configure Experimental UI Settings</DialogTitle>

        <DialogContent dividers={true} >
            These experimental configurations that are opt-in currently, but might become default or part of Mythic in the future.
            <br/>
            This list of experimental features will change over time, so be sure to always check it out!
            <br/>
            If you use any of these experimental features, please drop a comment on Mythic's GitHub or reach out on Twitter/Slack/Discord to let me know how it works for you.

        </DialogContent>
        <TableContainer className="mythicElement">
          <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
              <TableBody>
                  <TableRow hover>
                      <TableCell>{"Determine how many responses to fetch per task before paginating (0 is never paginate)"}</TableCell>
                      <TableCell>
                          <MythicTextField
                              type={"number"}
                              value={newResponseStreamLimit}
                              onChange={onNewResponseStreamLimitChange}
                              color="primary"
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
          <Button onClick={setDefaults} variant="contained" color="info">
            Reset Defaults
          </Button>
          <Button onClick={onAccept} variant="contained" color="success">
            Update
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

