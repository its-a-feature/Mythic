import React from 'react';
import {useQuery, gql} from '@apollo/client';
import CircularProgress from '@material-ui/core/CircularProgress';
import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';
import Select from '@material-ui/core/Select';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import Typography from '@material-ui/core/Typography';
import { MythicConfirmDialog } from '../../MythicComponents/MythicConfirmDialog';


const GET_Payload_Types = gql`
query getCommands($payloadType: String!) {
  command(where: {payloadtype: {ptype: {_eq: $payloadType}}, script_only: {_eq: false}, deleted: {_eq: false}}, order_by: {cmd: asc}) {
    cmd
    attributes
    id
    supported_ui_features
  }
}
 `;

export function Step3SelectCommands(props){
    const [commands, setCommands] = React.useState([]);
    const [commandOptions, setCommandOptions] = React.useState([]);
    const [isDisabled, setIsDisabled] = React.useState(false);
    const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);
    const { loading, error, data } = useQuery(GET_Payload_Types, {variables: {payloadType: props.buildOptions["payload_type"]},
        onCompleted: commandData => {
          
          if(!props.buildOptions["supports_dynamic_loading"]){
              setIsDisabled(true);
              const allCommands = data.command.map( cmd => cmd.cmd);
              setCommandOptions(allCommands);
              setCommands(allCommands);
          }else{
            const allCommands = data.command.reduce( (prev, cur) => {
              try{
                const attributes = JSON.parse(cur.attributes);
                if(attributes["supported_os"].length === 0 || attributes["supported_os"].includes(props.buildOptions["os"])){
                  return [...prev, cur.cmd];
                }
                return [...prev];
              }catch(error){
                return [...prev, cur.cmd];
              }
            }, []);
            setCommandOptions(allCommands);
          }
        }
    });

    if (loading) {
     return <div><CircularProgress /></div>;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    const finished = () => {
        let foundExit = false;
        for(let i = 0; i < data.command.length; i++){
          if(commands.includes(data.command[i]["cmd"])){
            if(data.command[i]["supported_ui_features"].includes("callback_table:exit")){
              foundExit = true;
              break;
            }
          }
        }
        if(foundExit){
          props.finished(commands);
        }else{
          setOpenConfirmDialog(true);
        }
        
    }
    const canceled = () => {
        props.canceled();
    }
    const handleChangeMultiple = (event) => {
        const { options } = event.target;
        const value = [];
        for (let i = 0, l = options.length; i < l; i += 1) {
          if (options[i].selected) {
            value.push(options[i].value);
          }
        }
        setCommands(value);
      };
    return (
        <div >
        <Typography variant="h3" align="left" id="selectcommands" component="div" 
            style={{ "marginLeft": "10px"}}>
              Select Commands
        </Typography> <br/>
        
        <FormControl>
            <Select
              multiple
              native
              disabled={isDisabled}
              value={commands}
              inputProps={{size: 20}}
              onChange={handleChangeMultiple}
            >
            {
                commandOptions.map((opt) => (
                    <option key={"step3" + opt} value={opt}>{opt}</option>
                ))
            }
            </Select>
            <FormHelperText>Select Commands</FormHelperText>
        </FormControl><br/><br/>
        <MythicConfirmDialog open={openConfirmDialog} 
            title={"No exit command selected, continue?"} 
            onClose={() => setOpenConfirmDialog(false)} 
            acceptText="Accept"
            onSubmit={() => props.finished(commands)} />
        <CreatePayloadNavigationButtons first={props.first} last={props.last} canceled={canceled} finished={finished} />
        </div>
    );
} 
