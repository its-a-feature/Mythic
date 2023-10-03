import React from 'react';
import { EventFeedTableEvents } from './EventFeedTableEvents';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import {useTheme} from '@mui/material/styles';
import {Button} from '@mui/material';
import ButtonGroup from '@mui/material/ButtonGroup';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Grow from '@mui/material/Grow';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Pagination from '@mui/material/Pagination';
import MythicTextField from "../../MythicComponents/MythicTextField";
import SearchIcon from '@mui/icons-material/Search';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import HealingIcon from '@mui/icons-material/Healing';

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
    const handleSearchValueChange = (name, value, error) => {
        setSearch(value);
    }
    const submitSearch = (event) => {
        props.onSearch(search)
    }
    return (
        <div style={{display: "flex", flexDirection: "column", height: "100%", width: "100%"}}>
            <div>
                <div style={{"display": "inline-block", width: "100%", marginBottom: "0px", marginTop: "10px"}}>
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
                </div>
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