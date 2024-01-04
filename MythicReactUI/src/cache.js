import { makeVar } from '@apollo/client';
import React from 'react';
import {restartWebsockets} from "./index";
import {snackActions} from "./components/utilities/Snackbar";

export const meState = makeVar({loggedIn:false, user: null, access_token: null, refresh_token: null});
export const menuOpen = makeVar(false);

export const successfulLogin = (data) => {
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    meState({
        loggedIn: true,
        ...data
    });
    restartWebsockets();
}
export const successfulRefresh = (data) => {
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    meState({
        loggedIn: true,
        access_token: localStorage.getItem("access_token"),
        ...meState()
    });
}
export const FailedRefresh = () =>{
    console.log("failed refresh");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    meState({
        loggedIn: false,
        access_token: null,
        refresh_token: null,
        user: null
    });
    snackActions.clearAll();
    restartWebsockets();
}

