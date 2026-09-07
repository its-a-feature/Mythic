import React from 'react';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import {gql, useQuery} from '@apollo/client';
import {MythicActionButton} from '../../MythicComponents/MythicActionButton';
import {
  MythicDialogButton,
  MythicDialogBody,
  MythicDialogFooter,
  MythicDialogSection
} from '../../MythicComponents/MythicDialogLayout';

const getCommandsQuery = gql`
query getCommandsQuery($uuid: String!) {
  payloadcommand(where: {payload: {uuid: {_eq: $uuid}}}){
    command {
      cmd
      id
    }
    id
  }
  command(where: {deleted: {_eq: false}, payloadtype: {payloads: {uuid: {_eq: $uuid}}}}) {
    cmd
    id
  }
}
`;

export function AddRemoveCommandsDialog(props) {

    const [checked, setChecked] = React.useState([]);
    const [left, setLeft] = React.useState([]);
    const [originalRight, setOriginalRight] = React.useState([]);
    const [right, setRight] = React.useState([]);
    const leftTitle = "Commands Not Included";
    const rightTitle = "Commands Included";
    const leftChecked = intersection(checked, left);
    const rightChecked = intersection(checked, right);
    useQuery(getCommandsQuery, {variables: {uuid: props.uuid},
      fetchPolicy: "no-cache",
      onCompleted: (data) => {
        setOriginalRight(data.payloadcommand);
        const leftData = data.command.reduce( (prev, cur) => {
          if( data.payloadcommand.filter(c => c.command.cmd === cur.cmd).length === 0){
            return [...prev, cur];
          } else {
            return [...prev];
          }
        }, []);
        leftData.sort( (a,b) => a.cmd < b.cmd ? -1 : 1);
        setLeft(leftData);
        const rightData = data.payloadcommand.map( c => c.command);
        rightData.sort( (a,b) => a.cmd < b.cmd ? -1 : 1);
        setRight(rightData);
      },
      onError: (data) => {

      }
    })
    function not(a, b) {
      if(props.itemKey){
        return a.filter( (value) => b.find( (element) => element[props.itemKey] === value[props.itemKey] ) === undefined)
      }
      return a.filter((value) => b.indexOf(value) === -1);
    }
    
    function intersection(a, b) {
      if(props.itemKey){
        return a.filter( (value) => b.find( (element) => element[props.itemKey] === value[props.itemKey] ) !== undefined)
      }
      return a.filter((value) => b.indexOf(value) !== -1);
    }
    const handleToggle = (value) => () => {
      let currentIndex = -1;
      if(props.itemKey){
        currentIndex = checked.findIndex( (element) => element[props.itemKey] === value[props.itemKey]);
      }else{
        currentIndex = checked.indexOf(value);
      }
      
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
      <div className="mythic-transfer-list flex flex-column min-w-0 overflow-hidden w-full rounded bg-surface border-subtle">
          <div className="mythic-transfer-list-header bg-table-header text-xs font-700 leading-125 border-b text-primary">{title}</div>
          <div className="mythic-transfer-list-body flex-fill overflow-auto">
              <List dense component="div" role="list" style={{padding:0, width: "100%", overflow: "auto"}}>
                  {items.map((valueObj) => {
                      const value = valueObj.cmd;
                      const labelId = `transfer-list-item-${value}-label`;
                      return (
                          <ListItem style={{padding:0}} key={value} role="listitem" button onClick={handleToggle(valueObj)}>
                              <ListItemIcon>
                                  <Checkbox
                                      checked={checked.findIndex( (element) => element.cmd === value) !== -1}
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
          </div>
      </div>
    );
    const setFinalTags = () => {
      // things to add are in the `right` now but weren't for `originalRight`
      const commandsToAdd = right.filter( (command) => {
        return originalRight.filter(orig => orig.command.cmd === command.cmd).length === 0;
      });
      const commandsToRemove = originalRight.filter( (command) => {
        return right.filter(newCommand => newCommand.cmd === command.command.cmd).length === 0;
      })
      props.onSubmit({commandsToAdd, commandsToRemove});
      props.onClose();
    }
  return (
    <>
        <DialogTitle id="form-dialog-title">Add or Remove Commands for Payload {props.filename}</DialogTitle>
        <DialogContent dividers={true} style={{height: "100%", display: "flex", flexDirection: "column", position: "relative",  maxHeight: "100%"}}>
          <MythicDialogBody>
            <MythicDialogSection
                title="Command Availability"
                description="Updates Mythic's payload command association without changing commands inside the payload."
            >
              <div style={{display: "flex", flexDirection: "row", overflowY: "auto", height: "100%"}}>
                <div  style={{paddingLeft: 0, flexGrow: 1,  marginLeft: 0, marginRight: "10px", position: "relative",  overflowY: "auto", display: "flex", flexDirection: "column", width: "100%" }}>
                  {customList(leftTitle, left)}
                </div>
                  <div className="mythic-transfer-controls py-0 px-4 items-center flex flex-column gap-6 justify-center">
                    <MythicActionButton
                      colorMode="always"
                      tone="primary"
                      variant="contained"
                      size="small"
                      onClick={handleAllRight}
                      disabled={left.length === 0}
                      aria-label="move all right"
                    >
                      &gt;&gt;
                    </MythicActionButton>
                    <MythicActionButton
                      colorMode="always"
                      tone="primary"
                      variant="contained"
                      size="small"
                      onClick={handleCheckedRight}
                      disabled={leftChecked.length === 0}
                      aria-label="move selected right"
                    >
                      &gt;
                    </MythicActionButton>
                    <MythicActionButton
                      colorMode="always"
                      tone="primary"
                      variant="contained"
                      size="small"
                      onClick={handleCheckedLeft}
                      disabled={rightChecked.length === 0}
                      aria-label="move selected left"
                    >
                      &lt;
                    </MythicActionButton>
                    <MythicActionButton
                      colorMode="always"
                      tone="primary"
                      variant="contained"
                      size="small"
                      onClick={handleAllLeft}
                      disabled={right.length === 0}
                      aria-label="move all left"
                    >
                      &lt;&lt;
                    </MythicActionButton>
                </div>
                <div  style={{marginLeft: "10px", position: "relative", display: "flex", flexDirection: "column", width: "100%" }}>
                  {customList(rightTitle, right)}
                  </div>
              </div>
            </MythicDialogSection>
          </MythicDialogBody>
        </DialogContent>
        <MythicDialogFooter>
          <MythicDialogButton onClick={props.onClose}>
            Close
          </MythicDialogButton>
          <MythicDialogButton intent="primary" onClick={setFinalTags}>
            Submit
          </MythicDialogButton>
        </MythicDialogFooter>
  </>
  );
}
