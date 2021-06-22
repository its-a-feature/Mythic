import React from 'react';
import SendIcon from '@material-ui/icons/Send';
import IconButton from '@material-ui/core/IconButton';
import {TextField} from '@material-ui/core';

export function EventFeedTableInput(props){
    const [message, setMessage] = React.useState("");
    const onMessageChange = (evt) => {
        evt.preventDefault();
        setMessage(evt.target.value);
    }
    const onSubmitMessage = (e) => {
        e.preventDefault();
        if(message && message.length > 0){
            props.onSubmitMessage(message);
            setMessage("");
        }
    } 

    return (          
        <div style={{padding: "0", margin: "0", position: "absolute", bottom: 0, width: "100%"}}>
            <form onSubmit={onSubmitMessage}>
                <TextField InputProps={{endAdornment:
                    <IconButton color="primary" variant="contained" onClick={onSubmitMessage}>
                        <SendIcon/>
                    </IconButton>
                    }} 
                    fullWidth
                    size="small"
                    style={{padding:0,margin:0}}
                    variant="outlined"
                    value={message} onChange={onMessageChange}
                    label="Type Message..." 
                />
            </form>
        </div>  
    )
}

