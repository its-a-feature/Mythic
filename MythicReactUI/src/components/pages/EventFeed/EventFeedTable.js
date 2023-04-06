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


const EventList = ({onUpdateDeleted, onUpdateLevel, onUpdateResolution, getSurroundingEvents, operationeventlog}) => {
   return (
    <div style={{overflowY: "auto", flexGrow: 1}}>
        {operationeventlog.map( o => <EventFeedTableEvents {...o} 
            key={o.id}
            onUpdateDeleted={onUpdateDeleted}
            onUpdateLevel={onUpdateLevel}
            onUpdateResolution={onUpdateResolution}
            getSurroundingEvents={getSurroundingEvents}
            />)}
    </div>
   )
};

export function EventFeedTable(props){
    const theme = useTheme();
    const dropdownAnchorRef = React.useRef(null);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const dropDownOptions = [
        {
            name: "Load More Events",
            click: props.loadMore
        },
        {
            name: "Load All Errors",
            click: props.loadNextError
        },
        {
            name: "Resolve Viewable Errors",
            click: props.resolveViewableErrors
        },
        {
            name: "Resolve All Errors",
            click: props.resolveAllErrors
        },
        {
            name: props.sortDirection === "asc" ? "Change to newest at botom" : "Change to newest at top",
            click: props.changeSortDirection
        }
    ]
    const handleMenuItemClick = (event, index) => {
        dropDownOptions[index].click();
        setDropdownOpen(false);
    };
    return (
        <div style={{display: "flex", flexDirection: "column", height: "100%", width: "100%"}}>
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main,  color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
                <Typography variant="h3" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                    Operational Event Messages
                </Typography>
                <ButtonGroup variant="contained" ref={dropdownAnchorRef} aria-label="split button" style={{marginRight: "10px", marginTop:"10px", float: "right"}} color="primary">
                    <Button size="small" color="primary" aria-controls={dropdownOpen ? 'split-button-menu' : undefined}
                        aria-expanded={dropdownOpen ? 'true' : undefined}
                        aria-haspopup="menu"
                        onClick={() => setDropdownOpen(!dropdownOpen)}>
                            Actions <ArrowDropDownIcon />
                    </Button>
                </ButtonGroup>
                <Popper open={dropdownOpen} anchorEl={dropdownAnchorRef.current} role={undefined} transition disablePortal style={{zIndex: 10}}>
                {({ TransitionProps, placement }) => (
                    <Grow
                    {...TransitionProps}
                    style={{
                        transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                    }}
                    >
                    <Paper style={{backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light, color: "white"}}>
                        <ClickAwayListener onClickAway={() => setDropdownOpen(false)}>
                        <MenuList id="split-button-menu">
                            {dropDownOptions.map((option, index) => (
                            <MenuItem
                                key={option.name}
                                onClick={(event) => handleMenuItemClick(event, index)}
                            >
                                {option.name}
                            </MenuItem>
                            ))}
                        </MenuList>
                        </ClickAwayListener>
                    </Paper>
                    </Grow>
                )}
                </Popper>
            </Paper>
            <div style={{display: "flex", flexDirection: "column", width: "100%", overflowY: "auto"}}>
                <Paper elevation={5} style={{position: "relative", flexGrow: 1, overflowY: "scroll", backgroundColor: theme.body, paddingBottom: "20px"}} variant={"elevation"}>
                    <EventList 
                        onUpdateResolution={props.onUpdateResolution}
                        onUpdateLevel={props.onUpdateLevel}
                        onUpdateDeleted={props.onUpdateDeleted}
                        getSurroundingEvents={props.getSurroundingEvents}
                        operationeventlog={props.operationeventlog}/>
                </Paper>
                
            </div>
            
        </div>
    )
}