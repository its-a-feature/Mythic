import React, {useEffect} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Box from '@mui/material/Box';
import AceEditor from 'react-ace';
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-searchbox";
import {useTheme} from '@mui/material/styles';
import {HexColorInput, HexColorPicker} from 'react-colorful';
import Typography from '@mui/material/Typography';
import MythicTextField from "../../MythicComponents/MythicTextField";

export function CallbacksTableEditTriggerOnCheckinDialog(props) {
    const [comment, setComment] = React.useState(0);
    const onChange = (name, value, error) => {
        setComment(parseInt(value));
    }
    useEffect( () => {
        setComment(props.trigger_on_checkin_after_time);
    }, [props.trigger_on_checkin_after_time]);
    const onSubmit = () => {
        props.onSubmit(comment);
    }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{"Adjust this callback's trigger threshold"}</DialogTitle>
        <DialogContent dividers={true} style={{height: "100%"}}>
            <Typography>
                {"This adjusts how long, in minutes, this callback must not checkin before finally checking in to trigger an eventing workflow (trigger is callback_checkin). A zero value means never trigger."}
            </Typography>
            <MythicTextField autoFocus={true} onChange={onChange} type={"number"} value={comment} onEnter={onSubmit} name={"trigger threshold in minutes"} showLabel={false} />
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Close
          </Button>
            {props.onSubmit &&
                <Button onClick={onSubmit} variant="contained" color="success">
                    Submit
                </Button>
            }
        </DialogActions>
    </React.Fragment>
  );
}