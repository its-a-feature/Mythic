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

export function CallbacksTabs(props) {
    const classes = useStyles();
    const [value, setValue] = React.useState(0);
    const handleChange = (event, newValue) => {
        setValue(newValue);
    };
    const getCallbackData = (tabID) => {
        return props.callbacks.filter( c => c.id === tabID.callbackID );
    }
    const onCloseTab = ({tabID, index}) =>{
        if(index > 0){
            setValue(index-1);
        }else{
            setValue(0);
        }
        props.onCloseTab({tabID, index});
    }
    useEffect( () => {
        for(let i = 0; i < props.openTabs.length; i++){     
            if( props.openTabs[i].tabID === props.clickedTabId ){
                setValue(i);
            }
        }
        props.clearSelectedTab();
    }, [props.clickedTabId, props.openTabs]);
  return (
    <div className={classes.root} style={{maxHeight: props.maxHeight, height: props.maxHeight, background: "transparent"}}>
    {props.openTabs.length > 0 ? (
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
                props.openTabs.map( (tab, index) => (
                    <CallbacksTabsTaskingLabel onCloseTab={onCloseTab} key={"tablabel" + tab.tabID + tab.tabType} tabInfo={tab} index={index}/>
                ))
            }
            </Tabs>
          </AppBar>
      ) : (null)
      }
      {
        props.openTabs.map( (tab, index) => (
            <CallbacksTabsTaskingPanel maxHeight={props.tabHeight} style={{height:`calc(${props.tabHeight}vh)`, maxHeight:`calc(${props.tabHeight}vh)`, position: "relative", overflow: "auto"}} key={"tabpanel" + tab.tabID + tab.tabType} tabInfo={tab} value={value} index={index} callback={getCallbackData(tab)}/>
        ))
      }
    </div>
  )
}

