import React from 'react';
import {MythicActionButton} from '../../MythicComponents/MythicActionButton';
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
        <div className="mythic-table-toolbar flex flex-none flex-wrap gap-4 mythic-create-flow-footer flex-none w-full rounded bg-surface-muted border-subtle">
            <MythicActionButton
                compact
                disabled={props.first}
                variant="contained"
                onClick={props.canceled}
              >
                Back
              </MythicActionButton>
              <MythicActionButton
                compact
                tone={props.last ? "success" : "info"}
                variant="contained"
                onClick={props.finished}
                disabled={props.disableNext || disabledButtons}
              >
                  {props.last ? props.showExtraOptions ? 'Create Payload Again' : 'Create Payload' : 'Next'}
              </MythicActionButton>
              {props.last && props.showExtraOptions &&
              <React.Fragment>
                <MythicActionButton
                  compact
                  tone="warning"
                  variant="contained"
                  onClick={props.startOver}
                >
                  Start Over
                </MythicActionButton>
              {props.showExtraOptions &&
                <MythicActionButton
                  compact
                  tone="info"
                  variant="contained"
                  component={Link}
                  to={"/new/createpayload"}
                >
                  Go To Create Another Base Payload
                </MythicActionButton>
              }
              </React.Fragment>
                
              }
        </div>
    );
} 
