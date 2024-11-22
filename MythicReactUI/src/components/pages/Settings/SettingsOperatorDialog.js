import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import {useMutation, gql} from '@apollo/client';
import {snackActions} from "../../utilities/Snackbar";
import {copyStringToClipboard} from "../../utilities/Clipboard";

const operatorCreateInviteLink = gql`
mutation operatorCreateInviteLink {
  createInviteLink {
    status
    error
    link
  }
}
`;


export function SettingsOperatorDialog(props) {
    const [username, setUsername] = React.useState(props.username ? props.username : "");
    const [passwordOld, setPasswordOld] = React.useState("");
    const [passwordNew, setPasswordNew] = React.useState("");
    const [email, setEmail] = React.useState(props.email ? props.email : "");
    const [createInviteLink] = useMutation(operatorCreateInviteLink, {
        onCompleted: (data) => {
            if(data.createInviteLink.status === "error"){
                snackActions.error(data.createInviteLink.error);
                return
            }
            copyStringToClipboard(data.createInviteLink.link);
            snackActions.success("Created new invite link and copied to clipboard");
        },
        onError: (data) => {
            console.log(data);
        }
    })
    const onUsernameChange = (name, value, error) => {
        setUsername(value);
    }
    const onPasswordOldChange = (name, value, error) => {
        setPasswordOld(value);
    }
    const onPasswordNewChange = (name, value, error) => {
        setPasswordNew(value);
    }
    const onEmailChange = (name, value, error) => {
        setEmail(value);
    }
    const onAccept = () =>{
        props.onAccept(props.id, username, passwordOld, passwordNew, email);
    }
  
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">
            {props.title}
            <MythicStyledTooltip tooltipStyle={{float: "right", display: "inline-block"}}
                                 title={"Generate invite link for somebody to create their own username/password. One-time use link only"}>
                <Button onClick={createInviteLink} variant={"contained"}>
                    Generate Invite Link
                </Button>
            </MythicStyledTooltip>

        </DialogTitle>

        <DialogContent dividers={true}>
          <DialogContentText>
                <b>Note:</b> If you're an admin, you don't need to know a user's old password to set a new one.
          </DialogContentText>
            <form autoComplete={"off"}>
                <MythicTextField
                    autoComplete={false}
                    autoFocus
                    placeholder={props.username}
                    value={username}
                    onChange={onUsernameChange}
                    margin="dense"
                    id="username"
                    name="username"
                />
                {!props.userIsAdmin &&
                    <MythicTextField
                        margin="dense"
                        id="passwordOld"
                        onChange={onPasswordOldChange}
                        name={props.title === "New Operator" ? "password" : "old password"}
                        type="password"
                    />
                }

                <MythicTextField
                    margin="dense"
                    id="passwordNew"
                    onChange={onPasswordNewChange}
                    name={props.title === "New Operator" ? "password again" : "new password"}
                    type="password"
                />
                <MythicTextField
                    margin="dense"
                    id="email"
                    value={email}
                    onChange={onEmailChange}
                    name={"email"}
                    type="text"
                />
            </form>

        </DialogContent>
        <DialogActions>
          <Button onClick={props.handleClose} variant="contained" color="primary">
            Cancel
          </Button>
          <Button onClick={onAccept} variant="contained" color="success">
            {props.title === "New Operator" ? "Create" : "Update"}
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}
export function SettingsBotDialog(props) {
    const [username, setUsername] = React.useState(props.username ? props.username : "");

    const onUsernameChange = (name, value, error) => {
        setUsername(value);
    }

    const onAccept = () =>{
        props.onAccept(props.id, username);
    }

    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title">{props.title}</DialogTitle>
            <DialogContent dividers={true}>
                <DialogContentText>
                    <b>Note:</b> Bot accounts cannot log in. They can be assigned to operations and perform actions as part of workflows (once approved).
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
            </DialogContent>
            <DialogActions>
                <Button onClick={props.handleClose} variant="contained" color="primary">
                    Cancel
                </Button>
                <Button onClick={onAccept} variant="contained" color="success">
                    {props.title === "New Bot Account" ? "Create" : "Update"}
                </Button>
            </DialogActions>
        </React.Fragment>
    );
}
export function SettingsAPITokenDialog(props) {
    const [name, setName] = React.useState(props.name ? props.name : "");

    const onUsernameChange = (name, value, error) => {
        setName(value);
    }

    const onAccept = () =>{
        props.onAccept(name);
    }

    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title">{props.title}</DialogTitle>
            <DialogContent dividers={true} >
                <MythicTextField
                    autoFocus
                    onEnter={onAccept}
                    placeholder={props.name}
                    value={name}
                    onChange={onUsernameChange}
                    margin="dense"
                    id="name"
                    name="name"
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={props.handleClose} variant="contained" color="primary">
                    Cancel
                </Button>
                <Button onClick={onAccept} variant="contained" color="success">
                    {"Create New"}
                </Button>
            </DialogActions>
        </React.Fragment>
    );
}

