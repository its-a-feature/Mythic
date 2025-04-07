import React from 'react';
import {Button} from '@mui/material';
import MythicTextField from '../../MythicComponents/MythicTextField';
import logo from '../../../assets/mythic-red.png';
import { Navigate } from 'react-router-dom';
import {restartWebsockets} from '../../../index';
import { snackActions } from '../../utilities/Snackbar';
import CardContent from '@mui/material/CardContent';

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
        fetch('/invite', requestOptions).then((response) => {
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
                snackActions.warning("Please refresh and accept the SSL connection error");
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
        <div style={{justifyContent: "center", display: "flex"}}>
            {
                props.me.loggedIn ?
                    (
                        <Navigate replace to={"/"}/>
                    )
                    : (
                        <div style={{backgroundColor: "transparent"}}>
                            <CardContent>
                                <img src={logo} height="400px" alt="Mythic logo"/>

                                    <MythicTextField name='code' value={inviteCode} debounceDelay={0}
                                                     onChange={onChangeText} width={31} required={true} showLabel={true}/>
                                    <MythicTextField name='username' value={username} onChange={onChangeText}
                                                     width={31} debounceDelay={0} showLabel={true}/>
                                    <MythicTextField name='password' type="password" onEnter={submit} value={password}
                                                     onChange={onChangeText} width={31} debounceDelay={0} requiredValue={true} showLabel={true}/>
                                    <MythicTextField name='passwordAgain'  type="password" onEnter={submit} value={passwordAgain}
                                                     onChange={onChangeText} width={31} debounceDelay={0} requiredValue={true} showLabel={true}
                                                     validate={checkPasswordsMatch} errorText={"Passwords do not match"}/>
                                    <MythicTextField name='email' value={email} onChange={onChangeText}
                                                     width={31} debounceDelay={0} showLabel={true} />
                                    <Button type="submit" color="primary" onClick={submit} variant="contained"
                                            style={{}}>Register</Button>

                            </CardContent>
                        </div>
                    )
            }
        </div>
    )
}

