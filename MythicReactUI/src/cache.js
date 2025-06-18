import { makeVar } from '@apollo/client';
import {restartWebsockets} from "./index";
import {snackActions} from "./components/utilities/Snackbar";

export const meState = makeVar({loggedIn:false, user: null, access_token: null, refresh_token: null});
export const alertCount = makeVar(0);
export const taskTimestampDisplayFieldOptions = [
    {
        name: "timestamp",
        display: "Latest Timestamp for anything task related"
    },
    {
        name: "status_timestamp_preprocessing",
        display: "When Operator Submitted Task"
    },
    {
        name: "status_timestamp_processing",
        display: "When Agent Picked up Task",
    }
]
export const operatorSettingDefaults =  {
    fontSize: 12,
    navBarOpen: false,
    fontFamily: "Verdana, Arial, sans-serif",
    showMedia: true,
    hideUsernames: false,
    showIP: false,
    showHostname: false,
    showCallbackGroups: false,
    useDisplayParamsForCLIHistory: true,
    interactType: "interact",
    taskTimestampDisplayField: "timestamp",
    callbacks_table_columns: ["Interact", "Host", "Domain", "User", "Description", "Last Checkin", "Agent",  "IP", "PID"],
    callbacks_table_filters: {},
    autoTaskLsOnEmptyDirectories: false,
    hideBrowserTasking: false,
    hideTaskingContext: false,
    ["experiment-responseStreamLimit"]: 50,
    palette: {
        primary: {
            dark: "#75859b",
            light: "#75859b",
        },
        error: {
            dark: '#bd5142',
            light: '#c42c32'
        },
        success: {
            dark: '#85b089',
            light: '#0e7004',
        },
        secondary: {
            dark: '#bebebe',
            light: '#a6a5a5'
        },
        info: {
            dark: '#84b4dc',
            light: '#4990b2'
        },
        warning: {
            dark: "#dc8455",
            light: "#ffb74d",
        },
        background: {
            dark: '#282828',
            light: '#f6f6f6'
        },
        paper: {
            dark: '#282828',
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
            dark: '#1b2025',
            light: '#706c6e'
        },
        text: {
            dark: "#e4e4e4",
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
            dark: "#2e373c",
            light: "#3c4d67",
        },
        taskPromptTextColor: {
            dark: '#bebebe',
            light: '#a6a5a5'
        },
        taskPromptCommandTextColor: {
            dark: "#e4e4e4",
            light: "#000000",
        },
        taskContextCwdColor: {
            dark: "#122848",
            light: "#acc0da",
        },
        taskContextImpersonationColor: {
            dark: "#641616",
            light: "#dec0c0",
        },
        taskContextExtraColor: {
            dark: "#2a5953",
            light: "#a7ce9d",
        },
    },
}
export const defaultShortcuts = [
    "ActiveCallbacks", "Payloads", "PayloadTypesAndC2",
    "Operations", "SearchFiles", "SearchProxies",
     "Reporting", "Eventing",
].sort();
export const mePreferences = makeVar(operatorSettingDefaults);


export const successfulLogin = (data) => {
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    let now = new Date();
    let serverNow = new Date(data.user.current_utc_time);
    const difference = (serverNow.getTime() - now.getTime());
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
    const difference = (serverNow.getTime() - now.getTime()) ;
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
export const FailedRefresh = (restart_websockets) =>{
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
    if(restart_websockets){
        restartWebsockets();
    }

}

