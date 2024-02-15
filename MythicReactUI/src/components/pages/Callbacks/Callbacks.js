import React, { useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { CallbacksTabs } from './CallbacksTabs';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import TocIcon from '@mui/icons-material/Toc';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { CallbacksTop } from './CallbacksTop';
import Split from 'react-split';
import PhoneForwardedIcon from '@mui/icons-material/PhoneForwarded';
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {ImportCallbackConfigDialog} from "./ImportCallbackConfigDialog";

const PREFIX = 'Callbacks';

const classes = {
    root: `${PREFIX}-root`,
    speedDial: `${PREFIX}-speedDial`,
    speedDialAction: `${PREFIX}-speedDialAction`,
    tooltip: `${PREFIX}-tooltip`,
    arrow: `${PREFIX}-arrow`
};

const StyledSpeedDial = styled(SpeedDial)(({theme}) => ({
    [`&.${classes.speedDial}`]: {
        position: 'absolute',
        '&.MuiSpeedDial-directionUp, &.MuiSpeedDial-directionLeft': {
            bottom: theme.spacing(2),
            right: theme.spacing(2),
        },
        '&.MuiSpeedDial-directionDown, &.MuiSpeedDial-directionRight': {
            top: theme.spacing(2),
            right: theme.spacing(2),
        },
        zIndex: 4,
    },

    [`& .${classes.speedDialAction}`]: {
        backgroundColor: theme.palette.speedDialAction,
    },

    [`& .${classes.tooltip}`]: {
        backgroundColor: theme.palette.background.contrast,
        color: theme.palette.text.contrast,
        boxShadow: theme.shadows[1],
        fontSize: 13,
    },

    [`& .${classes.arrow}`]: {
        color: theme.palette.background.contrast,
    }
}));


export function Callbacks({me}) {
    const [topDisplay, setTopDisplay] = React.useState('table');
    const [openTabs, setOpenTabs] = React.useState([]);
    const [clickedTabId, setClickedTabId] = React.useState('');
    const openTabRef = React.useRef([]);
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
    }, []);
    useEffect( () => {
        openTabRef.current = openTabs;
    }, [openTabs])
    const onOpenTab = React.useRef( (tabData) => {
        let found = false;
        openTabRef.current.forEach((tab) => {
            if (tab.tabID === tabData.tabID) found = true;
        });
        //console.log("found is", found, tabData.tabID, tabData.tabType, tabData.callbackID, openTabs);
        if (!found) {
            const tabs = [...openTabRef.current, { ...tabData }];
            localStorage.setItem('openTabs', JSON.stringify(tabs));
            setOpenTabs(tabs);
        }
        localStorage.setItem('clickedTab', tabData.tabID);
        setClickedTabId(tabData.tabID);
        
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
    return (
        <>
            <SpeedDialWrapper setTopDisplay={setTopDisplay} />
            <Split direction="vertical" sizes={[30, 70]} minSize={[0,0]} style={{ height: "100%" }}>
                <div className="bg-gray-base">
                    <CallbacksTop topDisplay={topDisplay} onOpenTab={onOpenTab.current} me={me}/>
                </div>
                <div className="bg-gray-mid">
                    <CallbacksTabs
                        onCloseTab={onCloseTab}
                        onEditTabDescription={onEditTabDescription}
                        key={'callbackstabs'}
                        clickedTabId={clickedTabId}
                        openTabs={openTabs}
                        onDragTab={onDragTab}
                        me={me}
                        contextMenuOptions={contextMenuOptions}
                    />
                </div>
            </Split>
        </>
    );
}
/*
<div style={{ maxWidth: '100%', height: '100%', flexDirection: 'column'}}>

            <React.Fragment>
                <SpeedDialWrapper setTopDisplay={setTopDisplay} heights={heights} onSubmitHeights={onSubmitHeights} />
                <div style={{flexGrow: 1, flexBasis: heights.top, height: heights.top }}>
                    <CallbacksTop topDisplay={topDisplay} onOpenTab={onOpenTab.current} heights={heights} me={me}/>
                </div>
                <div style={{ flexGrow: 1, flexBasis: heights.bottom, height: heights.bottom }}>
                    <CallbacksTabs
                        onCloseTab={onCloseTab}
                        onEditTabDescription={onEditTabDescription}
                        tabHeight={heights.bottom}
                        maxHeight={heights.bottom}
                        key={'callbackstabs'}
                        clickedTabId={clickedTabId}
                        openTabs={openTabs}
                        onDragTab={onDragTab}
                        me={me}
                        contextMenuOptions={contextMenuOptions}
                    />
                </div>
            </React.Fragment>
        </div>
 */
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
                FabProps={{ color: 'info', size: "small", variant: "extended" }}
                open={open}
                style={{ marginTop:"35px" }}
                direction='down'>
                {actions.map((action) => (
                    <SpeedDialAction
                        arrow
                        className={classes.speedDialAction}
                        key={action.name}
                        TooltipClasses={{ ".MuiTooltip-tooltip": classes.tooltip,
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