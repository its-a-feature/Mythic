import React, { useEffect } from 'react';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-xcode';
import "ace-builds/src-noconflict/ext-searchbox";
import {useTheme} from '@mui/material/styles';
import {snackActions} from "../../utilities/Snackbar";
import {modeOptions} from "../Search/PreviewFileStringDialog";
import FormControl from '@mui/material/FormControl';
import WrapTextIcon from '@mui/icons-material/WrapText';
import 'ace-builds/src-noconflict/mode-csharp';
import 'ace-builds/src-noconflict/mode-golang';
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/mode-markdown';
import 'ace-builds/src-noconflict/mode-ruby';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/mode-javascript';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { IconButton } from '@mui/material';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';

const MaxRenderSize = 2000000;
export const ResponseDisplayPlaintext = (props) =>{
  const theme = useTheme();
  const [plaintextView, setPlaintextView] = React.useState("");
  const [mode, setMode] = React.useState("html");
  const [wrapText, setWrapText] = React.useState(true);
  const [showOptions, setShowOptions] = React.useState(false);
  useEffect( () => {
      if(props.plaintext.length > MaxRenderSize){
          snackActions.warning("Response too large (> 2MB), truncating the render. Download task output to view entire response.");
          setPlaintextView(props.plaintext.substring(0, MaxRenderSize));
      } else {
          try{
              const newPlaintext = JSON.stringify(JSON.parse(String(props.plaintext)), null, 4);
              setPlaintextView(newPlaintext);
              setMode("json");
          }catch(error){
              setPlaintextView(String(props.plaintext));
          }
      }
  }, [props.plaintext]);
    const onChangeMode = (event) => {
        setMode(event.target.value);
    }
    const toggleWrapText = () => {
        setWrapText(!wrapText);
    }
    const onChangeShowOptions = (e) => {
        setShowOptions(!showOptions);
    }
    const scrollContent = (node, isAppearing) => {
        // only auto-scroll if you issued the task
        document.getElementById(`scrolltotaskbottom${props.task.id}`)?.scrollIntoView({
            //behavior: "smooth",
            block: "end",
            inline: "nearest"
        })
    }
    React.useLayoutEffect( () => {
        scrollContent()
    }, []);
  return (
      <div style={{display: "flex", height: "100%", flexDirection: "column"}}>
          {showOptions &&
              <div style={{display: "inline-flex", flexDirection: "row"}}>
                  <FormControl sx={{ display: "inline-block" }} size="small">
                      <TextField
                          label={"Syntax"}
                          select
                          margin={"dense"}
                          size={"small"}
                          style={{display: "inline-block", width: "100%"}}
                          value={mode}
                          onChange={onChangeMode}
                      >
                          {
                              modeOptions.map((opt, i) => (
                                  <MenuItem key={"searchopt" + opt} value={opt}>{opt}</MenuItem>
                              ))
                          }
                      </TextField>
                  </FormControl>
                  <MythicStyledTooltip title={wrapText ?  "Unwrap Text" : "Wrap Text"} >
                      <IconButton onClick={toggleWrapText} style={{}}>
                          <WrapTextIcon color={wrapText ? "success" : "secondary"}
                                        style={{cursor: "pointer"}}
                          />
                      </IconButton>
                  </MythicStyledTooltip>
              </div>
          }
          <div style={{height: "1px", width: "100%", display: "flex", zIndex: 1, justifyContent: "space-around", backgroundColor: theme.palette.secondary.main}}>
              {showOptions &&
                <UnfoldLessIcon onClick={onChangeShowOptions} style={{cursor: "pointer", position: "relative", top: "-8px"}} />
              }
              {!showOptions &&
                <UnfoldMoreIcon onClick={onChangeShowOptions} style={{cursor: "pointer", position: "relative", top: "-7px"}} />
              }
          </div>

          <div style={{display: "flex", flexGrow: 1, height: "100%"}}>
                <AceEditor
                    mode={mode}
                    theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
                    fontSize={14}
                    showGutter={true}
                    //onLoad={onLoad}
                    highlightActiveLine={false}
                    showPrintMargin={false}
                    value={plaintextView}
                    height={props.expand ? "100%": undefined}
                    maxLines={props.expand ? undefined : 20}
                    width={"100%"}
                    //autoScrollEditorIntoView={true}
                    wrapEnabled={wrapText}
                    minLines={1}
                    //maxLines={props.expand ? 50 : 20}
                    setOptions={{
                      showLineNumbers: true,
                      tabSize: 4,
                      useWorker: false
                    }}/>
          </div>
      </div>
  )
      
}