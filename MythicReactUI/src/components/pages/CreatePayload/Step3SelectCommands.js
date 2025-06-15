import React, {useEffect} from 'react';
import {useQuery, gql} from '@apollo/client';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import Typography from '@mui/material/Typography';
import { MythicConfirmDialog } from '../../MythicComponents/MythicConfirmDialog';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import CardHeader from '@mui/material/CardHeader';
import {classes, StyledButton, StyledDivider} from '../../MythicComponents/MythicTransferList';

const GET_Payload_Types = gql`
query getCommands($payloadType: String!) {
  command(where: {payloadtype: {name: {_eq: $payloadType}}, deleted: {_eq: false}}, order_by: {cmd: asc}) {
    cmd
    attributes
    id
    supported_ui_features
    help_cmd
    description
    needs_admin
  }
}
 `;

export function Step3SelectCommands(props){
    const confirmDialogCommands = React.useRef([]);
    const [commandOptions, setCommandOptions] = React.useState([]);
    const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);
    useQuery(GET_Payload_Types, {fetchPolicy: "network-only", variables: {payloadType: props.buildOptions["payload_type"]},
        onCompleted: ( data ) => {
          if(!props.buildOptions["supports_dynamic_loading"]){
              const allCommands = data.command.map( c => {
                return {...c, selected: true, disabled: true, reason: "Always included because agent doesn't support dynamic loading"}
              });
              setCommandOptions(allCommands);
              return
          }
            const allCommands = data.command.reduce( (prev, cur) => {
              try{
                const attributes = cur.attributes;
                if(attributes["supported_os"].length === 0 || attributes["supported_os"].includes(props.buildOptions["os"])){
                  if(attributes["builtin"] !== undefined && attributes["builtin"]){
                    return [...prev, {...cur, disabled: true, selected: true, reason: "This command is builtin and must be included"}];
                  }else{
                    try{
                      if(attributes["load_only"] !== undefined && attributes["load_only"]){
                          // command can't be loaded here, don't bother showing it
                          // {...cur, disabled: true, selected: false, reason: "This command can only be loaded in once a callback is established"}
                        return [...prev]
                      }
                      let include_command = true;
                      let build_option_that_sets_include_to_false = {};
                      if(attributes["filter_by_build_parameter"] !== undefined){
                        // if filter_attributes has keys, we need to filter down based on all of them
                        for( const[key, value] of Object.entries(attributes["filter_by_build_parameter"])){
                            for(let i = 0; i < props.buildOptions.parameters.length; i++){
                              if(props.buildOptions.parameters[i]["name"] === key){
                                if(props.buildOptions.parameters[i]["value"] !== value){
                                  include_command = false;
                                  build_option_that_sets_include_to_false["name"] = key;
                                  build_option_that_sets_include_to_false["value"] = value;
                                }
                              }
                            }
                        }
                      }
                      if(include_command){
                        if(attributes["suggested_command"] !== undefined && attributes["suggested_command"]){
                          return [...prev, {...cur, disabled: false, selected: true, reason: "This command is suggested to be included"}]
                        }else{
                          return [...prev, {...cur, disabled: false, selected: false, reason: ""}];
                        }
                      }else{
                          // command not possible due to build option, don't show it
                          // {...cur, disabled: true, selected: false, reason: "Not available when build option \"" + build_option_that_sets_include_to_false["name"] + "\" is not \"" + build_option_that_sets_include_to_false["value"] + "\""}
                        return [...prev]
                      }
                    }catch(error){
                      console.error(error);
                    }
                  }
                }
                // command isn't supported by the OS, so don't even show it as an option
                  // , {...cur, disabled: true, selected: false, reason: "This command isn't supported by the selected OS"}
                return [...prev];
              }catch(error){
                console.log(error);
                return [...prev, {...cur, disabled: false, selected: false, reason: "Failed to parse command attributes"}];
              }
            }, []);
            setCommandOptions(allCommands);
            if(props.prevData !== undefined){
              const selectedCommands = allCommands.map( (c) => {
                if(props.prevData.includes(c.cmd)){
                  return {...c, selected: true};
                }else{
                  return {...c, selected: false};
                }
              })
              setCommandOptions(selectedCommands);
            }
          }
    });
    const finished = (selectedCommands) => {
        let foundExit = false;
        for(let i = 0; i < selectedCommands.length; i++){
            if(selectedCommands[i]["supported_ui_features"].includes("callback_table:exit")){
              foundExit = true;
              break;
            }
        }
        if(foundExit){
          const cmdNames = selectedCommands.map( c => c.cmd);
          props.finished(cmdNames);
        }else if(props.buildOptions["agent_type"] === "agent") {
            // only alert for agent types, not service types
            confirmDialogCommands.current = selectedCommands;
            setOpenConfirmDialog(true);
        }else{
            const cmdNames = selectedCommands.map( c => c.cmd);
            props.finished(cmdNames);
        }
    }
    const acceptConfirm = () => {
      const cmdNames = confirmDialogCommands.current.map( c => c.cmd);
      props.finished(cmdNames);
    }
    const canceled = () => {
        props.canceled();
    }
    return (
        <div style={{display: "flex", flexDirection: "column", height: "100%", width: "100%", marginTop: "20px"}}>
            <CommandTransferSelect commands={commandOptions} payload_type={props.buildOptions["payload_type"]} first={props.first} last={props.last}
              canceled={canceled} finished={finished}/>
            {openConfirmDialog &&
                <MythicConfirmDialog open={openConfirmDialog}
                                     title={"No exit command selected, continue?"}
                                     onClose={() => setOpenConfirmDialog(false)}
                                     acceptText="Accept"
                                     onSubmit={acceptConfirm} />
            }
        </div>
    );
}

function CommandTransferSelect(props) {

  const [checked, setChecked] = React.useState([]);
  const [left, setLeft] = React.useState([]);
  const [right, setRight] = React.useState([]);
  const leftChecked = intersection(checked, left);
  const rightChecked = intersection(checked, right);
  const [hoveredCommand, setHoveredCommnad] = React.useState({});
  function not(a, b) {
      return a.filter( (value) => b.find( (element) => element["cmd"] === value["cmd"] && !element["disabled"] ) === undefined)
  }
  function intersection(a, b) {
      return a.filter( (value) => b.find( (element) => element["cmd"] === value["cmd"] && !element["disabled"] ) !== undefined)
  }
  const handleToggle = (value) => () => {
      if(value.disabled){
          return;
      }
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
    const initialLeft = props.commands.reduce( (prev, cur) => {
      if(cur.disabled && !cur.selected){
        return [...prev, {...cur}];
      }else{
        return [...prev];
      }
    }, [])
    const initialRight = props.commands.reduce( (prev, cur) => {
      if(!(cur.disabled && !cur.selected)){
        return [...prev, {...cur}];
      }else{
        return [...prev];
      }
    }, [])
    setLeft(initialLeft);
    setRight(initialRight);
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
    const initialLeft = props.commands.reduce( (prev, cur) => {
      if(!(cur.disabled && cur.selected)){
        return [...prev, {...cur}];
      }else{
        return [...prev];
      }
    }, [])
    const initialRight = props.commands.reduce( (prev, cur) => {
      if((cur.disabled && cur.selected)){
        return [...prev, {...cur}];
      }else{
        return [...prev];
      }
    }, [])
    setLeft(initialLeft);
    setRight(initialRight);
  };
  useEffect( () => {
    const initialLeft = props.commands.reduce( (prev, cur) => {
        if(!cur.selected){
          return [...prev, {...cur}];
        }else{
          return [...prev];
        }
    }, []);
    const initialRight = props.commands.reduce( (prev, cur) => {
      if(cur.selected){
        return [...prev, {...cur}];
      }else{
        return [...prev];
      }
    }, []);
    setLeft(initialLeft);
    setRight(initialRight);
  }, [props.commands]);
  const setHoveredData = (event) => {
    const cmd = props.commands.filter( c => c.cmd === event.target.innerText );
    if(cmd.length > 0){
      setHoveredCommnad(cmd[0]);
    }
  }
  const customList = (title, items) => (
    <div style={{width:"100%", height: "calc(40vh)", display: "flex", flexDirection: "column", overflowY: "auto"}} >
          <CardHeader title={title} />
          <StyledDivider className={classes.divider}/>
        <div style={{display: "flex", flexGrow: 1, overflowY: "auto", width: "100%"}}>
            <List dense component="div" role="list" style={{padding:0, width: "100%", overflow: "auto", backgroundColor: "unset"}}>
                {items.map((valueObj) => {
                    const value = valueObj["cmd"];
                    const labelId = `transfer-list-item-${value}-label`;
                    return (
                        <div onMouseEnter={setHoveredData} key={'commandtransfer' + value}>
                            <ListItem style={{padding:0}} disabled={valueObj["disabled"]}
                                      key={value} role="listitem" button onClick={handleToggle(valueObj)}
                            >
                                <ListItemIcon>
                                    <Checkbox
                                        disabled={valueObj["disabled"]}
                                        checked={checked.findIndex( (element) => element["cmd"] === value) !== -1}
                                        tabIndex={-1}
                                        disableRipple
                                        inputProps={{ 'aria-labelledby': labelId }}
                                    />
                                </ListItemIcon>
                                <ListItemText id={labelId} primary={value} />
                            </ListItem>
                        </div>
                    );
                })}
                <ListItem />
            </List>
        </div>
    </div>
  );
  const finished = () => {
    props.finished(right);
  }
return (
  <div style={{display: "flex", flexDirection: "column", height: "100%", width: "100%"}}>
    <div style={{flexGrow: 1}}>
        <Grid container spacing={2} justifyContent="center" alignItems="center" className={classes.root}>
            <Grid size={5}>
                {customList("Available Commands", left)}
            </Grid>
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
                </Grid>
            </Grid>
            <Grid size={5}>
                {customList("Commands Included", right)}
            </Grid>
        </Grid>
        <Grid container justifyContent="center" alignItems="flex-start" className={classes.root}>
            <Grid style={{height: "100%", marginBottom: "10px"}} size={12}>
                {hoveredCommand["cmd"] !== undefined &&
                    <Paper className={classes.paper} style={{width: "100%"}} elevation={5}>

                        <CardHeader
                            title={
                                <React.Fragment>
                                    {hoveredCommand["cmd"]}
                                    <Button variant="contained" color="primary"
                                            href={"/docs/agents/" + props.payload_type + "/commands/" + hoveredCommand["cmd"]}
                                            style={{marginLeft: "10px", float: "right"}} target="_blank">Documentation
                                    </Button>
                                </React.Fragment>
                            }
                        />
                        <StyledDivider classes={{root: classes.divider}}/>
                        {hoveredCommand["reason"] !== "" ? (
                            <Typography variant="body1" align="left" component="div"
                                        style={{"marginLeft": "10px"}}><b>{hoveredCommand["disabled"] ? ("Disabled Reason: ") : ("Information: ")} </b>{hoveredCommand["reason"]}
                            </Typography>
                        ) : null}
                        <br/>
                        <Typography align="left" component="div"
                                    style={{"marginLeft": "10px"}}><b>Commandline
                            Help: </b>{hoveredCommand["help_cmd"]}
                        </Typography>
                        <Typography align="left" component="div"
                                    style={{"marginLeft": "10px"}}><b>Needs Admin
                            Permissions: </b>{hoveredCommand["needs_admin"] ? "True" : "False"}
                        </Typography>
                        <Typography align="left" component="div"
                                    style={{"marginLeft": "10px"}}><b>Description: </b>{hoveredCommand["description"]}
                        </Typography>
                    </Paper>
                }

            </Grid>
        </Grid>
    </div>
    <CreatePayloadNavigationButtons first={props.first} last={props.last} canceled={props.canceled}
                                    finished={finished}/>
    <br/><br/>
  </div>
);
}