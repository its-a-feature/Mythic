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
import CardHeader from '@mui/material/CardHeader';
import ListItemText from '@mui/material/ListItemText';
import {useQuery, gql } from '@apollo/client';
import {TaskFromUIButton} from './TaskFromUIButton';
import { CardContent } from '@mui/material';
import {CallbacksTabsTaskingInput} from "./CallbacksTabsTaskingInput";
import {classes, StyledButton, StyledDivider} from '../../MythicComponents/MythicTransferList';


const callbacksAndFeaturesQuery = gql`
query callbacksAndFeatures($payloadtype_id: Int!) {
  callback(where: {active: {_eq: true}, payload: {payloadtype: { id: {_eq: $payloadtype_id}}}}, order_by: {id: asc}) {
    id
    host
    user
    process_name
    description
    integrity_level
    pid
    display_id
    mythictree_groups
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
                <CustomList title={"Callbacks Not Being Tasked"} left={true} items={data} onClick={handleToggle} />
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
                <CustomList title={"Callbacks To Task"} left={false} items={data} onClick={handleToggle} />
            </div>
        </div>
    )
}
export function CallbacksTabsTaskMultipleDialog({onClose, callback, me}) {
    const mountedRef = React.useRef(true);
    const [selectedToken, setSelectedToken] = React.useState({});
    const [openTaskingButton, setOpenTaskingButton] = React.useState(false);
    const taskingData = React.useRef({});
    const finalTaskedParameters = React.useRef(null);
    const [initialData, setInitialData] = React.useState([]);
    const leftData = React.useRef([]);
    const rightData = React.useRef([]);
    useQuery(callbacksAndFeaturesQuery, {variables: {payloadtype_id: callback.payload.payloadtype.id},
      fetchPolicy: "no-cache",
      onCompleted: (data) => {
          setInitialData(data.callback.map( c => {
          const display = `${c.id} - ${c.user}${c.integrity_level > 2 ? "*" : ""}@${c.host} (${c.pid}) - ${c.description}`;
          return {...c, display};
        }));
      }
    });
    const submitTasking = () => {
      //console.log("selectedFeature", selectedFeature)
      if(rightData.current.length === 0){
        onClose();
        console.log("rightData.current.length === 0")
        return;
      }
        const callbacks = rightData.current.map( c => c.display_id)
        if(callbacks.length > 0){
            if(finalTaskedParameters.current){
                taskingData.current = {...taskingData.current, callback_ids: callbacks, openDialog: false, parameters: finalTaskedParameters.current};
            }else{
                taskingData.current = {...taskingData.current, callback_ids: callbacks, openDialog: true};
            }
            setOpenTaskingButton(true);
        }else{
            //setOpenProgressIndicator(false);
            //onClose();
            return;
        }
    }
    const onTasked = ({tasked, variables}) => {
        onClose();
    }
    const onSubmitCommandLine = (message, cmd, parsed, force_parsed_popup, cmdGroupNames, previousTaskingLocation) => {
        //console.log(message, cmd, parsed);
        let params = message.split(" ");
        delete params[0];
        params = params.join(" ").trim();
        let newTaskingLocation = "parsed_cli";
        if(previousTaskingLocation.includes("modal")){
            newTaskingLocation = "modal_modified"
        }else if(previousTaskingLocation.includes("browserscript")){
            newTaskingLocation = "browserscript_modified";
        }
        if(cmd.commandparameters.length === 0){
            // if there are no parameters, just send whatever the user types along
            finalTaskedParameters.current = params;
            taskingData.current = {
                cmd: cmd.cmd,
                callback_id: callback.id,
                openDialog: false,
                parameters: params,
                tasking_location: newTaskingLocation,
                dontShowSuccessDialog: false
            };
            submitTasking();
            return;
        }else{
            // check if there's a "file" component that needs to be displayed
            const fileParamExists = cmd.commandparameters.find(param => param.parameter_type === "File" && cmdGroupNames.includes(param.parameter_group_name));
            //console.log("missing File for group? ", fileParamExists, cmdGroupNames);
            let missingRequiredPrams = false;
            if(cmdGroupNames.length === 1){
                const missingParams = cmd.commandparameters.filter(param => param.required && param.parameter_group_name === cmdGroupNames[0] && !(param.cli_name in parsed || param.name in parsed || param.display_name in parsed));
                if(missingParams.length > 0){
                    missingRequiredPrams = true;
                    console.log("missing required params", missingParams,parsed);
                }
            }else if(cmdGroupNames > 1 && !force_parsed_popup){
                // need to force a popup because the tasking is ambiguous
                console.log("command is ambiguous");
                force_parsed_popup = true;
            }
            if(fileParamExists || force_parsed_popup || missingRequiredPrams){
                //need to do a popup
                if(cmdGroupNames.length > 0){
                    finalTaskedParameters.current = undefined;
                    taskingData.current = {
                        cmd: cmd.cmd,
                        callback_id: callback.id,
                        openDialog: true,
                        parsedParameters: parsed,
                        groupName: cmdGroupNames[0],
                        parameters: params,
                        tasking_location: newTaskingLocation,
                        dontShowSuccessDialog: false
                    };
                }else{
                    finalTaskedParameters.current = undefined;
                    taskingData.current = {
                        cmd: cmd.cmd,
                        callback_id: callback.id,
                        openDialog: true,
                        parsedParameters: parsed,
                        parameters: params,
                        tasking_location: newTaskingLocation,
                        dontShowSuccessDialog: false
                    };
                }
                submitTasking();
                return;
            }else{
                delete parsed["_"];
                finalTaskedParameters.current = JSON.stringify(parsed);
                taskingData.current = {
                    cmd: cmd.cmd,
                    callback_id: callback.id,
                    openDialog: false,
                    parameters: finalTaskedParameters.current,
                    original_params: params,
                    parsedParameters: parsed,
                    tasking_location: newTaskingLocation,
                    dontShowSuccessDialog: false,
                    parameter_group_name: cmdGroupNames[0]
                };
                submitTasking();
            }
        }
    }
    const changeSelectedToken = (token) => {
        if(token === "Default Token"){
            setSelectedToken("Default Token");
            return;
        }
        if(token.token_id !== selectedToken.token_id){
            setSelectedToken(token);
        }
    }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Task Multiple {callback.payload.payloadtype.name} Callbacks at Once</DialogTitle>
        <DialogContent dividers={true} style={{height: "100%", display: "flex", flexDirection: "column", position: "relative",  maxHeight: "100%"}}>
            <CustomTransferList initialData={initialData}
                            parentLeftData={leftData}
                            parentRightData={rightData}  />
        <Grid item xs={12} >
            <CallbacksTabsTaskingInput filterTasks={false} onSubmitFilter={()=>{}} onSubmitCommandLine={onSubmitCommandLine}
                                       changeSelectedToken={changeSelectedToken}
                                       filterOptions={{}} callback_id={callback.id} callback_os={callback.payload.os} parentMountedRef={mountedRef} />
        </Grid>
        </DialogContent>
        {openTaskingButton && 
            <TaskFromUIButton cmd={taskingData.current?.cmd} 
                callback_id={taskingData?.current?.callback_id || 0}
                callback_ids={taskingData?.current?.callback_ids || undefined}
                parameters={taskingData.current?.parameters || ""}
                openDialog={taskingData.current?.openDialog || false}
                tasking_location={taskingData.current?.tasking_location || "command_line"}
                dontShowSuccessDialog={taskingData.current?.dontShowSuccessDialog || false}
                onTasked={onTasked}/>
        }
        <DialogActions>
          <Button onClick={onClose} variant="contained" color="primary">
            Cancel
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

