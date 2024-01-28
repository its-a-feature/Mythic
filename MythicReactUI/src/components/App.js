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
import { TopAppBar } from './TopAppBar';
import { useReactiveVar } from '@apollo/client';
import { useDarkMode } from './utilities/useDarkMode';
import { SingleTaskView } from './pages/SingleTaskView/SingleTaskView';
import { createTheme, ThemeProvider, StyledEngineProvider, adaptV4Theme } from '@mui/material/styles';
import { GlobalStyles } from '../themes/GlobalStyles';
import CssBaseline from '@mui/material/CssBaseline';
import { FailedRefresh, meState } from '../cache';
import { Reporting } from './pages/Reporting/Reporting';
import { MitreAttack } from './pages/MITRE_ATTACK/MitreAttack';
import {Tags} from './pages/Tags/Tags';
//background-color: #282c34;
import { Route, Routes } from 'react-router-dom';
import { useInterval } from './utilities/Time';
import { JWTTimeLeft, isJWTValid } from '../index';
import { RefreshTokenDialog } from './RefreshTokenDialog';
import { MythicDialog } from './MythicComponents/MythicDialog';
import { ToastContainer } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";



export function App(props) {
    const me = useReactiveVar(meState);
    const [themeMode, themeToggler] = useDarkMode();
    const localStorageFontSize = localStorage.getItem(`${me?.user?.user_id || 0}-fontSize`);
    const initialLocalStorageFontSizeValue = localStorageFontSize === null ? 12 : parseInt(localStorageFontSize);
    const localStorageFontFamily = localStorage.getItem(`${me?.user?.user_id || 0}-fontFamily`);
    const initialLocalStorageFontFamilyValue = localStorageFontFamily === null ? [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(',') : localStorageFontFamily;
    const localStorageTopColor = localStorage.getItem(`${me?.user?.user_id || 0}-topColor`);
    const initialLocalStorageTopColorValue = localStorageTopColor === null ? "#3c4d67" : localStorageTopColor;
    const theme = React.useMemo(
        () =>
            createTheme(adaptV4Theme({
                palette: {
                    primary: {
                        main: themeMode === "dark" ? "#465a79" : "rgb(102,121,145)",
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
                        contrast: themeMode === 'dark' ? '#ffffff' : '#30455e',
                        default: themeMode === "dark" ? 'rgb(31, 31, 31)' : '#ffffff',
                    },
                    listSubHeader: {
                      default: themeMode === "dark" ? 'rgb(50, 50, 50)' : 'rgb(240, 240, 240)',
                    },
                    text: {
                        contrast: themeMode === 'dark' ? '#000' : '#fff',
                    },
                    textBackgroundColor: themeMode === 'dark' ? '#272c2f' : '#e9eaea',
                    textBackgroundColorMythic: themeMode === 'dark' ? '#436b9f' : '#aadcf5',
                    textBackgroundColorSuccess: themeMode === 'dark' ? '#09a21a' : '#70e373',
                    textBackgroundColorError: themeMode === 'dark' ? '#9f1616' : '#f19da3',
                    graphGroup: themeMode === 'dark' ? '#394c5d' : '#d3d7e8',
                    graphGroupRGBA: themeMode === 'dark' ? 'rgba(57, 76, 93, 0.5)' : 'rgba(211, 215, 232, 0.5)',
                    speedDialAction: themeMode === 'dark' ? '#495054' : '#ffffff',
                },
                pageHeaderColor: "white",
                folderColor: '#f1d592',
                tableHeader: '#484848',
                successOnMain: '#1ae302',
                errorOnMain: '#ff656b',
                infoOnMain: '#67ceff',
                materialReactTableHeader: themeMode === 'dark' ? '#484848' : '#d5d5d5',
                tableBorder: themeMode === 'dark' ? 'rgba(81,81,81,1)' : 'rgba(224,224,224,1)',
                tableHover: themeMode === 'dark' ? 'rgba(85,88,93)' : 'rgba(245, 245, 245)',
                pageHeader: {
                    main: '#827E80',
                },
                pageHeaderSecondary: {
                    main: '#444343',
                },
                pageHeaderText: {
                    main: 'white',
                },
                topAppBarColor: initialLocalStorageTopColorValue,
                typography: {
                    fontSize: initialLocalStorageFontSizeValue,
                    fontFamily: initialLocalStorageFontFamilyValue
                },
            })),
        [themeMode]
    );
    const mountedRef = React.useRef(true);
    const [openRefreshDialog, setOpenRefreshDialog] = React.useState(false);
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
    return (
        <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
                <GlobalStyles theme={theme} />
                <CssBaseline />
                <ToastContainer limit={2} autoClose={3000}
                                theme={themeMode}
                                style={{maxWidth: "100%", minWidth: "40%", width: "40%", marginTop: "20px", display: "flex", flexWrap: "wrap",
                                wordBreak: "break-all", flexDirection: "column", justifyContent: "center"}}
                                pauseOnFocusLoss={false} />
                    <div style={{ maxHeight: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ minHeight: '56px', flexGrow: 0 }}>
                            {me.loggedIn && me.user !== undefined && me.user !== null ? (
                                <TopAppBar me={me} theme={themeMode} toggleTheme={themeToggler} />
                            ) : null}
                        </div>
                        {openRefreshDialog && 
                            <MythicDialog fullWidth={true} maxWidth="sm" open={openRefreshDialog} 
                                onClose={()=>{setOpenRefreshDialog(false);}} 
                                innerDialog={<RefreshTokenDialog 
                                    onClose={()=>{setOpenRefreshDialog(false);}} />}
                            />
                        }
                        <div style={{ margin: '0px 5px 5px 5px', flexGrow: 1, flexDirection: 'column', height: "calc(100% - 4rem)",  }}>
                            <Routes>
                                <Route path='/new/login' element={<LoginForm me={me}/>}/>
                                <Route path='/' element={<LoggedInRoute me={me}><Home me={me}/></LoggedInRoute>} />
                                <Route exact path='/new' element={<LoggedInRoute me={me}><Home me={me}/></LoggedInRoute>} />
                                <Route exact path='/new/settings' element={<LoggedInRoute me={me}><Settings me={me}/></LoggedInRoute>} />
                                <Route exact path='/new/payloadtypes' element={<LoggedInRoute me={me}><PayloadTypesC2Profiles me={me}/></LoggedInRoute>} />
                                <Route exact path='/new/eventfeed' element={<LoggedInRoute me={me}><EventFeed me={me}/></LoggedInRoute>} />
                                <Route exact path='/new/createpayload' element={<LoggedInRoute me={me}><CreatePayload me={me}/></LoggedInRoute>} />
                                <Route exact path='/new/createwrapper' element={<LoggedInRoute me={me}><CreatePayloadWrapper me={me}/></LoggedInRoute>} />
                                <Route exact path='/new/payloads' element={<LoggedInRoute me={me}><Payloads me={me} /></LoggedInRoute>} />
                                <Route exact path='/new/c2profiles' element={<LoggedInRoute me={me}><PayloadTypesC2Profiles me={me}/></LoggedInRoute>} />
                                <Route exact path='/new/services/' element={<LoggedInRoute me={me}><PayloadTypesC2Profiles me={me}/></LoggedInRoute>} />
                                <Route exact path='/new/callbacks' element={<LoggedInRoute me={me}><Callbacks me={me}/></LoggedInRoute>} />
                                <Route path='/new/search' element={<LoggedInRoute  me={me}><Search history={props.history} me={me} /></LoggedInRoute>} />
                                <Route exact path='/new/browserscripts' element={<LoggedInRoute me={me}><BrowserScripts me={me}/></LoggedInRoute>} />
                                <Route exact path='/new/task/:taskId' element={<LoggedInRoute me={me}><SingleTaskView me={me}/></LoggedInRoute>} />
                                <Route exact path='/new/tasks/by_range' element={<LoggedInRoute me={me}><SingleTaskView me={me}/></LoggedInRoute>} />
                                <Route exact path='/new/operations' element={<LoggedInRoute me={me}><Operations me={me}/></LoggedInRoute>} />
                                <Route exact path='/new/callbacks/:callbackDisplayId' element={<LoggedInRoute me={me}><ExpandedCallback me={me}/></LoggedInRoute>} />
                                <Route exact path='/new/reporting' element={<LoggedInRoute me={me}><Reporting me={me}/></LoggedInRoute>} />
                                <Route exact path='/new/mitre' element={<LoggedInRoute me={me}><MitreAttack me={me}/></LoggedInRoute>} />
                                <Route exact path='/new/tagtypes' element={<LoggedInRoute me={me}><Tags me={me}/></LoggedInRoute>} />
                                <Route exact path='/new/consuming_services' element={<LoggedInRoute me={me}><ConsumingServices me={me}/></LoggedInRoute>} />
                            </Routes>
                        </div>
                    </div>
                
            </ThemeProvider>
        </StyledEngineProvider>
    );
}
