import React from 'react';
import { EventFeedTableEvents } from './EventFeedTableEvents';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import HealingIcon from '@mui/icons-material/Healing';
import MenuItem from '@mui/material/MenuItem';
import {alertCount} from "../../../cache";
import {levelOptions} from "./EventFeed";
import {MythicPageBody} from "../../MythicComponents/MythicPageBody";
import {MythicPageHeader, MythicPageHeaderChip} from "../../MythicComponents/MythicPageHeader";
import {MythicTablePagination} from "../../MythicComponents/MythicTablePagination";
import {MythicSearchField, MythicTableToolbar, MythicTableToolbarGroup, MythicToolbarButton, MythicToolbarSelect} from "../../MythicComponents/MythicTableToolbar";
import {MythicEmptyState} from "../../MythicComponents/MythicStateDisplay";

const EventList = ({onUpdateLevel, onUpdateResolution, operationeventlog}) => {
   return (
    <div style={{ flexGrow: 1}}>
        {operationeventlog.length === 0 ? (
            <MythicEmptyState
                compact
                title="No event feed entries"
                description="Events matching the current level and search will appear here."
                minHeight={180}
            />
        ) : (
            operationeventlog.map( o => <EventFeedTableEvents {...o}
                key={o.id}
                onUpdateLevel={onUpdateLevel}
                onUpdateResolution={onUpdateResolution}
                />)
        )}
    </div>
   )
};

export function EventFeedTable(props){
    const [search, setSearch] = React.useState("");
    const [level, setLevel] = React.useState("info");


    const handleSearchValueChange = (name, value, error) => {
        setSearch(value);
    }
    const handleLevelValueChange = (event) => {
        setLevel(event.target.value);
        props.onLevelChange(event.target.value);
    }
    const submitSearch = (event) => {
        props.onSearch(search)
    }
    React.useEffect( () => {
        if( alertCount() > 0){
            setLevel("warning (unresolved)");
            props.onLevelChange("warning (unresolved)");
        }
    }, []);
    const visibleEventsLabel = props.operationeventlog.length === 1 ? "1 shown" : `${props.operationeventlog.length} shown`;
    const totalEventsLabel = props.pageData.totalCount === 1 ? "1 total" : `${props.pageData.totalCount} total`;
    return (
        <MythicPageBody>
            <MythicPageHeader
                title={"Event Feed"}
                subtitle={"Review operation messages, warnings, and service events as they arrive."}
                meta={
                    <>
                        <MythicPageHeaderChip label={level} />
                        <MythicPageHeaderChip label={visibleEventsLabel} />
                        <MythicPageHeaderChip label={totalEventsLabel} />
                    </>
                }
                actions={
                    <>
                        <MythicToolbarButton onClick={props.resolveViewableErrors} color="success" variant="outlined" startIcon={<AutoFixHighIcon />}>
                            Resolve Viewable
                        </MythicToolbarButton>
                        <MythicToolbarButton onClick={props.resolveAllErrors} color="success" variant="outlined" startIcon={<HealingIcon />}>
                            Resolve All
                        </MythicToolbarButton>
                    </>
                }
            />
            <MythicTableToolbar>
                <MythicTableToolbarGroup grow>
                    <MythicSearchField value={search} onChange={handleSearchValueChange} onEnter={submitSearch} onSearch={submitSearch} />
                </MythicTableToolbarGroup>
                <MythicTableToolbarGroup>
                    <MythicToolbarSelect
                        value={level}
                        onChange={handleLevelValueChange}
                    >
                        {
                            levelOptions.map((opt, i) => (
                                <MenuItem key={"levelFilter" + opt} value={opt}>{opt}</MenuItem>
                            ))
                        }
                    </MythicToolbarSelect>
                </MythicTableToolbarGroup>
            </MythicTableToolbar>

            <div style={{display: "flex", flexDirection: "column", overflowY: "auto", flexGrow: 1, overflowX: "Hidden"}}>
                    <EventList 
                        onUpdateResolution={props.onUpdateResolution}
                        onUpdateLevel={props.onUpdateLevel}
                        operationeventlog={props.operationeventlog}/>
            </div>
            <MythicTablePagination totalCount={props.pageData.totalCount} fetchLimit={props.pageData.fetchLimit} onChange={props.onChangePage} />
        </MythicPageBody>
    );
}
