import React from 'react';
import {Button} from '@mui/material';
import MythicTextField from '../../MythicComponents/MythicTextField';
import { Navigate } from 'react-router-dom';
import {restartWebsockets} from '../../../index';
import { snackActions } from '../../utilities/Snackbar';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import {AuthFormStack, LoginLayout} from './LoginLayout';
import {mythicFetch} from '../../utilities/MythicConnection';

export function InviteForm(props){
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [passwordAgain, setPasswordAgain] = React.useState("");
    const [email, setEmail] = React.useState("");
    let queryParams = new URLSearchParams(window.location.search);
    const suppliedCode = queryParams.has("code") ? queryParams.get("code") : "";
    const [inviteCode, setInviteCode] = React.useState(suppliedCode);

    const submit = e => {
        e.preventDefault();
        if( username === "" || password === ""){
            snackActions.warning("Username and Password required");
            return;
        }
        if(password !== passwordAgain){
            snackActions.warning("Passwords do not match");
            return;
        }
        const requestOptions = {
            method: "POST",
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username, password, code: inviteCode, email})
        };
        mythicFetch('/invite', requestOptions).then((response) => {
            if(response.status !== 200){
                snackActions.warning("HTTP " + response.status + " Error: Check Mythic logs");
                return;
            }
            response.json().then(data => {
                //console.log(data)
                if(data["status"] === "success"){
                    snackActions.success("Successfully registered new account!");
                    restartWebsockets();
                    window.location = "/new/login";
                }else{
                    snackActions.warning(data["error"]);
                    console.log("Error", data);
                }
            }).catch(error => {
                snackActions.warning("Error getting JSON from server: " + error.toString());
                console.log("Error trying to get json response", error, response);
            });
        }).catch(error => {
            if(error.toString() === "TypeError: Failed to fetch"){
                snackActions.warning("Unable to reach Mythic. Check the server, network, or certificate approval.");
            } else {
                snackActions.warning("Error talking to server: " + error.toString());
            }
            console.log("There was an error!", error);
        });
    }
    const checkPasswordsMatch = (newValue) => {
        return password !== newValue;
    }
    const onChangeText = (name, value, error) => {
        if(name === "username"){
            setUsername(value);
        }else if(name === "password"){
            setPassword(value);
        }else if(name === "code"){
            setInviteCode(value);
        }else if(name === "email"){
            setEmail(value);
        }else if(name === "passwordAgain"){
            setPasswordAgain(value);
        }
    }

    return (
        <>
            {
                props.me.loggedIn ?
                    (
                        <Navigate replace to={"/"}/>
                    )
                    : (
                        <LoginLayout>
                            <AuthFormStack component="form" noValidate onSubmit={submit}>
                                <MythicTextField name='code' value={inviteCode} debounceDelay={0}
                                                 onChange={onChangeText} requiredValue={true} showLabel={true}
                                                 autoComplete={"one-time-code"} autoFocus={true}
                                                 marginTop={0} marginBottom={0}/>
                                <MythicTextField name='username' value={username} onChange={onChangeText}
                                                 debounceDelay={0} showLabel={true} autoComplete={"username"}
                                                 marginTop={0} marginBottom={0}/>
                                <MythicTextField name='password' type="password" onEnter={submit} value={password}
                                                 onChange={onChangeText} debounceDelay={0} requiredValue={true}
                                                 showLabel={true} autoComplete={"new-password"}
                                                 marginTop={0} marginBottom={0}/>
                                <MythicTextField name='passwordAgain'  type="password" onEnter={submit} value={passwordAgain}
                                                 onChange={onChangeText} debounceDelay={0} requiredValue={true}
                                                 showLabel={true} autoComplete={"new-password"}
                                                 validate={checkPasswordsMatch} errorText={"Passwords do not match"}
                                                 marginTop={0} marginBottom={0}/>
                                <MythicTextField name='email' value={email} onChange={onChangeText}
                                                 debounceDelay={0} showLabel={true} autoComplete={"email"}
                                                 marginTop={0} marginBottom={0}/>
                                <Button type="submit" color="primary" startIcon={<PersonAddAlt1Icon />} variant="contained" fullWidth>
                                    Register
                                </Button>
                            </AuthFormStack>
                        </LoginLayout>
                    )
            }
        </>
    )
}
