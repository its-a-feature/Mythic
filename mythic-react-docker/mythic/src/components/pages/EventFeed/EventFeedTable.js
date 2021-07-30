import React, { useEffect, useRef } from 'react';
import { EventFeedTableEvents } from './EventFeedTableEvents';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import {useTheme} from '@material-ui/core/styles';
import { EventFeedTableInput } from './EventFeedTableInput';
import {Button} from '@material-ui/core';
import {VariableSizeList } from 'react-window';
import Autosizer from 'react-virtualized-auto-sizer';

const Row = ({data, index, style}) => {
    const op = data[data.length - index - 1];
    return (
        <div style={style}>
            <EventFeedTableEvents
                {...op}
            />
        </div> 
    )
};

const EventList = ({onUpdateDeleted, onUpdateLevel, onUpdateResolution, getSurroundingEvents, operationeventlog}) => {
    const listRef = React.createRef();
    const getItemSize = (index) => {
        const op = operationeventlog[operationeventlog.length - index - 1];
        return 60 + (20 * (op["message"].match(/\n/g) || []).length);
    }
    const eventlogWithFunctions = operationeventlog.map( (oplog) => {
        return {onUpdateDeleted, onUpdateLevel, onUpdateResolution, getSurroundingEvents, ...oplog}
    });
    useEffect( () => {
        if(listRef.current){
            listRef.current.resetAfterIndex(0);
        }
    }, [operationeventlog])
    return (
        <Autosizer>
            {({height, width}) => (
                <VariableSizeList
                    ref={listRef}
                    height={height-50}
                    itemData={eventlogWithFunctions}
                    itemCount={operationeventlog.length}
                    width={width}
                    itemSize={getItemSize}
                    overscanCount={20}
                    >
                        {Row}
                </VariableSizeList>
            )}
        </Autosizer>
    )
};

export function EventFeedTable(props){
    const messagesEndRef = useRef(null);
    const theme = useTheme();
    
    const onSubmitMessage = (message) => {
        if(message && message.length > 0){
            props.onSubmitMessage({level:"info", message});
            scrollToBottom();
        }
    } 
    const scrollToBottom = () => {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
      }
    return (
        <React.Fragment>
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main,  color: theme.pageHeaderText.main,marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
                <Typography variant="h4" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                    Operational Event Messages
                </Typography>
                <Button variant="contained" color={"primary"} size="small" style={{display: "inline-block", float: "right", marginTop:"5px", marginRight:"10px"}} 
                    onClick={(evt) => {evt.stopPropagation(); props.loadMore()}}>Load More Events</Button>
                <Button variant="contained" color={"primary"} size="small" style={{display: "inline-block", float: "right", marginTop:"5px", marginRight:"10px"}} 
                    onClick={(evt) => {evt.stopPropagation(); props.loadNextError()}}>Load All Errors</Button>
            </Paper>
            
            <Paper elevation={5} style={{position: "relative", height: "calc(90vh)", backgroundColor: theme.body}} variant={"elevation"}>
                <EventList 
                    onUpdateResolution={props.onUpdateResolution}
                    onUpdateLevel={props.onUpdateLevel}
                    onUpdateDeleted={props.onUpdateDeleted}
                    getSurroundingEvents={props.getSurroundingEvents}
                    operationeventlog={props.operationeventlog}/>
                <div ref={messagesEndRef} />
                <EventFeedTableInput onSubmitMessage={onSubmitMessage} />
            </Paper>
        </React.Fragment>
    )
}