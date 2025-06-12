import React, { useEffect } from 'react';
import AceEditor from 'react-ace';
import {useTheme} from '@mui/material/styles';
import {snackActions} from "../../utilities/Snackbar";
import {modeOptions} from "./ResponseDisplayMedia";
import FormControl from '@mui/material/FormControl';
import WrapTextIcon from '@mui/icons-material/WrapText';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { IconButton } from '@mui/material';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import { useReactiveVar } from '@apollo/client';
import { meState } from '../../../cache';
import CodeIcon from '@mui/icons-material/Code';
import {GetOutputFormatAll} from "./ResponseDisplayInteractive";
import PaletteIcon from '@mui/icons-material/Palette';

const MaxRenderSize = 2000000;
export const ResponseDisplayPlaintext = (props) =>{
  const theme = useTheme();
  const me = useReactiveVar(meState);
  const currentContentRef = React.useRef();
  const [plaintextView, setPlaintextView] = React.useState("");
  const initialMode = props?.initial_mode || "html";
  const [mode, setMode] = React.useState(initialMode);
  const [wrapText, setWrapText] = React.useState(props?.wrap_text === undefined ? true : props.wrap_text);
  const [showOptions, setShowOptions] = React.useState(false);
  const [renderColors, setRenderColors] = React.useState(props?.render_colors === undefined ? false : props.render_colors);
  const onChangeText = (data) => {
      if(props.onChangeContent){
          props?.onChangeContent(data);
      }
      setPlaintextView(data);
  }
  useEffect( () => {
      if(props.plaintext.length > MaxRenderSize){
          snackActions.warning("Response too large (> 2MB), truncating the render. Download task output to view entire response.");
          setPlaintextView(props.plaintext.substring(0, MaxRenderSize));
      } else {
          try{
              if(props.autoFormat === undefined || props.autoFormat){
                  const newPlaintext = JSON.stringify(JSON.parse(String(props.plaintext)), null, 4);
                  setPlaintextView(newPlaintext);
                  setMode("json");
              } else {
                  setPlaintextView(String(props.plaintext));
              }
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
    const formatJSON = () => {
        try{
            let tmp = JSON.stringify(JSON.parse(currentContentRef.current?.editor?.getValue()), null, 2);
            setPlaintextView(tmp);
            setMode("json");
        }catch(error){
            snackActions.warning("Failed to reformat as JSON")
        }
    }
    const onChangeShowOptions = (e) => {
        setShowOptions(!showOptions);
    }
    const scrollContent = (node, isAppearing) => {
        // only auto-scroll if you issued the task
        if(props?.task?.operator?.username === (me?.user?.username || "")){
            let el = document.getElementById(`taskingPanel${props.task.callback_id}`);
            if(props.expand || props.displayType === "console"){
                el = document.getElementById(`taskingPanelConsole${props.task.callback_id}`);
            }
            if(el && el.scrollHeight - el.scrollTop - el.clientHeight < 600){
                document.getElementById(`scrolltotaskbottom${props.task.id}`)?.scrollIntoView({
                    //behavior: "smooth",
                    block: "end",
                    inline: "nearest"
                });
            }
        }

    }
    React.useLayoutEffect( () => {
        scrollContent()
    }, []);
    React.useEffect( () => {
        setMode(props?.initial_mode || "html");
    }, [props?.initial_mode]);
  return (
      <div style={{display: "flex", height: "100%", flexDirection: "column"}}>
          {showOptions &&
              <div style={{display: "inline-flex", flexDirection: "row", alignItems: "center"}}>
                  <FormControl sx={{ display: "inline-block", marginLeft: "10px" }} size="small">
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
                  <MythicStyledTooltip title={"Auto format JSON"} >
                      <IconButton onClick={formatJSON} style={{}}>
                          <CodeIcon color={"info"} style={{cursor: "pointer"}} />
                      </IconButton>
                  </MythicStyledTooltip>
                  <MythicStyledTooltip title={renderColors ? "Render Plaintext" : "Render Colors"} >
                      <IconButton onClick={() => {setRenderColors(!renderColors)}}>
                          <PaletteIcon color={renderColors ? "success" : "secondary"} style={{cursor: "pointer"}} />
                      </IconButton>
                  </MythicStyledTooltip>
              </div>
          }
          {props.displayType !== 'console' &&
              <div style={{
                  height: "1px",
                  width: "100%",
                  display: "flex",
                  zIndex: 1,
                  backgroundColor: theme.palette.secondary.main
              }}>
                  {showOptions &&
                      <UnfoldLessIcon onClick={onChangeShowOptions}
                                      style={{cursor: "pointer", position: "relative", top: "-9px"}}/>
                  }
                  {!showOptions &&
                      <UnfoldMoreIcon onClick={onChangeShowOptions}
                                      style={{cursor: "pointer", position: "relative", top: "-9px"}}/>
                  }
              </div>
          }

          <div style={{
              flexGrow: 1,
              height: "100%",
              paddingLeft: renderColors ? "15px" : "0px",
              paddingRight: renderColors ? "5px" : "0px"
          }}>
              {renderColors &&
                  <GetOutputFormatAll data={[
                      {response: plaintextView, id: props?.task?.id || 0, timestamp: "1970-01-01"}]}
                                      myTask={false}
                                      taskID={props?.task?.id || 0}
                                      useASNIColor={true}
                                      messagesEndRef={null}
                                      showTaskStatus={false}
                                      search={undefined}
                                      wrapText={wrapText}/>
              }
              {!renderColors &&
                  <AceEditor
                      className={"roundedBottomCorners"}
                      ref={currentContentRef}
                      mode={props.displayType !== 'console' ? mode : 'html'}
                      theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
                      fontSize={14}
                      showGutter={ props.displayType !== 'console'}
                      onChange={onChangeText}
                      //onLoad={onLoad}
                      highlightActiveLine={false}
                      showPrintMargin={false}
                      value={plaintextView}
                      height={props.expand ? "100%": undefined}
                      maxLines={props.expand ? undefined : 20}
                      width={"100%"}
                      //style={{backgroundColor: "transparent"}}
                      //autoScrollEditorIntoView={true}
                      wrapEnabled={props.displayType !== 'console' ? wrapText : true}
                      minLines={1}
                      //maxLines={props.expand ? 50 : 20}
                      setOptions={{
                          showLineNumbers: props.displayType !== 'console',
                          tabSize: 4,
                          useWorker: false,
                          showInvisibles: false,
                      }}/>
              }

          </div>
      </div>
  )
      
}