import React, {useEffect} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import {CallbacksTabsTaskingLabel, CallbacksTabsTaskingPanel} from './CallbacksTabsTasking';
import {CallbacksTabsFileBrowserLabel, CallbacksTabsFileBrowserPanel} from './CallbacksTabsFileBrowser';
import {CallbacksTabsProcessBrowserLabel, CallbacksTabsProcessBrowserPanel} from './CallbacksTabsProcessBrowser';

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    backgroundColor: theme.palette.background.paper,
  },
}));

export function CallbacksTabs({callbacks, onCloseTab, openTabs, clickedTabId, maxHeight, clearSelectedTab, tabHeight}) {
    const classes = useStyles();
    const [value, setValue] = React.useState(0);
    const handleChange = (event, newValue) => {
        setValue(newValue);
    };
    const getCallbackData = (tabID) => {
        return callbacks.find( c => c.id === tabID.callbackID );
    }
    const onCloseTabLocal = ({tabID, index}) =>{
        if(index > 0){
            setValue(index-1);
        }else{
            setValue(0);
        }
        onCloseTab({tabID, index});
    }
    useEffect( () => {
        for(let i = 0; i < openTabs.length; i++){     
            if( openTabs[i].tabID === clickedTabId ){
                setValue(i);
            }
        }
        clearSelectedTab();
    }, [clickedTabId, openTabs, clearSelectedTab]);
  return (
    <div className={classes.root} style={{maxHeight: maxHeight, height: maxHeight, background: "transparent"}}>
    {openTabs.length > 0 ? (
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
                openTabs.map( (tab, index) => {
                  switch (tab.tabType){
                    case "interact":
                      return <CallbacksTabsTaskingLabel onCloseTab={onCloseTabLocal} key={"tablabel" + tab.tabID + tab.tabType} tabInfo={tab} index={index} callback={getCallbackData(tab)}/>;
                    case "fileBrowser":
                      return <CallbacksTabsFileBrowserLabel onCloseTab={onCloseTabLocal} key={"tablabel" + tab.tabID + tab.tabType} tabInfo={tab} index={index} callback={getCallbackData(tab)}/>;
                    case "processBrowser":
                      return <CallbacksTabsProcessBrowserLabel onCloseTab={onCloseTabLocal} key={"tablabel" + tab.tabID + tab.tabType} tabInfo={tab} index={index} callback={getCallbackData(tab)}/>;
                    default:
                      return (null);
                  }
                })
            }
            </Tabs>
          </AppBar>
      ) : (null)
      }
      {
       openTabs.map( (tab, index) => {
         switch(tab.tabType){
            case "interact":
             return <CallbacksTabsTaskingPanel maxHeight={tabHeight} style={{height:`calc(${tabHeight}vh)`, maxHeight:`calc(${tabHeight}vh)`, position: "relative", overflow: "auto"}} key={"tabpanel" + tab.tabID + tab.tabType} tabInfo={tab} value={value} index={index} callback={getCallbackData(tab)} getCallbackData={getCallbackData}/>
            case "fileBrowser":
              return <CallbacksTabsFileBrowserPanel maxHeight={tabHeight} style={{height:`calc(${tabHeight}vh)`, maxHeight:`calc(${tabHeight}vh)`, position: "relative", overflow: "auto"}} key={"tabpanel" + tab.tabID + tab.tabType} tabInfo={tab} value={value} index={index} callback={getCallbackData(tab)} getCallbackData={getCallbackData}/>
            case "processBrowser":
              return <CallbacksTabsProcessBrowserPanel maxHeight={tabHeight} style={{height:`calc(${tabHeight}vh)`, maxHeight:`calc(${tabHeight}vh)`, position: "relative", overflow: "auto"}} key={"tabpanel" + tab.tabID + tab.tabType} tabInfo={tab} value={value} index={index} callback={getCallbackData(tab)} getCallbackData={getCallbackData}/>
            default:
              return (null);
         }
       })
      }
    </div>
  )
}

