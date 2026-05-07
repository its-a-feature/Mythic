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
import Typography from '@mui/material/Typography';
import {getReadableTextColor, isValidHexColor, MythicColorSwatchInput} from '../../MythicComponents/MythicColorInput';

export function CallbacksTableEditDescriptionColorDialog(props) {
  const [comment, setComment] = React.useState("");
  const [color, setColor] = React.useState("");
  const theme = useTheme();
    const onCommitSubmit = () => {
        const normalizedColor = color?.toLowerCase() || "";
        if(normalizedColor === "" || normalizedColor === "ffffff" || normalizedColor === "#ffffff" ||
            normalizedColor === "000000" || normalizedColor === "#000000"){
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
    const previewColor = isValidHexColor(color) ? color : "";
    const darkPreviewBackground = previewColor || "#1f2937";
    const lightPreviewBackground = previewColor || "#f8fafc";
    const darkPreviewTextColor = previewColor ? getReadableTextColor(previewColor) : "#ffffff";
    const lightPreviewTextColor = previewColor ? getReadableTextColor(previewColor) : "#111827";
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{props.title}</DialogTitle>
        <DialogContent dividers={true} style={{height: "100%", margin: 0, padding: 0}}>
            <AceEditor
                mode="json"
                theme={theme.palette.mode === 'dark' ? 'monokai' : 'github'}
                width="100%"
                height="100%"
                fontSize={14}
                wrapEnabled={props.wrap ? props.wrap : false}
                minLines={props.maxRows ? props.maxRows : 3}
                maxLines={props.maxRows ? props.maxRows : 3}
                value={comment}
                focus={true}
                onChange={onChange}
                setOptions={{
                    tabSize: 4,
                    useWorker: false,
                    showInvisibles: false,
                }}
            />
            <Box sx={{p: 1.5, borderTop: "1px solid", borderColor: "divider", backgroundColor: "background.paper"}}>
                <Box
                    sx={{
                        p: 1.5,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: "8px",
                    }}
                >
                    <Box sx={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 1}}>
                        <Box sx={{minWidth: 0}}>
                            <Typography variant="body2" sx={{fontWeight: 700}}>Callback Color</Typography>
                            <Typography variant="caption" sx={{color: "text.secondary"}}>Callback row background and tasking accent</Typography>
                        </Box>
                        <Box sx={{display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", justifyContent: "flex-end"}}>
                            <MythicColorSwatchInput
                                color={isValidHexColor(color) ? color : "#000000"}
                                label="Callback color"
                                onChange={setColor}
                            />
                            <Button onClick={() => setColor("")} color="success" variant="outlined" size="small">
                                Clear
                            </Button>
                        </Box>
                    </Box>
                    <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", sm: "1fr 1fr"}, gap: 1}}>
                        <Box
                            sx={{
                                minHeight: 40,
                                px: 1.5,
                                display: "flex",
                                alignItems: "center",
                                borderRadius: "6px",
                                border: "1px solid",
                                borderColor: "divider",
                                backgroundColor: darkPreviewBackground,
                            }}
                        >
                            <Typography sx={{color: darkPreviewTextColor, fontWeight: 700}}>Dark callback row</Typography>
                        </Box>
                        <Box
                            sx={{
                                minHeight: 40,
                                px: 1.5,
                                display: "flex",
                                alignItems: "center",
                                borderRadius: "6px",
                                border: "1px solid",
                                borderColor: "divider",
                                backgroundColor: lightPreviewBackground,
                            }}
                        >
                            <Typography sx={{color: lightPreviewTextColor, fontWeight: 700}}>Light callback row</Typography>
                        </Box>
                    </Box>
                </Box>
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
