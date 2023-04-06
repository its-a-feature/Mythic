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
import {HexColorInput, HexColorPicker} from 'react-colorful';


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
    const localStorageInitialHideUsernameValue = localStorage.getItem(`${me?.user?.user_id || 0}-hideUsernames`);
    const initialHideUsernameValue = localStorageInitialHideUsernameValue === null ? false : (localStorageInitialHideUsernameValue.toLowerCase() === "false" ? false : true);
    const [hideUsernames, setHideUsernames] = React.useState(initialHideUsernameValue);
    const onChangeFontSize = (name, value, error) => {
      setFontSize(value);
    }
    const onChangeFontFamily = (name, value, error) => {
      setFontFamily(value);
    }
    const onHideUsernamesChanged = (evt) => {
      
      setHideUsernames(!hideUsernames);
    }
    const onAccept = () => {
      props.onAccept({
        fontSize,
        fontFamily,
        topColor,
        hideUsernames
      });
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
      setTopColor("#7f93c0");
      setHideUsernames(false);
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Configure UI Settings</DialogTitle>
          <TableContainer component={Paper} className="mythicElement">
          <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
              <TableBody>
                <TableRow hover>
                  <TableCell>Font Size</TableCell>
                  <TableCell>
                    <MythicTextField type="number" value={fontSize} onChange={onChangeFontSize} showLabel={false} />
                  </TableCell>
                </TableRow>
                <TableRow hover>
                  <TableCell>Font Family</TableCell>
                  <TableCell>
                  <MythicTextField value={fontFamily} onChange={onChangeFontFamily} showLabel={false} />
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
                  <TableCell>Top App Bar Color</TableCell>
                  <TableCell>
                    <HexColorPicker color={topColor} onChange={setTopColor} />
                    <HexColorInput color={topColor} onChange={setTopColor} />
                    <Box sx={{width: "100%", height: 25, backgroundColor: topColor}} > </Box>
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

