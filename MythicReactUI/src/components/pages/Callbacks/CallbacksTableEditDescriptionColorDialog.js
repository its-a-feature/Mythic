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

export function CallbacksTableEditDescriptionColorDialog(props) {
  const [comment, setComment] = React.useState("");
  const [color, setColor] = React.useState("");
  const theme = useTheme();
    const onCommitSubmit = () => {
        if(color === "ffffff" || color === "000000"){
            props.onSubmit(comment, "");
        } else {
            props.onSubmit(comment, color);
        }
        if(props.dontCloseOnSubmit){
            return;
        }
        props.onClose();
    }
    const onChange = (value) => {
        setComment(value);
    }
    useEffect( () => {
        try{
            setComment(JSON.stringify(JSON.parse(props.description), null, 2));
        }catch(error){
            setComment(props.description);
        }
        setColor(props.color);
    }, [props.description, props.color]);
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{props.title}</DialogTitle>
        <DialogContent dividers={true} style={{height: "100%", margin: 0, padding: 0}}>
            <AceEditor
                mode="json"
                theme={theme.palette.mode === 'dark' ? 'monokai' : 'github'}
                width="100%"
                height="100%"
                wrapEnabled={props.wrap ? props.wrap : false}
                minLines={props.maxRows ? props.maxRows : 3}
                maxLines={props.maxRows ? props.maxRows : 3}
                value={comment}
                focus={true}
                onChange={onChange}
                setOptions={{
                    useWorker: false
                }}
            />
            <HexColorPicker color={color} onChange={setColor} style={{width: "100%"}} />
            <HexColorInput color={color} onChange={setColor} style={{width: "80%"}} />
            <Button onClick={()=>setColor("ffffff")} color={"success"}>
                Clear
            </Button>
            <Box sx={{width: "100%", height: 25, backgroundColor: color}} >
                <Typography style={{color: "white", display: "inline-block", marginRight: "10px"}}>DarkMode Text With Color Background</Typography>
                <Typography style={{color: "black", display: "inline-block"}}>LightMode Text With Color Background</Typography>
            </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Close
          </Button>
            {props.onSubmit &&
                <Button onClick={onCommitSubmit} variant="contained" color="success">
                    Submit
                </Button>
            }
        </DialogActions>
    </React.Fragment>
  );
}