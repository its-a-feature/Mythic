import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-xcode';
import {useTheme} from '@mui/material/styles';


export function PreviewFileStringDialog(props) {
  const theme = useTheme();
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{props.filename}'s first 512KB</DialogTitle>
        <DialogContent  style={{height: "calc(80vh)", margin: 0, padding: 0}}>
          <AceEditor 
              mode="json"
              theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
              fontSize={14}
              height="inherit"
              showGutter={true}
              highlightActiveLine={true}
              value={atob(props.contents)}
              width={"100%"}
              minLines={2}
              setOptions={{
                showLineNumbers: true,
                tabSize: 4,
                useWorker: false
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

