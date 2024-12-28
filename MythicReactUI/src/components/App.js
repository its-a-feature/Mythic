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
import { ConsumingServices } from './pages/ConsumingServices/ConsumingServices';
import React, {createContext} from 'react';
import { Typography } from '@mui/material';
import { useReactiveVar } from '@apollo/client';
import { useDarkMode } from './utilities/useDarkMode';
import { SingleTaskView } from './pages/SingleTaskView/SingleTaskView';
import { createTheme, ThemeProvider, StyledEngineProvider, adaptV4Theme } from '@mui/material/styles';
import { GlobalStyles } from '../themes/GlobalStyles';
import CssBaseline from '@mui/material/CssBaseline';
import {FailedRefresh, mePreferences, meState} from '../cache';
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
import {TopAppBar} from "./TopAppBar";

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
        () =>
            createTheme(adaptV4Theme({
                transitions: {
                    // So we have `transition: none;` everywhere
                    create: () => 'none',
                },
                palette: {
                    primary: {
                        main: themeMode === "dark" ? "rgb(70,91,115)" : "rgb(117,133,155)",
                    },
                    error: {
                        main: themeMode === "dark" ? '#da3237' : '#c42c32',
                    },
                    success: {
                        main: themeMode === 'dark' ? '#44b636' : '#0e7004',
                    },
                    secondary: {
                        main: themeMode === 'dark' ? '#bebebe' : '#a6a5a5',
                    },
                    info: {
                        main: themeMode === 'dark' ? '#2574b4' : '#4990b2',
                    },
                    mode: themeMode,
                    background: {
                        contrast: themeMode === 'dark' ? '#e1e0e0' : 'rgb(44, 52, 60)',
                        default: themeMode === "dark" ? 'rgb(48, 48, 48)' : '#f6f6f6',
                        paper: themeMode === "dark" ? 'rgb(37,36,36)' : '#ececec',
                        taskLabel: themeMode === "dark" ? 'rgb(20, 20, 20)' : '#f5f5f5',
                    },
                    listSubHeader: {
                      default: themeMode === "dark" ? 'rgb(50, 50, 50)' : 'rgb(240, 240, 240)',
                    },
                    text: {
                        contrast: themeMode === 'dark' ? '#000' : '#fff',
                    },
                    textBackgroundColor: themeMode === 'dark' ? '#272c2f' : '#e9eaea',
                    textBackgroundColorPrimary: themeMode === 'dark' ? '#436b9f' : '#aadcf5',
                    textBackgroundColorSuccess: themeMode === 'dark' ? '#09a21a' : '#70e373',
                    textBackgroundColorError: themeMode === 'dark' ? '#9f1616' : '#f19da3',
                    graphGroup: themeMode === 'dark' ? '#394c5d' : '#d3d7e8',
                    graphGroupRGBA: themeMode === 'dark' ? 'rgba(57, 76, 93, 0.5)' : 'rgba(211, 215, 232, 0.5)',
                    speedDialAction: themeMode === 'dark' ? '#495054' : '#ffffff',
                },
                pageHeaderTextColor: "#ffffff",
                folderColor: '#f1d592',
                tableHeader: themeMode === 'dark' ? '#484848' : '#c4c4c4',
                successOnMain: '#1ae302',
                errorOnMain: '#ff656b',
                infoOnMain: '#67ceff',
                selectedCallbackColor: themeMode === 'dark' ? '#26456e' : '#c6e5f6',
                selectedCallbackHierarchyColor:  themeMode === 'dark' ? '#273e5d' : '#deeff8',
                materialReactTableHeader: themeMode === 'dark' ? '#484848' : '#d5d5d5',
                tableBorder: themeMode === 'dark' ? 'rgba(81,81,81,1)' : 'rgba(224,224,224,1)',
                tableHover: themeMode === 'dark' ? 'rgba(60,60,60)' : 'rgb(232,232,232)',
                pageHeader: {
                    main: '#706c6e',
                },
                pageHeaderSecondary: {
                    main: '#444343',
                },
                pageHeaderText: {
                    main: 'white',
                },
                topAppBarColor: preferences?.topColor,
                typography: {
                    fontSize: preferences?.fontSize,
                    fontFamily: preferences?.fontFamily
                },
            })),
        [themeMode, loadingPreference, preferences.topColor, preferences.fontSize, preferences.fontFamily]
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
    return (
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
                <GlobalStyles theme={theme} />
                <CssBaseline />
                <Tooltip id={"my-tooltip"} style={{zIndex: 100000, wordBreak: "break-word", maxWidth: "80%"}}/>
                <ToastContainer limit={2} autoClose={3000}
                                theme={themeMode}
                                style={{maxWidth: "100%", minWidth: "40%", width: "40%", marginTop: "20px", display: "flex", flexWrap: "wrap",
                                wordBreak: "break-all", flexDirection: "column", justifyContent: "center"}}
                                pauseOnFocusLoss={false} />
                    <div style={{ maxHeight: '100%', height: '100%', display: 'flex', flexDirection: 'row', maxWidth: "100%", width:"100%" }}>

                        {openRefreshDialog &&
                            <MythicDialog fullWidth={true} maxWidth="sm" open={openRefreshDialog}
                                          onClose={()=>{setOpenRefreshDialog(false);}}
                                          innerDialog={<RefreshTokenDialog
                                              onClose={()=>{setOpenRefreshDialog(false);}} />}
                            />
                        }
                        {me.loggedIn && me.user !== undefined && me.user !== null && preferences?.["experiment-newSidebar"] ? (
                            <TopAppBarVertical me={me} theme={themeMode} toggleTheme={themeToggler} />
                        ) : null}
                        <div style={{
                            maxHeight: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            width: "100%"
                        }}>
                            {me.loggedIn && !preferences?.["experiment-newSidebar"] &&
                                <div style={{minHeight: '50px', flexGrow: 0}}>
                                    {me.loggedIn && me.user !== undefined && me.user !== null ? (
                                        <TopAppBar me={me} theme={themeMode} toggleTheme={themeToggler}/>
                                    ) : null}
                                </div>
                            }
                            {me?.user?.current_operation_banner_text !== "" &&
                                <Typography style={{
                                    backgroundColor: me?.user?.current_operation_banner_color,
                                    width: "100%",
                                    textAlign: "center",
                                    fontWeight: "600",
                                    color: "white",
                                    borderRadius: "4px",
                                    border: "1px solid grey"
                                }}>
                                    {me?.user?.current_operation_banner_text}
                                </Typography>
                            }
                            <div style={{
                                margin: '0px 2px 0px 5px',
                                flexGrow: 1,
                                flexDirection: 'column',
                                height: "calc(100% - 5rem)",
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
                                    <Route exact path='/new/consuming_services'
                                           element={<LoggedInRoute me={me}><ConsumingServices
                                               me={me}/></LoggedInRoute>}/>
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
