import React, {useEffect} from 'react';
import {useQuery, gql} from '@apollo/client';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import Typography from '@mui/material/Typography';
import { MythicConfirmDialog } from '../../MythicComponents/MythicConfirmDialog';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import IconButton from '@mui/material/IconButton';
import {classes, StyledButton, StyledDivider} from '../../MythicComponents/MythicTransferList';
import {MythicAgentSVGIcon} from "../../MythicComponents/MythicAgentSVGIcon";
import MythicTextField from "../../MythicComponents/MythicTextField";
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';

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
    const [hoveredCommand, setHoveredCommand] = React.useState({});
    const [commandOptions, setCommandOptions] = React.useState([]);
    const selectedCommands = React.useRef([]);
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
    const finished = () => {
        let foundExit = false;
        for(let i = 0; i < selectedCommands.current.length; i++){
            if(selectedCommands.current[i]["supported_ui_features"].includes("callback_table:exit")){
              foundExit = true;
              break;
            }
        }
        if(foundExit){
          const cmdNames = selectedCommands.current.map( c => c.cmd);
          props.finished(cmdNames);
        }else if(props.buildOptions["agent_type"] === "agent") {
            // only alert for agent types, not service types
            confirmDialogCommands.current = selectedCommands.current;
            setOpenConfirmDialog(true);
        }else{
            const cmdNames = selectedCommands.current.map( c => c.cmd);
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
    const updateSelectedCommands = (commands) => {
        selectedCommands.current = commands;
    }
    return (
        <div style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
        }}>
            {/* Content area that can grow */}
            <div style={{
                flexGrow: 1,
                overflow: "hidden",
                display: "flex",
                flexDirection: "row",
                minHeight: 0 // Important for flex shrinking
            }}>
                {/* Left section - fixed height */}
                <div style={{
                    padding: "5px",
                    display: "flex",
                    width: "60%",
                    flexDirection: "column",
                    minHeight: 0,
                    overflow: "hidden" // Don't shrink this section
                }}>
                    <div style={{width: "100%", marginBottom: "5px", border: "1px solid grey", borderRadius: "5px", padding: "10px", display: "flex", flexShrink: 0}}>
                        <MythicAgentSVGIcon payload_type={props.buildOptions.payload_type} style={{width: "80px", padding: "5px", objectFit: "unset"}} />
                        <Typography variant="body2" component="p" style={{whiteSpace: "pre-wrap"}}>
                            <b>Description: </b>{props.buildOptions.description}
                        </Typography>
                    </div>
                    <div style={{width: "100%",
                        //border: "1px solid grey",
                        flexDirection: "column",
                        borderRadius: "5px",
                        //padding: "10px",
                        flexGrow: 1, minHeight: 0, display: "flex"}}>
                        <Typography variant={"p"} style={{fontWeight: 600}}>
                            {"1. Select Commands to Include in the Payload"}
                        </Typography>
                        <div style={{flexGrow: 1, minHeight: 0, overflow: "hidden", display: "flex"}}>
                            <CommandTransferSelect commands={commandOptions}
                                                   payload_type={props.buildOptions["payload_type"]}
                                                   first={props.first} last={props.last}
                                                   updateSelectedCommands={updateSelectedCommands}
                                                   setHoveredCommand={setHoveredCommand}/>
                        </div>

                    </div>
                </div>

                {/* Bottom section - scrollable table area */}
                <div style={{
                    width: "40%",
                    padding: "5px",
                    borderRadius: "5px",
                    display: "flex",
                    flexDirection: "column",
                    flexGrow: 1,
                    minHeight: 0, // Important for flex shrinking
                    overflow: "hidden"
                }}>
                    <div style={{width: "100%", flexGrow: 1, marginBottom: "5px", border: "1px solid grey", borderRadius: "5px", padding: "10px",
                                height: "40%"}}>
                        <Typography variant={"p"} style={{fontWeight: 600}}>
                            {"Hovered Command Details"}
                        </Typography><br/>
                            {hoveredCommand["cmd"] !== undefined &&
                                <>
                                    {hoveredCommand["cmd"]}
                                    <StyledDivider classes={{root: classes.divider}}/>
                                    <Typography style={{}}>
                                        <b>Description: </b>
                                    </Typography>
                                    <Typography style={{marginLeft: "20px"}}>
                                        {hoveredCommand["description"]}
                                    </Typography><br/>
                                </>
                            }

                    </div>
                    <div style={{width: "100%", flexGrow: 1,  marginBottom: "5px", border: "1px solid grey", borderRadius: "5px", padding: "10px",
                                height: "20%", overflow: "scroll"}}>
                        {hoveredCommand["reason"] !== "" ? (
                            <>
                                <Typography style={{}}>
                                    <b>{hoveredCommand["disabled"] ? ("Cannot be moved: ") : ("Information: ")} </b>
                                </Typography>
                                <Typography style={{marginLeft: "20px"}}>
                                    {hoveredCommand["reason"]}
                                </Typography>
                            </>
                        ) : (
                            <>
                                <Typography style={{}}>
                                    <b>{"Information: "} </b>
                                </Typography>
                                <Typography style={{marginLeft: "20px"}}>
                                    {"This command can be included or removed as needed"}
                                </Typography>
                            </>
                        )}
                        <Typography style={{}}>
                            <b>Command line Help: </b>
                        </Typography>
                        <Typography style={{marginLeft: "20px"}}>
                            {hoveredCommand["help_cmd"]}
                        </Typography>
                        <Typography style={{}}>
                            <b>Needs Admin Permissions: </b>
                        </Typography>
                        <Typography style={{marginLeft: "20px"}}>
                            {hoveredCommand["needs_admin"] ? "True" : "False"}
                        </Typography>
                        <Typography style={{}}>
                            <b>Supported UI Features: </b>
                        </Typography>
                        <Typography style={{marginLeft: "20px"}}>
                            {hoveredCommand?.supported_ui_features?.join(", ")}
                        </Typography>
                        {hoveredCommand?.attributes?.dependencies && hoveredCommand?.attributes?.dependencies.length > 0 &&
                            <>
                                <Typography style={{}}>
                                    <b>Dependencies: </b>
                                </Typography>
                                <Typography style={{marginLeft: "20px"}}>
                                    {hoveredCommand?.attributes?.dependencies.join(", ")}
                                </Typography>
                            </>}
                        {hoveredCommand?.attributes?.alias !== undefined &&
                            <>
                                <Typography style={{}}>
                                    <b>Alias: </b>
                                </Typography>
                                <Typography style={{marginLeft: "20px"}}>
                                    {hoveredCommand?.attributes?.alias ? "True":"False"}
                                </Typography>
                            </>}
                    </div>

                </div>
            </div>
            {openConfirmDialog &&
                <MythicConfirmDialog open={openConfirmDialog}
                                     title={"No exit command selected, continue?"}
                                     onClose={() => setOpenConfirmDialog(false)}
                                     acceptText="Accept"
                                     onSubmit={acceptConfirm} />
            }
            {/* Navigation buttons - always at bottom */}
            <div style={{flexShrink: 0}}>
                <CreatePayloadNavigationButtons
                    first={props.first}
                    last={props.last}
                    canceled={canceled}
                    finished={finished}
                />
                <br/><br/>
            </div>
        </div>
    );
}
function CommandTransferSelect(props) {
  const [commands, setCommands] = React.useState([]);
  const [leftFilter, setLeftFilter] = React.useState("");
  const [rightFilter, setRightFilter] = React.useState("");
  const handleToggle = (value) => () => {
      if(value.disabled){
          return;
      }
      const newCommands = commands.map( c => {
          if(c.cmd === value.cmd){
              return {...c, selected: !c.selected};
          }
          return {...c};
      });
      setCommands(newCommands);
  };
  const handleAllRight = () => {
      const newCommands = commands.map( c => {
          if(c.disabled){return {...c}}
          return {...c, left: false, right: true};
      });
      setCommands(newCommands);
  };
  const handleCheckedRight = () => {
    const newCommands = commands.map( c => {
        if(c.selected && c.left){
            return {...c, selected: false, left: false, right: true};
        }
        return {...c}
    });
    setCommands(newCommands);
  };
  const handleCheckedLeft = () => {
      const newCommands = commands.map( c => {
          if(c.selected && c.right){
              return {...c, selected: false, left: true, right: false};
          }
          return {...c}
      });
      setCommands(newCommands);
  };
  const handleAllLeft = () => {
      const newCommands = commands.map( c => {
          if(c.disabled){return {...c}}
          return {...c, left: true, right: false};
      });
      setCommands(newCommands);
  };
  useEffect( () => {
      const newCommands = props.commands.map( c => {
          if(c.selected){
              return {...c, selected: false, left: false, right: true};
          }
          return {...c, selected: false, left: true, right: false};
      });
      setCommands(newCommands);
  }, [props.commands]);
  useEffect( () => {
      props.updateSelectedCommands(commands.filter(c => c.right));
  }, [commands]);
  const setHoveredData = (event) => {
    const cmd = props.commands.filter( c => c.cmd === event.target.innerText );
    if(cmd.length > 0){
        props.setHoveredCommand(cmd[0]);
    }
  }
  const updateLeftFilter = (name, value, error) => {
      setLeftFilter(value);
  }
  const updateRightFilter = (name, value, error) => {
      setRightFilter(value);
  }
  const customList = (title, items, filter, setFilter) => (
    <div style={{width:"100%", flexGrow: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", padding: "5px", }} >
        <Typography style={{fontWeight: 600}} variant={"h5"}>
            {title}
        </Typography>
        <MythicTextField value={filter} onChange={setFilter} name={"Search Commands"} width={"100%"}
                         marginBottom={"0px"}
                        InputProps={{startAdornment: (
                            <InputAdornment position={"start"}>
                                <SearchIcon />
                            </InputAdornment>
                            )}}
        />
        <StyledDivider className={classes.divider}/>
        <div style={{display: "flex", flexGrow: 1, width: "100%", overflow: "hidden", minHeight: 0, }}>
            <List dense component="div" role="list" style={{
                flexGrow: 1, // Subtract header height
                padding:0, width: "100%", overflow: "auto", backgroundColor: "unset", maxHeight: "100%"}}>
                {items.map((valueObj) => {
                    const value = valueObj["cmd"];
                    const labelId = `transfer-list-item-${value}-label`;
                    if(filter !== "" && !value.includes(filter.toLowerCase())){return null}
                    return (
                        <div onMouseEnter={setHoveredData} key={'commandtransfer' + value}>
                            <ListItem style={{padding:0}} disabled={valueObj.disabled}
                                      key={value} role="listitem" onClick={handleToggle(valueObj)}
                            >
                                <ListItemIcon>
                                    <Checkbox
                                        disabled={valueObj.disabled}
                                        checked={valueObj.selected}
                                        tabIndex={-1}
                                        disableRipple
                                        inputProps={{ 'aria-labelledby': labelId }}
                                    />
                                </ListItemIcon>
                                <ListItemText id={labelId} primary={
                                    <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                                        {value}
                                        <IconButton variant="contained" onClick={(e) => e.stopPropagation()}
                                                href={"/docs/agents/" + props.payload_type + "/commands/" + value}
                                                style={{marginLeft: "10px", float: "right"}} target="_blank">
                                            <MenuBookIcon/>
                                        </IconButton>
                                    </div>
                                } />
                            </ListItem>
                        </div>
                    );
                })}
                <ListItem />
            </List>
        </div>
    </div>
  );
  return (
        <div style={{flexGrow: 1, width: "100%", display: "flex", minHeight: 0, alignItems: "stretch"}} className={classes.root}>
            {customList("Commands Available", commands.filter(c => c.left), leftFilter, updateLeftFilter)}
            <div style={{display: "flex", flexDirection: "column", flexShrink: 0, justifyContent: "center"}}>
                    <StyledButton
                        variant="contained"
                        size="small"
                        className={classes.button}
                        onClick={handleAllRight}
                        disabled={commands.filter(c => c.left && !c.disabled).length === 0}
                        aria-label="move all right"
                    >
                        &gt;&gt;
                    </StyledButton>
                    <StyledButton
                        variant="contained"
                        size="small"
                        className={classes.button}
                        onClick={handleCheckedRight}
                        disabled={commands.filter(c => c.left && c.selected).length === 0}
                        aria-label="move selected right"
                    >
                        &gt;
                    </StyledButton>
                    <StyledButton
                        variant="contained"
                        size="small"
                        className={classes.button}
                        onClick={handleCheckedLeft}
                        disabled={commands.filter( c => c.right && c.selected).length === 0}
                        aria-label="move selected left"
                    >
                        &lt;
                    </StyledButton>
                    <StyledButton
                        variant="contained"
                        size="small"
                        className={classes.button}
                        onClick={handleAllLeft}
                        disabled={commands.filter(c => c.right && !c.disabled).length === 0}
                        aria-label="move all left"
                    >
                        &lt;&lt;
                    </StyledButton>
            </div>
            {customList("Commands in Payload", commands.filter(c => c.right), rightFilter, updateRightFilter)}
        </div>
    );
}

/*
<div style={{display: "flex", flexDirection: "column", height: "100%", width: "100%", marginTop: "20px"}}>
            <CommandTransferSelect commands={commandOptions} payload_type={props.buildOptions["payload_type"]} first={props.first} last={props.last}
              canceled={canceled} finished={finished}/>

        </div>
 */