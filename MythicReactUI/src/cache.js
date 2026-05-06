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
export const taskingDisplayFieldOptions = [
    {
        name: "timestamp",
        display: "Timestamp",
        description: "Show the configured task timestamp."
    },
    {
        name: "task",
        display: "Task number",
        description: "Show the T-number link for each task."
    },
    {
        name: "username",
        display: "Username",
        description: "Show the operator that issued the task."
    },
    {
        name: "callback",
        display: "Callback number",
        description: "Show the C-number link for the task callback."
    },
    {
        name: "host",
        display: "Host",
        description: "Show the callback host."
    },
    {
        name: "ip",
        display: "IP address",
        description: "Show the callback primary IP."
    },
    {
        name: "groups",
        display: "Callback groups",
        description: "Show the callback's tree groups."
    },
    {
        name: "payload_type",
        display: "Payload type",
        description: "Show the task payload type."
    },
];
export const defaultTaskingDisplayFields = ["timestamp", "task", "username", "callback", "payload_type"];
export const normalizeTaskingDisplayFields = (fields) => {
    if(!Array.isArray(fields)){
        return [...defaultTaskingDisplayFields];
    }
    const validFieldNames = taskingDisplayFieldOptions.map((option) => option.name);
    return fields.reduce( (prev, fieldName) => {
        if(validFieldNames.includes(fieldName) && !prev.includes(fieldName)){
            return [...prev, fieldName];
        }
        return prev;
    }, []);
}
export const taskingContextFieldsOptions = ["impersonation_context", "cwd", "user", "host", "ip", "pid", "process_short_name", "extra_info", "architecture"].sort();
export const defaultShortcuts = [
    "ActiveCallbacks", "Payloads", "PayloadTypesAndC2",
    "Operations", "SearchFiles", "SearchProxies",
    "CreatePayload", "Eventing",
].sort();
export const operatorSettingDefaults =  {
    fontSize: 13,
    navBarOpen: false,
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    showMedia: true,
    showOPSECBypassUsername: false,
    taskingDisplayFields: defaultTaskingDisplayFields,
    useDisplayParamsForCLIHistory: true,
    interactType: "interactSplit",
    taskTimestampDisplayField: "timestamp",
    callbacks_table_columns: ["Interact", "Host", "Domain", "User", "Description", "Last Checkin", "Agent",  "IP", "PID"],
    callbacks_table_filters: {},
    autoTaskLsOnEmptyDirectories: false,
    hideBrowserTasking: false,
    hideTaskingContext: false,
    taskingContextFields: ["impersonation_context", "cwd"],
    ["experiment-responseStreamLimit"]: 200,
    sideShortcuts: defaultShortcuts,
    palette: {
        primary: {
            dark: "#8ab4f8",
            light: "#2563eb",
        },
        error: {
            dark: '#f87171',
            light: '#dc2626'
        },
        success: {
            dark: '#4ade80',
            light: '#15803d',
        },
        secondary: {
            dark: '#94a3b8',
            light: '#64748b'
        },
        info: {
            dark: '#38bdf8',
            light: '#0284c7'
        },
        warning: {
            dark: "#fbbf24",
            light: "#d97706",
        },
        background: {
            dark: '#0f141b',
            light: '#f4f6f8'
        },
        paper: {
            dark: '#161b22',
            light: '#ffffff'
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
            dark: '#171d25',
            light: '#ffffff'
        },
        text: {
            dark: "#e5e7eb",
            light: "#111827",
        },
        selectedCallbackColor: {
            dark: '#1e3a5f',
            light: '#dbeafe',
        },
        selectedCallbackHierarchyColor: {
            dark: '#22324c',
            light: '#eef4ff',
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
            dark: "#111827",
            light: "#111827",
        },
        navBarBottomColor: {
            dark: "#1f2937",
            light: "#1f2937",
        },
        taskPromptTextColor: {
            dark: '#9ca3af',
            light: '#64748b'
        },
        taskPromptCommandTextColor: {
            dark: "#f8fafc",
            light: "#111827",
        },
        taskContextColor: {
            dark: "#14253d",
            light: "#dbeafe",
        },
        taskContextImpersonationColor: {
            dark: "#4c1d20",
            light: "#fee2e2",
        },
        taskContextExtraColor: {
            dark: "#123d39",
            light: "#dcfce7",
        },
        emptyFolderColor: {
            dark: '#94a3b8',
            light: '#64748b'
        },
        outputBackgroundColor: {
            dark: '#0b1017',
            light: '#f8fafc'
        },
        outputTextColor: {
            dark: '#e5e7eb',
            light: '#111827',
        },
        borderColor: {
            dark: "#2f3742",
            light: "#d9dee7"
        }
    },
}

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
