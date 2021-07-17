import clsx from 'clsx';
import { makeStyles } from '@material-ui/core/styles';
import { LoginForm } from './pages/Login/LoginForm';
import { Settings } from './pages/Settings/Settings';
import { Logout } from './pages/Logout/Logout';
import { PayloadTypes } from './pages/PayloadTypes/PayloadTypes';
import { CreatePayload } from './pages/CreatePayload/CreatePayload';
import { EventFeed } from './pages/EventFeed/EventFeed';
import { BrowserScripts } from './pages/BrowserScripts/BrowserScripts';
import { Payloads } from './pages/Payloads/Payloads';
import { Home } from './pages/Home/Home';
import { LoggedInRoute } from './utilities/LoggedInRoute';
import { C2Profiles } from './pages/C2Profiles/C2Profiles';
import { Callbacks } from './pages/Callbacks/Callbacks';
import React from 'react';
import { TopAppBar } from './TopAppBar';
import { useReactiveVar } from '@apollo/client';
import { menuOpen } from '../cache';
import  {useDarkMode} from "./utilities/useDarkMode";
import { SnackbarProvider } from 'notistack';
import {SingleTaskView} from './pages/SingleTaskView/SingleTaskView';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import { GlobalStyles } from "../themes/GlobalStyles";
import CssBaseline from '@material-ui/core/CssBaseline';
import {SnackbarUtilsConfigurator, } from './utilities/Snackbar';

//background-color: #282c34;
import {
    Route,
    Switch,
} from 'react-router-dom'


const useStyles = makeStyles((theme) => ({
    content: {
        maxWidth: "calc(99vw)",
        maxHeight: "calc(98vh)",
        overflow: "auto",
        padding: "0px 0 0px 16px"
      },
      contentShift: {
        maxWidth: `calc(99vw - ${drawerWidth}px)`,
        marginLeft: `${drawerWidth}px`,
        overflow: "auto",
        padding: "0 0 0 16px"
      }
  }));
  
const drawerWidth = 240;

export function App(props) {
    const classes = useStyles();
    const [themeMode, themeToggler] = useDarkMode();
    const isOpen = useReactiveVar(menuOpen);
    const theme = React.useMemo( () => createMuiTheme({
        palette: {
          primary: {
                  main: "#617AB1"
              },
          secondary: {
                  main: "#725398"
              },
          error: {
                  main: "#f44336"
              },
          warning: {
                  main: "#ff9800"
              },
          info: {
                  main: "#2196f3"
              },
          disabled: {
                  main: "rgba(0, 0, 0, 0.38)"
              },
          type: themeMode,
          background: {
              main: '#303030'
          },
          text: {
            primary: themeMode === 'dark' ? '#fff' : '#000',
            secondary: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.7)': 'rgba(0, 0, 0, 0.54)'
          },
          graphGroup: themeMode === 'dark' ? '#394c5d' : "#d3d7e8"
        },
        folderColor: '#f1d592',
        tableHeader: '#484848',
        tableBorder: themeMode === 'dark' ? 'rgba(81,81,81,1)' : 'rgba(224,224,224,1)',
        tableHover: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.08)': 'rgba(0, 0, 0, 0.04)',
        pageHeader: {
            main: "#6a7da0"
        },
        }
    ), [themeMode]
    );
    return (
        <ThemeProvider theme={theme}>
            <GlobalStyles theme={theme}/>
            <CssBaseline />                
            <SnackbarProvider maxSnack={5} anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                }}>
                <SnackbarUtilsConfigurator />
                <div className="App">
                    <TopAppBar theme={themeMode} toggleTheme={themeToggler} />
                    <div className={clsx(classes.content, {[classes.contentShift]: isOpen,})}>
                        <Switch>
                            <LoggedInRoute exact path='/new' component={Home} />
                            <Route exact path='/new/login' component={LoginForm} /> 
                            <LoggedInRoute exact path='/new/settings' component={Settings} />
                            <LoggedInRoute exact path='/new/payloadtypes' component={PayloadTypes} />
                            <LoggedInRoute exact path='/new/eventfeed' component={EventFeed} />
                            <LoggedInRoute exact path='/new/createpayload' component={CreatePayload} />
                            <LoggedInRoute exact path='/new/payloads' component={Payloads} />
                            <LoggedInRoute exact path='/new/c2profiles' component={C2Profiles} />
                            <LoggedInRoute exact path='/new/callbacks' component={Callbacks} />
                            <LoggedInRoute exact path='/new/browserscripts' component={BrowserScripts} />
                            <LoggedInRoute exact path='/new/task/:taskId' component={SingleTaskView} />
                            <LoggedInRoute exact path='/new/tasks/by_range' component={SingleTaskView} />
                            <Route exact path='/new/logout' component={Logout} />
                        </Switch>
                    </div>
                </div>
            </SnackbarProvider>
        </ThemeProvider>
    );

}

