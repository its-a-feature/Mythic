import React, { useEffect } from 'react';
import makeStyles from '@mui/styles/makeStyles';
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import { CallbacksTabsTaskingLabel, CallbacksTabsTaskingPanel } from './CallbacksTabsTasking';
import { CallbacksTabsFileBrowserLabel, CallbacksTabsFileBrowserPanel } from './CallbacksTabsFileBrowser';
import { CallbacksTabsProcessBrowserLabel, CallbacksTabsProcessBrowserPanel } from './CallbacksTabsProcessBrowser';

const useStyles = makeStyles((theme) => ({
    root: {
        width: '100%',
    },
}));
export function CallbacksTabs({ onCloseTab, openTabs, onDragTab, clickedTabId, onEditTabDescription, contextMenuOptions, me}) {
    const classes = useStyles();
    const mountedRef = React.useRef(true);
    const [value, setValue] = React.useState(0);
    const handleChange = (event, newValue) => {
        setValue(newValue);
        //console.log(newValue);
        localStorage.setItem('clickedTab', openTabs[newValue].tabID);
    };
    React.useEffect( () => {
        return() => {
            mountedRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const onCloseTabLocal = ({ tabID, index }) => {
        if (index > 0) {
            setValue(index - 1);
        } else {
            setValue(0);
        }
        onCloseTab({ tabID, index });
    };
    useEffect(() => {
        //console.log(clickedTabId);
        for (let i = 0; i < openTabs.length; i++) {
            //console.log("openTabs[i]", i, openTabs[i]);
            if (openTabs[i].tabID === clickedTabId) {
                //console.log("seting value", i);
                setValue(i);
            }
        }
    }, [clickedTabId, openTabs]);
    
    return (
        <div className={classes.root} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, height: "100%" }}>
            <AppBar color='default' position='static'>
                <Tabs
                    value={value}
                    onChange={handleChange}
                    indicatorColor='primary'
                    textColor='primary'
                    variant='scrollable'
                    scrollButtons='auto'
                    style={{ maxWidth: '100%', width: '100%' }}
                    aria-label='scrollable auto tabs example'>
                    {openTabs.map((tab, index) => {
                        switch (tab.tabType) {
                            case 'interact':
                                return (
                                    <CallbacksTabsTaskingLabel
                                        onEditTabDescription={onEditTabDescription}
                                        onCloseTab={onCloseTabLocal}
                                        key={'tablabel' + tab.tabID + tab.tabType}
                                        tabInfo={tab}
                                        index={index}
                                        me={me}
                                        onDragTab={onDragTab}
                                        contextMenuOptions={contextMenuOptions}
                                    />
                                );
                            case 'fileBrowser':
                                return (
                                    <CallbacksTabsFileBrowserLabel
                                        onEditTabDescription={onEditTabDescription}
                                        onCloseTab={onCloseTabLocal}
                                        key={'tablabel' + tab.tabID + tab.tabType}
                                        tabInfo={tab}
                                        index={index}
                                        me={me}
                                        onDragTab={onDragTab}
                                        contextMenuOptions={contextMenuOptions}
                                    />
                                );
                            case 'processBrowser':
                                return (
                                    <CallbacksTabsProcessBrowserLabel
                                        onEditTabDescription={onEditTabDescription}
                                        onCloseTab={onCloseTabLocal}
                                        key={'tablabel' + tab.tabID + tab.tabType}
                                        tabInfo={tab}
                                        index={index}
                                        me={me}
                                        onDragTab={onDragTab}
                                        contextMenuOptions={contextMenuOptions}
                                    />
                                );
                            default:
                                return null;
                        }
                    })}
                </Tabs>
            </AppBar>

            {openTabs.map((tab, index) => {
                switch (tab.tabType) {
                    case 'interact':
                        return (
                            <CallbacksTabsTaskingPanel
                                style={{
                                    position: 'relative',
                                    height: '100%',
                                    maxHeight: '100%',
                                    overflow: 'auto',
                                }}
                                key={'tabpanel' + tab.tabID + tab.tabType}
                                onCloseTab={onCloseTabLocal}
                                tabInfo={tab}
                                value={value}
                                index={index}
                                me={me}
                                parentMountedRef={mountedRef}
                            />
                        );
                    case 'fileBrowser':
                        return (
                            <CallbacksTabsFileBrowserPanel
                                style={{
                                    height: '100%',
                                    maxHeight: '100%',
                                    position: 'relative',
                                    overflow: 'auto',
                                }}
                                onCloseTab={onCloseTabLocal}
                                key={'tabpanel' + tab.tabID + tab.tabType}
                                tabInfo={tab}
                                value={value}
                                index={index}
                                me={me}
                                parentMountedRef={mountedRef}
                            />
                        );
                    case 'processBrowser':
                        return (
                            <CallbacksTabsProcessBrowserPanel
                                style={{
                                    height: '100%',
                                    maxHeight: '100%',
                                    position: 'relative',
                                    overflow: 'auto',
                                }}
                                onCloseTab={onCloseTabLocal}
                                key={'tabpanel' + tab.tabID + tab.tabType}
                                tabInfo={tab}
                                value={value}
                                index={index}
                                me={me}
                                parentMountedRef={mountedRef}
                            />
                        );
                    default:
                        return null;
                }
            })}
        </div>
    );
}
