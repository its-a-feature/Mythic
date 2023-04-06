import React from 'react';
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import makeStyles from '@mui/styles/makeStyles';
import {SearchTabTasksLabel, SearchTabTasksPanel} from './SearchTabTasks';
import {SearchTabFilesLabel, SearchTabFilesPanel} from './SearchTabFiles';
import {SearchTabCredentialsLabel, SearchTabCredentialsPanel} from './SearchTabCredentials';
import {SearchTabKeylogsLabel, SearchTabKeylogsPanel} from './SearchTabKeylog';
import {SearchTabTokensLabel, SearchTabTokensPanel} from './SearchTabTokens';
import {SearchTabCallbacksLabel, SearchTabCallbacksPanel} from './SearchTabCallbacks';
import {SearchTabArtifactsLabel, SearchTabArtifactsPanel} from './SearchTabArtifacts';
import {SearchTabSocksLabel, SearchTabSocksPanel} from './SearchTabSocks';

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    backgroundColor: theme.palette.background.paper,
  },
}));

export function Search(props){
  const classes = useStyles();
  const tabTypes = ["callbacks", "tasks", "files", "credentials", "keylogs", "artifacts", "tokens", "socks"];
  var params = new URLSearchParams(window.location.search);
  var valueString = params.get("tab");
  var valueIndex = tabTypes.findIndex(t => t === valueString);
  var value = valueIndex === -1 ? 0 : valueIndex;

  const handleChange = (event, newValue) => {
      params.set("tab", tabTypes[newValue]);
      var newRelativePathQuery = window.location.pathname + "?" + params.toString();
      props.history.push(newRelativePathQuery);
  };

const changeSearchParam = (name, value) => {
  params.set(name, value);
  var newRelativePathQuery = window.location.pathname + "?" + params.toString();
  props.history.push(newRelativePathQuery);
}
return (
  <div className={classes.root} style={{  height: "100%", display: "flex", flexDirection: "column"}}>
      <AppBar position="static" color="default">
        <Tabs 
          value={value}
          onChange={handleChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          aria-label="scrollable auto tabs example"
        >
        {
            tabTypes.map( (tab, index) => {
              switch (tab){
                case "tasks":
                  return <SearchTabTasksLabel key={"taskstab"} me={props.me} />;
                case "files":
                  return <SearchTabFilesLabel key={"filestab"} me={props.me}/>;
                case "credentials":
                  return <SearchTabCredentialsLabel key={"credentialstab"} me={props.me}/>;
                case "keylogs":
                  return <SearchTabKeylogsLabel key={"keylogstab"} me={props.me}/>;
                case "tokens":
                  return <SearchTabTokensLabel key={"tokenstab"} me={props.me}/>;
                case "callbacks":
                  return <SearchTabCallbacksLabel key={"callbackstab"} me={props.me}/>;
                case "artifacts":
                  return <SearchTabArtifactsLabel key={"artifactstab"} me={props.me}/>;
                case "socks":
                  return <SearchTabSocksLabel key={"sockstab"} me={props.me}/>;
                default:
                  return (null);
              }
            })
        }
        </Tabs>
      </AppBar>
      {
        tabTypes.map( (tab, index) => {
          switch(tab){
              case "tasks":
                return <SearchTabTasksPanel key={"taskspanel"} index={index} me={props.me} value={value} changeSearchParam={changeSearchParam} />
              case "callbacks":
                return <SearchTabCallbacksPanel key={"callbackspanel"} index={index} me={props.me} value={value} changeSearchParam={changeSearchParam} />
              case "files":
                return <SearchTabFilesPanel key={"filespanel"} index={index} me={props.me} value={value} changeSearchParam={changeSearchParam} />
              case "credentials":
                return <SearchTabCredentialsPanel key={"credentialspanel"} index={index} me={props.me} value={value} changeSearchParam={changeSearchParam}/>
              case "keylogs":
                return <SearchTabKeylogsPanel key={"keylogspanel"} index={index} me={props.me} value={value} changeSearchParam={changeSearchParam} />
              case "tokens":
                return <SearchTabTokensPanel key={"tokenspanel"} index={index} me={props.me} value={value}  changeSearchParam={changeSearchParam} />
              case "artifacts":
                return <SearchTabArtifactsPanel key={"artifactspanel"} index={index} me={props.me} value={value}  changeSearchParam={changeSearchParam} />
              case "socks":
                return <SearchTabSocksPanel key={"sockspanel"} index={index} me={props.me} value={value} changeSearchParam={changeSearchParam} />
              default:
                return (null);
          }
        })
      }
  </div>
)
} 
