import React from 'react';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {milisecondsToString, useInterval } from './utilities/Time';
import {JWTTimeLeft, GetNewToken} from '../index';
import {FailedRefresh} from '../cache';
import { Button } from '@mui/material';
import { snackActions } from './utilities/Snackbar';


export function RefreshTokenDialog(props) {
    const mountedRef = React.useRef(true);
    const [timeLeft, setTimeLeft] = React.useState("Loading...")
    useInterval( () => {
      let milisecondsLeft = JWTTimeLeft();
      if(milisecondsLeft <= 0){
        FailedRefresh();
        props.onClose();
      }else{
        setTimeLeft(milisecondsToString(milisecondsLeft));
      }
      
    }, 1000, mountedRef, mountedRef);
    const onCommitSubmit = () => {
      GetNewToken().then( function(result) {
        if(result){
          snackActions.success("Extended your session");
        }else{
          snackActions.error("Failed to extend your session");
        }
        props.onClose();
      });
    }
    const onClose = () => {
      FailedRefresh();
      props.onClose();
    }
    return (
      <React.Fragment>
        <DialogTitle id="form-dialog-title">Session About to Expire</DialogTitle>
        <DialogContent dividers={true}>
          Your Session will expire in {timeLeft}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="contained" color="primary">
            Logout
          </Button>
          <Button onClick={onCommitSubmit} variant="contained" color="success">
            Extend
          </Button>
        </DialogActions>
      </React.Fragment>
    )
}

