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
        <div className="mythic-table-toolbar mythic-create-flow-footer">
            <Button
                className="mythic-compact-action"
                disabled={props.first}
                variant="contained"
                onClick={props.canceled}
              >
                Back
              </Button>
              <Button
                className={`mythic-compact-action ${props.last ? "mythic-action-tone-hover mythic-tone-success" : "mythic-action-tone-hover mythic-tone-info"}`}
                variant="contained"
                onClick={props.finished}
                disabled={props.disableNext || disabledButtons}
              >
                  {props.last ? props.showExtraOptions ? 'Create Payload Again' : 'Create Payload' : 'Next'}
              </Button>
              {props.last && props.showExtraOptions &&
              <React.Fragment>
                <Button
                  className="mythic-compact-action mythic-action-tone-hover mythic-tone-warning"
                  variant="contained"
                  onClick={props.startOver}
                >
                  Start Over
                </Button>
              {props.showExtraOptions &&
                <Button
                  className="mythic-compact-action mythic-action-tone-hover mythic-tone-info"
                  variant="contained"
                  component={Link}
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
