import React from 'react';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";
import {MythicDialogButton, MythicDialogFooter, MythicDialogSection} from "../../MythicComponents/MythicDialogLayout";


export function C2ProfileStartStopOutputDialog(props) {
  return (
    <>
        <DialogTitle id="form-dialog-title">{props.container_name}'s Current Stdout/Stderr</DialogTitle>
            <DialogContent dividers={true} style={{padding: 0}}>
            <MythicDialogSection description="This is the current Stdout/Stderr for the profile. This goes away once you close this dialog.">
            <div style={{height: "calc(80vh)", overflowY: "auto", paddingTop: "0.5rem"}}>
                <ResponseDisplayPlaintext
                    initial_mode={"json"}
                    render_colors={true}
                    wrap_text={false}
                    plaintext={props.output}
                    expand={true}/>
            </div>
            </MythicDialogSection>
            </DialogContent>
        <MythicDialogFooter>
            <MythicDialogButton onClick={props.onClose}>
            Close
          </MythicDialogButton>
        </MythicDialogFooter>
  </>
  );
}
