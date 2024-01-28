import React from 'react';
import { EventFeedTableEvents } from './EventFeedTableEvents';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import {useTheme} from '@mui/material/styles';
import Pagination from '@mui/material/Pagination';
import MythicTextField from "../../MythicComponents/MythicTextField";
import SearchIcon from '@mui/icons-material/Search';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import HealingIcon from '@mui/icons-material/Healing';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Grid from '@mui/material/Grid';

const EventList = ({onUpdateLevel, onUpdateResolution, operationeventlog}) => {
   return (
    <div style={{ flexGrow: 1}}>
        {operationeventlog.map( o => <EventFeedTableEvents {...o} 
            key={o.id}
            onUpdateLevel={onUpdateLevel}
            onUpdateResolution={onUpdateResolution}
            />)}
    </div>
   )
};

export function EventFeedTable(props){
    const theme = useTheme();
    const [search, setSearch] = React.useState("");
    const [level, setLevel] = React.useState("All Levels");
    const levelOptions = [
        "All Levels", "warning", "info", "debug"
    ];

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
    return (
        <div style={{display: "flex", flexDirection: "column", height: "100%", width: "100%"}}>
            <div>
                <Grid container spacing={2} style={{paddingTop: "10px", maxWidth: "100%"}}>
                    <Grid item xs={10}>
                        <MythicTextField placeholder="Search..." value={search}
                                         onChange={handleSearchValueChange} onEnter={submitSearch} name="Search..." InputProps={{
                            endAdornment:
                                <React.Fragment>
                                    <Tooltip title="Search">
                                        <IconButton onClick={submitSearch} size="large"><SearchIcon style={{color: theme.palette.info.main}}/></IconButton>
                                    </Tooltip>
                                    <Tooltip title="Resolve Viewable Errors">
                                        <IconButton onClick={props.resolveViewableErrors} size="large"><AutoFixHighIcon style={{color: theme.palette.success.main}}/></IconButton>
                                    </Tooltip>
                                    <Tooltip title="Resolve All Errors">
                                        <IconButton onClick={props.resolveAllErrors} size="large"><HealingIcon style={{color: theme.palette.success.main}}/></IconButton>
                                    </Tooltip>
                                </React.Fragment>,
                            style: {padding: 0}
                        }}/>
                    </Grid>
                    <Grid item xs={2}>
                        <Select
                            style={{width: "100%"}}
                            value={level}
                            onChange={handleLevelValueChange}
                        >
                            {
                                levelOptions.map((opt, i) => (
                                    <MenuItem key={"levelFilter" + opt} value={opt}>{opt}</MenuItem>
                                ))
                            }
                        </Select>
                    </Grid>
                </Grid>
            </div>
            <div style={{display: "flex", flexDirection: "column", width: "100%", overflowY: "auto"}}>
                <Paper elevation={5} style={{position: "relative", flexGrow: 1, overflowY: "scroll", backgroundColor: theme.body, paddingBottom: "20px"}} variant={"elevation"}>
                    <EventList 
                        onUpdateResolution={props.onUpdateResolution}
                        onUpdateLevel={props.onUpdateLevel}
                        operationeventlog={props.operationeventlog}/>
                </Paper>
                
            </div>
            <div style={{background: "transparent", display: "flex", justifyContent: "center", alignItems: "center", paddingTop: "5px", paddingBottom: "10px"}}>
                <Pagination count={Math.ceil(props.pageData.totalCount / props.pageData.fetchLimit)} variant="outlined" color="primary" boundaryCount={1}
                            siblingCount={1} onChange={props.onChangePage} showFirstButton={true} showLastButton={true} style={{padding: "20px"}}/>
                <Typography style={{paddingLeft: "10px"}}>Total Results: {props.pageData.totalCount}</Typography>
            </div>
        </div>
    )
}