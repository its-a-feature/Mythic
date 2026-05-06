import React from 'react';
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
                <span className="mythic-response-tab-label">
                    {label}
                </span>
            }
            className="mythic-response-tab"
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
                display: value === index ? "flex" : "none",
            }
            : props.style;
    return (
        <div
            role='tabpanel'
            hidden={value !== index}
            id={`scrollable-auto-tabpanel-${index}`}
            aria-labelledby={`scrollable-auto-tab-${index}`}
            className="mythic-response-tabs-panel"
            style={style}
            {...other}>
            {<React.Fragment>{children}</React.Fragment>}
        </div>
    );
}
export function ResponseDisplayTabs({ tabs, task, expand, displayType, output }) {
    const [value, setValue] = React.useState(0);
    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    return (
        <div className="mythic-response-tabs" style={{height: expand ? "100%" : "400px"}}>
            <div className="mythic-response-tabs-bar">
                <Tabs
                    value={value}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    onChange={handleChange}
                    indicatorColor="primary"
                    textColor="inherit"
                    className="mythic-response-tabs-list"
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
            </div>
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
