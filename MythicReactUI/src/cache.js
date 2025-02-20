import { makeVar } from '@apollo/client';
import {restartWebsockets} from "./index";
import {snackActions} from "./components/utilities/Snackbar";

export const meState = makeVar({loggedIn:false, user: null, access_token: null, refresh_token: null});
export const menuOpen = makeVar(false);
export const alertCount = makeVar(0);
export const operatorSettingDefaults =  {
    fontSize: 12,
    fontFamily: "Verdana, Arial, sans-serif",
    showMedia: true,
    hideUsernames: false,
    showIP: false,
    showHostname: false,
    showCallbackGroups: false,
    useDisplayParamsForCLIHistory: true,
    interactType: "interact",
    callbacks_table_columns: ["Interact", "Host", "Domain", "User", "Description", "Last Checkin", "Agent",  "IP", "PID"],
    callbacks_table_filters: {},
    autoTaskLsOnEmptyDirectories: false,
    ["experiment-responseStreamLimit"]: 50,
    palette: {
        primary: {
            dark: "#465b73",
            light: "#75859b",
        },
        error: {
            dark: '#da3237',
            light: '#c42c32'
        },
        success: {
            dark: '#44b636',
            light: '#0e7004',
        },
        secondary: {
            dark: '#bebebe',
            light: '#a6a5a5'
        },
        info: {
            dark: '#2184d3',
            light: '#4990b2'
        },
        warning: {
            dark: "#f57c00",
            light: "#ffb74d",
        },
        background: {
            dark: '#303030',
            light: '#f6f6f6'
        },
        paper: {
            dark: '#424242',
            light: '#ececec'
        },
        tableHeader: {
            dark: '#484848',
            light: '#c4c4c4'
        },
        tableHover: {
            dark: "#3c3c3c",
            light: "#e8e8e8",
        },
        pageHeader: {
            dark: '#706c6e',
            light: '#706c6e'
        },
        text: {
            dark: "#ffffff",
            light: "#000000",
        },
        selectedCallbackColor: {
            dark: '#26456e',
            light: '#c6e5f6',
        },
        selectedCallbackHierarchyColor: {
            dark: '#273e5d',
            light: '#deeff8',
        },
        backgroundImage: {
            dark: null,
            light: null
        },
        navBarIcons: {
            dark: '#ffffff',
            light: '#ffffff'
        },
        navBarText: {
            dark: '#ffffff',
            light: '#ffffff'
        },
        navBarColor: {
            dark: "#3c4d67",
            light: "#3c4d67",
        }
    },
}
export const mePreferences = makeVar(operatorSettingDefaults);


export const successfulLogin = (data) => {
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);


    let now = new Date();
    let serverNow = new Date(data.user.current_utc_time);
    const difference = (serverNow.getTime() - now.getTime()) / 1000;
    let me = {...data.user};
    me.server_skew = difference;
    me.login_time = now;
    meState({
        loggedIn: true,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: {
            ...me
        }
    });
    localStorage.setItem("user", JSON.stringify(me));
    restartWebsockets();
}
export const successfulRefresh = (data) => {
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    let now = new Date();
    let serverNow = new Date(data.user.current_utc_time);
    const difference = (serverNow.getTime() - now.getTime()) / 1000;
    let me = {...meState().user};
    me.server_skew = difference;
    me.login_time = now;
    meState({
        loggedIn: true,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: {
            ...me
        }
    });
    localStorage.setItem("user", JSON.stringify(me));
}
export const FailedRefresh = () =>{
    console.log("failed refresh");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    // retrieve all cookies
    let Cookies = document.cookie.split(';');
    // set past expiry to all cookies
    for (let i = 0; i < Cookies.length; i++) {
        document.cookie = Cookies[i] + "=; expires="+ new Date(0).toUTCString();
    }
    meState({
        loggedIn: false,
        access_token: null,
        refresh_token: null,
        user: null
    });
    mePreferences(operatorSettingDefaults);
    snackActions.clearAll();
    restartWebsockets();
}

