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
import {ThemeProvider} from "styled-components";
import { GlobalStyles } from "../themes/GlobalStyles";
import { lightTheme, darkTheme, muiTheme } from "../themes/Themes";
import { ThemeProvider as TP} from '@material-ui/styles';
import  {useDarkMode} from "./utilities/useDarkMode";
import { SnackbarProvider } from 'notistack';
import {SingleTaskView} from './pages/SingleTaskView/SingleTaskView';

//background-color: #282c34;
import {
    Route,
    Switch,
} from 'react-router-dom'


const useStyles = makeStyles((theme) => ({
    content: {
        maxWidth: "calc(98vw)",
        maxHeight: "calc(98vh)",
        overflow: "auto",
        padding: "0px 0 0px 16px"
      },
      contentShift: {
        maxWidth: `calc(97vw - ${drawerWidth}px)`,
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
    return (
        <ThemeProvider theme={themeMode === 'dark' ? darkTheme : lightTheme}>
            <GlobalStyles/>
            <SnackbarProvider maxSnack={5} anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                }}>
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
                            <Route exact path='/new/logout' component={Logout} />
                        </Switch>
                    </div>
                </div>
            </SnackbarProvider>
        </ThemeProvider>
    );

}

