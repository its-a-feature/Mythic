import { IconButton } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import Tab from '@material-ui/core/Tab';
import React from 'react';

export function MythicTabPanel(props) {
  const { children, value, index, maxHeight, tabInfo, getCallbackData, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`scrollable-auto-tabpanel-${index}`}
      aria-labelledby={`scrollable-auto-tab-${index}`}
      
      {...other}
    >
      {value === index ? (<React.Fragment>{children}</React.Fragment>) : (null)}
    </div>
  )
}
function a11yProps(index) {
  return {
    id: `scrollable-auto-tab-${index}`,
    'aria-controls': `scrollable-auto-tabpanel-${index}`,
  };
}
export function MythicTabLabel(props){
    const {label, index, fullWidth, maxHeight, onCloseTab, selectionFollowsFocus, textColor, indicator, tabInfo, getCallbackData, ...other} = props;
    return (
        <Tab label={
            <span>
                {label}<IconButton component="div" size="small" onClick={(e) => {
                    e.stopPropagation();onCloseTab({tabID: tabInfo.tabID, index: index});
                    }} {...other}><CloseIcon /></IconButton>
            </span>
        } {...a11yProps(index)} {...other}/>
    )
}
export function MythicSearchTabLabel(props){
  const {label, index, fullWidth, maxHeight, selectionFollowsFocus, textColor, indicator, iconComponent, ...other} = props;
  return (
      <Tab label={
          <span>{label}<br/>{iconComponent}
          </span>
      } {...a11yProps(index)} {...other}/>
  )
}
