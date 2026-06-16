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
    "CreatePayload", "Eventing", "Chat",
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
            dark: "#7dd3fc",
            light: "#2563eb",
        },
        error: {
            dark: '#fb7185',
            light: '#dc2626'
        },
        success: {
            dark: '#34d399',
            light: '#15803d',
        },
        secondary: {
            dark: '#94a3b8',
            light: '#64748b'
        },
        info: {
            dark: '#22d3ee',
            light: '#0891b2'
        },
        warning: {
            dark: "#fbbf24",
            light: "#b45309",
        },
        background: {
            dark: '#0b0f14',
            light: '#f6f8fb'
        },
        paper: {
            dark: '#111820',
            light: '#ffffff'
        },
        surfaceRaised: {
            dark: '#16212b',
            light: '#ffffff'
        },
        surfaceMuted: {
            dark: '#0f1720',
            light: '#fafbfc'
        },
        tableHeader: {
            dark: '#17212c',
            light: '#e8eef5'
        },
        tableHover: {
            dark: "#1e2a36",
            light: "#eaf1f8",
        },
        pageHeader: {
            dark: '#111a23',
            light: '#ffffff'
        },
        pageHeaderText: {
            dark: "#e7edf5",
            light: "#0f172a",
        },
        chatMessageOperatorBackground: {
            dark: "#111820",
            light: "#ffffff",
        },
        chatMessageSelfBackground: {
            dark: "#142033",
            light: "#eef5ff",
        },
        chatMessageAIBackground: {
            dark: "#14272b",
            light: "#edf8f5",
        },
        chatMessageSystemBackground: {
            dark: "#2a2116",
            light: "#fff7ed",
        },
        chatMarkdownSurfaceBackground: {
            dark: "#0b1118",
            light: "#f1f5f9",
        },
        chatMarkdownSurfaceStrongBackground: {
            dark: "#1f2a37",
            light: "#e2e8f0",
        },
        sectionHeaderAccent: {
            dark: "#7dd3fc",
            light: "#b3cbff",
        },
        sectionHeaderGradientStart: {
            dark: "#153049",
            light: "#dbeafe",
        },
        sectionHeaderGradientMiddle: {
            dark: "#111f2e",
            light: "#eef6ff",
        },
        sectionHeaderGradientEnd: {
            dark: "#111820",
            light: "#ffffff",
        },
        subtleAccentGradientStart: {
            dark: "#132338",
            light: "#eef6ff",
        },
        subtleAccentGradientEnd: {
            dark: "#111820",
            light: "#ffffff",
        },
        graphGroupColor: {
            dark: "#24384a",
            light: "#d9e6f2",
        },
        chartSeries1: {
            dark: "#38bdf8",
            light: "#0284c7",
        },
        chartSeries2: {
            dark: "#34d399",
            light: "#16a34a",
        },
        chartSeries3: {
            dark: "#fbbf24",
            light: "#ca8a04",
        },
        chartSeries4: {
            dark: "#fb7185",
            light: "#e11d48",
        },
        chartSeries5: {
            dark: "#a78bfa",
            light: "#7c3aed",
        },
        chartSeries6: {
            dark: "#2dd4bf",
            light: "#0d9488",
        },
        chartSeries7: {
            dark: "#f472b6",
            light: "#db2777",
        },
        chartSeries8: {
            dark: "#f97316",
            light: "#ea580c",
        },
        chartSeries9: {
            dark: "#818cf8",
            light: "#4f46e5",
        },
        chartSeries10: {
            dark: "#a3e635",
            light: "#65a30d",
        },
        text: {
            dark: "#e6edf3",
            light: "#111827",
        },
        textSecondary: {
            dark: "#a7b2c2",
            light: "#526174",
        },
        textDisabled: {
            dark: "#6f7c8d",
            light: "#93a1b2",
        },
        selectedCallbackColor: {
            dark: '#123a5a',
            light: '#dbeafe',
        },
        selectedCallbackHierarchyColor: {
            dark: '#172d49',
            light: '#edf6ff',
        },
        backgroundImage: {
            dark: null,
            light: null
        },
        navBarIcons: {
            dark: '#dce8f8',
            light: '#ffffff'
        },
        navBarText: {
            dark: '#dce8f8',
            light: '#ffffff'
        },
        navBarColor: {
            dark: "#1a283d",
            light: "#5c73a5",
        },
        navBarBottomColor: {
            dark: "#0c131c",
            light: "#1f2937",
        },
        taskPromptTextColor: {
            dark: '#9fb3c8',
            light: '#64748b'
        },
        taskPromptCommandTextColor: {
            dark: "#f8fafc",
            light: "#0f172a",
        },
        taskContextColor: {
            dark: "#14324f",
            light: "#dbeafe",
        },
        taskContextImpersonationColor: {
            dark: "#4a1824",
            light: "#fee2e2",
        },
        taskContextExtraColor: {
            dark: "#123a35",
            light: "#dcfce7",
        },
        emptyFolderColor: {
            dark: '#8997aa',
            light: '#64748b'
        },
        folderColor: {
            dark: '#f2c86b',
            light: '#d6a23f'
        },
        outputBackgroundColor: {
            dark: '#070b10',
            light: '#f8fafc'
        },
        outputTextColor: {
            dark: '#e6edf3',
            light: '#111827',
        },
        borderColor: {
            dark: "#263241",
            light: "#d5dee9"
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
    let me = {...meState().user, ...(data.user || {})};
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
