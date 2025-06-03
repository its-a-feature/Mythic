import React, { useEffect } from 'react';
import { CallbacksTabs } from './CallbacksTabs';
import TocIcon from '@mui/icons-material/Toc';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { CallbacksTop } from './CallbacksTop';
import Split from 'react-split';
import PhoneForwardedIcon from '@mui/icons-material/PhoneForwarded';
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {ImportCallbackConfigDialog} from "./ImportCallbackConfigDialog";
import {reorder} from "../../MythicComponents/MythicDraggableList";
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";

export const getCallbackIdFromClickedTab = (tabId) => {
    if(tabId === null || tabId === undefined){return 0}
    if(tabId === ""){return 0}
    if(tabId.includes("fileBrowser")) {
        return Number(tabId.split("fileBrowser")[0]);
    }else if(tabId.includes("interact")){
        return Number(tabId.split("interact")[0]);
    }else if(tabId.includes("processBrowser")){
        return Number(tabId.split("processBrowser")[0]);
    } else {
        console.log("unknown tab type", tabId);
        return 0;
    }
}

export function Callbacks({me}) {
    const [openCallbackImport, setOpenCallbackImport] = React.useState(false);
    const [topDisplay, setTopDisplay] = React.useState('table');
    const [openTabs, setOpenTabs] = React.useState([]);
    const [clickedTabId, setClickedTabIdValue] = React.useState('');
    const openTabRef = React.useRef([]);
    const callbackTableGridRef = React.useRef();
    const [callbackTableSplitSizes, setCallbackTableSplitSizes] = React.useState([30, 70]);
    const setClickedTabId = (tabID) => {
        if(callbackTableGridRef.current){
            let tabIDNumber = getCallbackIdFromClickedTab(tabID);
            let rowIndex = callbackTableGridRef.current?.props?.itemData?.items?.findIndex((e) => {
                return e[0]?.props?.rowData?.id === tabIDNumber
            });
            if(rowIndex >= 0){
                callbackTableGridRef.current?.scrollToItem({rowIndex: rowIndex, align: "end", columnIndex: 0})
            }
        }
        setClickedTabIdValue(tabID);
    }
    useEffect(() => {
        const oldTabs = localStorage.getItem('openTabs');
        if (oldTabs !== undefined && oldTabs !== null) {
            try {
                const tabs = JSON.parse(oldTabs);
                setOpenTabs(tabs);
                const lastClickedTab = localStorage.getItem('clickedTab');
                if (lastClickedTab !== undefined && lastClickedTab !== null) {
                    setClickedTabId(lastClickedTab);
                }
            } catch (error) {
                console.log('failed to parse oldTabs', error);
            }
        }
        const oldSizes = localStorage.getItem("callbackTableSplitSizes");
        if (oldSizes) {
            try{
                setCallbackTableSplitSizes(JSON.parse(oldSizes));
            }catch(error){
                console.log("failed to parse callback table split sizes");
            }
        }
    }, []);
    useEffect( () => {
        openTabRef.current = openTabs;
    }, [openTabs])
    const onOpenTab = React.useRef( (tabData) => {
        let found = false;
        openTabRef.current = openTabRef.current.map( (tab) => {
            if(tab.tabID === tabData.tabID){
                return {...tabData};
            }
            return {...tab};
        })
        openTabRef.current.forEach((tab) => {
            if (tab.tabID === tabData.tabID) found = true;
        });
        //console.log("found is", found, tabData.tabID, tabData.tabType, tabData.callbackID, openTabs);
        if (!found) {
            const tabs = [...openTabRef.current, { ...tabData }];
            localStorage.setItem('openTabs', JSON.stringify(tabs));
            setOpenTabs(tabs);
        } else {
            setOpenTabs([...openTabRef.current]);
        }
        localStorage.setItem('clickedTab', tabData.tabID);
        setClickedTabId(tabData.tabID);
        
    });
    const onOpenTabs = React.useRef( (tabData) => {
        let currentTabs = [...openTabRef.current];
        for(let i = 0; i < tabData.length; i++){
            let found = false;
            currentTabs.forEach((tab) => {
                if (tab.tabID === tabData[i].tabID) found = true;
            });
            if (!found) {
                currentTabs = [...currentTabs, { ...tabData[i] }];
            }
        }
        localStorage.setItem('openTabs', JSON.stringify(currentTabs));
        setOpenTabs(currentTabs);
        localStorage.setItem('clickedTab', tabData[0].tabID);
        setClickedTabId(tabData[0].tabID);

    });
    const onEditTabDescription = React.useCallback( (tabInfo, description) => {
        const tabs = openTabs.map((t) => {
            if (t.tabID === tabInfo.tabID) {
                return { ...t, customDescription: description };
            } else {
                return { ...t };
            }
        });
        setOpenTabs(tabs);
        localStorage.setItem('openTabs', JSON.stringify(tabs));
    }, [openTabs]);
    const onCloseTab = React.useCallback( ({ tabID, index }) => {
        const tabSet = openTabs.filter((tab) => {
            return tab.tabID !== tabID;
        });
        localStorage.setItem('openTabs', JSON.stringify(tabSet));
        setOpenTabs(tabSet);
        if(tabSet.length === 0){
            setClickedTabId("0");
            localStorage.removeItem("clickedTab");
        }
    }, [openTabs]);
    const onDragTab = ({selected, toLeftOf}) => {
        //console.log("onDragTab in CallbacksTabs", selected, toLeftOf);
        let selectedPieces = selected.split("-");
        let targetTabIndex = selectedPieces[selectedPieces.length -1] -0;
        let newLocationPieces = toLeftOf.split("-");
        let newLocation = newLocationPieces[newLocationPieces.length -1] -0;
        if(newLocation > targetTabIndex){
            newLocation = newLocation -1;
        }
        //console.log("from index", targetTabIndex, "to index", newLocation);
        if(targetTabIndex === newLocation){
            return;
        }
        let newOpenTabList = [];
        for(let i = 0; i < openTabs.length; i++){
            if(i === targetTabIndex){
                //console.log("matched targetTabIndex")
                continue;
            } else if(i === newLocation){
                //console.log("matched new location")
                if(newLocation > targetTabIndex){
                    newOpenTabList.push(openTabs[i]);
                    newOpenTabList.push(openTabs[targetTabIndex]);
                }else{
                    newOpenTabList.push(openTabs[targetTabIndex]);
                    newOpenTabList.push(openTabs[i]);
                }

                setClickedTabId(openTabs[targetTabIndex].tabID)
            } else {
                newOpenTabList.push(openTabs[i]);
            }
        }
        setOpenTabs(newOpenTabList);
        //openTabRef.current = newOpenTabList;
        localStorage.setItem('openTabs', JSON.stringify(newOpenTabList));
    }
    const closeAllTabs = () => {
        setOpenTabs([]);
        localStorage.setItem('openTabs', JSON.stringify([]));
    }
    const closeAllExceptThisTab = ({event, index}) => {
        const newOpenTabs = [openTabs[index]];
        setOpenTabs(newOpenTabs);
        localStorage.setItem('openTabs', JSON.stringify(newOpenTabs));
    }
    const contextMenuOptions = [
        {
            name: 'Close All Tabs', 
            click: ({event}) => {
                closeAllTabs();
            }
        },
        {
            name: 'Close All Other Tabs', 
            click: ({event, index}) => {
                closeAllExceptThisTab({event, index});
            }
        },
    ];
    const onDragEnd = ({ destination, source }) => {
        // dropped outside the list
        if (!destination) return;
        const newItems = reorder(openTabs, source.index, destination.index);
        setOpenTabs(newItems);
        localStorage.setItem('openTabs', JSON.stringify(newItems));
    };
    return (
        <>
            <Split direction="vertical"
                   sizes={callbackTableSplitSizes}
                   minSize={[0,0]}
                   onDragEnd={(sizes) => localStorage.setItem('callbackTableSplitSizes', JSON.stringify(sizes))}
                   style={{ height: "100%" }}>
                <div style={{display: "flex", flexDirection: "row-reverse"}}>
                    <Paper elevation={5} style={{width: "30px", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden",
                    backgroundColor: "transparent"}}>
                        {topDisplay !== 'table' &&
                            <MythicStyledTooltip title={"Table View"}>
                                <IconButton onClick={() =>setTopDisplay("table")}>
                                    <TocIcon />
                                </IconButton>
                            </MythicStyledTooltip>
                        }
                        {topDisplay !== 'graph' &&
                            <MythicStyledTooltip title={"Graph View"} >
                                <IconButton onClick={() =>setTopDisplay("graph")}>
                                    <AssessmentIcon />
                                </IconButton>
                            </MythicStyledTooltip>
                        }
                        {openCallbackImport &&
                            <MythicDialog fullWidth={true} maxWidth="sm" open={openCallbackImport}
                                          onClose={()=>{setOpenCallbackImport(false);}}
                                          innerDialog={<ImportCallbackConfigDialog onClose={()=>{setOpenCallbackImport(false);}} />}
                            />
                        }
                        <MythicStyledTooltip title={"Import previously exported Callbacks"} >
                            <IconButton onClick={() =>setOpenCallbackImport(true)}>
                                <PhoneForwardedIcon />
                            </IconButton>
                        </MythicStyledTooltip>
                    </Paper>
                    <CallbacksTop
                        callbackTableGridRef={callbackTableGridRef}
                        topDisplay={topDisplay}
                        onOpenTab={onOpenTab.current}
                        onOpenTabs={onOpenTabs.current}
                        me={me} clickedTabId={clickedTabId}/>
                </div>
                <div >
                    <CallbacksTabs
                        onCloseTab={onCloseTab}
                        onEditTabDescription={onEditTabDescription}
                        key={'callbackstabs'}
                        clickedTabId={clickedTabId}
                        setClickedTabId={setClickedTabId}
                        openTabs={openTabs}
                        onDragTab={onDragTab}
                        me={me}
                        onDragEnd={onDragEnd}
                        contextMenuOptions={contextMenuOptions}
                    />
                </div>
            </Split>
        </>
    );
}
/*
function SpeedDialWrapperPreMemo({ setTopDisplay }) {
    const [open, setOpen] = React.useState(false);
    const [openCallbackImport, setOpenCallbackImport] = React.useState(false);
    const actions = React.useMemo(
        () => [
            {
                icon: <TocIcon />,
                name: 'Table layout',
                onClick: () => {
                    setTopDisplay('table');
                },
            },
            {
                icon: <AssessmentIcon />,
                name: 'Graph layout',
                onClick: () => {
                    setTopDisplay('graph');
                },
            },
            {
                icon: <PhoneForwardedIcon />,
                name: "Import Callback",
                onClick: () => {
                    setOpenCallbackImport(true);
                }
            }
        ],
        [] // eslint-disable-line react-hooks/exhaustive-deps
    );
    return (
        <React.Fragment>
            {openCallbackImport &&
                <MythicDialog fullWidth={true} maxWidth="sm" open={openCallbackImport}
                              onClose={()=>{setOpenCallbackImport(false);}}
                              innerDialog={<ImportCallbackConfigDialog onClose={()=>{setOpenCallbackImport(false);}} />}
                />
            }
            <StyledSpeedDial
                ariaLabel='SpeedDial example'
                className={classes.speedDial}
                icon={<SpeedDialIcon />}
                onClose={() => {
                    setOpen(false);
                }}
                onOpen={() => {
                    setOpen(true);
                }}
                FabProps={{
                    color: 'info', size: "small", variant: "extended",
                    sx: {
                        height: "25px", minWidth: "unset", width: "25px"
                    }
                }}
                open={open}
                style={{ marginTop:"10px", marginRight: "20px"}}
                direction='down'>
                {actions.map((action) => (
                    <SpeedDialAction
                        arrow
                        className={classes.speedDialAction}
                        key={action.name}
                        TooltipClasses={{
                            ".MuiTooltip-tooltip": classes.tooltip,
                            ".MuiTooltip-tooltipArrow": classes.arrow,
                        }}
                        icon={action.icon}
                        tooltipTitle={action.name}
                        onClick={action.onClick}
                    />
                ))}
            </StyledSpeedDial>
        </React.Fragment>
    );
}
const SpeedDialWrapper = React.memo(SpeedDialWrapperPreMemo);

 */