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
                <span className="mythic-response-tab-label min-w-0 truncate whitespace-nowrap">
                    {label}
                </span>
            }
            className="mythic-response-tab bg-neutral-1 border-subtle text-muted text-xs font-750 leading-120 flex-none min-w-0 overflow-hidden rounded"
            title={typeof label === "string" ? label : undefined}
            wrapped={false}
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
            className="mythic-response-tabs-panel p-4 flex-fill flex-column max-w-full min-h-0 min-w-0 overflow-auto w-full"
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
        <div className="mythic-response-tabs flex flex-fill flex-column max-w-full min-h-0 min-w-0 overflow-hidden w-full rounded bg-surface-raised border-subtle" style={{height: expand ? "100%" : "400px"}}>
            <div className="mythic-response-tabs-bar p-3 flex-none min-w-0 overflow-hidden bg-surface-muted border-b-subtle">
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
                    aria-label='browser script response tabs'>
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
