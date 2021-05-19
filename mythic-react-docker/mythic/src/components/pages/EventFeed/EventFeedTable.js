import React, { useEffect, useRef } from 'react';
import { EventFeedTableEvents } from './EventFeedTableEvents';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import Paper from '@material-ui/core/Paper';
import {ThemeContext} from 'styled-components';
import { useContext} from 'react';
import { EventFeedTableInput } from './EventFeedTableInput';

function EventFeedTableFunc(props){
    const messagesEndRef = useRef(null);
    const theme = useContext(ThemeContext);

    const onSubmitMessage = (message) => {
        if(message && message.length > 0){
            props.onSubmitMessage("info", message);
        }
    } 
    const scrollToBottom = () => {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
      }
    const subscribeToMoreMessages = () => {
        props.subscribeToMoreMessages();
    }
    useEffect( () => {
        messagesEndRef.current.scrollIntoView();
        subscribeToMoreMessages();
        
    }, []);
    return (
    <React.Fragment>
        <Typography variant="h4" style={{textAlign: "left"}}>
        Operational Event Messages
        </Typography>
        <Paper elevation={5} style={{position: "relative", height: "calc(90vh)", backgroundColor: theme.body}}>
             <List style={{height: "calc(84vh)", overflow: "auto", maxWidth: "100%", backgroundColor: theme.eventMessageBackgroundColor}} dense>
                {[...props.operationeventlog].reverse().map( (op) => (
                        <EventFeedTableEvents
                            onDeleteOperator={props.onDeleteOperator}
                            key={"event" + op.id}
                            onUpdateResolution={props.onUpdateResolution}
                            onUpdateLevel={props.onUpdateLevel}
                            onUpdateDeleted={props.onUpdateDeleted}
                            {...op}
                        />
                    ))}
                    <div ref={messagesEndRef} />
             </List>
            <EventFeedTableInput onSubmitMessage={onSubmitMessage} />
        </Paper>
    </React.Fragment>
    )
}
export const EventFeedTable = React.memo(EventFeedTableFunc);
EventFeedTable.whyDidYouRender = true;

