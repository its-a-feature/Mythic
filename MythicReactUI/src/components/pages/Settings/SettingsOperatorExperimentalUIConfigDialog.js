import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {
    GetMythicSetting,
    useSetMythicSetting
} from "../../MythicComponents/MythicSavedUserSetting";
import {snackActions} from "../../utilities/Snackbar";
import {
    MythicDialogBody,
    MythicDialogSection
} from "../../MythicComponents/MythicDialogLayout";


export function SettingsOperatorExperimentalUIConfigDialog(props) {
    const initialResponseStreamLimit = GetMythicSetting({setting_name: "experiment-responseStreamLimit", default_value: 50})
    const [newResponseStreamLimit, setNewResponseStreamLimit] = React.useState(initialResponseStreamLimit);

    const [updateSetting] = useSetMythicSetting();
    const onNewResponseStreamLimitChange = (name, value, error) => {
        setNewResponseStreamLimit(parseInt(value));
    }

    const onAccept = () => {
        if(newResponseStreamLimit < 0){
            updateSetting({setting_name: "experiment-responseStreamLimit", value: 0, broadcast: false});
        }else{
            updateSetting({setting_name: "experiment-responseStreamLimit", value: newResponseStreamLimit, broadcast: false});
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
            <MythicDialogBody>
                <MythicDialogSection
                    title="Response Streaming"
                    description="Experimental settings may change as features move into the default UI."
                >
                    <MythicTextField
                        type={"number"}
                        value={newResponseStreamLimit}
                        onChange={onNewResponseStreamLimitChange}
                        name="Responses per task before pagination"
                        helperText="0 uses the safe default."
                    />
                </MythicDialogSection>
            </MythicDialogBody>
        </DialogContent>
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
