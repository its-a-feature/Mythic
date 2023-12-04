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

const CustomListElement = ({value, onClick}) => {
    const labelId = `transfer-list-item-${value.id}-label`;
    return (
        <ListItem style={{padding:0}} key={value.id} role="listitem" button onClick={() => onClick(value)}>
            <ListItemIcon>
                <Checkbox
                    checked={value.checked}
                    tabIndex={-1}
                    disableRipple
                    inputProps={{ 'aria-labelledby': labelId }}
                />
            </ListItemIcon>
            <ListItemText id={labelId} primary={value.display} />
        </ListItem>
    );
}
const CustomList = ({title, items, left, onClick}) => {

    return (
        <>
            <CardHeader title={title} />
            <StyledDivider classes={{root: classes.divider}}/>
            <CardContent style={{flexGrow: 1, height: "100%", width: "100%", overflowY: "auto", padding: 0}}>
                <List dense component="div" role="list" style={{padding:0, width: "100%"}}>
                    {items.map((value, index) => (
                        <div key={value.display + index}>
                            {
                                left && value.left &&
                                <CustomListElement value={value} onClick={onClick}/>
                            }
                            {
                                !left && value.right &&
                                <CustomListElement value={value} onClick={onClick} />
                            }
                        </div>

                    ))}
                </List>
            </CardContent>
        </>
    );
}
const CustomTransferList = ({initialData, parentLeftData, parentRightData}) => {

    const [data, setData] = React.useState(initialData);
    const handleToggle = (value)  => {
        const updatedData = data.map(d => {
            if(value.id === d.id){
                return {...d, checked: !d.checked}
            } else {
                return {...d}
            }
        });
        setData(updatedData);
    };
    const handleAllRight = () => {
        const updatedData = data.map( d => {
            return {...d, checked: false, left: false, right: true}
        })
        setData(updatedData);
    };
    const handleCheckedRight = () => {
        const updatedData = data.map( d => {
            if(d.checked && d.left){
                return {...d, checked: false, left: false, right: true};
            } else {
                return {...d};
            }
        })
        setData(updatedData);
    };
    const handleCheckedLeft = () => {
        const updatedData = data.map( d => {
            if(d.checked && d.right){
                return {...d, checked: false, left: true, right: false};
            } else {
                return {...d};
            }
        })
        setData(updatedData);
    };
    const handleAllLeft =() => {
        const updatedData = data.map( d => {
            return {...d, checked: false, left: true, right: false}
        })
        setData(updatedData);
    };
    React.useEffect( () => {
        parentLeftData.current = data.reduce( (prev, cur) => {
            if(cur.left){return [...prev, cur]}
            return [...prev];
        }, []);
        parentRightData.current = data.reduce( (prev, cur) => {
            if(cur.right){return [...prev, cur]}
            return [...prev];
        }, []);
    }, [data]);
    React.useEffect( () => {
        setData(initialData.map(c => {
            return {...c, left: true, checked: false, right: false}
        }));
    }, [initialData]);
    return (
        <div style={{display: "flex", flexDirection: "row", overflowY: "auto", flexGrow: 1, minHeight: 0}}>
            <div  style={{paddingLeft: 0, flexGrow: 1,  marginLeft: 0, marginRight: "10px", position: "relative",  overflowY: "auto", display: "flex", flexDirection: "column" }}>
                <CustomList title={"Active Callbacks"} left={true} items={data} onClick={handleToggle} />
            </div>
            <div style={{display: "flex", flexDirection: "column", justifyContent: "center"}}>
                <StyledButton
                    variant="contained"
                    size="small"
                    className={classes.button}
                    onClick={handleAllRight}
                    aria-label="move all right"
                >
                    &gt;&gt;
                </StyledButton>
                <StyledButton
                    variant="contained"
                    size="small"
                    disabled={data.filter( x => x.checked && x.left).length === 0}
                    className={classes.button}
                    onClick={handleCheckedRight}
                    aria-label="move selected right"
                >
                    &gt;
                </StyledButton>
                <StyledButton
                    variant="contained"
                    size="small"
                    disabled={data.filter( x => x.checked && x.right).length === 0}
                    className={classes.button}
                    onClick={handleCheckedLeft}
                    aria-label="move selected left"
                >
                    &lt;
                </StyledButton>
                <StyledButton
                    variant="contained"
                    size="small"
                    className={classes.button}
                    onClick={handleAllLeft}
                    aria-label="move all left"
                >
                    &lt;&lt;
                </StyledButton>

            </div>
            <div style={{marginLeft: "10px", position: "relative", flexGrow: 1, display: "flex", overflowY: "auto", flexDirection: "column" }}>
                <CustomList title={"Callbacks To Hide"} left={false} items={data} onClick={handleToggle} />
            </div>
        </div>
    )
}

export function CallbacksTabsHideMultipleDialog({onClose}) {

    const leftData = React.useRef([]);
    const rightData = React.useRef([]);
    const [initialData, setInitialData] = React.useState([]);
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
          setInitialData(callbackData);
      }
    });
    const submitTasking = () => {
      if(rightData.current.length === 0){
        onClose();
        return;
      }
      let callbackIDs = rightData.current.map(c => c.display_id);
      snackActions.info("Hiding callbacks...");
      hideCallback({variables: {callback_display_ids: callbackIDs}});
    }


  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Hide Multiple Callbacks at Once</DialogTitle>
        <DialogContent dividers={true} style={{height: "100%", display: "flex", flexDirection: "column", position: "relative",  maxHeight: "100%"}}>
            <CustomTransferList initialData={initialData}
                                parentLeftData={leftData}
                                parentRightData={rightData}  />
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

