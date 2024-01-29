import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Switch from '@mui/material/Switch';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {HexColorInput, HexColorPicker} from 'react-colorful';
import {useMythicSetting} from "../../MythicComponents/MythicSavedUserSetting";


export function SettingsOperatorUIConfigDialog(props) {
    const me = props.me;
    const localStorageFontSize = localStorage.getItem(`${me?.user?.user_id || 0}-fontSize`);
    const initialLocalStorageFontSizeValue = localStorageFontSize === null ? 12 : parseInt(localStorageFontSize);
    const localStorageFontFamily = localStorage.getItem(`${me?.user?.user_id || 0}-fontFamily`);
    const initialLocalStorageFontFamilyValue = localStorageFontFamily === null ? [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(',') : localStorageFontFamily;
    const localStorageTopColor = localStorage.getItem(`${me?.user?.user_id || 0}-topColor`);
    const initialLocalStorageTopColorValue = localStorageTopColor === null ? "#7f93c0" : localStorageTopColor;
    const [fontSize, setFontSize] = React.useState(initialLocalStorageFontSizeValue);
    const [fontFamily, setFontFamily] = React.useState(initialLocalStorageFontFamilyValue);
    const [topColor, setTopColor] = React.useState(initialLocalStorageTopColorValue);

    const initialShowMediaValue = useMythicSetting({setting_name: "showMedia", default_value: "true"});
    const [showMedia, setShowMedia] = React.useState(initialShowMediaValue);

    const initialHideUsernameValue = useMythicSetting({setting_name: "hideUsernames", default_value: "false"});
    const [hideUsernames, setHideUsernames] = React.useState(initialHideUsernameValue);

    const initialShowIPValue = useMythicSetting({setting_name: "showIP", default_value: "false"});
    const [showIP, setShowIP] = React.useState(initialShowIPValue);

    const initialShowHostnameValue = useMythicSetting({setting_name: "showHostname", default_value: "false"});
    const [showHostname, setShowHostname] = React.useState(initialShowHostnameValue);

    const initialShowCallbackGroupsValue = useMythicSetting({setting_name: "showCallbackGroups", default_value: "false"});
    const [showCallbackGroups, setShowCallbackGroups] = React.useState(initialShowCallbackGroupsValue);

    const [resumeNotifications, setResumeNotifications] = React.useState(false);
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
    const onAccept = () => {
      if(resumeNotifications){
          localStorage.setItem("dnd", JSON.stringify({
              "doNotDisturb": false,
              "doNotDisturbTimeStart": new Date(),
              "doNotDisturbMinutes": 0
          }))
      }
        localStorage.setItem(`${me?.user?.user_id || 0}-hideUsernames`, hideUsernames);
        localStorage.setItem(`${me?.user?.user_id || 0}-showIP`, showIP);
        localStorage.setItem(`${me?.user?.user_id || 0}-showHostname`, showHostname);
        localStorage.setItem(`${me?.user?.user_id || 0}-showCallbackGroups`, showCallbackGroups);
        localStorage.setItem(`${me?.user?.user_id || 0}-fontSize`, fontSize);
        localStorage.setItem(`${me?.user?.user_id || 0}-fontFamily`, fontFamily);
        localStorage.setItem(`${me?.user?.user_id || 0}-topColor`, topColor);
        localStorage.setItem(`${me?.user?.user_id || 0}-showMedia`, showMedia);
        window.location.reload();
      props.onClose();
    }
    const setDefaults = () => {
      setFontSize(12);
      setFontFamily([
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(','));
      setTopColor("#3c4d67");
      setHideUsernames(false);
      setShowIP(false);
      setShowHostname(false);
      setShowCallbackGroups(false);
      setShowMedia(true);
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Configure UI Settings</DialogTitle>
          <TableContainer component={Paper} className="mythicElement">
          <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
              <TableBody>
                <TableRow hover>
                  <TableCell style={{width: "30%"}}>Font Size</TableCell>
                  <TableCell>
                    <MythicTextField type="number" value={fontSize} onChange={onChangeFontSize} showLabel={false} />
                  </TableCell>
                </TableRow>
                <TableRow hover>
                  <TableCell>Font Family</TableCell>
                  <TableCell>
                  <MythicTextField value={fontFamily} onChange={onChangeFontFamily} showLabel={false} multiline maxRows={5} />
                  </TableCell>
                </TableRow>
                <TableRow hover>
                  <TableCell>Hide Usernames In Tasking</TableCell>
                  <TableCell>
                    <Switch
                      checked={hideUsernames}
                      onChange={onHideUsernamesChanged}
                      color="primary"
                      inputProps={{ 'aria-label': 'primary checkbox' }}
                      name="hide_usernames"
                    />
                  </TableCell>
                </TableRow>
                  <TableRow hover>
                      <TableCell>Show Callback IP In Tasking</TableCell>
                      <TableCell>
                          <Switch
                              checked={showIP}
                              onChange={onShowIPChanged}
                              color="primary"
                              inputProps={{ 'aria-label': 'primary checkbox' }}
                              name="show_ip"
                          />
                      </TableCell>
                  </TableRow>
                  <TableRow hover>
                      <TableCell>Show Callback Hostname In Tasking</TableCell>
                      <TableCell>
                          <Switch
                              checked={showHostname}
                              onChange={onShowHostnameChanged}
                              color="primary"
                              inputProps={{ 'aria-label': 'primary checkbox' }}
                              name="show_hostname"
                          />
                      </TableCell>
                  </TableRow>
                  <TableRow hover>
                      <TableCell>Show Callback Groups In Tasking</TableCell>
                      <TableCell>
                          <Switch
                              checked={showCallbackGroups}
                              onChange={onShowCallbackGroupsChanged}
                              color="primary"
                              inputProps={{ 'aria-label': 'primary checkbox' }}
                              name="show_callback_groups"
                          />
                      </TableCell>
                  </TableRow>
                  <TableRow hover>
                      <TableCell>Automatically show Media in Browser scripts</TableCell>
                      <TableCell>
                          <Switch
                              checked={showMedia}
                              onChange={onShowMediaChanged}
                              color="primary"
                              inputProps={{ 'aria-label': 'primary checkbox' }}
                              name="show_media"
                          />
                      </TableCell>
                  </TableRow>
                <TableRow hover>
                      <TableCell>Resume Info/Warning Notifications</TableCell>
                      <TableCell>
                          <Switch
                              checked={resumeNotifications}
                              onChange={onResumeNotifications}
                              color="primary"
                              inputProps={{ 'aria-label': 'primary checkbox' }}
                              name="resumeNotifications"
                          />
                      </TableCell>
                  </TableRow>
                <TableRow hover>
                  <TableCell>Top App Bar Color</TableCell>
                  <TableCell>
                    <HexColorPicker color={topColor} onChange={setTopColor} />
                    <HexColorInput color={topColor} onChange={setTopColor} />
                    <Box sx={{width: "100%", height: 25, backgroundColor: topColor}} >
                        <Typography style={{color: "white"}}>Operation Chimera Sample</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
        </TableContainer>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Cancel
          </Button>
          <Button onClick={setDefaults} variant="contained" color="info">
            Reset Defaults
          </Button>
          <Button onClick={onAccept} variant="contained" color="success">
            Update
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

