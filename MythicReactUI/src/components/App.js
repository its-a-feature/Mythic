import { LoginForm } from './pages/Login/LoginForm';
import { Settings } from './pages/Settings/Settings';
import { PayloadTypesC2Profiles } from './pages/PayloadTypesC2Profiles/PayloadTypesC2Profiles';
import { CreatePayload } from './pages/CreatePayload/CreatePayload';
import { CreatePayloadWrapper } from './pages/CreateWrapper/CreatePayload';
import { EventFeed } from './pages/EventFeed/EventFeed';
import { Operations } from './pages/Operations/Operations';
import { BrowserScripts } from './pages/BrowserScripts/BrowserScripts';
import { Payloads } from './pages/Payloads/Payloads';
import { ExpandedCallback } from './pages/ExpandedCallback/ExpandedCallback';
import { Home } from './pages/Home/Home';
import { LoggedInRoute } from './utilities/LoggedInRoute';
import { Callbacks } from './pages/Callbacks/Callbacks';
import { Search } from './pages/Search/Search';
import React, {createContext} from 'react';
import { Typography } from '@mui/material';
import { useReactiveVar } from '@apollo/client';
import { useDarkMode } from './utilities/useDarkMode';
import { SingleTaskView } from './pages/SingleTaskView/SingleTaskView';
import { createTheme, ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import { GlobalStyles } from '../themes/GlobalStyles';
import CssBaseline from '@mui/material/CssBaseline';
import {FailedRefresh, mePreferences, meState, operatorSettingDefaults} from '../cache';
import { Reporting } from './pages/Reporting/Reporting';
import { MitreAttack } from './pages/MITRE_ATTACK/MitreAttack';
import {Tags} from './pages/Tags/Tags';
import { Tooltip } from 'react-tooltip';
import {useLazyQuery, gql } from '@apollo/client';
//background-color: #282c34;
import { Route, Routes } from 'react-router-dom';
import { useInterval } from './utilities/Time';
import { JWTTimeLeft, isJWTValid } from '../index';
import { RefreshTokenDialog } from './RefreshTokenDialog';
import { MythicDialog } from './MythicComponents/MythicDialog';
import { ToastContainer } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
import {Eventing} from "./pages/Eventing/Eventing";
import {InviteForm} from "./pages/Login/InviteForm";
import {snackActions} from "./utilities/Snackbar";
import {TopAppBarVertical} from "./TopAppBarVertical";

export const userSettingsQuery = gql`
query getUserSettings {
    getOperatorPreferences {
        status
        error
        preferences
    }
}
`;


export function App(props) {
    const me = useReactiveVar(meState);
    const preferences = useReactiveVar(mePreferences);
    const [loadingPreference, setLoadingPreferences] = React.useState(true);
    const [themeMode, themeToggler] = useDarkMode();
    const theme = React.useMemo(
        () => {
            try{
                return createTheme({
                    transitions: {
                        // So we have `transition: none;` everywhere
                        create: () => 'none',
                    },
                    palette: {
                        contrastThreshold: 4.5,
                        //tonalOffset: 0.5,
                        primary: {
                            main: themeMode === "dark" ? preferences?.palette?.primary?.dark || operatorSettingDefaults.palette.primary.dark :
                                preferences?.palette?.primary?.light || operatorSettingDefaults.palette.primary.light,
                        },
                        error: {
                            main: themeMode === "dark" ? preferences?.palette?.error?.dark || operatorSettingDefaults.palette.error.dark :
                                preferences?.palette?.error?.light || operatorSettingDefaults.palette.error.light,
                        },
                        success: {
                            main: themeMode === 'dark' ? preferences?.palette?.success?.dark || operatorSettingDefaults.palette.success.dark :
                                preferences?.palette?.success?.light || operatorSettingDefaults.palette.success.light,
                        },
                        secondary: {
                            main: themeMode === 'dark' ? preferences?.palette?.secondary?.dark || operatorSettingDefaults.palette.secondary.dark :
                                preferences?.palette?.secondary?.light || operatorSettingDefaults.palette.secondary.light,
                        },
                        info: {
                            main: themeMode === 'dark' ? preferences?.palette?.info?.dark || operatorSettingDefaults.palette.info.dark :
                                preferences?.palette?.info?.light || operatorSettingDefaults.palette.info.light,
                        },
                        warning: {
                            main: themeMode === 'dark' ? preferences?.palette?.warning?.dark || operatorSettingDefaults.palette.warning.dark :
                                preferences?.palette?.warning?.light || operatorSettingDefaults.palette.warning.light,
                        },
                        mode: themeMode,
                        background: {
                            contrast: themeMode === 'dark' ? preferences?.palette?.background?.light || operatorSettingDefaults.palette.background.light :
                                preferences?.palette?.background?.dark || operatorSettingDefaults.palette.background.dark,
                            default: themeMode === "dark" ? preferences?.palette?.background?.dark || operatorSettingDefaults.palette.background.dark :
                                preferences?.palette?.background?.light || operatorSettingDefaults.palette.background.light,
                            paper: themeMode === "dark" ?  preferences?.palette?.paper?.dark || operatorSettingDefaults.palette.paper.dark :
                                preferences?.palette?.paper?.light || operatorSettingDefaults.palette.paper.light,
                            image: themeMode === "dark" ?  preferences?.palette?.backgroundImage?.dark || operatorSettingDefaults.palette.backgroundImage.dark :
                                preferences?.palette?.backgroundImage?.light || operatorSettingDefaults.palette.backgroundImage.light,
                        },
                        text: {
                            primary: themeMode === 'dark' ? preferences?.palette?.text?.dark || operatorSettingDefaults.palette.text.dark :
                                preferences?.palette?.text?.light || operatorSettingDefaults.palette.text.light,
                            contrast: themeMode === 'dark' ? '#000' : '#fff',
                        },
                        graphGroupRGBA: themeMode === 'dark' ? 'rgba(57, 76, 93, 0.5)' : 'rgba(211, 215, 232, 0.5)',
                        speedDialAction: themeMode === 'dark' ? '#495054' : '#ffffff',
                    },
                    folderColor: '#f1d592',
                    tableHeader: themeMode === 'dark' ? preferences?.palette?.tableHeader?.dark || operatorSettingDefaults.palette.tableHeader.dark :
                        preferences?.palette?.tableHeader?.light || operatorSettingDefaults.palette.tableHeader.light,
                    selectedCallbackColor: themeMode === 'dark' ? preferences?.palette?.selectedCallbackColor?.dark || operatorSettingDefaults.palette.selectedCallbackColor.dark :
                        preferences?.palette?.selectedCallbackColor?.light || operatorSettingDefaults.palette.selectedCallbackColor.light,
                    selectedCallbackHierarchyColor:  themeMode === 'dark' ? preferences?.palette?.selectedCallbackHierarchyColor?.dark || operatorSettingDefaults.palette.selectedCallbackHierarchyColor.dark :
                        preferences?.palette?.selectedCallbackHierarchyColor?.light || operatorSettingDefaults.palette.selectedCallbackHierarchyColor.light,
                    tableHover: themeMode === 'dark' ? preferences?.palette?.tableHover?.dark || operatorSettingDefaults.palette.tableHover.dark :
                        preferences?.palette?.tableHover?.light || operatorSettingDefaults.palette.tableHover.light,
                    navBarTextIconColor: themeMode === 'dark' ? preferences?.palette?.navBarIcons?.dark || operatorSettingDefaults.palette.navBarIcons.dark :
                        preferences?.palette?.navBarIcons?.light || operatorSettingDefaults.palette.navBarIcons.light,
                    navBarTextColor: themeMode === 'dark' ? preferences?.palette?.navBarText?.dark || operatorSettingDefaults.palette.navBarText.dark :
                        preferences?.palette?.navBarText?.light || operatorSettingDefaults.palette.navBarText.light,
                    pageHeader: {
                        main: themeMode === 'dark' ? preferences?.palette?.pageHeader?.dark || operatorSettingDefaults.palette.pageHeader.dark :
                            preferences?.palette?.pageHeader?.light || operatorSettingDefaults.palette.pageHeader.light,
                    },
                    pageHeaderText: {
                        main: 'white',
                    },
                    topAppBarColor: themeMode === 'dark' ? preferences?.palette?.navBarColor?.dark || operatorSettingDefaults.palette.navBarColor.dark :
                        preferences?.palette?.navBarColor?.light || operatorSettingDefaults.palette.navBarColor.light,
                    typography: {
                        fontSize: preferences?.fontSize,
                        fontFamily: preferences?.fontFamily
                    },
                    taskPromptTextColor: themeMode === 'dark' ? preferences?.palette?.taskPromptTextColor?.dark || operatorSettingDefaults.palette.taskPromptTextColor.dark :
                        preferences?.palette?.taskPromptTextColor?.light || operatorSettingDefaults.palette.taskPromptTextColor.light,
                    taskPromptCommandTextColor: themeMode === 'dark' ? preferences?.palette?.taskPromptCommandTextColor?.dark || operatorSettingDefaults.palette.taskPromptCommandTextColor.dark :
                        preferences?.palette?.taskPromptCommandTextColor?.light || operatorSettingDefaults.palette.taskPromptCommandTextColor.light,
                    taskContextColor: themeMode === 'dark' ? preferences?.palette?.taskContextColor?.dark || operatorSettingDefaults.palette.taskContextColor.dark :
                        preferences?.palette?.taskContextColor?.light || operatorSettingDefaults.palette.taskContextColor.light,
                    taskContextImpersonationColor: themeMode === 'dark' ? preferences?.palette?.taskContextImpersonationColor?.dark || operatorSettingDefaults.palette.taskContextImpersonationColor.dark :
                        preferences?.palette?.taskContextImpersonationColor?.light || operatorSettingDefaults.palette.taskContextImpersonationColor.light,
                    taskContextExtraColor: themeMode === 'dark' ? preferences?.palette?.taskContextExtraColor?.dark || operatorSettingDefaults.palette.taskContextExtraColor.dark :
                        preferences?.palette?.taskContextExtraColor?.light || operatorSettingDefaults.palette.taskContextExtraColor.light,
                })
            }catch(error){
                console.log(error);
                snackActions.error(error.message);
                return createTheme({
                    transitions: {
                        // So we have `transition: none;` everywhere
                        create: () => 'none',
                    },
                    palette: {
                        contrastThreshold: 4.5,
                        //tonalOffset: 0.5,
                        primary: {
                            main: themeMode === "dark" ? operatorSettingDefaults.palette.primary.dark :
                                operatorSettingDefaults.palette.primary.light,
                        },
                        error: {
                            main: themeMode === "dark" ? operatorSettingDefaults.palette.error.dark :
                                operatorSettingDefaults.palette.error.light,
                        },
                        success: {
                            main: themeMode === 'dark' ? operatorSettingDefaults.palette.success.dark :
                                operatorSettingDefaults.palette.success.light,
                        },
                        secondary: {
                            main: themeMode === 'dark' ? operatorSettingDefaults.palette.secondary.dark :
                                operatorSettingDefaults.palette.secondary.light,
                        },
                        info: {
                            main: themeMode === 'dark' ? operatorSettingDefaults.palette.info.dark :
                                operatorSettingDefaults.palette.info.light,
                        },
                        warning: {
                            main: themeMode === 'dark' ? operatorSettingDefaults.palette.warning.dark :
                                operatorSettingDefaults.palette.warning.light,
                        },
                        mode: themeMode,
                        background: {
                            contrast: themeMode === 'dark' ?operatorSettingDefaults.palette.background.light :
                                operatorSettingDefaults.palette.background.dark,
                            default: themeMode === "dark" ? operatorSettingDefaults.palette.background.dark :
                                operatorSettingDefaults.palette.background.light,
                            paper: themeMode === "dark" ?  operatorSettingDefaults.palette.paper.dark :
                                operatorSettingDefaults.palette.paper.light,
                            image: themeMode === "dark" ?  operatorSettingDefaults.palette.backgroundImage.dark :
                                operatorSettingDefaults.palette.backgroundImage.light,
                        },
                        text: {
                            primary: themeMode === 'dark' ? operatorSettingDefaults.palette.text.dark :
                                operatorSettingDefaults.palette.text.light,
                            contrast: themeMode === 'dark' ? '#000' : '#fff',
                        },
                        graphGroupRGBA: themeMode === 'dark' ? 'rgba(57, 76, 93, 0.5)' : 'rgba(211, 215, 232, 0.5)',
                        speedDialAction: themeMode === 'dark' ? '#495054' : '#ffffff',
                    },
                    folderColor: '#f1d592',
                    tableHeader: themeMode === 'dark' ? operatorSettingDefaults.palette.tableHeader.dark :
                        operatorSettingDefaults.palette.tableHeader.light,
                    selectedCallbackColor: themeMode === 'dark' ? operatorSettingDefaults.palette.selectedCallbackColor.dark :
                        operatorSettingDefaults.palette.selectedCallbackColor.light,
                    selectedCallbackHierarchyColor:  themeMode === 'dark' ? operatorSettingDefaults.palette.selectedCallbackHierarchyColor.dark :
                        operatorSettingDefaults.palette.selectedCallbackHierarchyColor.light,
                    tableHover: themeMode === 'dark' ? operatorSettingDefaults.palette.tableHover.dark :
                        operatorSettingDefaults.palette.tableHover.light,
                    navBarTextIconColor: themeMode === 'dark' ? operatorSettingDefaults.palette.navBarIcons.dark :
                        operatorSettingDefaults.palette.navBarIcons.light,
                    navBarTextColor: themeMode === 'dark' ? operatorSettingDefaults.palette.navBarText.dark :
                        operatorSettingDefaults.palette.navBarText.light,
                    pageHeader: {
                        main: themeMode === 'dark' ? operatorSettingDefaults.palette.pageHeader.dark :
                            operatorSettingDefaults.palette.pageHeader.light,
                    },
                    pageHeaderText: {
                        main: 'white',
                    },
                    topAppBarColor: themeMode === 'dark' ? operatorSettingDefaults.palette.navBarColor.dark :
                        operatorSettingDefaults.palette.navBarColor.light,
                    typography: {
                        fontSize: operatorSettingDefaults?.fontSize,
                        fontFamily: operatorSettingDefaults?.fontFamily
                    },
                })
            }
        },[themeMode, loadingPreference, preferences.fontSize, preferences.fontFamily, preferences.palette]
    );
    const mountedRef = React.useRef(true);
    const [openRefreshDialog, setOpenRefreshDialog] = React.useState(false);
    const [getUserPreferences] = useLazyQuery(userSettingsQuery, {
        onCompleted: (data) => {
            //console.log("got preferences", data.getOperatorPreferences.preferences)
            if(data.getOperatorPreferences.status === "success"){
                if(data.getOperatorPreferences.preferences !== null){
                    mePreferences({...preferences, ...data.getOperatorPreferences.preferences});
                }
            } else {
                snackActions.error(`Failed to get user preferences:\n${data.getOperatorPreferences.error}`);
            }
            setLoadingPreferences(false);
        },
        onError: (error) => {
            console.log(error);
            snackActions.error(error.message);
            setLoadingPreferences(false);
        }
    })
    useInterval( () => {
        // interval should run every 10 minutes (600000 milliseconds) to check JWT status
        let millisecondsLeft = JWTTimeLeft();
        // if we have 30min left of our token, prompt the user to extend. 30 min is 1,800,000 milliseconds
        //console.log("jwt time left: ", millisecondsLeft)
        if(millisecondsLeft <= 1800000 && !openRefreshDialog){
            if(isJWTValid()){
                setOpenRefreshDialog(true);
            }else{
                FailedRefresh();
            }
        }
    }, 600000, mountedRef, mountedRef);
    React.useEffect( () => {
        if(me.loggedIn){
            setLoadingPreferences(true);
            getUserPreferences();
        } else {
            setLoadingPreferences(false);
        }
    }, [me.loggedIn])
    if(loadingPreference){
        // make sure we've loaded preferences before loading actual app content
        return (
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={theme}>
                    <GlobalStyles theme={theme} />
                    <CssBaseline />
                </ThemeProvider>
            </StyledEngineProvider>
        )
    }
    const background = theme.palette.background.image !== null ? {
        backgroundImage: "linear-gradient(" + theme.palette.background.default + "99" + "," + theme.palette.background.default + "99" + ")," + theme.palette.background.image ,
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 100%"
    } : {
        backgroundColor: theme.palette.background.default
    };
    return (
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
                <GlobalStyles theme={theme} />
                <CssBaseline />
                <Tooltip id={"my-tooltip"} style={{zIndex: 100000, wordBreak: "break-word", maxWidth: "80%", whiteSpace: "pre-wrap"}}/>
                <ToastContainer limit={2} autoClose={3000}
                                theme={themeMode}
                                hideProgressBar={true}
                                newestOnTop={true}
                                stacked={false}
                                style={{maxWidth: "100%", minWidth: "40%", width: "40%", display: "flex", flexWrap: "wrap",
                                wordBreak: "break-all", flexDirection: "column", justifyContent: "center",}}
                                pauseOnFocusLoss={false} />
                    <div style={{ maxHeight: '100%', height: '100%', display: 'flex', flexDirection: 'row', maxWidth: "100%", width:"100%",
                        ...background}}>

                        {openRefreshDialog &&
                            <MythicDialog fullWidth={true} maxWidth="sm" open={openRefreshDialog}
                                          onClose={()=>{setOpenRefreshDialog(false);}}
                                          innerDialog={<RefreshTokenDialog
                                              onClose={()=>{setOpenRefreshDialog(false);}} />}
                            />
                        }
                        {me.loggedIn && me.user !== undefined && me.user !== null  ? (
                            <TopAppBarVertical me={me} theme={themeMode} toggleTheme={themeToggler} />
                        ) : null}
                        <div style={{
                            maxHeight: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            width: "100%"
                        }}>
                            {me.loggedIn && me?.user?.current_operation_banner_text !== "" &&
                                <Typography style={{
                                    backgroundColor: me?.user?.current_operation_banner_color,
                                    width: "100%",
                                    textAlign: "center",
                                    fontWeight: "600",
                                    color: "white",
                                    border: `1px solid ${theme.topAppBarColor || "grey"}`
                                }}>
                                    {me?.user?.current_operation_banner_text}
                                </Typography>
                            }
                            {me.loggedIn && me?.badConnection
                                &&
                                <Typography style={{
                                    backgroundColor: theme.palette.error.main,
                                    width: "100%",
                                    textAlign: "center",
                                    fontWeight: "600",
                                    color: "white",
                                    border: `1px solid ${theme.topAppBarColor || "grey"}`
                                }}>
                                    {"Can't connect to Mythic. Please check connection and refresh"}
                                </Typography>
                            }
                            <div style={{
                                margin: '0px 0px 0px 0px',
                                flexGrow: 1,
                                overflowY: "hidden",
                                flexDirection: 'column',
                                height: "100%",
                            }}>
                                <Routes>
                                    <Route path='/new/login' element={<LoginForm me={me}/>}/>
                                    <Route path='/new/invite' element={<InviteForm me={me}/>}/>
                                    <Route path='/' element={<LoggedInRoute me={me}><Home me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new'
                                           element={<LoggedInRoute me={me}><Home me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/settings'
                                           element={<LoggedInRoute me={me}><Settings me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/payloadtypes'
                                           element={<LoggedInRoute me={me}><PayloadTypesC2Profiles
                                               me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/eventfeed'
                                           element={<LoggedInRoute me={me}><EventFeed me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/createpayload'
                                           element={<LoggedInRoute me={me}><CreatePayload me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/createwrapper'
                                           element={<LoggedInRoute me={me}><CreatePayloadWrapper
                                               me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/payloads'
                                           element={<LoggedInRoute me={me}><Payloads me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/c2profiles'
                                           element={<LoggedInRoute me={me}><PayloadTypesC2Profiles
                                               me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/services/'
                                           element={<LoggedInRoute me={me}><PayloadTypesC2Profiles
                                               me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/callbacks'
                                           element={<LoggedInRoute me={me}><Callbacks me={me}/></LoggedInRoute>}/>
                                    <Route path='/new/search'
                                           element={<LoggedInRoute me={me}><Search history={props.history}
                                                                                   me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/browserscripts'
                                           element={<LoggedInRoute me={me}><BrowserScripts me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/task/:taskId'
                                           element={<LoggedInRoute me={me}><SingleTaskView me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/tasks/by_range'
                                           element={<LoggedInRoute me={me}><SingleTaskView me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/operations'
                                           element={<LoggedInRoute me={me}><Operations me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/callbacks/:callbackDisplayId'
                                           element={<LoggedInRoute me={me}><ExpandedCallback
                                               me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/reporting'
                                           element={<LoggedInRoute me={me}><Reporting me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/mitre'
                                           element={<LoggedInRoute me={me}><MitreAttack me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/tagtypes'
                                           element={<LoggedInRoute me={me}><Tags me={me}/></LoggedInRoute>}/>
                                    <Route exact path='/new/eventing'
                                           element={<LoggedInRoute me={me}><Eventing me={me}/></LoggedInRoute>}/>
                                </Routes>
                            </div>
                        </div>


                    </div>

            </ThemeProvider>
        </StyledEngineProvider>
    );
}
