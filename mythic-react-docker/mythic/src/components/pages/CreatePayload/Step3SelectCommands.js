import React from 'react';
import {useQuery, gql} from '@apollo/client';
import CircularProgress from '@material-ui/core/CircularProgress';
import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';
import Select from '@material-ui/core/Select';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import Typography from '@material-ui/core/Typography';


const GET_Payload_Types = gql`
query getCommands($payloadType: String!) {
  command(where: {payloadtype: {ptype: {_eq: $payloadType}}}, order_by: {cmd: asc}) {
    cmd
    id
  }
}
 `;

export function Step3SelectCommands(props){
    const [commands, setCommands] = React.useState([]);
    const { loading, error, data } = useQuery(GET_Payload_Types, {variables: {payloadType: props.buildOptions["payload_type"]}});

    if (loading) {
     return <div><CircularProgress /></div>;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    const finished = () => {
        props.finished(commands);
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
              value={commands}
              inputProps={{size: 20}}
              onChange={handleChangeMultiple}
            >
            {
                data.command.map((opt) => (
                    <option key={"step3" + opt.cmd} value={opt.cmd}>{opt.cmd}</option>
                ))
            }
            </Select>
            <FormHelperText>Select Commands</FormHelperText>
        </FormControl><br/><br/>
        <CreatePayloadNavigationButtons first={props.first} last={props.last} canceled={canceled} finished={finished} />
        </div>
    );
} 
