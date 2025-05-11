import React, {useEffect} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import Paper from '@mui/material/Paper';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import {useQuery, gql} from '@apollo/client';
import {useTheme} from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import MythicTextField from '../../MythicComponents/MythicTextField';
import { snackActions } from '../../utilities/Snackbar';
import {classes, StyledButton, StyledDivider} from '../../MythicComponents/MythicTransferList';

function PayloadTypeBlockListPreMemo(props){

    const theme = useTheme();
    const [checked, setChecked] = React.useState([]);
    const [left, setLeft] = React.useState([]);
    const [right, setRight] = React.useState(props.right);
    const [leftTitle, setLeftTitle] = React.useState("");
    const [rightTitle, setRightTitle] = React.useState("");
    const leftChecked = intersection(checked, left);
    const rightChecked = intersection(checked, right);
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
    useEffect( () => {
      const left = props.left.reduce( (prev, cur) => {
        if(props.itemKey === undefined){
          if(props.right.includes(cur)){
            return [...prev];
          }
          return [...prev, cur];
        }else{
          if(props.right.find( element => element[props.itemKey] === cur[props.itemKey])){
            return [...prev]
          }
          return [...prev, cur];
        }
        
      }, [])
      setLeft(left);
      setLeftTitle(props.leftTitle);
      setRightTitle(props.rightTitle);
    }, [props.left, props.right, props.leftTitle, props.rightTitle, props.itemKey]);
    useEffect( () => {
      props.onChange({selected: right, name: props.name});
    }, [right])
    const customList = (title, items) => (
      <Paper style={{width:"100%", marginTop:"5px"}}>
        <Card>
          <CardHeader
            title={title}
          />
          <StyledDivider classes={{root: classes.divider}}/>
          <CardContent style={{height: "calc(30vh)", overflow: "auto"}} >
            <List dense component="div" role="list" style={{padding:0}} >
              {items.map((valueObj) => {
                const value = props.itemKey === undefined ? valueObj : valueObj[props.itemKey];
                const labelId = `transfer-list-item-${value}-label`;
                return (
                  <ListItem style={{padding:0}} key={value} role="listitem" button onClick={handleToggle(valueObj)}>
                    <ListItemIcon>
                      <Checkbox
                        checked={props.itemKey === undefined ? checked.indexOf(value) !== -1 : checked.findIndex( (element) => element[props.itemKey] === value) !== -1}
                        tabIndex={-1}
                        disableRipple
                        inputProps={{ 'aria-labelledby': labelId }}
                      />
                    </ListItemIcon>
                    <ListItemText id={labelId} primary={value} />
                  </ListItem>
                );
              })}
            </List>
          </CardContent>
        </Card>
      </Paper>
    );
    
  return (
    <Grid container spacing={0} justifyContent="center" alignItems="center" className={classes.root}>
      <Grid size={12}>
        <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main}} variant={"elevation"}>
            <Typography variant="h3" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                {props.name}
            </Typography>
        </Paper>
      </Grid>
      <Grid size={5}>{customList(leftTitle, left)}</Grid>
      <Grid>
        <Grid container direction="column" alignItems="center">
          <StyledButton
            variant="contained"
            size="small"
            className={classes.button}
            onClick={handleAllRight}
            disabled={left.length === 0}
            aria-label="move all right"
          >
            ≫
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
            ≪
          </StyledButton>
        </Grid>
      </Grid>
      <Grid size={5}>{customList(rightTitle, right)}</Grid>
    </Grid>
  );
}
const PayloadTypeBlockList = React.memo(PayloadTypeBlockListPreMemo);
const getPayloadTypesAndCommandsQuery = gql`
  query getPayloadTypesAndCommands{
    payloadtype(where: {deleted: {_eq: false}, wrapper: {_eq: false}}, order_by: {name: asc}) {
      commands(order_by: {cmd: asc}) {
        cmd
        id
      }
      id
      name
    }
  }
`;
export function EditBlockListDialog({dialogTitle, onSubmit, blockListName: propBlockListName, onClose, currentSelected, editable}) {
  const [payloadtypes, setPayloadTypes] = React.useState([]);
  const [selectedCommands, setSelectedCommands] = React.useState({});
  const [blockListName, setBlockListName] = React.useState("");
  useQuery(getPayloadTypesAndCommandsQuery, {fetchPolicy: "network-only",
    onCompleted: (data) => {
      if(propBlockListName){
        setBlockListName(propBlockListName);
      }
      // for each of the possible commands mark them as selected or not
      const updatedPayloadTypes = data.payloadtype.map( p => {
        let selectedCommands = [];
        if(currentSelected[p.name] !== undefined){
          selectedCommands = [...currentSelected[p.name]];
        }
        return {...p, selected: selectedCommands};
      });
      setPayloadTypes(updatedPayloadTypes);      
      setSelectedCommands({...currentSelected});
      
    },
    onError: (data) => {

    }
  })
  const onChange = React.useCallback( ({selected, name}) => {
    setSelectedCommands({...selectedCommands, [name]: selected});
  }, [selectedCommands]);
  const onChangeBlockListName = (name, value, error) => {
    setBlockListName(value);
  };
  const submit = () => {
    if(blockListName.trim() === ""){
      snackActions.warning("Must supply a block list name");
      return;
    }
    // now diff selectedCommands with props.currentSelected to see which should be added or removed
    let toAdd = [];
    let toRemove = [];
    for(const value of Object.values(selectedCommands)){
      //key is the payload type name, value is an array of commands
      for(let i = 0; i < value.length; i++){
        toAdd.push({command_id: value[i].id, name:blockListName.trim()});
      }
    }
    for(const value of Object.values(currentSelected)){
      for(let i = 0; i < value.length; i++){
        // if value[i] in add, then remove it from add because it was selected before and is selected now
        // if value[i] is not in add, then add it to toRemove because it was selected and is no longer selected
        let index = toAdd.findIndex(c => c.command_id === value[i].id);
        if(index > -1){
          toAdd.splice(index, 1); //remove it
        }else{
          toRemove.push({command_id: value[i].id, name: blockListName.trim()});
        }
      }
    }
    onSubmit({toAdd, toRemove});
    onClose();
  }
  return (
    <>
      <DialogTitle id="form-dialog-title">{dialogTitle}</DialogTitle>
      <DialogContent dividers={true}>
        <MythicTextField disabled={!editable} onChange={onChangeBlockListName} value={blockListName} name="Block List Name" autoFocus requiredValue/>
        {payloadtypes.map(p => (
          <PayloadTypeBlockList key={p.name} leftTitle={"Not Blocked"} onChange={onChange} rightTitle={"Blocked Commands"} itemKey={"cmd"} right={p.selected} left={p.commands} name={p.name}/>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
        <Button onClick={submit} variant="contained" color="success">
          Submit
        </Button>
      </DialogActions>
    </>
  );
}

