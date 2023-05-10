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


export function PreviewFileHexDialog(props) {
  const theme = useTheme();
  const [hexData, setHexData] = React.useState("");
  React.useEffect( () => {
    let data = atob(props.contents);
    let newData = "";
    let stringData = "";
    for(let i = 0; i < data.length; i++){
      let char = data[i].charCodeAt(0).toString(16);
      if(char.length === 1){
        newData += "0" + char;
      }else{
        newData += char;
      }
      if(data[i] === "\n"){
        stringData += "\\n";
      }else if(data[i] === "\r"){
        stringData += "\\r";
      }else{
        stringData += data[i];
      }
      if((i+1) % 4 === 0){
        newData += " ";
      }
      if((i+1) % 32 === 0){
        newData += ": " + stringData + "\n";
        stringData = "";
      }
    }
    setHexData(newData);
  })
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{props.filename}'s first 512KB</DialogTitle>
        <DialogContent style={{height: "calc(80vh)", margin: 0, padding: 0}}>
          <AceEditor 
              mode="json"
              height="inherit"
              theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
              fontSize={14}
              showGutter={true}
              highlightActiveLine={true}
              value={hexData}
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

