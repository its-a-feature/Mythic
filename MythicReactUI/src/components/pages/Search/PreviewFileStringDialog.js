import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-csharp';
import 'ace-builds/src-noconflict/mode-golang';
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/mode-markdown';
import 'ace-builds/src-noconflict/mode-ruby';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-xcode';
import {useTheme} from '@mui/material/styles';
import FormControl from '@mui/material/FormControl';

export const modeOptions = ["csharp", "golang", "html", "json", "markdown", "ruby", "python", "java", "javascript"];
export function PreviewFileStringDialog(props) {
  const theme = useTheme();
  const [mode, setMode] = React.useState("json");
  const onChangeMode = (event) => {
      setMode(event.target.value);
  }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title" style={{display: "inline-block"}}>
            {props.filename}'s first 512KB
        </DialogTitle>
        <DialogContent  style={{height: "calc(80vh)", margin: 0, padding: 0}}>
            <FormControl sx={{ width: "100%" }} size="small">
                <Select
                    style={{display: "inline-block", width: "20%"}}
                    value={mode}
                    onChange={onChangeMode}
                >
                    {
                        modeOptions.map((opt, i) => (
                            <MenuItem key={"searchopt" + opt} value={opt}>{opt}</MenuItem>
                        ))
                    }
                </Select>
            </FormControl>
          <AceEditor 
              mode={mode}
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

