import React, {useEffect} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Checkbox from '@mui/material/Checkbox';
import CardHeader from '@mui/material/CardHeader';
import ListItemText from '@mui/material/ListItemText';
import {useQuery, gql } from '@apollo/client';
import {useMutation} from '@apollo/client';
import {hideCallbacksMutation} from './CallbackMutations';
import { CardContent } from '@mui/material';
import {snackActions} from "../../utilities/Snackbar";
import {CallbacksTableLastCheckinCell} from "./CallbacksTableRow";
import {classes, StyledButton, StyledDivider} from '../../MythicComponents/MythicTransferList';


const callbacksAndFeaturesQuery = gql`
query callbacksAndFeatures{
  callback(where: {active: {_eq: true}}, order_by: {id: asc}) {
    id
    display_id
    host
    user
    process_name
    pid
    description
    last_checkin
  }
}`;

function not(a, b) {
  return a.filter((value) => b.indexOf(value) === -1);
}

function intersection(a, b) {
  return a.filter((value) => b.indexOf(value) !== -1);
}

export function CallbacksTabsHideMultipleDialog({onClose}) {

    const [checked, setChecked] = React.useState([]);
    const [left, setLeft] = React.useState([]);
    const [right, setRight] = React.useState([]);
    const leftChecked = intersection(checked, left);
    const rightChecked = intersection(checked, right);
    const [hideCallback] = useMutation(hideCallbacksMutation, {
        onCompleted: data => {
            snackActions.success("Successfully hid callbacks!")
            onClose();
        },
        onError: data => {
            console.log(data);
            snackActions.error(data.message);
            onClose();
        }
    });
    useQuery(callbacksAndFeaturesQuery,{
      fetchPolicy: "no-cache",
      onCompleted: (data) => {
        const callbackData = data.callback.map( c => {
          // for each callback, get a unique set of supported features
          const display = `${c.display_id} - ${c.user}@${c.host} (${c.pid}) - ${c.description}`;
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
      let callbackIDs = right.map(c => c.display_id);
      snackActions.info("Hiding callbacks...");
      hideCallback({variables: {callback_display_ids: callbackIDs}});
    }

    const customList = (title, items) => (
      <>
          <CardHeader
            title={title}
          />
          <StyledDivider classes={{root: classes.divider}}/>
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
                      <div style={{display: "inline-flex", flexDirection: "column"}} >
                          <ListItemText primary={value.display} />
                          <div style={{display: "inline-flex"}}>
                              {"Last Checkin: "}&nbsp;
                              <CallbacksTableLastCheckinCell rowData={value} />
                          </div>

                      </div>

                  </ListItem>
                );
              })}
              <ListItem />
            </List>
          </CardContent>
          </>
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
              <StyledButton
                variant="contained"
                size="small"
                color={"primary"}
                className={classes.button}
                onClick={handleAllRight}
                disabled={left.length === 0}
                aria-label="move all right"
              >
                &gt;&gt;
              </StyledButton>
              <StyledButton
                variant="contained"
                size="small"
                color={"primary"}
                className={classes.button}
                onClick={handleCheckedRight}
                disabled={leftChecked.length === 0}
                aria-label="move selected right"
              >
                &gt;
              </StyledButton>
              <StyledButton
                variant="contained"
                size="small"
                color={"primary"}
                className={classes.button}
                onClick={handleCheckedLeft}
                disabled={rightChecked.length === 0}
                aria-label="move selected left"
              >
                &lt;
              </StyledButton>
              <StyledButton
                variant="contained"
                size="small"
                color={"primary"}
                className={classes.button}
                onClick={handleAllLeft}
                disabled={right.length === 0}
                aria-label="move all left"
              >
                &lt;&lt;
              </StyledButton>
 
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

