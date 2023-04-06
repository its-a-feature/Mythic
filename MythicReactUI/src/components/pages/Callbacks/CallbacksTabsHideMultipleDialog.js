import React, {useEffect} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Checkbox from '@mui/material/Checkbox';
import Paper from '@mui/material/Paper';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';
import ListItemText from '@mui/material/ListItemText';
import makeStyles from '@mui/styles/makeStyles';
import {useQuery, gql } from '@apollo/client';
import { meState } from '../../../cache';
import {useReactiveVar, useMutation} from '@apollo/client';
import {hideCallbackMutation} from './CallbackMutations';
import {snackActions} from '../../utilities/Snackbar';
import { CardContent } from '@mui/material';


const callbacksAndFeaturesQuery = gql`
query callbacksAndFeatures($operation_id: Int!) {
  callback(where: {operation_id: {_eq: $operation_id}, active: {_eq: true}}, order_by: {id: asc}) {
    id
    display_id
    host
    user
    process_name
    pid
  }
}`;

const useStyles = makeStyles((theme) => ({
  root: {
    margin: 'auto',
  },
  paper: {
    width: 200,
    height: 500,
  },
  button: {
    margin: theme.spacing(0.5, 0),
  },
  divider: {
    backgroundColor: "rgb(100, 170, 204)",
    border: "2px solid rgba(100, 170, 204)"
  }
}));

function not(a, b) {
  return a.filter((value) => b.indexOf(value) === -1);
}

function intersection(a, b) {
  return a.filter((value) => b.indexOf(value) !== -1);
}

export function CallbacksTabsHideMultipleDialog({onClose}) {
    const me = useReactiveVar(meState);
    const classes = useStyles();
    const [checked, setChecked] = React.useState([]);
    const [left, setLeft] = React.useState([]);
    const [right, setRight] = React.useState([]);
    const leftChecked = intersection(checked, left);
    const rightChecked = intersection(checked, right);
    const updatedCallbacksSuccess = React.useRef(0);
    const updatedCallbacks = React.useRef(0);
    const [hideCallback] = useMutation(hideCallbackMutation, {
      update: (cache, {data}) => {
          updatedCallbacks.current += 1;
          if(data.updateCallback.status === "success"){
            updatedCallbacksSuccess.current += 1;
          }else{
              snackActions.warning(data.updateCallback.error);
          }
          if(updatedCallbacks.current === right.length){
            snackActions.success("Successfully updated " + updatedCallbacksSuccess.current + " callbacks status");
          }
          
      },
      onError: data => {
          console.log(data);
      }
    });
    useQuery(callbacksAndFeaturesQuery, {variables: {operation_id: me?.user?.current_operation_id || 0},
      fetchPolicy: "no-cache",
      onCompleted: (data) => {
        const callbackData = data.callback.map( c => {
          // for each callback, get a unique set of supported features
          const display = `${c.id} - ${c.user}@${c.host} (${c.pid})`;
          return {...c, display};
        });
        setLeft(callbackData);
      }
    });
    const handleToggle = (value) => () => {
      const currentIndex = checked.indexOf(value);
      const newChecked = [...checked];

      if (currentIndex === -1) {
        newChecked.push(value);
      } else {
        newChecked.splice(currentIndex, 1);
      }

      setChecked(newChecked);
    };

    const handleAllRight = () => {
      setRight(right.concat(left));
      setLeft([]);
    };

    const handleCheckedRight = () => {
      setRight(right.concat(leftChecked));
      setLeft(not(left, leftChecked));
      setChecked(not(checked, leftChecked));
    };

    const handleCheckedLeft = () => {
      setLeft(left.concat(rightChecked));
      setRight(not(right, rightChecked));
      setChecked(not(checked, rightChecked));
    };

    const handleAllLeft = () => {
      setLeft(left.concat(right));
      setRight([]);
    };

    const submitTasking = () => {
      if(right.length === 0){
        onClose();
        return;
      }
      for(let i = 0; i < right.length; i++){
        hideCallback({variables: {callback_display_id: right[i].display_id}});
      }
      
    }
    const customList = (title, items) => (
      <React.Fragment>
          <CardHeader
            className={classes.cardHeader}
            title={title}
          />
          <Divider classes={{root: classes.divider}}/>
          <CardContent style={{flexGrow: 1, overflowY: "auto", padding: 0}}>
            <List dense component="div" role="list" style={{padding:0}}>
              {items.map((value) => {
                const labelId = `transfer-list-item-${value.id}-label`;
                return (
                  <ListItem style={{padding:0}} key={value.id} role="listitem" button onClick={handleToggle(value)}>
                    <ListItemIcon>
                      <Checkbox
                        checked={checked.indexOf(value) !== -1}
                        tabIndex={-1}
                        disableRipple
                        inputProps={{ 'aria-labelledby': labelId }}
                      />
                    </ListItemIcon>
                    <ListItemText id={labelId} primary={value.display} />
                  </ListItem>
                );
              })}
              <ListItem />
            </List>
          </CardContent>
          </React.Fragment>
    );
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Hide Multiple Callbacks at Once</DialogTitle>
        <DialogContent dividers={true} style={{height: "100%", display: "flex", flexDirection: "column", position: "relative",  maxHeight: "100%"}}>
        <div style={{display: "flex", flexDirection: "row", overflowY: "auto", flexGrow: 1, minHeight: 0}}>
          <div  style={{paddingLeft: 0, flexGrow: 1,  marginLeft: 0, marginRight: "10px", position: "relative",  overflowY: "auto", display: "flex", flexDirection: "column" }}>
            
            {customList("Visible Callbacks", left)}
            </div>
            <div style={{display: "flex", flexDirection: "column", justifyContent: "center"}}>
              <Button
                variant="outlined"
                size="small"
                className={classes.button}
                onClick={handleAllRight}
                disabled={left.length === 0}
                aria-label="move all right"
              >
                &gt;&gt;
              </Button>
              <Button
                variant="outlined"
                size="small"
                className={classes.button}
                onClick={handleCheckedRight}
                disabled={leftChecked.length === 0}
                aria-label="move selected right"
              >
                &gt;
              </Button>
              <Button
                variant="outlined"
                size="small"
                className={classes.button}
                onClick={handleCheckedLeft}
                disabled={rightChecked.length === 0}
                aria-label="move selected left"
              >
                &lt;
              </Button>
              <Button
                variant="outlined"
                size="small"
                className={classes.button}
                onClick={handleAllLeft}
                disabled={right.length === 0}
                aria-label="move all left"
              >
                &lt;&lt;
              </Button>
 
          </div>
          <div  style={{marginLeft: "10px", position: "relative", flexGrow: 1, display: "flex", flexDirection: "column" }}>
            {customList("Callbacks To Hide", right)}
            </div>
        </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="contained" color="primary">
            Close
          </Button>
          <Button onClick={submitTasking} variant="contained" color="warning">
            Hide
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

