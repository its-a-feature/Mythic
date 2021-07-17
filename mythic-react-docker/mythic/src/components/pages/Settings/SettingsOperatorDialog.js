import React from 'react';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';


export function SettingsOperatorDialog(props) {
    const [username, setUsername] = React.useState(props.username ? props.username : "");
    const [passwordOld, setPasswordOld] = React.useState("");
    const [passwordNew, setPasswordNew] = React.useState("");
    
    const onUsernameChange = (name, value, error) => {
        setUsername(value);
    }
    const onPasswordOldChange = (name, value, error) => {
        setPasswordOld(value);
    }
    const onPasswordNewChange = (name, value, error) => {
        setPasswordNew(value);
    }
    const onAccept = () =>{
        props.onAccept(props.id, username, passwordOld, passwordNew);
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{props.title}</DialogTitle>
        <DialogContent dividers={true}>
          <DialogContentText>
            Use this dialog to update some information about an operator.
          </DialogContentText>
          <MythicTextField
            autoFocus
            placeholder={props.username}
            value={username}
            onChange={onUsernameChange}
            margin="dense"
            id="username"
            name="username"
          />
          <MythicTextField
            margin="dense"
            id="passwordOld"
            onChange={onPasswordOldChange}
            name="old password"
            type="password"
          />
          <MythicTextField
            margin="dense"
            id="passwordNew"
            onChange={onPasswordNewChange}
            name="new password"
            type="password"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={props.handleClose} variant="contained" color="primary">
            Cancel
          </Button>
          <Button onClick={onAccept} variant="contained" color="primary">
            Update
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

