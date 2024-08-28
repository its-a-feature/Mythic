import React from 'react';
import Button from '@mui/material/Button';
import { Link } from 'react-router-dom';
import { useReactiveVar } from '@apollo/client';
import { meState } from '../../../cache';

/*
    Takes in props for Boolean of first/last
    Takes in props for canceled
    Takes in props for finished
*/
export function CreatePayloadNavigationButtons(props){
    const me = useReactiveVar(meState);
    const disabledButtons = (me?.user?.current_operation_id || 0) > 0 ? false : true;
    return (
        <div >
            <Button
                disabled={props.first}
                color="secondary"
                onClick={props.canceled}
              >
                Back
              </Button>
              <Button
                variant="contained"
                color={props.last ? "success" : "primary"}
                onClick={props.finished}
                disabled={props.disableNext || disabledButtons}
              >
                  {props.last ? props.showExtraOptions ? 'Create Payload Again' : 'Create Payload' : 'Next'}
              </Button>
              {props.last && props.showExtraOptions &&
              <React.Fragment>
                <Button
                  variant="contained"
                  color="warning"
                  style={{marginLeft: "10px"}}
                  onClick={props.startOver}
                >
                  Start Over
                </Button>
              {props.showExtraOptions &&
                <Button
                  variant="contained"
                  color="info"
                  component={Link}
                  style={{marginLeft: "10px"}}
                  to={"/new/createpayload"}
                >
                  Go To Create Another Base Payload
                </Button>
              }
              </React.Fragment>
                
              }
        </div>
    );
} 
