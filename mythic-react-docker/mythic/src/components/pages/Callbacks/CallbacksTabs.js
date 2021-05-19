import React, {useEffect} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import {CallbacksTabsTaskingLabel, CallbacksTabsTaskingPanel} from './CallbacksTabsTasking';

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
        return callbacks.filter( c => c.id === tabID.callbackID );
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
                openTabs.map( (tab, index) => (
                    <CallbacksTabsTaskingLabel onCloseTab={onCloseTabLocal} key={"tablabel" + tab.tabID + tab.tabType} tabInfo={tab} index={index}/>
                ))
            }
            </Tabs>
          </AppBar>
      ) : (null)
      }
      {
       openTabs.map( (tab, index) => (
            <CallbacksTabsTaskingPanel maxHeight={tabHeight} style={{height:`calc(${tabHeight}vh)`, maxHeight:`calc(${tabHeight}vh)`, position: "relative", overflow: "auto"}} key={"tabpanel" + tab.tabID + tab.tabType} tabInfo={tab} value={value} index={index} callback={getCallbackData(tab)}/>
        ))
      }
    </div>
  )
}

