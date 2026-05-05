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
        <div style={{marginLeft: "20px"}}>
            <Button
                className="mythic-table-row-action"
                disabled={props.first}
                variant="contained"
                style={{marginRight: "10px"}}
                onClick={props.canceled}
              >
                Back
              </Button>
              <Button
                className={`mythic-table-row-action ${props.last ? "mythic-table-row-action-hover-success" : "mythic-table-row-action-hover-info"}`}
                variant="contained"
                onClick={props.finished}
                disabled={props.disableNext || disabledButtons}
              >
                  {props.last ? props.showExtraOptions ? 'Create Payload Again' : 'Create Payload' : 'Next'}
              </Button>
              {props.last && props.showExtraOptions &&
              <React.Fragment>
                <Button
                  className="mythic-table-row-action mythic-table-row-action-hover-warning"
                  variant="contained"
                  style={{marginLeft: "10px"}}
                  onClick={props.startOver}
                >
                  Start Over
                </Button>
              {props.showExtraOptions &&
                <Button
                  className="mythic-table-row-action mythic-table-row-action-hover-info"
                  variant="contained"
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
