import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import MythicTextField from '../../MythicComponents/MythicTextField';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import {useMythicSetting} from "../../MythicComponents/MythicSavedUserSetting";
import {snackActions} from "../../utilities/Snackbar";


export function SettingsOperatorExperimentalUIConfigDialog(props) {
    const me = props.me;
    const initialNewBrowserScriptTable = useMythicSetting({setting_name: "experiment-browserscripttable", default_value: "false"});
    const [newBrowserScriptTables, setNewBrowserScriptTables] = React.useState(initialNewBrowserScriptTable);
    const initialResponseStreamLimit = useMythicSetting({setting_name: "experiment-responseStreamLimit", default_value: 10, output: "number"})
    const [newResponseStreamLimit, setNewResponseStreamLimit] = React.useState(initialResponseStreamLimit);

    const onBrowserScriptTablesChanged = (evt) => {
        setNewBrowserScriptTables(evt.target.checked);
    }
    const onNewResponseStreamLimitChange = (name, value, error) => {
        setNewResponseStreamLimit(value);
    }

    const onAccept = () => {
        localStorage.setItem(`${me?.user?.user_id || 0}-experiment-browserscripttable`, newBrowserScriptTables);
        if(newResponseStreamLimit < 0){
            localStorage.setItem(`${me?.user?.user_id || 0}-experiment-responseStreamLimit`, 0);
        }else{
            localStorage.setItem(`${me?.user?.user_id || 0}-experiment-responseStreamLimit`, newResponseStreamLimit);
        }
        snackActions.success("Updated settings!");
        props.onClose();
    }
    const setDefaults = () => {
        setNewBrowserScriptTables(false);
        setNewResponseStreamLimit(10);
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
        <TableContainer component={Paper} className="mythicElement">
          <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
              <TableBody>
                <TableRow hover>
                  <TableCell>Use new BrowserScript Table Renders</TableCell>
                  <TableCell>
                    <Switch
                      checked={newBrowserScriptTables}
                      onChange={onBrowserScriptTablesChanged}
                      color="primary"
                      inputProps={{ 'aria-label': 'primary checkbox' }}
                      name="new-browserscripttables"
                    />
                  </TableCell>
                </TableRow>
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

