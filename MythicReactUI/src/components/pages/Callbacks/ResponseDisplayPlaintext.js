import React, { useEffect } from 'react';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-xcode';
import "ace-builds/src-noconflict/ext-searchbox";
import {useTheme} from '@mui/material/styles';
import {snackActions} from "../../utilities/Snackbar";

const MaxRenderSize = 2000000;
export const ResponseDisplayPlaintext = (props) =>{
  const theme = useTheme();
  const [plaintextView, setPlaintextView] = React.useState("");
  useEffect( () => {
      if(props.plaintext.length > MaxRenderSize){
          snackActions.warning("Response too large (> 2MB), truncating the render. Download task output to view entire response.");
          setPlaintextView(props.plaintext.substring(0, MaxRenderSize));
      } else {
          try{
              const newPlaintext = JSON.stringify(JSON.parse(String(props.plaintext)), null, 4);
              setPlaintextView(newPlaintext);
          }catch(error){
              setPlaintextView(String(props.plaintext));
          }
      }
  }, [props.plaintext]);
  return (
    <AceEditor 
        mode="json"
        theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
        fontSize={14}
        showGutter={true}
        //onLoad={onLoad}
        highlightActiveLine={true}
        value={plaintextView}
        height={props.expand ? "100%": undefined}
        maxLines={props.expand ? undefined : 20}
        width={"100%"}
        //autoScrollEditorIntoView={true}
        wrapEnabled={true}
        minLines={1}
        //maxLines={props.expand ? 50 : 20}
        setOptions={{
          showLineNumbers: true,
          tabSize: 4,
          useWorker: false
        }}/>
  )
      
}