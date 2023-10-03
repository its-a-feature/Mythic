import React, {useEffect} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import makeStyles from '@mui/styles/makeStyles';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import { CardContent } from '@mui/material';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';

const useStyles = makeStyles((theme) => ({
  root: {
    margin: 'auto',
  },
  paper: {
    width: 200,
  },
  button: {
    margin: theme.spacing(0.5, 0),
  },
  divider: {
    backgroundColor: "rgb(100, 170, 204)",
    border: "2px solid rgba(100, 170, 204)"
  }
}));


  
export function MythicTransferListDialog(props) {
    const classes = useStyles();
    const [checked, setChecked] = React.useState([]);
    const [left, setLeft] = React.useState([]);
    const [right, setRight] = React.useState([]);
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
      setRight(props.right);
      setLeftTitle(props.leftTitle);
      setRightTitle(props.rightTitle);
    }, [props.left, props.right, props.leftTitle, props.rightTitle, props.itemKey]);
    const customList = (title, items) => (
      <>
          <CardHeader
            className={classes.cardHeader}
            title={title}
          />
          <Divider classes={{root: classes.divider}}/>
          <CardContent style={{flexGrow: 1, height: "100%", width: "100%", overflowY: "auto", padding: 0}}>
          <List dense component="div" role="list" style={{padding:0}}>
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
            <ListItem />
          </List>
          </CardContent>
          </>
    );
    const setFinalTags = () => {
      props.onSubmit({left, right});
      props.onClose();
    }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{props.dialogTitle}</DialogTitle>
        <DialogContent dividers={true}>
        <div style={{display: "flex", flexDirection: "row", overflowY: "auto", flexGrow: 1, minHeight: 0}}>
            <div  style={{paddingLeft: 0, flexGrow: 1,  marginLeft: 0, marginRight: "10px", position: "relative",  overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {customList(leftTitle, left)}
            </div>
            <div style={{display: "flex", flexDirection: "column", justifyContent: "center"}}>
              <Button
                variant="contained"
                size="small"
                className={classes.button}
                onClick={handleAllRight}
                disabled={left.length === 0}
                aria-label="move all right"
              >
                &gt;&gt;
              </Button>
              <Button
                variant="contained"
                size="small"
                className={classes.button}
                onClick={handleCheckedRight}
                disabled={leftChecked.length === 0}
                aria-label="move selected right"
              >
                &gt;
              </Button>
              <Button
                variant="contained"
                size="small"
                className={classes.button}
                onClick={handleCheckedLeft}
                disabled={rightChecked.length === 0}
                aria-label="move selected left"
              >
                &lt;
              </Button>
              <Button
                variant="contained"
                size="small"
                className={classes.button}
                onClick={handleAllLeft}
                disabled={right.length === 0}
                aria-label="move all left"
              >
                &lt;&lt;
              </Button>
            </div>
            <div style={{marginLeft: "10px", position: "relative", flexGrow: 1, display: "flex", overflowY: "auto", flexDirection: "column" }}>
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

