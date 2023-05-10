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
import React from 'react';
import { TopAppBar } from './TopAppBar';
import { useReactiveVar } from '@apollo/client';
import { useDarkMode } from './utilities/useDarkMode';
import { SingleTaskView } from './pages/SingleTaskView/SingleTaskView';
import { createTheme, ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import { GlobalStyles } from '../themes/GlobalStyles';
import CssBaseline from '@mui/material/CssBaseline';
import { FailedRefresh, meState } from '../cache';
import { Reporting } from './pages/Reporting/Reporting';
import { MitreAttack } from './pages/MITRE_ATTACK/MitreAttack';
import {Tags} from './pages/Tags/Tags';
//background-color: #282c34;
import { Route, Switch } from 'react-router-dom';
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
            createTheme({
                palette: {
                    primary: {
                        main: '#7f93c0',
                    },
                    mode: themeMode,
                    background: {
                        contrast: themeMode === 'dark' ? '#ffffff' : '#30455e',
                        default: themeMode === "dark" ? 'rgb(31, 31, 31)' : 'white',
                    },
                    listSubHeader: {
                      default: themeMode === "dark" ? 'rgb(50, 50, 50)' : 'rgb(240, 240, 240)',
                    },
                    text: {
                        contrast: themeMode === 'dark' ? '#000' : '#fff',
                    },
                    textBackgroundColor: themeMode === 'dark' ? '#74828b' : '#d9dbdc',
                    textBackgroundColorMythic: themeMode === 'dark' ? '#436b9f' : '#aadcf5',
                    textBackgroundColorSuccess: themeMode === 'dark' ? '#09a21a' : '#70e373',
                    textBackgroundColorError: themeMode === 'dark' ? '#9f1616' : '#f19da3',
                    graphGroup: themeMode === 'dark' ? '#394c5d' : '#d3d7e8',
                },

                folderColor: '#f1d592',
                tableHeader: '#484848',
                tableBorder: themeMode === 'dark' ? 'rgba(81,81,81,1)' : 'rgba(224,224,224,1)',
                tableHover: themeMode === 'dark' ? 'rgba(85,88,93)' : 'rgba(245, 245, 245)',
                pageHeader: {
                    main: '#827E80',
                },
                pageHeaderText: {
                    main: 'white',
                },
                topAppBarColor: initialLocalStorageTopColorValue,
                typography: {
                    fontSize: initialLocalStorageFontSizeValue,
                    fontFamily: initialLocalStorageFontFamilyValue
                },
            }),
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
                <ToastContainer limit={5} autoClose={3000} hideProgressBar={true} newestOnTop={true} theme={themeMode} style={{maxWidth: "100%"}} />
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
                        <div style={{ margin: '0px 16px 0px 16px', flexGrow: 1,  flexDirection: 'column', height: "calc(100% - 56px)",  }}>
                            <Switch>
                                <LoggedInRoute exact path='/new' component={Home} />
                                <Route exact path='/new/login' component={LoginForm} />
                                <LoggedInRoute exact path='/new/settings' component={Settings} />
                                <LoggedInRoute exact path='/new/payloadtypes' component={PayloadTypesC2Profiles} />
                                <LoggedInRoute exact path='/new/eventfeed' component={EventFeed} />
                                <LoggedInRoute exact path='/new/createpayload' component={CreatePayload} />
                                <LoggedInRoute exact path='/new/createwrapper' component={CreatePayloadWrapper} />
                                <LoggedInRoute exact path='/new/payloads' component={Payloads} />
                                <LoggedInRoute exact path='/new/c2profiles' component={PayloadTypesC2Profiles} />
                                <LoggedInRoute exact path='/new/services/' component={PayloadTypesC2Profiles} />
                                <LoggedInRoute exact path='/new/callbacks' component={Callbacks} />
                                <LoggedInRoute path='/new/search' component={Search} />
                                <LoggedInRoute exact path='/new/browserscripts' component={BrowserScripts} />
                                <LoggedInRoute exact path='/new/task/:taskId' component={SingleTaskView} />
                                <LoggedInRoute exact path='/new/tasks/by_range' component={SingleTaskView} />
                                <LoggedInRoute exact path='/new/operations' component={Operations} />
                                <LoggedInRoute exact path='/new/callbacks/:callbackDisplayId' component={ExpandedCallback} />
                                <LoggedInRoute exact path='/new/reporting' component={Reporting} />
                                <LoggedInRoute exact path='/new/mitre' component={MitreAttack} />
                                <LoggedInRoute exact path='/new/tagtypes' component={Tags} />
                                <LoggedInRoute exact path='/new/consuming_services' component={ConsumingServices} />
                            </Switch>
                        </div>
                    </div>
                
            </ThemeProvider>
        </StyledEngineProvider>
    );
}
