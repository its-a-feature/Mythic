import React, { useEffect } from 'react';
import {Button, Divider} from '@mui/material';
import MythicTextField from '../../MythicComponents/MythicTextField';
import { Navigate } from 'react-router-dom';
import {meState, successfulLogin, FailedRefresh} from '../../../cache';
import { useReactiveVar } from '@apollo/client';
import {isJWTValid} from '../../../index';
import { snackActions } from '../../utilities/Snackbar';
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyIcon from '@mui/icons-material/Key';
import LoginIcon from '@mui/icons-material/Login';
import {AuthFormStack, AuthMenuPaper, AuthMethodNote, LoginLayout} from './LoginLayout';

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
    const redirectPath = React.useRef(queryParams.has("redirect") ? queryParams.get("redirect") : "/new");
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
        setOpenUpdateDialog(false);
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
    const selectedIdp = selectedAuthOptionRef.current.idp || "Custom provider";
    return (
        <LoginLayout>
        {
            me.loggedIn && (<Navigate replace to={redirectPath.current}/>)
        }
            <AuthFormStack
                component="form"
                noValidate
                onSubmit={requestField.length === 0 ? submit : submitNonIDP}
            >
                {requestField.length === 0 &&
                    <>
                        <MythicTextField name='username' value={username} onChange={onUsernameChange}
                                         debounceDelay={0} showLabel={true} autoComplete={"username"}
                                         autoFocus={true} marginTop={0} marginBottom={0}/>
                        <MythicTextField name='password' type="password" onEnter={submit} value={password} autoComplete={"current-password"}
                                         onChange={onPasswordChange} debounceDelay={0} showLabel={true}
                                         marginTop={0} marginBottom={0}/>
                        <Button type="submit" color="primary" startIcon={<LoginIcon />} variant="contained" fullWidth>
                            Login
                        </Button>
                    </>
                }
                {requestField.length > 0 &&
                    <>
                        <AuthMethodNote>
                            <KeyIcon fontSize="small" />
                            {selectedIdp}
                        </AuthMethodNote>
                        {requestField.map(r => (
                            <MythicTextField key={r.name} name={r.name} value={r.value} onChange={onUpdateText}
                                             type={r.name === "password" ? "password" : ""}
                                             debounceDelay={0} showLabel={true}
                                             autoComplete={r.name === "password" ? "current-password" : "off"}
                                             marginTop={0} marginBottom={0}/>
                        ))}
                        <Button type="submit" color="primary" startIcon={<LoginIcon />} variant="contained" fullWidth>
                            Login via {selectedAuthOptionRef.current.idp}
                        </Button>
                    </>
                }
                {authOptions.length > 0 &&
                    <>
                        <Divider>Custom auth</Divider>
                        <Button ref={dropdownAnchorRef}
                                type="button"
                                variant={"outlined"}
                                fullWidth
                                startIcon={<KeyIcon />}
                                endIcon={<ExpandMoreIcon />}
                                onClick={() => {
                                    setOpenUpdateDialog(!openUpdate);
                                }} color="info"
                        >
                            Providers
                        </Button>
                        <Popper open={openUpdate} anchorEl={dropdownAnchorRef.current}
                                role={undefined} transition disablePortal placement="bottom-end" style={{zIndex: 4}}>
                            {({TransitionProps, placement}) => (
                                <Grow
                                    {...TransitionProps}
                                    style={{
                                        transformOrigin: placement.startsWith('bottom') ? 'right top' : 'right bottom',
                                    }}
                                >
                                    <AuthMenuPaper className={"dropdownMenuColored"}>
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
                                    </AuthMenuPaper>
                                </Grow>
                            )}
                        </Popper>
                    </>
                }
            </AuthFormStack>
        </LoginLayout>
    )
}
