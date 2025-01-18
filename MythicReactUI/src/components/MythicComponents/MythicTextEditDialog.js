import React, {useState} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-xcode';
import {useTheme} from '@mui/material/styles';

export function MythicTextEditDialog(props) {
    const theme = useTheme();

  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{props.title}</DialogTitle>
        <DialogContent dividers={true} style={{padding: 0}}>
            <AceEditor 
              mode="json"
              theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
              onChange={() => {}}
              fontSize={14}
              showGutter={true}
              highlightActiveLine={true}
              value={props.value}
              showPrintMargin={false}
              wrapEnabled={true}
              focus={true}
              width={"100%"}
              setOptions={{
                showLineNumbers: true,
                  useWorker: false,
                tabSize: 4
              }}/>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={props.onClose} color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

