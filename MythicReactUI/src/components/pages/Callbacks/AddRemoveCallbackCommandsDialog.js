import React, {useEffect} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import CardHeader from '@mui/material/CardHeader';
import {gql, useQuery} from '@apollo/client';
import { CardContent } from '@mui/material';
import {classes, StyledButton, StyledDivider} from '../../MythicComponents/MythicTransferList';

const getCommandsQuery = gql`
query GetCallbackDetails($callback_id: Int!) {
  callback_by_pk(id: $callback_id){
    loadedcommands {
      command {
        cmd
        payloadtype {
            name
        }
        id
      }
      id
    }
    payload {
      payloadtype {
        name
        commands(where: {deleted: {_eq: false}}) {
          cmd
          id
        }
      }
    }
  }
  command(where: {deleted: {_eq: false}, payloadtype: {agent_type: {_eq: "command_augment"}}}){
    cmd
    id
    payloadtype {
        name
    }
  }
}
`;

export function AddRemoveCallbackCommandsDialog(props) {

    const [checked, setChecked] = React.useState([]);
    const [left, setLeft] = React.useState([]);
    const [originalLeft, setOriginalLeft] = React.useState([]);
    const [originalRight, setOriginalRight] = React.useState([]);
    const [right, setRight] = React.useState([]);
    const [leftTitle, setLeftTitle] = React.useState("Commands Not Included");
    const [rightTitle, setRightTitle] = React.useState("Commands Included");
    const leftChecked = intersection(checked, left);
    const rightChecked = intersection(checked, right);
    const compareElements = (a, b) => {
        return a.cmd === b.cmd && a.payloadtype.name === b.payloadtype.name;
    }
    useQuery(getCommandsQuery, {variables: {callback_id: props.callback_id},
      fetchPolicy: "no-cache",
      onCompleted: (data) => {
        let originalLeftFromQuery = data.callback_by_pk.payload.payloadtype.commands.map(c => {
            return {...c, payloadtype: {name: data.callback_by_pk.payload.payloadtype.name}}
        })
        originalLeftFromQuery = [...originalLeftFromQuery, ...data.command];
        setOriginalLeft(originalLeftFromQuery);
        setOriginalRight(data.callback_by_pk.loadedcommands);

        const leftData = originalLeftFromQuery.reduce( (prev, cur) => {
          if( data.callback_by_pk.loadedcommands.filter(c => c.command.cmd === cur.cmd && c.command.payloadtype.name === cur.payloadtype.name).length === 0){
            return [...prev, cur];
          } else {
            return [...prev];
          }
        }, []);

        leftData.sort( (a,b) => a.cmd < b.cmd ? -1 : 1);
        setLeft(leftData);
        const rightData = data.callback_by_pk.loadedcommands.map( c => c.command);
        rightData.sort( (a,b) => a.cmd < b.cmd ? -1 : 1);
        setRight(rightData);
      },
      onError: (data) => {

      }
    })
    function not(a, b) {
      return a.filter((value) => b.indexOf(value) === -1);
    }
    
    function intersection(a, b) {
      return a.filter((value) => b.indexOf(value) !== -1);
    }
    const handleToggle = (value) => () => {
      let currentIndex = -1;
        currentIndex = checked.indexOf(value);
      
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
    const customList = (title, items) => (
      <>
          <CardHeader className={classes.cardHeader} title={title} />
          <StyledDivider classes={{root: classes.divider}}/>
          <CardContent style={{flexGrow: 1, overflowY: "auto", padding: 0}}>
            <List dense component="div" role="list" style={{padding:0, width: "100%"}}>
              {items.map((valueObj) => {
                const value = valueObj.cmd + " (" + valueObj?.payloadtype?.name + ")";
                const labelId = `transfer-list-item-${value}-label`;
                return (
                  <ListItem style={{padding:0}} key={value} role="listitem" button onClick={handleToggle(valueObj)}>
                    <ListItemIcon>
                      <Checkbox
                        checked={checked.findIndex( (element) => element.cmd + " (" + element?.payloadtype?.name + ")" === value) !== -1}
                        tabIndex={-1}
                        disableRipple
                        inputProps={{ 'aria-labelledby': labelId }}
                      />
                    </ListItemIcon>
                    <ListItemText id={labelId} primary={value} />
                  </ListItem>
                );
              })}
              <ListItem />
            </List>
          </CardContent>
        </>
    );
    const setFinalTags = () => {
      // things to add are in the `right` now but weren't for `originalRight`
      const commandsToAdd = right.filter( (command) => {
        return originalRight.filter(orig => orig.command.cmd === command.cmd && orig.command.payloadtype.name === command.payloadtype.name).length === 0;
      });
      const commandsToRemove = originalRight.filter( (command) => {
        return right.filter(newCommand => newCommand.cmd === command.command.cmd && newCommand.payloadtype.name === command.command.payloadtype.name).length === 0;
      })
      props.onSubmit({commandsToAdd, commandsToRemove});
      props.onClose();
    }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Add or Remove Commands for Callback {props.display_id} </DialogTitle>
        <DialogContent dividers={true} style={{height: "100%", display: "flex", flexDirection: "column", position: "relative",  maxHeight: "100%"}}>
          This will add or remove commands associated with this callback from Mythic's perspective. 
          This does NOT add or remove commands within the payload itself that's beaconing out to Mythic.
          <div style={{display: "flex", flexDirection: "row", overflowY: "auto", flexGrow: 1, minHeight: 0}}>
          <div  style={{paddingLeft: 0, flexGrow: 1,  marginLeft: 0, marginRight: "10px", position: "relative",  overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {customList(leftTitle, left)}
          </div>
            <div style={{display: "flex", flexDirection: "column", justifyContent: "center"}}>
              <StyledButton
                variant="contained"
                size="small"
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
                className={classes.button}
                onClick={handleAllLeft}
                disabled={right.length === 0}
                aria-label="move all left"
              >
                &lt;&lt;
              </StyledButton>
 
          </div>
          <div  style={{marginLeft: "10px", position: "relative", flexGrow: 1, display: "flex", flexDirection: "column" }}>
            {customList(rightTitle, right)}
            </div>
        </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Close
          </Button>
          <Button onClick={setFinalTags} variant="contained" color="success">
            Submit
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

