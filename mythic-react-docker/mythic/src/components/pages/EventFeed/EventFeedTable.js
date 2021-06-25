import React, { useEffect, useRef, memo } from 'react';
import { EventFeedTableEvents } from './EventFeedTableEvents';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import Paper from '@material-ui/core/Paper';
import {ThemeContext} from 'styled-components';
import { useContext} from 'react';
import { EventFeedTableInput } from './EventFeedTableInput';
import {Button} from '@material-ui/core';
import {VariableSizeList, areEqual } from 'react-window';

function EventFeedTableFunc(props){
    const messagesEndRef = useRef(null);
    const theme = useContext(ThemeContext);
    const [operationEventLogs, setOperationEventLogs] = React.useState([]);
    const onSubmitMessage = (message) => {
        if(message && message.length > 0){
            props.onSubmitMessage({level:"info", message});
        }
    } 
    const scrollToBottom = () => {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
      }
    useEffect( () => {
        const newEvents = props.operationeventlog.reduce( (prev, cur) => {
            if(prev.find(({ id }) => id === cur.id)){
              return [...prev];
            }
            if(operationEventLogs.length == 0){
              return [...prev, cur];
            }else{
              return [cur, ...prev];
            }
            
          }, [...operationEventLogs]);
          newEvents.sort((a,b) => (a.id > b.id) ? -1 : ((b.id > a.id) ? 1 : 0));
        setOperationEventLogs(newEvents);
    }, [props.operationeventlog])
    const getItemSize = (index) => {
        const op = operationEventLogs[operationEventLogs.length - index - 1];
        return 60 + (20 * (op["message"].match(/\n/g) || []).length);
    }
    const Row = (props) => {
        const op = operationEventLogs[operationEventLogs.length - props.index - 1];
        return (
            <EventFeedTableEvents
                style={props.style}
                onDeleteOperator={props.onDeleteOperator}
                key={"event" + op.id}
                onUpdateResolution={props.onUpdateResolution}
                onUpdateLevel={props.onUpdateLevel}
                onUpdateDeleted={props.onUpdateDeleted}
                getSurroundingEvents={props.getSurroundingEvents}
                {...op}
            />
        )
    };
    const EventList = props => {
        return (
            <VariableSizeList
                height={400}
                itemCount={operationEventLogs.length}
                width={"100%"}
                itemSize={getItemSize}
                >
                    {Row}
            </VariableSizeList>
        )
    };
    return (
    <React.Fragment>
        <Paper elevation={5} style={{backgroundColor: theme.pageHeader, marginBottom: "5px", marginTop: "10px"}} variant={"elevation"}>
            <Typography variant="h4" style={{textAlign: "left", display: "inline-block", marginLeft: "20px", color: theme.pageHeaderColor}}>
                Operational Event Messages
            </Typography>
            <Button variant="contained" color={"primary"} size="small" style={{display: "inline-block", float: "right", marginTop:"5px", marginRight:"10px"}} 
                onClick={(evt) => {evt.stopPropagation(); props.loadMore()}}>Load More Events</Button>
            <Button variant="contained" color={"primary"} size="small" style={{display: "inline-block", float: "right", marginTop:"5px", marginRight:"10px"}} 
                onClick={(evt) => {evt.stopPropagation(); props.loadNextError()}}>Load All Errors</Button>
        </Paper>
        
        <Paper elevation={5} style={{position: "relative", height: "calc(90vh)", backgroundColor: theme.body}} variant={"elevation"}>
        <List style={{height: "calc(84vh)", overflow: "auto", maxWidth: "100%", backgroundColor: theme.eventMessageBackgroundColor}} dense>
                {[...props.operationeventlog].reverse().map( (op) => (
                        <EventFeedTableEvents
                            onDeleteOperator={props.onDeleteOperator}
                            key={"event" + op.id}
                            onUpdateResolution={props.onUpdateResolution}
                            onUpdateLevel={props.onUpdateLevel}
                            onUpdateDeleted={props.onUpdateDeleted}
                            getSurroundingEvents={props.getSurroundingEvents}
                            {...op}
                        />
                    ))}
                    <div ref={messagesEndRef} />
             </List>
             
             <div ref={messagesEndRef} />
            <EventFeedTableInput onSubmitMessage={onSubmitMessage} />
        </Paper>
    </React.Fragment>
    )
}
export const EventFeedTable = React.memo(EventFeedTableFunc);
/*<EventList {...props} onUpdateResolution={props.onUpdateResolution}/>

             */