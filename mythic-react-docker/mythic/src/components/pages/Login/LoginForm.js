import React from 'react';
import {Button} from '@material-ui/core';
import MythicTextField from '../../MythicComponents/MythicTextField';
import logo from '../../../assets/mythic.svg';
import { Redirect } from 'react-router-dom';
import { meState, successfulLogin } from '../../../cache';
import { useReactiveVar } from '@apollo/client';
import { useSnackbar } from 'notistack';

export function LoginForm(props){
    const me = useReactiveVar(meState);
    const { enqueueSnackbar } = useSnackbar();
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const submit = e => {
        e.preventDefault();
        if( username === "" || password === ""){
            enqueueSnackbar("Username and Password required", {variant: "warning"});
            return;
        }
        const requestOptions = {
            method: "POST",
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username, password})
        };
        const response = fetch('/auth', requestOptions).then((response) => {
            response.json().then(data => {
                //console.log(data)
                if("access_token" in data){
                    successfulLogin(data);
                }else{
                    enqueueSnackbar("Invalid Username or Password", {
                            variant: 'warning',
                            autoHideDuration: 2000
                        });
                    console.log("Error", data);
                }
            }).catch(error => {
                enqueueSnackbar("Error getting JSON from server", {
                                variant: 'warning',
                                autoHideDuration: 2000
                            });
                console.log("Error trying to get json response", error.toString());
            });
        }).catch(error => {
            enqueueSnackbar("Error talking to server", {
                                variant: 'warning',
                                autoHideDuration: 2000
                            });
            console.log("There was an error!", error.toString());
        });
    }
    const onUsernameChange = (name, value, error) => {
        setUsername(value);
    }
    const onPasswordChange = (name, value, error) => {
        setPassword(value);
    }
    const redirectPath = () => {
        const locationState = props.location.state;
        return locationState && locationState.from ? locationState.from.pathname : '/new/';
    }
    return (
        <div style={{justifyContent: "center", display: "flex"}}>
        { 
            me.loggedIn ?
                (
                    <Redirect to={redirectPath()}/>
                )
               : (
                    <div>
                    <img src={logo} height="400px" alt="Mythic logo"/>
                        <form onSubmit={submit}>
                            <MythicTextField name='username' value={username} onChange={onUsernameChange} width={30} />
                            <MythicTextField name='password' type="password" value={password} onChange={onPasswordChange} width={30} />
                            <Button type="submit" color="primary" onClick={submit} variant="contained" style={{marginRight: "10px"}}>Login</Button>
                        </form>
                    </div>
                )
        }
        </div>
  )
}

