import React from 'react';
import Button from '@material-ui/core/Button';

/*
    Takes in props for Boolean of first/last
    Takes in props for canceled
    Takes in props for finished
*/
export function CreatePayloadNavigationButtons(props){

    return (
        <div >
            <Button
                disabled={props.first}
                color="primary"
                onClick={props.canceled}
              >
                Back
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={props.finished}
              >
                {props.last ? 'Create Payload' : 'Next'}
              </Button>
        </div>
    );
} 
