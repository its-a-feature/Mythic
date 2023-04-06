import React from 'react';
import SendIcon from '@mui/icons-material/Send';
import IconButton from '@mui/material/IconButton';
import {TextField} from '@mui/material';

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
                    <IconButton
                        color="primary"
                        variant="contained"
                        onClick={onSubmitMessage}
                        size="large">
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
    );
}

