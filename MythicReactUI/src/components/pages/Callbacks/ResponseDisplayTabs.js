import React from 'react';
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import {a11yProps} from "../../MythicComponents/MythicTabPanel";
import {ResponseDisplayBrowserScriptComponent} from "./ResponseDisplay";

function ResponseDisplayTabsLabel(props) {
    const { label, index, ...other } =
        props;
    return (
        <Tab
            label={
                <span>
                    {label}
                </span>
            }
            sx={{
                '&.Mui-selected': {
                    border: "2px solid grey",
                    borderRadius: "4px",
                    //backgroundColor: 'info.main', // Color when selected
                },
            }}
            wrapped={true}
            {...a11yProps(index)}
            {...other}
        />
    );
}
function ResponseDisplayTabsPanel(props) {
    const { children, value, index,  ...other } =
        props;
    const style =
        props.style === undefined
            ? {
                display: value === index ? 'flex' : 'none',
                flexDirection: 'column',
                flexGrow: 1,
                width: '100%',
                maxWidth: '100%',
                overflowY: "auto",
            }
            : props.style;
    return (
        <div
            role='tabpanel'
            hidden={value !== index}
            id={`scrollable-auto-tabpanel-${index}`}
            aria-labelledby={`scrollable-auto-tab-${index}`}
            style={style}
            {...other}>
            {<React.Fragment>{children}</React.Fragment>}
        </div>
    );
}
export function ResponseDisplayTabs({ tabs, task, expand, displayType, output }) {
    const mountedRef = React.useRef(true);
    const [value, setValue] = React.useState(0);
    const handleChange = (event, newValue) => {
        setValue(newValue);
    };
    React.useEffect( () => {
        return() => {
            mountedRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div style={{width: "100%", maxWidth: "100%", display: 'flex', flexDirection: 'column', flexGrow: 1, height: expand ? "100%" : "400px", }}>
            <AppBar color='default' position={"static"} style={{}} >
                <Tabs
                    value={value}
                    onChange={handleChange}
                    indicatorColor='primary'
                    textColor='primary'
                    style={{ }}
                    TabIndicatorProps={{style: {
                        display: "none",
                    }}}
                    aria-label='scrollable tabs'>
                    {tabs.map((tab, index) =>  (
                        <ResponseDisplayTabsLabel
                            key={'tablabel' + task.id + index}
                            index={index}
                            label={tab.title}
                        />
                    ))}
                </Tabs>
            </AppBar>
            {tabs.map((tab, index) => (
                <ResponseDisplayTabsPanel
                    key={'tabpanel' + task.id + index}
                    value={value}
                    index={index}>
                    <ResponseDisplayBrowserScriptComponent
                        task={task} expand={expand} displayType={displayType} output={output}
                        browserScriptData={tab.content}
                    />
                </ResponseDisplayTabsPanel>

            ))}
        </div>
    );
}

