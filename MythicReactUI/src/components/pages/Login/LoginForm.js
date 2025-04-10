import React, { useEffect } from 'react';
import {Button, Paper} from '@mui/material';
import MythicTextField from '../../MythicComponents/MythicTextField';
import logo from '../../../assets/mythic-red.png';
import { Navigate } from 'react-router-dom';
import {meState, successfulLogin, FailedRefresh} from '../../../cache';
import { useReactiveVar } from '@apollo/client';
import {isJWTValid} from '../../../index';
import { snackActions } from '../../utilities/Snackbar';
import CardContent from '@mui/material/CardContent';
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ClickAwayListener from '@mui/material/ClickAwayListener';

export function LoginForm(props){
    const me = useReactiveVar(meState);
    const [openUpdate, setOpenUpdateDialog] = React.useState(false);
    const dropdownAnchorRef = React.useRef(null);
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [requestField, setRequestFields] = React.useState([]);
    const [authOptions, setAuthOptions] = React.useState([]);
    const selectedAuthOptionRef = React.useRef({});
    let queryParams = new URLSearchParams(window.location.search);
    const redirectPath = queryParams.has("redirect") ? queryParams.get("redirect") : "/new";
    useEffect( () => {
        if(!isJWTValid()){
            console.log("calling FailedRefresh on the login page to remove old data");
            FailedRefresh();
        }
        const requestOptions = {
            method: "GET",
            headers: {'Content-Type': 'application/json', MythicSource: "web"},
        };
        fetch('/auth_services', requestOptions).then((response) => {
            if(response.status !== 200){
                snackActions.warning("HTTP " + response.status + " Error: Check Mythic logs");
                return;
            }
            response.json().then(data => {
                if(data['status'] === 'success'){
                    setAuthOptions(data["idps"]);
                } else {
                    snackActions.warning("Failed to fetch potential additional auth methods: " + data["error"]);
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
    }, [])
    // normal username + password to Mythic for local Mythic auth
    const submit = e => {
        e.preventDefault();
        if( username === "" || password === ""){
            snackActions.warning("Username and Password required");
            return;
        }
        const requestOptions = {
            method: "POST",
            headers: {'Content-Type': 'application/json', MythicSource: "web"},
            body: JSON.stringify({username, password})
        };
        fetch('/auth', requestOptions).then((response) => {
            if(response.status === 403){
                snackActions.warning("Invalid username or password");
                return;
            }else if(response.status === 404){
                snackActions.warning("Failed to find login endpoint");
                return;
            }else if(response.status === 502){
                snackActions.warning("Failed to contact mythic server due to gateway. Please refresh");
                return;
            }else if(response.status === 400){
                snackActions.warning("Bad format, can't process request");
                return;
            }
            if(response.status !== 200){
                snackActions.warning("HTTP " + response.status + " Error: Check Mythic logs");
                return;
            }
            response.json().then(data => {
                //console.log(data)
                if("access_token" in data){
                    successfulLogin(data);
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
    const submitNonIDP = e => {
        e.preventDefault();
        const finalRequestFields = requestField.reduce( (prev, cur) => {
            return {...prev, [cur.name]: cur.value}
        }, {});
        const requestOptions = {
            method: "POST",
            headers: {'Content-Type': 'application/json', MythicSource: "web"},
            body: JSON.stringify({"request_fields": finalRequestFields})
        };
        fetch(`/auth_acs/${selectedAuthOptionRef.current.container}/${selectedAuthOptionRef.current.idp}`, requestOptions).then((response) => {
            if(response.redirected){
                window.location.href = response.url;
            } else {
                snackActions.warning("Failed to authenticate");
            }
        }).catch(error => {
                snackActions.warning("Error getting JSON from server: " + error.toString());
                console.log("Error trying to get json response", error);
            });
    }
    const onUpdateText = (name, value, error) => {
        const updatedRequestFields = requestField.map( r => {
            if(r.name === name){
                return {...r, value: value};
            }
            return {...r};
        });
        setRequestFields(updatedRequestFields);
    }
    const onUsernameChange = (name, value, error) => {
        setUsername(value);
    }
    const onPasswordChange = (name, value, error) => {
        setPassword(value);
    }
    const resetLoginOption = () => {
        setRequestFields([]);
    }
    const handleMenuItemClick = (event, index) => {
        setOpenUpdateDialog(false);
        snackActions.info("Fetching IDP Information");
        const requestOptions = {
            method: "GET",
            headers: {'Content-Type': 'application/json', MythicSource: "web"},
        };
        let authOptionsPieces = authOptions[index].split(" - ");
        selectedAuthOptionRef.current = {"container": authOptionsPieces[1], "idp": authOptionsPieces[0]};
        fetch(`/auth_redirect/${authOptionsPieces[1]}/${authOptionsPieces[0]}`, requestOptions).then((response) => {
            if(response.status !== 200){
                snackActions.warning("HTTP " + response.status + " Error: Check Mythic logs");
                return;
            }
            response.json().then(data => {
                if(data["status"] === "success"){
                    if(data["redirect"]){
                        window.location = data["redirect"];
                    } else if(data["request_fields"]){
                        let values = data["request_fields"].map(r => {return {"name": r, "value": ""}})
                        setRequestFields(values);
                        snackActions.info("Updating to " + authOptions[index]);
                    }
                } else {
                    snackActions.warning("Failed to get redirect url: " + data["error"]);
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
    const handleClose = (event) => {
        if (dropdownAnchorRef.current && dropdownAnchorRef.current.contains(event.target)) {
            return;
        }
        setOpenUpdateDialog(false);
    };
    return (
        <div style={{justifyContent: "center", display: "flex"}}>
        {
            me.loggedIn && (<Navigate replace to={redirectPath}/>)
        }

                    <div style={{backgroundColor: "transparent"}}>
                        <CardContent >
                            <img src={logo} height="400px" alt="Mythic logo"/>
                            {requestField.length === 0 &&
                                <>
                                    <MythicTextField name='username' value={username} onChange={onUsernameChange}
                                                     width={31} debounceDelay={0} showLabel={true} autoComplete={true}/>
                                    <MythicTextField name='password' type="password" onEnter={submit} value={password} autoComplete={true}
                                                     onChange={onPasswordChange} width={31} debounceDelay={0} showLabel={true}/>
                                    <Button type="submit" color="primary" onClick={submit} variant="contained"
                                            style={{}}>Login</Button>
                                </>
                            }
                            {requestField.length > 0 &&
                                <>
                                    {requestField.map(r => (
                                        <MythicTextField key={r.name} name={r.name} value={r.value} onChange={onUpdateText}
                                                         type={r.name === "password" ? "password" : ""}
                                                         width={31} debounceDelay={0} showLabel={true}/>
                                    ))}
                                    <Button type="submit" color="primary" onClick={submitNonIDP} variant="contained"
                                            style={{}}>Login via {selectedAuthOptionRef.current.idp}</Button>
                                </>
                            }
                            {authOptions.length > 0 &&
                                <>
                                    <Button ref={dropdownAnchorRef} style={{float: "right"}}
                                            variant={"outlined"}
                                            onClick={() => {
                                                setOpenUpdateDialog(true);
                                            }} color="success"
                                    >
                                        Login via Custom Auth Providers
                                    </Button>
                                    <Popper open={openUpdate} anchorEl={dropdownAnchorRef.current}
                                            role={undefined} transition disablePortal style={{zIndex: 4}}>
                                        {({TransitionProps, placement}) => (
                                            <Grow
                                                {...TransitionProps}
                                                style={{
                                                    transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                                                }}
                                            >
                                                <Paper className={"dropdownMenuColored"}>
                                                    <ClickAwayListener onClickAway={handleClose}
                                                                       mouseEvent={"onMouseDown"}>
                                                        <MenuList id="split-button-menu">
                                                            {authOptions.map((option, index) => (
                                                                <MenuItem
                                                                    key={index + option}
                                                                    onClick={(event) => handleMenuItemClick(event, index)}
                                                                >
                                                                    {option}
                                                                </MenuItem>
                                                            ))}
                                                            <MenuItem onClick={resetLoginOption}>Mythic Local Login</MenuItem>
                                                        </MenuList>
                                                    </ClickAwayListener>
                                                </Paper>
                                            </Grow>
                                        )}
                                    </Popper>
                                </>
                            }
                        </CardContent>
                    </div>

        </div>
    )
}

