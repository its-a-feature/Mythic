import React, { useEffect } from 'react';
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import {
    DragDropContext,
    Droppable,
} from "@hello-pangea/dnd";
import { CallbacksTabsTaskingLabel, CallbacksTabsTaskingPanel } from './CallbacksTabsTasking';
import { CallbacksTabsFileBrowserLabel, CallbacksTabsFileBrowserPanel } from './CallbacksTabsFileBrowser';
import { CallbacksTabsProcessBrowserLabel, CallbacksTabsProcessBrowserPanel } from './CallbacksTabsProcessBrowser';
import { CallbacksTabsTaskingSplitLabel, CallbacksTabsTaskingSplitPanel} from "./CallbacksTabsTaskingSplit";
import {CallbacksTabsTaskingConsoleLabel, CallbacksTabsTaskingConsolePanel} from "./CallbacksTabsTaskingConsole";

export function CallbacksTabs({ onCloseTab, openTabs, onDragTab, onDragEnd, clickedTabId, setClickedTabId, onEditTabDescription, contextMenuOptions, me}) {

    const mountedRef = React.useRef(true);
    const [value, setValue] = React.useState(0);
    const handleChange = (event, newValue) => {
        setValue(newValue);
        //console.log(newValue);
        localStorage.setItem('clickedTab', openTabs[newValue].tabID);
        setClickedTabId(openTabs[newValue].tabID);
    };
    React.useEffect( () => {
        return() => {
            mountedRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const onCloseTabLocal = ({ tabID, index }) => {
        if (index > 0) {
            setClickedTabId(openTabs[index-1].tabID);
            setValue(index - 1);
        } else {
            setClickedTabId(openTabs[0].tabID);
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
    const [collapseTaskRequest, setCollapseTaskRequest] = React.useState({})
    const modifiedInteractContextMenuOptions = [...contextMenuOptions,
        {
            name: 'Collapse All Tasks',
            click: ({event, index}) => {
                setCollapseTaskRequest((prevState) => {
                    if(prevState[index] !== undefined){
                        prevState[index] += 1;
                        return {...prevState};
                    } else {
                        return { [index]: 0};
                    }
                });

            }
        },]

    return (
        <div style={{width: "100%", maxWidth: "100%", display: 'flex', flexDirection: 'column', flexGrow: 1, height: "100%" }}>
            <AppBar color='default' position={"static"} style={{backgroundColor: "transparent"}} >
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="callback-tabs-list" direction={"horizontal"}>
                        {(provided) => (
                            <Tabs
                                ref={provided.innerRef} {...provided.droppableProps}
                                value={value}
                                onChange={handleChange}
                                indicatorColor='primary'
                                textColor='primary'
                                variant='fullWidth'
                                scrollButtons={true}
                                style={{ }}
                                TabIndicatorProps={{style: {display: "none"}}}
                                aria-label='scrollable tabs'>
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
                                                    selectedIndex={value}
                                                    onDragTab={onDragTab}
                                                    contextMenuOptions={modifiedInteractContextMenuOptions}
                                                />
                                            );
                                        case 'interactSplit':
                                            return (
                                                <CallbacksTabsTaskingSplitLabel
                                                    onEditTabDescription={onEditTabDescription}
                                                    onCloseTab={onCloseTabLocal}
                                                    key={'tablabel' + tab.tabID + tab.tabType}
                                                    tabInfo={tab}
                                                    index={index}
                                                    me={me}
                                                    selectedIndex={value}
                                                    onDragTab={onDragTab}
                                                    contextMenuOptions={contextMenuOptions}
                                                />
                                            )
                                        case 'interactConsole':
                                            return (
                                                <CallbacksTabsTaskingConsoleLabel
                                                    onEditTabDescription={onEditTabDescription}
                                                    onCloseTab={onCloseTabLocal}
                                                    key={'tablabel' + tab.tabID + tab.tabType}
                                                    tabInfo={tab}
                                                    index={index}
                                                    me={me}
                                                    selectedIndex={value}
                                                    onDragTab={onDragTab}
                                                    contextMenuOptions={contextMenuOptions}
                                                />
                                            )
                                        case 'fileBrowser':
                                            return (
                                                <CallbacksTabsFileBrowserLabel
                                                    onEditTabDescription={onEditTabDescription}
                                                    onCloseTab={onCloseTabLocal}
                                                    key={'tablabel' + tab.tabID + tab.tabType}
                                                    tabInfo={tab}
                                                    index={index}
                                                    me={me}
                                                    selectedIndex={value}
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
                                                    selectedIndex={value}
                                                    onDragTab={onDragTab}
                                                    contextMenuOptions={contextMenuOptions}
                                                />
                                            );
                                        default:
                                            return null;
                                    }
                                })}
                            </Tabs>
                        )}
                    </Droppable>
                </DragDropContext>
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
                                collapseTaskRequest={collapseTaskRequest}
                                parentMountedRef={mountedRef}
                            />
                        );
                    case 'interactSplit':
                        return (
                            <CallbacksTabsTaskingSplitPanel
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
                    case 'interactConsole':
                        return (
                            <CallbacksTabsTaskingConsolePanel
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
                        )
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
