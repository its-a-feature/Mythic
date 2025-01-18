import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import TableRow from '@mui/material/TableRow';
import Switch from '@mui/material/Switch';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import Typography from '@mui/material/Typography';
import {HexColorInput, HexColorPicker} from 'react-colorful';
import {GetMythicSetting, useSetMythicSetting} from "../../MythicComponents/MythicSavedUserSetting";
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Input from '@mui/material/Input';
import IconButton from '@mui/material/IconButton';
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";
import { operatorSettingDefaults} from "../../../cache";
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {snackActions} from "../../utilities/Snackbar";
import {userSettingsQuery} from "../../App";
import {copyStringToClipboard} from "../../utilities/Clipboard";
import {useLazyQuery } from '@apollo/client';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import ColorLensIcon from '@mui/icons-material/ColorLens';

const interactTypeOptions = [
    {value: "interact", display: "Accordions"},
    {value: "interactSplit", display: "Split View"},
    {value: "interactConsole", display: "Console Like"}
];
const commonFontFamilies = [
    "Verdana",
    "-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",\"Segoe UI Symbol\"",
    "Monaco"
]
export function SettingsOperatorUIConfigDialog(props) {
    const fileInputRef = React.useRef(null);
    const backgroundFileImageLightRef = React.useRef(null);
    const backgroundFileImageDarkRef = React.useRef(null);
    const [getUserPreferences] = useLazyQuery(userSettingsQuery, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            //console.log("got preferences", data.getOperatorPreferences.preferences)
            if(data.getOperatorPreferences.status === "success"){
                let settingString = JSON.stringify(data.getOperatorPreferences.preferences, null, 4);
                copyStringToClipboard(settingString);
                snackActions.info("Copied settings to clipboard");
            } else {
                snackActions.error(`Failed to get user preferences:\n${data.getOperatorPreferences.error}`);
            }
        },
        onError: (error) => {
            console.log(error);
            snackActions.error(error.message);
        }
    })
    const [getUserColorPreferences] = useLazyQuery(userSettingsQuery, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            //console.log("got preferences", data.getOperatorPreferences.preferences)
            if(data.getOperatorPreferences.status === "success"){
                let settingString = JSON.stringify({palette: data.getOperatorPreferences.preferences?.palette}, null, 4);
                copyStringToClipboard(settingString);
                snackActions.info("Copied settings to clipboard");
            } else {
                snackActions.error(`Failed to get user preferences:\n${data.getOperatorPreferences.error}`);
            }
        },
        onError: (error) => {
            console.log(error);
            snackActions.error(error.message);
        }
    })

    const initialLocalStorageInteractType = GetMythicSetting({setting_name: 'interactType', default_value: operatorSettingDefaults.interactType});
    const [interactType, setInteractType] = React.useState(initialLocalStorageInteractType);

    const initialLocalStorageFontSizeValue = GetMythicSetting({setting_name: "fontSize", default_value: operatorSettingDefaults.fontSize});
    const [fontSize, setFontSize] = React.useState(initialLocalStorageFontSizeValue);

    const initialLocalStorageFontFamilyValue = GetMythicSetting({setting_name: "fontFamily", default_value: operatorSettingDefaults.fontFamily});
    const [fontFamily, setFontFamily] = React.useState(initialLocalStorageFontFamilyValue);

    const initialShowMediaValue = GetMythicSetting({setting_name: "showMedia", default_value: operatorSettingDefaults.showMedia});
    const [showMedia, setShowMedia] = React.useState(initialShowMediaValue);

    const initialHideUsernameValue = GetMythicSetting({setting_name: "hideUsernames", default_value: operatorSettingDefaults.hideUsernames});
    const [hideUsernames, setHideUsernames] = React.useState(initialHideUsernameValue);

    const initialShowIPValue = GetMythicSetting({setting_name: "showIP", default_value: operatorSettingDefaults.showIP});
    const [showIP, setShowIP] = React.useState(initialShowIPValue);

    const initialShowHostnameValue = GetMythicSetting({setting_name: "showHostname", default_value: operatorSettingDefaults.showHostname});
    const [showHostname, setShowHostname] = React.useState(initialShowHostnameValue);

    const initialShowCallbackGroupsValue = GetMythicSetting({setting_name: "showCallbackGroups", default_value: operatorSettingDefaults.showCallbackGroups});
    const [showCallbackGroups, setShowCallbackGroups] = React.useState(initialShowCallbackGroupsValue);

    const initialUseDisplayParamsForCLIHistory = GetMythicSetting({setting_name: "useDisplayParamsForCLIHistory", default_value: operatorSettingDefaults.useDisplayParamsForCLIHistory});
    const [useDisplayParamsForCLIHistory, setUseDisplayParamsForCLIHistory] = React.useState(initialUseDisplayParamsForCLIHistory);

    const initialPalette = GetMythicSetting({setting_name: 'palette', default_value: operatorSettingDefaults.palette});
    const [palette, setPalette] = React.useState({
        primary: {
            dark: initialPalette?.primary?.dark || operatorSettingDefaults.palette.primary.dark,
            light: initialPalette?.primary?.light || operatorSettingDefaults.palette.primary.light,
        },
        error: {
            dark: initialPalette?.error?.dark || operatorSettingDefaults.palette.error.dark,
            light: initialPalette?.error?.light || operatorSettingDefaults.palette.error.light,
        },
        success: {
            dark: initialPalette?.success?.dark || operatorSettingDefaults.palette.success.dark,
            light: initialPalette?.success?.light || operatorSettingDefaults.palette.success.light,
        },
        info: {
            dark: initialPalette?.info?.dark || operatorSettingDefaults.palette.info.dark,
            light: initialPalette?.info?.light || operatorSettingDefaults.palette.info.light,
        },
        warning: {
            dark: initialPalette?.warning?.dark || operatorSettingDefaults.palette.warning.dark,
            light: initialPalette?.warning?.light || operatorSettingDefaults.palette.warning.light,
        },
        secondary: {
            dark: initialPalette?.secondary?.dark || operatorSettingDefaults.palette.secondary.dark,
            light: initialPalette?.secondary?.light || operatorSettingDefaults.palette.secondary.light,
        },
        background: {
            dark: initialPalette?.background?.dark || operatorSettingDefaults.palette.background.dark,
            light: initialPalette?.background?.light || operatorSettingDefaults.palette.background.light,
        },
        tableHeader: {
            dark: initialPalette?.tableHeader?.dark || operatorSettingDefaults.palette.tableHeader.dark,
            light: initialPalette?.tableHeader?.light || operatorSettingDefaults.palette.tableHeader.light,
        },
        tableHover: {
            dark: initialPalette?.tableHover?.dark || operatorSettingDefaults.palette.tableHover.dark,
            light: initialPalette?.tableHover?.light || operatorSettingDefaults.palette.tableHover.light,
        },
        pageHeader: {
            dark: initialPalette?.pageHeader?.dark || operatorSettingDefaults.palette.pageHeader.dark,
            light: initialPalette?.pageHeader?.light || operatorSettingDefaults.palette.pageHeader.light,
        },
        text: {
            dark: initialPalette?.text?.dark || operatorSettingDefaults.palette.text.dark,
            light: initialPalette?.text?.light || operatorSettingDefaults.palette.text.light,
        },
        paper: {
            dark: initialPalette?.paper?.dark || operatorSettingDefaults.palette.paper.dark,
            light: initialPalette?.paper?.light || operatorSettingDefaults.palette.paper.light,
        },
        selectedCallbackColor: {
            dark: initialPalette?.selectedCallbackColor?.dark || operatorSettingDefaults.palette.selectedCallbackColor.dark,
            light: initialPalette?.selectedCallbackColor?.light || operatorSettingDefaults.palette.selectedCallbackColor.light,
        },
        selectedCallbackHierarchyColor: {
            dark: initialPalette?.selectedCallbackHierarchyColor?.dark || operatorSettingDefaults.palette.selectedCallbackHierarchyColor.dark,
            light: initialPalette?.selectedCallbackHierarchyColor?.light || operatorSettingDefaults.palette.selectedCallbackHierarchyColor.light,
        },
        backgroundImage: {
            dark: initialPalette?.backgroundImage?.dark || operatorSettingDefaults.palette.backgroundImage.dark,
            light: initialPalette?.backgroundImage?.light || operatorSettingDefaults.palette.backgroundImage.light,
        },
        navBarIcons: {
            dark: initialPalette?.navBarIcons?.dark || operatorSettingDefaults.palette.navBarIcons.dark,
            light: initialPalette?.navBarIcons?.light || operatorSettingDefaults.palette.navBarIcons.light,
        },
        navBarText: {
            dark: initialPalette?.navBarText?.dark || operatorSettingDefaults.palette.navBarText.dark,
            light: initialPalette?.navBarText?.light || operatorSettingDefaults.palette.navBarText.light,
        },
        navBarColor: {
            dark: initialPalette?.navBarColor?.dark || operatorSettingDefaults.palette.navBarColor.dark,
            light: initialPalette?.navBarColor?.light || operatorSettingDefaults.palette.navBarColor.light,
        }
    });
    const paletteOptions = [
        {name: "primary", display: "Primary"},
        {name: "error", display: "Error"},
        {name: "warning", display: "Warning"},
        {name: "info", display: "Informational"},
        {name: "success", display: "Success"},
        {name: "secondary", display: "Secondary"},
        {name: "background", display: "Background"},
        {name: "text", display: "Text Color"},
        {name: "tableHeader", display: "Table Headers"},
        {name: "tableHover", display: "Table Hover"},
        {name: "pageHeader", display: "Page Headers"},
        {name: "paper", display: "Menu and Modals Background"},
        {name: "selectedCallbackColor", display: "Currently active callback row highlight"},
        {name: "selectedCallbackHierarchyColor", display: "Current Host highlight in tree views"}
    ];
    const [resumeNotifications, setResumeNotifications] = React.useState(false);
    const [_, updateSettings, clearSettings] = useSetMythicSetting();
    const onChangeFontSize = (name, value, error) => {
      setFontSize(value);
    }
    const onChangeFontFamily = (name, value, error) => {
      setFontFamily(value);
    }
    const onHideUsernamesChanged = (evt) => {
      setHideUsernames(!hideUsernames);
    }
    const onShowIPChanged = (evt) => {
        setShowIP(!showIP);
    }
    const onShowHostnameChanged = (evt) => {
        setShowHostname(!showHostname);
    }
    const onShowCallbackGroupsChanged = (evt) => {
        setShowCallbackGroups(!showCallbackGroups);
    }
    const onShowMediaChanged = (evt) => {
        setShowMedia(!showMedia);
    }
    const onResumeNotifications = (evt) => {
        setResumeNotifications(!resumeNotifications);
    }
    const onChangeInteractType = (evt) => {
        setInteractType(evt.target.value);
    }
    const onChangeUseDisplayParamsForCLIHistory = (evt) => {
        setUseDisplayParamsForCLIHistory(!useDisplayParamsForCLIHistory);
    }
    const onChangePaletteColor = (name, mode, value) => {
        setPalette({...palette, [name]: {...palette[name], [mode]: value}});
    }
    const onAccept = () => {
      if(resumeNotifications){
          localStorage.setItem("dnd", JSON.stringify({
              "doNotDisturb": false,
              "doNotDisturbTimeStart": new Date(),
              "doNotDisturbMinutes": 0
          }))
      }
      updateSettings({settings: {
              hideUsernames,
              showIP,
              showHostname,
              showCallbackGroups,
              fontSize,
              fontFamily,
              showMedia,
              interactType,
              useDisplayParamsForCLIHistory,
              palette: palette
      }});
      props.onClose();
    }
    const changeCommonFontFamilies = (event) => {
        if(event.target.value !== " "){
            setFontFamily(event.target.value);
        }
    }
    const setDefaults = () => {
      setFontSize(operatorSettingDefaults.fontSize);
      setFontFamily(operatorSettingDefaults.fontFamily);
      setHideUsernames(operatorSettingDefaults.hideUsernames);
      setShowIP(operatorSettingDefaults.showIP);
      setShowHostname(operatorSettingDefaults.showHostname);
      setShowCallbackGroups(operatorSettingDefaults.showCallbackGroups);
      setShowMedia(operatorSettingDefaults.showMedia);
      setInteractType(operatorSettingDefaults.interactType);
      setUseDisplayParamsForCLIHistory(operatorSettingDefaults.useDisplayParamsForCLIHistory);
      setResumeNotifications(false);
      setPalette(operatorSettingDefaults.palette);
    }
    const clearAllUserSettings = () => {
        clearSettings();
        props.onClose();
    }
    const setColorDefaults = (mode) => {
        let newPaletteOptions = {...palette};
        for(const [key, value] of Object.entries(operatorSettingDefaults.palette)){
            newPaletteOptions[key][mode] = value[mode];
        }
        setPalette(newPaletteOptions);
    }
    const onFileChange = async (evt) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const contents = e.target.result;
            try{
                let jsonData = JSON.parse(String(contents));
                updateSettings({settings: jsonData});
                snackActions.info("Updating settings");
                props.onClose();
            }catch(error){
                console.log(error);
                snackActions.error("Failed to parse file as JSON");
            }
        }
        reader.readAsBinaryString(evt.target.files[0]);
    }
    const onFileBackgroundImageChangeLight = async (evt) => {
        const reader = new FileReader();
        const filenameExtension = evt.target.files[0].name.split(".")[1];
        reader.onload = (e) => {
            const contents = e.target.result;
            let backgroundImage = `url("data:image/${filenameExtension};base64,${btoa(contents)}`;
            setPalette({...palette, backgroundImage: {...palette.backgroundImage, light: backgroundImage}});
        }
        reader.readAsBinaryString(evt.target.files[0]);
    }
    const onFileBackgroundImageChangeDark = async (evt) => {
        const reader = new FileReader();
        const filenameExtension = evt.target.files[0].name.split(".")[1];
        reader.onload = (e) => {
            const contents = e.target.result;
            let backgroundImage = `url("data:image/${filenameExtension};base64,${btoa(contents)}`;
            setPalette({...palette, backgroundImage: {...palette.backgroundImage, dark: backgroundImage}});
        }
        reader.readAsBinaryString(evt.target.files[0]);
    }

    const getCurrentPreferences = () => {
        getUserPreferences();
    }
    const getCurrentColorPreferences = () => {
        getUserColorPreferences();
    }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">
            Configure UI Settings
            <div style={{float: "right", display: "flex", alignItems: "center"}}>
                <MythicStyledTooltip title={"Export Preferences"} tooltipStyle={{float: "right"}}>
                    <IconButton onClick={getCurrentPreferences}>
                        <CloudDownloadIcon />
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"Export Only Color Preferences"} tooltipStyle={{float: "right"}}>
                    <IconButton  onClick={getCurrentColorPreferences}>
                        <CloudDownloadIcon fontSize={"medium"} />
                        <ColorLensIcon color={"success"} fontSize={"small"} style={{marginLeft: "-8px", marginTop: "7px"}} />
                    </IconButton>
                </MythicStyledTooltip>
                <MythicStyledTooltip title={"Import Preferences"} tooltipStyle={{float: "right"}}>
                    <IconButton  onClick={()=>fileInputRef.current.click()} >
                        <CloudUploadIcon color={"success"}/>
                        <input ref={fileInputRef} onChange={onFileChange} type="file" hidden />
                    </IconButton>
                </MythicStyledTooltip>
            </div>

        </DialogTitle>
        <TableContainer className="mythicElement" style={{paddingLeft: "10px", paddingRight: "10px"}}>
          <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
              <TableBody>
                  <TableRow hover>
                  <MythicStyledTableCell style={{width: "30%"}}>Font Size</MythicStyledTableCell>
                  <MythicStyledTableCell>
                    <MythicTextField type="number" value={fontSize} onChange={onChangeFontSize} showLabel={false} />
                  </MythicStyledTableCell>
                </TableRow>
                  <TableRow hover>
                  <MythicStyledTableCell>Font Family</MythicStyledTableCell>
                  <MythicStyledTableCell>
                    <MythicTextField value={fontFamily} onChange={onChangeFontFamily} showLabel={false} multiline maxRows={5} />
                      <Select
                          value={" "}
                          onChange={changeCommonFontFamilies}
                          input={<Input style={{width: "100%"}}/>}
                      >
                          <MenuItem value={" "}>Select a common font family</MenuItem>
                          {commonFontFamilies.map( (opt) => (
                              <MenuItem value={opt} key={opt}>{opt}</MenuItem>
                          ) )}
                      </Select>
                  </MythicStyledTableCell>
                </TableRow>
                  <TableRow hover>
                  <MythicStyledTableCell>Hide Usernames In Tasking</MythicStyledTableCell>
                  <MythicStyledTableCell>
                    <Switch
                      checked={hideUsernames}
                      onChange={onHideUsernamesChanged}
                      color="info"
                      inputProps={{ 'aria-label': 'info checkbox' }}
                      name="hide_usernames"
                    />
                  </MythicStyledTableCell>
                </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell>Show Callback IP In Tasking</MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <Switch
                              checked={showIP}
                              onChange={onShowIPChanged}
                              color="info"
                              inputProps={{ 'aria-label': 'info checkbox' }}
                              name="show_ip"
                          />
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell>Show Callback Hostname In Tasking</MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <Switch
                              checked={showHostname}
                              onChange={onShowHostnameChanged}
                              color="info"
                              inputProps={{ 'aria-label': 'info checkbox' }}
                              name="show_hostname"
                          />
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell>Show Callback Groups In Tasking</MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <Switch
                              checked={showCallbackGroups}
                              onChange={onShowCallbackGroupsChanged}
                              color="info"
                              inputProps={{ 'aria-label': 'info checkbox' }}
                              name="show_callback_groups"
                          />
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell>Automatically show Media in Browser scripts</MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <Switch
                              checked={showMedia}
                              onChange={onShowMediaChanged}
                              color="info"
                              inputProps={{ 'aria-label': 'info checkbox' }}
                              name="show_media"
                          />
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell>Resume Info/Warning Notifications</MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <Switch
                              checked={resumeNotifications}
                              onChange={onResumeNotifications}
                              color="info"
                              inputProps={{ 'aria-label': 'info checkbox' }}
                              name="resumeNotifications"
                          />
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell>Show Display Parameters in CLI History</MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <Switch
                              checked={useDisplayParamsForCLIHistory}
                              onChange={onChangeUseDisplayParamsForCLIHistory}
                              color="info"
                              inputProps={{ 'aria-label': 'info checkbox' }}
                              name="use display params"
                          />
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell>
                          Choose default type of tasking display
                      </MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <Select
                              labelId="demo-dialog-select-label"
                              id="demo-dialog-select"
                              value={interactType}
                              onChange={onChangeInteractType}
                              input={<Input style={{width: "100%"}}/>}
                          >
                              {interactTypeOptions.map( (opt) => (
                                  <MenuItem value={opt.value} key={opt.value}>{opt.display}</MenuItem>
                              ) )}
                          </Select>
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow>
                      <MythicStyledTableCell></MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <Typography variant={"h4"}>
                              Global Palette Colors
                          </Typography>
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell>Navigation Bar Color</MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <div style={{display: "flex", width: "100%", paddingRight: "15px"}}>
                              <div style={{display: "inline-block", width: "100%"}}>
                                  <HexColorPicker style={{width: "100%"}} color={palette?.navBarColor?.dark} onChange={(v) => onChangePaletteColor("navBarColor", "dark", v)}/>
                                  <HexColorInput color={palette?.navBarColor?.dark} onChange={(v) => onChangePaletteColor("navBarColor", "dark", v)}/>
                                  <Box sx={{width: "100%", height: 25, backgroundColor: palette?.navBarColor?.dark, display: "flex", alignItems: "center"}}>
                                      <PhoneCallbackIcon style={{color: palette.navBarIcons.dark, marginRight: "5px"}}/>
                                      <Typography style={{color: palette.navBarText.dark, display: "inline-block"}}>Dark Mode Color</Typography>
                                  </Box>
                              </div>
                              <div style={{display: "inline-block", width: "100%"}}>
                                  <HexColorPicker style={{width: "100%"}} color={palette?.navBarColor?.light} onChange={(v) => onChangePaletteColor("navBarColor", "light", v)}/>
                                  <HexColorInput color={palette?.navBarColor?.light} onChange={(v) => onChangePaletteColor("navBarColor", "light", v)}/>
                                  <Box sx={{width: "100%", height: 25, backgroundColor: palette?.navBarColor?.light, display: "flex", alignItems: "center"}}>
                                      <PhoneCallbackIcon style={{color: palette.navBarIcons.light, marginRight: "5px"}}/>
                                      <Typography style={{color: palette.navBarText.light, display: "inline-block"}}>Light Mode Color</Typography>
                                  </Box>
                              </div>
                          </div>
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell>Navigation Bar Icon Colors</MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <div style={{display: "flex", width: "100%", paddingRight: "15px"}}>
                              <div style={{display: "inline-block", width: "100%"}}>
                                  <HexColorPicker style={{width: "100%"}} color={palette?.navBarIcons?.dark} onChange={(v) => onChangePaletteColor("navBarIcons", "dark", v)}/>
                                  <HexColorInput color={palette?.navBarIcons?.dark} onChange={(v) => onChangePaletteColor("navBarIcons", "dark", v)}/>
                                  <Box sx={{width: "100%", height: 25, backgroundColor: palette?.navBarColor?.dark, display: "flex", alignItems: "center"}}>
                                      <PhoneCallbackIcon style={{color: palette.navBarIcons.dark, marginRight: "5px"}}/>
                                      <Typography style={{color: palette.navBarText.dark, display: "inline-block"}}>Dark Mode Color</Typography>
                                  </Box>
                              </div>
                              <div style={{display: "inline-block", width: "100%"}}>
                                  <HexColorPicker style={{width: "100%"}} color={palette?.navBarIcons?.light} onChange={(v) => onChangePaletteColor("navBarIcons", "light", v)}/>
                                  <HexColorInput color={palette?.navBarIcons?.light} onChange={(v) => onChangePaletteColor("navBarIcons", "light", v)}/>
                                  <Box sx={{width: "100%", height: 25, backgroundColor: palette?.navBarColor?.light, display: "flex", alignItems: "center"}}>
                                      <PhoneCallbackIcon style={{color: palette.navBarIcons.light, marginRight: "5px"}}/>
                                      <Typography style={{color: palette.navBarText.light, display: "inline-block"}}>Light Mode Color</Typography>
                                  </Box>
                              </div>
                          </div>
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell>Navigation Bar Text Color</MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <div style={{display: "flex", width: "100%", paddingRight: "15px"}}>
                              <div style={{display: "inline-block", width: "100%"}}>
                                  <HexColorPicker style={{width: "100%"}} color={palette?.navBarText?.dark} onChange={(v) => onChangePaletteColor("navBarText", "dark", v)}/>
                                  <HexColorInput color={palette?.navBarText?.dark} onChange={(v) => onChangePaletteColor("navBarText", "dark", v)}/>
                                  <Box sx={{width: "100%", height: 25, backgroundColor: palette?.navBarColor?.dark, display: "flex", alignItems: "center"}}>
                                      <PhoneCallbackIcon style={{color: palette.navBarIcons.dark, marginRight: "5px"}}/>
                                      <Typography style={{color: palette.navBarText.dark, display: "inline-block"}}>Dark Mode Color</Typography>
                                  </Box>
                              </div>
                              <div style={{display: "inline-block", width: "100%"}}>
                                  <HexColorPicker style={{width: "100%"}} color={palette?.navBarText?.light} onChange={(v) => onChangePaletteColor("navBarText", "light", v)}/>
                                  <HexColorInput color={palette?.navBarText?.light} onChange={(v) => onChangePaletteColor("navBarText", "light", v)}/>
                                  <Box sx={{width: "100%", height: 25, backgroundColor: palette?.navBarColor?.light, display: "flex", alignItems: "center"}}>
                                      <PhoneCallbackIcon style={{color: palette.navBarIcons.light, marginRight: "5px"}}/>
                                      <Typography style={{color: palette.navBarText.light, display: "inline-block"}}>Light Mode Color</Typography>
                                  </Box>
                              </div>
                          </div>
                      </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                      <MythicStyledTableCell>Background Images</MythicStyledTableCell>
                      <MythicStyledTableCell>
                          <div style={{display: "flex", width: "100%", justifyContent: "space-between"}}>
                              <div style={{width: "100%"}}>
                                  <Button color={"info"} variant={"contained"} onClick={()=>backgroundFileImageDarkRef.current.click()} >
                                      Upload Dark
                                      <input ref={backgroundFileImageDarkRef} onChange={onFileBackgroundImageChangeDark} type="file" hidden />
                                  </Button>
                                  <Button color={"warning"} variant={"contained"} onClick={() => onChangePaletteColor("backgroundImage", "dark", null)} >
                                      Remove Dark
                                  </Button>
                                  <div style={{backgroundImage: palette.backgroundImage.dark,  width: "100%", height: "300px", backgroundSize: "contain"}}>
                                  </div>
                              </div>
                              <div style={{width: "100%"}}>
                                  <Button color={"info"} variant={"contained"} onClick={()=>backgroundFileImageLightRef.current.click()} >
                                      Upload Light
                                      <input ref={backgroundFileImageLightRef} onChange={onFileBackgroundImageChangeLight} type="file" hidden />
                                  </Button>
                                  <Button color={"warning"} variant={"contained"} onClick={() => onChangePaletteColor("backgroundImage", "light", null)} >
                                      Remove Light
                                  </Button>
                                  <div style={{backgroundImage: palette.backgroundImage.light,  width: "100%", height: "300px", backgroundSize: "contain"}}>
                                  </div>
                              </div>
                          </div>

                      </MythicStyledTableCell>
                  </TableRow>
                  {paletteOptions.map(p => (
                      <TableRow hover key={p.display}>
                          <MythicStyledTableCell>{p.display}</MythicStyledTableCell>
                          <MythicStyledTableCell>
                              <div style={{display: "flex", width: "100%", paddingRight: "15px"}}>
                                  <div style={{display: "inline-block", width: "100%"}}>
                                      <HexColorPicker style={{width: "100%"}} color={palette?.[p.name]?.dark} onChange={(v) => onChangePaletteColor(p.name, "dark", v)}/>
                                      <HexColorInput color={palette?.[p.name]?.dark} onChange={(v) => onChangePaletteColor(p.name, "dark", v)}/>
                                      <Box sx={{width: "100%", height: 25, backgroundColor: palette?.[p.name]?.dark}}>
                                          <Typography style={{color: "white"}}>Dark Mode Color</Typography>
                                      </Box>
                                  </div>
                                  <div style={{display: "inline-block", width: "100%"}}>
                                      <HexColorPicker style={{width: "100%"}} color={palette?.[p.name]?.light} onChange={(v) => onChangePaletteColor(p.name, "light", v)}/>
                                      <HexColorInput color={palette?.[p.name]?.light} onChange={(v) => onChangePaletteColor(p.name, "light", v)}/>
                                      <Box sx={{width: "100%", height: 25, backgroundColor: palette?.[p.name]?.light}}>
                                          <Typography style={{color: "black"}}>Light Mode Color</Typography>
                                      </Box>
                                  </div>
                              </div>
                          </MythicStyledTableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
        </TableContainer>
        <DialogActions>
            <Button onClick={props.onClose} variant="contained" color="primary">
                Cancel
            </Button>
            <Button onClick={clearAllUserSettings} variant="contained" color="error">
                Clear ALL User Settings
            </Button>
            <Button onClick={setDefaults} variant="contained" color="warning">
                Reset ALL
            </Button>
            <Button onClick={() => setColorDefaults("dark")} variant={"contained"} color={"info"}>Reset Dark Mode</Button>
            <Button onClick={() => setColorDefaults("light")} variant={"contained"} color={"info"}>Reset Light Mode</Button>
            <Button onClick={onAccept} variant="contained" color="success">
                Update
            </Button>
        </DialogActions>
    </React.Fragment>
  );
}

