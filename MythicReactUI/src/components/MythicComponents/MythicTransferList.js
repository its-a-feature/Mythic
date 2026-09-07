import React, {useEffect} from 'react';
import { styled } from '@mui/material/styles';
import {MythicActionButton} from './MythicActionButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import Divider from '@mui/material/Divider';

const PREFIX = 'MythicTransferList';

export const classes = {
    divider: `${PREFIX}-divider`
};

export const StyledDivider = styled(Divider)((
    {
        theme
    }
) => ({
    [`&.${classes.divider}`]: {
        backgroundColor: theme.palette.primary.main,
        border: `2px solid ${theme.palette.primary.main}`
    }
}));
const CustomListElement = ({value, onClick, itemKey}) => {
    const displayValue = itemKey ? value[itemKey] : value.value;
    const labelId = `transfer-list-item-${displayValue}-label`;
    return (
        <ListItem style={{padding:0}} key={displayValue} role="listitem" button onClick={() => onClick(value)}>
            <ListItemIcon>
                <Checkbox
                    checked={value.checked}
                    tabIndex={-1}
                    disableRipple
                    inputProps={{ 'aria-labelledby': labelId }}
                />
            </ListItemIcon>
            <ListItemText id={labelId} primary={displayValue} />
        </ListItem>
    );
}
const CustomList = ({title, items, left, onClick, itemKey}) => {

    return (
        <div className="mythic-transfer-list flex flex-column min-w-0 overflow-hidden w-full rounded bg-surface border-subtle">
            <div className="mythic-transfer-list-header bg-table-header text-xs font-700 leading-125 border-b text-primary">{title}</div>
            <div className="mythic-transfer-list-body flex-fill overflow-auto">
                <List dense component="div" role="list" style={{padding:0, width: "100%"}}>
                    {items.map((value, index) => (
                        <div key={index}>
                            {
                                left && value.left &&
                                <CustomListElement itemKey={itemKey} value={value} onClick={onClick}/>
                            }
                            {
                                !left && value.right &&
                                <CustomListElement itemKey={itemKey} value={value} onClick={onClick} />
                            }
                        </div>

                    ))}
                </List>
            </div>
        </div>
    );
}
const CustomTransferList = ({leftTitle, rightTitle, initialData, parentLeftData, parentRightData, itemKey}) => {

    const [data, setData] = React.useState(initialData);
    const handleToggle = (value)  => {
        const updatedData = data.map(d => {
            const key = itemKey ? itemKey : "value";
            if(value[key] === d[key]){
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
        setData(initialData);
    }, [initialData]);
    return (
        <div style={{display: "flex", flexDirection: "row", overflowY: "auto", flexGrow: 1, minHeight: 0}}>
            <div  style={{paddingLeft: 0, flexGrow: 1,  marginLeft: 0, marginRight: "10px", position: "relative",  overflowY: "auto", display: "flex", flexDirection: "column" }}>
                <CustomList title={leftTitle} left={true} items={data} onClick={handleToggle} itemKey={itemKey} />
            </div>
            <div className="mythic-transfer-controls py-0 px-4 items-center flex flex-column gap-6 justify-center">
                <MythicActionButton
                    colorMode="always"
                    tone="primary"
                    variant="contained"
                    size="small"
                    onClick={handleAllRight}
                    aria-label="move all right"
                >
                    &gt;&gt;
                </MythicActionButton>
                <MythicActionButton
                    colorMode="always"
                    tone="primary"
                    variant="contained"
                    size="small"
                    disabled={data.filter( x => x.checked && x.left).length === 0}
                    onClick={handleCheckedRight}
                    aria-label="move selected right"
                >
                    &gt;
                </MythicActionButton>
                <MythicActionButton
                    colorMode="always"
                    tone="primary"
                    variant="contained"
                    size="small"
                    disabled={data.filter( x => x.checked && x.right).length === 0}
                    onClick={handleCheckedLeft}
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
                    aria-label="move all left"
                >
                    &lt;&lt;
                </MythicActionButton>

            </div>
            <div style={{marginLeft: "10px", position: "relative", flexGrow: 1, display: "flex", overflowY: "auto", flexDirection: "column" }}>
                <CustomList title={rightTitle} left={false} items={data} onClick={handleToggle} itemKey={itemKey} />
            </div>
        </div>
    )
}
export function MythicTransferListDialog(props) {
    const [initialData, setInitialData] = React.useState([]);
    const leftData = React.useRef([]);
    const rightData = React.useRef([]);
    const itemKey = React.useRef(props.itemKey);
    const leftTitle = React.useRef(props.leftTitle);
    const rightTitle = React.useRef(props.rightTitle);

    useEffect( () => {
        const leftData = props.left.map(c => {
            if(props.itemKey){
                return {...c, checked: false, left: true, right: false};
            }
            return {value: c, checked: false, left: true, right: false};
        })
        const rightData = props.right.map(c => {
            if(props.itemKey){
                return {...c, checked: false, left: false, right: true};
            }
            return {value: c, checked: false, left: false, right: true};
        })
        setInitialData([...leftData, ...rightData]);
    }, [props.left, props.right, props.itemKey]);
    const setFinalTags = () => {
        const finalLeft = leftData.current.map( c => {
            const key = itemKey.current ? itemKey.current : "value";
            return c[key];
        });
        const finalRight = rightData.current.map( c => {
            const key = itemKey.current ? itemKey.current : "value";
            return c[key];
        })
      props.onSubmit({left: finalLeft, right: finalRight});
      props.onClose();
    }
  return (
    <>
        <DialogTitle id="form-dialog-title">{props.dialogTitle}</DialogTitle>
        <DialogContent dividers={true}>
            <CustomTransferList initialData={initialData}
                                parentLeftData={leftData}
                                parentRightData={rightData}
                                rightTitle={rightTitle.current}
                                leftTitle={leftTitle.current}
                                itemKey={itemKey.current}
            />
        </DialogContent>
        <DialogActions>
            <MythicActionButton colorMode="always" onClick={props.onClose} tone="primary" variant="contained">
            Close
            </MythicActionButton>
            <MythicActionButton colorMode="always" onClick={setFinalTags} tone="success" variant="contained">
            Submit
            </MythicActionButton>
        </DialogActions>
  </>
  );
}
