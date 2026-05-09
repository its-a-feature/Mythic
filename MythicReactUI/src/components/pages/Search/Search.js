import React from 'react';
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
import {SearchTabCustomBrowserLabel, SearchTabCustomBrowserPanel} from "./SearchTabCustomBrowsers";
import {MythicPageBody} from "../../MythicComponents/MythicPageBody";
import {MythicPageHeader, MythicPageHeaderChip} from "../../MythicComponents/MythicPageHeader";

export function Search(props){

  const navigate = useNavigate();
  const tabTypes = ["callbacks", "tasks", "payloads", "files", "credentials", "keylogs", "artifacts", "tokens", "proxies", "processes", "tags", "browsers"];
  const tabLabels = {
    artifacts: "Artifacts",
    browsers: "Browser scripts",
    callbacks: "Callbacks",
    credentials: "Credentials",
    files: "Files",
    keylogs: "Keylogs",
    payloads: "Payloads",
    processes: "Processes",
    proxies: "proxies",
    tags: "Tags",
    tasks: "Tasks",
    tokens: "Tokens",
  };
  var params = new URLSearchParams(window.location.search);
  var valueString = params.get("tab") ? params.get("tab") : tabTypes[0];
  var valueIndex = tabTypes.findIndex(t => t === valueString);
  var value = valueIndex === -1 ? 0 : valueIndex;
  const currentTab = valueIndex === -1 ? tabTypes[0] : valueString;
  const currentTabLabel = tabLabels[currentTab] || currentTab;

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
    switch(currentTab){
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
      case "proxies":
        return <SearchTabSocksPanel key={"proxiespanel"} index={value} me={props.me} value={value} changeSearchParam={changeSearchParam} />
      case "processes":
        return <SearchTabProcessPanel key={"processpanel"} index={value} me={props.me} value={value} changeSearchParam={changeSearchParam} />
      case "tags":
        return <SearchTabTagsPanel key={"tagspanel"} index={value} me={props.me} value={value} changeSearchParam={changeSearchParam} />
      case "browsers":
        return <SearchTabCustomBrowserPanel key={"browserpanel"} index={value} me={props.me} value={value} changeSearchParam={changeSearchParam} />
      default:
        return null;
    }
    }
    return (
      <MythicPageBody>
          <MythicPageHeader
            title={"Search"}
            subtitle={"Pivot across callbacks, tasks, files, payloads, credentials, and operation artifacts."}
            meta={
              <>
                <MythicPageHeaderChip label={currentTabLabel} />
                <MythicPageHeaderChip label={`${tabTypes.length} search views`} />
              </>
            }
          />
          <AppBar
            position="static"
            color="default"
            className={"no-box-shadow"}
            sx={(theme) => ({
              backgroundColor: theme.surfaces?.muted || theme.palette.background.paper,
              border: `1px solid ${theme.table?.borderSoft || theme.borderColor}`,
              borderRadius: `${theme.shape.borderRadius}px`,
              overflow: "hidden",
            })}
          >
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
                    case "proxies":
                      return <SearchTabSocksLabel key={"sockstab"} me={props.me}/>;
                    case "processes":
                      return <SearchTabProcessesLabel key={"processtab"} me={props.me}/>;
                    case "tags":
                      return <SearchTabTagsLabel key={"tagstab"} me={props.me} />;
                    case "browsers":
                      return <SearchTabCustomBrowserLabel key={"browsers"} me={props.me}/>;
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
      </MythicPageBody>
    );
} 
