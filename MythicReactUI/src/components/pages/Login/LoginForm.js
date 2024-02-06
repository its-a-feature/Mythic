import React, { useEffect } from 'react';
import {Button} from '@mui/material';
import MythicTextField from '../../MythicComponents/MythicTextField';
import logo from '../../../assets/mythic@2x.png';
import { Navigate } from 'react-router-dom';
import { meState, successfulLogin, FailedRefresh } from '../../../cache';
import { useReactiveVar } from '@apollo/client';
import {restartWebsockets, isJWTValid} from '../../../index';
import { snackActions } from '../../utilities/Snackbar';
import CardContent from '@mui/material/CardContent';

export function LoginForm(props){
    const me = useReactiveVar(meState);
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    useEffect( () => {
        if(!isJWTValid()){
            console.log("calling FailedRefresh on the login page to remove old data");
            FailedRefresh();
        }else{
            //console.log(meState());
        }
    }, [])
    const submit = e => {
        e.preventDefault();
        if( username === "" || password === ""){
            snackActions.warning("Username and Password required");
            return;
        }
        const requestOptions = {
            method: "POST",
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username, password})
        };
        fetch('/auth', requestOptions).then((response) => {
            if(response.status !== 200){
                snackActions.warning("HTTP " + response.status + " Error: Check Mythic logs");
                return;
            }
            response.json().then(data => {
                //console.log(data)
                if("access_token" in data){
                    successfulLogin(data);
                    restartWebsockets();
                }else{
                    snackActions.warning("Invalid Username or Password");
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
    const onUsernameChange = (name, value, error) => {
        setUsername(value);
    }
    const onPasswordChange = (name, value, error) => {
        setPassword(value);
    }
    const redirectPath = () => {
        return  '/new/';
    }
    return (
        <div style={{justifyContent: "center", display: "flex"}}>
        { 
            me.loggedIn ?
                (
                    <Navigate replace to={redirectPath()}/>
                )
               : (
                    <div style={{backgroundColor: "transparent"}}>
                        <CardContent>
                            <img src={logo} height="400px" alt="Mythic logo"/>
                            <form onSubmit={submit}>
                                <MythicTextField name='username' value={username} onChange={onUsernameChange} width={30} />
                                <MythicTextField name='password' type="password" onEnter={submit} value={password} onChange={onPasswordChange} width={30} />
                                <Button type="submit" color="primary" onClick={submit} variant="contained" style={{marginRight: "10px"}}>Login</Button>
                            </form>
                        </CardContent>
                    </div>
                )
        }
        </div>
  )
}

