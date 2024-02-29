import React from 'react';
import {Typography, Link} from '@mui/material';
import { Button, IconButton } from '@mui/material';
import {useMythicSetting} from "../../MythicComponents/MythicSavedUserSetting";
import {modeOptions} from "../Search/PreviewFileStringDialog";
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import AceEditor from 'react-ace';
import {useTheme} from '@mui/material/styles';
import {snackActions} from "../../utilities/Snackbar";
import FormControl from '@mui/material/FormControl';
import WrapTextIcon from '@mui/icons-material/WrapText';
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
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";


export const ResponseDisplayMedia = ({media, expand, task}) =>{
     return <DisplayMedia agent_file_id={media?.agent_file_id || ""} task={task} filename={media?.filename || undefined} expand={expand} />
}
const textExtensionTypes = ["txt", "ps1", "php", "json", "yml", "yaml", "config", "cfg", "go",
    "html", "xml", "js", "java", "conf", "cs", "rb", "toml", "sh", "md", "ini", "py", "kirbi", "bash_profile", "rc",
    "local", "gitconfig", "gitignore", "zsh_history", "bash_history", "ps", "psql_history", "lesshst", "gcloudignore",
    "pem", "boto", "zsh_profile", "pub", "python_history", "sqlite_history", "viminfo", "zprofile", "zshrc",
    "history", "historynew"
];
const knownTextFiles = ["config", "credentials", "known_hosts", "config_default", "id_rsa"];
const imgExtensionTypes = ["png", "jpg", "gif", "jpeg", "pdf"];
const mimeType = (path) => {
    if(!path){return undefined}
    let extension = path.split(".");
    if(extension.length > 0){
        extension = extension[extension.length - 1];
        if(imgExtensionTypes.includes(extension.toLowerCase())){
            return "object";
        }
        if(textExtensionTypes.includes(extension.toLowerCase())){
            return "text";
        }
        return undefined;
    } else if(knownTextFiles.includes(path.toLowerCase())){
        return "text"
    }
    return undefined;
}
export const DisplayMedia = ({agent_file_id, filename, expand, task}) => {
    const showMediaSetting = useMythicSetting({setting_name: "showMedia", default_value: "true"});
    const [showMedia, setShowMedia] = React.useState(showMediaSetting);
    const [fileData, setFileData] = React.useState({
        display: false,
        display_type: undefined,
        message: "Loading...",
        filename: filename,
        agent_file_id: ""
    })
    React.useEffect( () => {
        let display_type = mimeType(filename);
        if(display_type !== undefined){
            setFileData({
                display: true,
                display_type: display_type,
                filename: filename,
                agent_file_id: agent_file_id,
                message: "File not found"
            });
        }else{
            setFileData({
                display: false,
                display_type: undefined,
                filename: filename,
                agent_file_id: "",
                message: "Invalid file extension to render"
            });
        }
    }, [agent_file_id, filename]);
    const scrollContent = (node, isAppearing) => {
        // only auto-scroll if you issued the task
        document.getElementById(`scrolltotaskbottom${task?.id}`)?.scrollIntoView({
            //behavior: "smooth",
            block: "end",
            inline: "nearest"
        })
    }
    React.useLayoutEffect( () => {
        scrollContent()
    }, []);
    if(!showMedia){
        return (
            <>
                <div style={{display: "flex", width: "100%", height: "100%", justifyContent: "center", flexDirection: "column", alignItems: "center"}}>
                    <Typography variant={"h4"} >
                        {"Media Hidden by Default Due to User Settings"}
                    </Typography>
                    <Button variant={"contained"} color={"error"} onClick={() => {setShowMedia(!showMedia)}}>
                        {"Show Media"}
                    </Button>
                </div>
            </>
        )
    }
    if(!fileData.display){
        return (
            <div style={{display: "flex", width: "100%", height: "100%", justifyContent: "center", flexDirection: "column", alignItems: "center"}}>
                <Typography variant={"h4"} >
                    {fileData.message}
                </Typography>
                <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" href={"/direct/download/" + agent_file_id} >
                    {"Download here"}
                </Link>
            </div>
        )
    }
    if(fileData.display_type === "object"){
        return (
            <object width={"100%"} height={expand ? "100%" : "400px"}
                    data={"/direct/view/" + agent_file_id} >
                <Typography variant={"h4"} style={{display: "flex", width: "100%", height: "100%", justifyContent: "center", flexDirection: "column", alignItems: "center"}} >
                    {fileData.message}
                </Typography>
            </object>
        )
    }
    if(fileData.display_type === "text"){
        return (
            <div style={{height: "100%", minHeight: "200px", width: "100%"}} >
                <DisplayText agent_file_id={agent_file_id} expand={expand} />
            </div>

        )
    }
    return null;
}
const MaxRenderSize = 2000000;
const DisplayText = ({agent_file_id, expand}) => {
    const theme = useTheme();
    const [mode, setMode] = React.useState("html");
    const [content, setContent] = React.useState("");
    const [wrapText, setWrapText] = React.useState(true);
    React.useEffect( () => {

        fetch('/direct/view/' + agent_file_id).then((response) => {
            if(response.status !== 200){
                snackActions.warning("Failed to fetch contents from Mythic");
                return;
            }
            response.text().then(data => {
                if(data.length > MaxRenderSize){
                    snackActions.warning("File too large (> 2MB), truncating the render");
                }
                setContent(data.substring(0, MaxRenderSize));
            }).catch(error => {
                snackActions.warning("Error getting contents from server: " + error.toString());
                console.log("Error trying to get json response", error, response);
            });
        }).catch(error => {
            if(error.toString() === "TypeError: Failed to fetch"){
                snackActions.warning("Please refresh and accept the SSL connection error");
            } else {
                snackActions.warning("Error talking to server: " + error.toString());
            }
            console.log("There was an error!", error);
        });
    }, []);
    const onChangeMode = (event) => {
        setMode(event.target.value);
    }
    const toggleWrapText = () => {
        setWrapText(!wrapText);
    }
    return (
        <div style={{display: "flex", height: "100%", flexDirection: "column"}}>
            <div style={{display: "inline-flex", flexDirection: "row"}}>
                <FormControl sx={{ display: "inline-block" }} size="small" color={"secondary"}>
                    <TextField
                        select
                        label={"Syntax"}
                        margin={"dense"}
                        size={"small"}
                        style={{display: "inline-block", width: "100%",}}
                        value={mode}
                        sx={{padding: 0}}
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
            <div style={{display: "flex", flexGrow: 1, height: "100%"}}>
                <AceEditor
                    mode={mode}
                    theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
                    fontSize={14}
                    showGutter={true}
                    //onLoad={onLoad}
                    highlightActiveLine={false}
                    showPrintMargin={false}
                    value={content}
                    height={expand ? "100%": undefined}
                    maxLines={expand ? undefined : 20}
                    width={"100%"}
                    //autoScrollEditorIntoView={true}
                    wrapEnabled={wrapText}
                    minLines={2}
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