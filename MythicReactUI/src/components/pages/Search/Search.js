import React from 'react';
import { styled } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import {useNavigate} from 'react-router-dom';
import {SearchTabTasksLabel, SearchTabTasksPanel} from './SearchTabTasks';
import {SearchTabFilesLabel, SearchTabFilesPanel} from './SearchTabFiles';
import {SearchTabCredentialsLabel, SearchTabCredentialsPanel} from './SearchTabCredentials';
import {SearchTabKeylogsLabel, SearchTabKeylogsPanel} from './SearchTabKeylog';
import {SearchTabTokensLabel, SearchTabTokensPanel} from './SearchTabTokens';
import {SearchTabCallbacksLabel, SearchTabCallbacksPanel} from './SearchTabCallbacks';
import {SearchTabArtifactsLabel, SearchTabArtifactsPanel} from './SearchTabArtifacts';
import {SearchTabSocksLabel, SearchTabSocksPanel} from './SearchTabProxies';
import {SearchTabProcessesLabel, SearchTabProcessPanel} from "./SearchTabProcesses";
import {SearchTabTagsLabel, SearchTabTagsPanel} from "./SearchTabTags";
import {SearchTabPayloadsLabel, SearchTabPayloadsPanel} from "./SearchTabPayloads";

const PREFIX = 'Search';

const classes = {
  root: `${PREFIX}-root`
};

const Root = styled('div')((
  {
    theme
  }
) => ({
  [`&.${classes.root}`]: {
    width: "100%",
  }
}));

export function Search(props){

  const navigate = useNavigate();
  const tabTypes = ["callbacks", "tasks", "payloads", "files", "credentials", "keylogs", "artifacts", "tokens", "socks", "processes", "tags"];
  var params = new URLSearchParams(window.location.search);
  var valueString = params.get("tab") ? params.get("tab") : tabTypes[0];
  var valueIndex = tabTypes.findIndex(t => t === valueString);
  var value = valueIndex === -1 ? 0 : valueIndex;

  const handleChange = (event, newValue) => {
      params.set("tab", tabTypes[newValue]);
      var newRelativePathQuery = window.location.pathname + "?" + params.toString();
      navigate(newRelativePathQuery);
  };
  const changeSearchParam = (name, value) => {
      params.set(name, value);
      var newRelativePathQuery = window.location.pathname + "?" + params.toString();
      navigate(newRelativePathQuery);
    }
  const getTabComponent = () => {
    switch(valueString){
      case "tasks":
        return <SearchTabTasksPanel key={"taskspanel"} index={value} me={props.me} value={value} changeSearchParam={changeSearchParam} />
      case "payloads":
        return <SearchTabPayloadsPanel key={"payloadspanel"} index={value} value={value} me={props.me} changeSearchParam={changeSearchParam} />
      case "callbacks":
        return <SearchTabCallbacksPanel key={"callbackspanel"} index={value} me={props.me} value={value} changeSearchParam={changeSearchParam} />
      case "files":
        return <SearchTabFilesPanel key={"filespanel"} index={value} me={props.me} value={value} changeSearchParam={changeSearchParam} />
      case "credentials":
        return <SearchTabCredentialsPanel key={"credentialspanel"} index={value} me={props.me} value={value} changeSearchParam={changeSearchParam}/>
      case "keylogs":
        return <SearchTabKeylogsPanel key={"keylogspanel"} index={value} me={props.me} value={value} changeSearchParam={changeSearchParam} />
      case "tokens":
        return <SearchTabTokensPanel key={"tokenspanel"} index={value} me={props.me} value={value}  changeSearchParam={changeSearchParam} />
      case "artifacts":
        return <SearchTabArtifactsPanel key={"artifactspanel"} index={value} me={props.me} value={value}  changeSearchParam={changeSearchParam} />
      case "socks":
        return <SearchTabSocksPanel key={"sockspanel"} index={value} me={props.me} value={value} changeSearchParam={changeSearchParam} />
      case "processes":
        return <SearchTabProcessPanel key={"processpanel"} index={value} me={props.me} value={value} changeSearchParam={changeSearchParam} />
      case "tags":
        return <SearchTabTagsPanel key={"tagspanel"} index={value} me={props.me} value={value} changeSearchParam={changeSearchParam} />
      default:
        return null;
    }
  }
    return (
      <Root className={classes.root} style={{  height: "100%", display: "flex", flexDirection: "column"}}>
          <AppBar position="static" color="default" className={"no-box-shadow"}>
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
                    case "payloads":
                      return <SearchTabPayloadsLabel key={"payloadstab"} me={props.me} />;
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
                    case "processes":
                      return <SearchTabProcessesLabel key={"processtab"} me={props.me}/>;
                    case "tags":
                      return <SearchTabTagsLabel key={"tagstab"} me={props.me} />;
                    default:
                      return null;
                  }
                })
            }
            </Tabs>
          </AppBar>
          {
            getTabComponent()
          }
      </Root>
    );
} 
