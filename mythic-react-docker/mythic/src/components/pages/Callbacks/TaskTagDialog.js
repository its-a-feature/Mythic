import React, {useState} from 'react';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {useQuery, gql, useReactiveVar, useMutation} from '@apollo/client';
import LinearProgress from '@material-ui/core/LinearProgress';
import { meState } from '../../../cache';
import { makeStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Checkbox from '@material-ui/core/Checkbox';
import Paper from '@material-ui/core/Paper';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import Divider from '@material-ui/core/Divider';
import NoteAddIcon from '@material-ui/icons/NoteAdd';
import { IconButton } from '@material-ui/core';
import {muiTheme} from '../../../themes/Themes.js';

const updateCommentMutation = gql`
mutation updateComment ($task_id: Int!, $comment: String) {
  update_task_by_pk(pk_columns: {id: $task_id}, _set: {comment: $comment}) {
    comment
    commentOperator {
      username
    }
    id
  }
}
`;
const getTaskTagsQuery = gql`
query getTaskTags ($operation_id: Int!) {
  tasktag(where: {operation_id: {_eq: $operation_id}}) {
    id
    tag
    task_id
  }
}
`;
const useStyles = makeStyles((theme) => ({
  root: {
    margin: 'auto',
  },
  paper: {
    width: 200,
    height: 230,
    overflow: 'auto',
  },
  button: {
    margin: theme.spacing(0.5, 0),
  },
}));

function not(a, b) {
  return a.filter((value) => b.indexOf(value) === -1);
}

function intersection(a, b) {
  return a.filter((value) => b.indexOf(value) !== -1);
}
  
export function TaskTagDialog(props) {
    const [newTag, setNewTag] = useState("");
    const me = useReactiveVar(meState);
    const { loading, error } = useQuery(getTaskTagsQuery, {
        variables: {operation_id: me.user.current_operation_id},
        onCompleted: data => {
            const allTags = data.tasktag.reduce( (prev, cur) => {
              if(prev.includes(cur.tag)){
                return [...prev];
              }else{
                return [...prev, cur];
              }
            }, []);
            const currentTags = data.tasktag.reduce( (prev, cur) => {
              if(cur.task_id === props.task_id){
                return [...prev, cur];
              }else{
                return [...prev];
              }
            }, []);
            setLeft(allTags);
            setRight(currentTags);
            setOriginalTags([...currentTags]);
        },
        fetchPolicy: "network-only"
    });
    const [updateComment] = useMutation(updateCommentMutation, {
        update: (cache, {data}) => {
            //console.log(data);
        }
    });
    const classes = useStyles();
    const [checked, setChecked] = React.useState([]);
    const [left, setLeft] = React.useState([]);
    const [right, setRight] = React.useState([]);
    const [originalTags, setOriginalTags] = React.useState([]);
    const leftChecked = intersection(checked, left);
    const rightChecked = intersection(checked, right);

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

    const customList = (title, items) => (
      <Paper className={classes.paper} style={{width:"100%"}}>
        <Card>
          <CardHeader
            className={classes.cardHeader}
            title={title}
          />
          <Divider />
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
                  <ListItemText id={labelId} primary={value.tag} />
                </ListItem>
              );
            })}
            <ListItem />
          </List>
          </Card>
      </Paper>
    );
    if (loading) {
     return <LinearProgress />;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    const onCommitSubmit = () => {
        //updateComment({variables: {task_id: props.task_id, comment: comment}});
        props.onClose();
    }
    const onChange = (name, value, error) => {
        setNewTag(value);
    }
    const addNewTag = () => {
      if(!right.find(element => element.tag === newTag) && !left.find(element => element.tag === newTag)){
        if(newTag !== ""){
          setRight([...right, {tag: newTag, id: 0, task_id: 0}]);
        }
      }
      setNewTag("");
    }
    const setFinalTags = () => {
      console.log(right, originalTags);
      originalTags.forEach( (tag) => {
        // go through the original tags and see if they exist in the right, if so, move on
        // if the tag doesn't exist, we delete it
        if(!right.find(element => element.id === tag.id)){
          console.log("delete: ", tag);
        }
      });
      right.forEach( (tag) => {
        // go through the right tags and see if they exited in the original, if so, move on
        // if the tag doesn't exist, we add it
        if(!originalTags.find(element => element.id === tag.id)){
          console.log("add: ", tag);
        }
      });
      props.onClose();
    }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Edit Task Tags</DialogTitle>
        <DialogContent dividers={true}>
        <Grid container spacing={2} justify="center" alignItems="center" className={classes.root}>
          <Grid item xs={5}>{customList("Unused Tags", left)}</Grid>
          <Grid item>
            <Grid container direction="column" alignItems="center">
              <Button
                variant="outlined"
                size="small"
                className={classes.button}
                onClick={handleAllRight}
                disabled={left.length === 0}
                aria-label="move all right"
              >
                ≫
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
                ≪
              </Button>
            </Grid>
          </Grid>
          <Grid item xs={5}>{customList("Applied Tags To Task", right)}</Grid>
        </Grid>
        <MythicTextField multiline={false} onChange={onChange} value={newTag} style={{display:"inline-block"}} 
          InputProps={{
                    endAdornment:
                    <React.Fragment>
                    <IconButton style={{color: muiTheme.palette.success.main}} variant="contained" onClick={addNewTag}><NoteAddIcon/></IconButton>
                    </React.Fragment>
                }}/>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} color="primary">
            Close
          </Button>
          <Button onClick={setFinalTags} color="secondary">
            Submit
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

