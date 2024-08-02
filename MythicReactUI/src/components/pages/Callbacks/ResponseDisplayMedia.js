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
import 'ace-builds/src-noconflict/mode-yaml';
import 'ace-builds/src-noconflict/mode-toml';
import 'ace-builds/src-noconflict/mode-swift';
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/mode-rust';
import 'ace-builds/src-noconflict/mode-powershell';
import 'ace-builds/src-noconflict/mode-pgsql';
import 'ace-builds/src-noconflict/mode-perl';
import 'ace-builds/src-noconflict/mode-php';
import 'ace-builds/src-noconflict/mode-objectivec';
import 'ace-builds/src-noconflict/mode-nginx';
import 'ace-builds/src-noconflict/mode-makefile';
import 'ace-builds/src-noconflict/mode-kotlin';
import 'ace-builds/src-noconflict/mode-dockerfile';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import {previewFileQuery} from "../Search/FileMetaTable";
import { useMutation } from '@apollo/client';
import CodeIcon from '@mui/icons-material/Code';

export const ResponseDisplayMedia = ({media, expand, task}) =>{
    const displayType = mimeType(media?.filename);
    const [value, setValue] = React.useState(displayType !== undefined ? 0 : 1);
    const handleChange = (event, newValue) => {
        setValue(newValue);
    }
    return (
        <div style={{display: "flex", height: "100%", flexDirection: "column"}}>
            <AppBar color={'default'} position='static' className={"no-box-shadow"}>
                <Button style={{width: "100%"}}
                        size={"small"} variant={"contained"} href={"/direct/download/" +  media.agent_file_id}
                        download >Download</Button>
                <Tabs
                    value={value}
                    onChange={handleChange}
                    indicatorColor='secondary'
                    textColor='primary'
                    sx={{
                        '& .Mui-selected': {
                            color: "unset !important"
                        }
                    }}
                    variant='scrollable'
                    scrollButtons='auto'
                    style={{maxWidth: '100%', width: '100%'}}
                    aria-label='scrollable auto tabs example'>
                    <Tab className={value === 0 ? "selectedCallback": ""} label={"Render Media"}></Tab>
                    <Tab className={value === 1 ? "selectedCallback": ""} label={"Preview Strings"}></Tab>
                    <Tab className={value === 2 ? "selectedCallback": ""} label={"Preview Hex"}></Tab>
                </Tabs>
            </AppBar>
            <div hidden={value !== 0}  style={{height: "100%"}} role='tabpanel' >
                <DisplayMedia agent_file_id={media?.agent_file_id || ""} task={task} filename={media?.filename || undefined} expand={expand} />
            </div>
            <div hidden={value !== 1} style={{height: "100%"}} role='tabpanel' >
                <DisplayText agent_file_id={media?.agent_file_id || ""} task={task} filename={media?.filename || undefined} expand={expand} preview />
            </div>
            <div hidden={value !== 2} style={{height: "100%"}} role='tabpanel' >
                <DisplayHex agent_file_id={media?.agent_file_id || ""} task={task} filename={media?.filename || undefined} expand={expand} />
            </div>

        </div>


    )
}
const textExtensionTypes = ["txt", "ps1", "php", "json", "yml", "yaml", "config", "cfg", "go",
    "html", "xml", "js", "java", "conf", "cs", "rb", "toml", "sh", "md", "ini", "py", "kirbi", "bash_profile", "rc",
    "local", "gitconfig", "gitignore", "zsh_history", "bash_history", "ps", "psql_history", "lesshst", "gcloudignore",
    "pem", "boto", "zsh_profile", "pub", "python_history", "sqlite_history", "viminfo", "zprofile", "zshrc",
    "history", "historynew"
];
const textExtensionTypesToSyntax = {
    "json": "json",
    "cs": "csharp",
    "go": "golang",
    "md": "markdown",
    "MD": "markdown",
    "rb": "ruby",
    "py": "python",
    "java": "java",
    "js": "javascript",
    "yml": "yaml",
    "yaml": "yaml",
    "toml": "toml",
    "swift": "swift",
    "psql": "sql",
    "rs": "rust",
    "ps1": "powershell",
    "prl": "perl",
    "php": "php",
    "m": "objectivec",
    "mm": "objectivec",
    "Dockerfile": "Dockerfile",
    "Makefile": "Makefile"
}
const knownTextFiles = ["config", "credentials", "known_hosts", "config_default", "id_rsa", "Dockerfile", "Makefile"];
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
            <div style={{height: "100%", minHeight: "100px", width: "100%"}} >
                <DisplayText agent_file_id={agent_file_id} expand={expand} filename={filename} />
            </div>
        )
    }
    return null;
}
const MaxRenderSize = 2000000;
const DisplayText = ({agent_file_id, expand, filename, preview}) => {
    const theme = useTheme();
    const [mode, setMode] = React.useState("html");
    const [content, setContent] = React.useState("");
    const [wrapText, setWrapText] = React.useState(true);
    const [previewFileString] = useMutation(previewFileQuery, {
        onCompleted: (data) => {
            if(data.previewFile.status === "success"){
                setContent(atob(data.previewFile.contents));
            }else{
                snackActions.error(data.previewFile.error)
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error(data);
        }
    });
    const currentContentRef = React.useRef();
    React.useEffect( () => {
        if(preview){
            // get first 512KB
            previewFileString({variables: {file_id: agent_file_id}})
        }else{
            // get entire file
            fetch('/direct/view/' + agent_file_id).then((response) => {
                if(response.status !== 200){
                    snackActions.warning("Failed to fetch contents from Mythic");
                    return;
                }
                response.text().then(data => {
                    if(data.length > MaxRenderSize){
                        snackActions.warning("File too large (> 2MB), truncating the render");
                    }

                    try{
                        let cont = JSON.stringify(JSON.parse(data), null, 2);
                        setContent(cont);
                    }catch(error){
                        setContent(data.substring(0, MaxRenderSize));
                    }
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
        }
        if(filename){
            let extension = filename.split(".");
            if(extension.length > 0){
                extension = extension[extension.length - 1];
                if(textExtensionTypesToSyntax[extension]){
                    setMode(textExtensionTypesToSyntax[extension]);
                }
            } else {
                if(textExtensionTypesToSyntax[filename]){
                    setMode(textExtensionTypesToSyntax[filename]);
                }
            }
        }
    }, [agent_file_id, filename]);
    const onChangeMode = (event) => {
        setMode(event.target.value);
    }
    const toggleWrapText = () => {
        setWrapText(!wrapText);
    }
    const formatJSON = () => {
        try{
            let tmp = JSON.stringify(JSON.parse(currentContentRef.current?.editor?.getValue()), null, 2);
            setContent(tmp);
            setMode("json");
        }catch(error){
            snackActions.warning("Failed to reformat as JSON")
        }
    }
    return (
        <div style={{display: "flex", height: "100%", flexDirection: "column"}}>
            <div style={{display: "inline-flex", flexDirection: "row", alignItems: "center"}}>
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
                <MythicStyledTooltip title={"Auto format JSON"} >
                    <IconButton onClick={formatJSON} style={{}}>
                        <CodeIcon color={"info"} style={{cursor: "pointer"}} />
                    </IconButton>
                </MythicStyledTooltip>
            </div>
            <div style={{display: "flex", flexGrow: 1, height: "100%"}}>
                <AceEditor
                    ref={currentContentRef}
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
const DisplayHex = ({agent_file_id, expand}) => {
    const theme = useTheme();
    const [content, setContent] = React.useState("");
    const [previewFileString] = useMutation(previewFileQuery, {
        onCompleted: (previewData) => {
            if(previewData.previewFile.status === "success"){
                let data = atob(previewData.previewFile.contents);
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
                setContent(newData);
            }else{
                snackActions.error(previewData.previewFile.error)
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error(data);
        }
    });
    React.useEffect( () => {
        previewFileString({variables: {file_id: agent_file_id}})
    }, [agent_file_id])
    return (
            <div style={{display: "flex", height: "100%", flexDirection: "column"}}>
                <div style={{display: "flex", flexGrow: 1, height: "100%"}}>
                    <AceEditor
                        mode="json"
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
                        minLines={2}
                        //maxLines={props.expand ? 50 : 20}
                        setOptions={{
                            showLineNumbers: true,
                            tabSize: 4,
                            useWorker: false
                        }}/>
                </div>
            </div>
);
}