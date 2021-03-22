import React from 'react';
import {useQuery, gql} from '@apollo/client';
import CircularProgress from '@material-ui/core/CircularProgress';
import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';
import Select from '@material-ui/core/Select';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import Typography from '@material-ui/core/Typography';


const GET_Payload_Types = gql`
query getPayloadTypesQuery {
  payloadtype(where: {deleted: {_eq: false}, wrapper: {_eq: false}}) {
    id
    supported_os
  }
}
 `;

export function Step1SelectOS(props){
    const [os, setOS] = React.useState('');
    const { loading, error, data } = useQuery(GET_Payload_Types, {fetchPolicy: "network-only"});

    if (loading) {
     return <div><CircularProgress /></div>;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    const finished = () => {
        props.finished(os);
    }
    const canceled = () => {
        props.canceled();
    }
    const getOSOptions = () => {
        const optionsReduced= data.payloadtype.reduce((currentOptions, payloadtype) => {
            const adds = payloadtype.supported_os.split(",").reduce( (prev, os) => {
                    if(!currentOptions.includes(os)){
                        return [...prev, os];
                    }
                    return prev;
                }, []);
            return [...currentOptions, ...adds];
        }, []);
        const sortedOptions = optionsReduced.sort();
        if(os === ""){
            setOS(sortedOptions[0]);
        }
        return sortedOptions;
    }
    return (
        <div >
        <Typography variant="h3" align="left" id="selectospage" component="div" 
            style={{ "marginLeft": "10px"}}>
              Select Target Operating System
        </Typography> <br/>
        
        <FormControl>
            <Select
              native
              value={os}
              onChange={evt => setOS(evt.target.value)}
            >
            {
                getOSOptions().map((opt) => (
                    <option key={"step1" + opt} value={opt}>{opt}</option>
                ))
            }
            </Select>
            <FormHelperText>Target Operating System</FormHelperText>
        </FormControl><br/><br/>
        <CreatePayloadNavigationButtons first={props.first} last={props.last} canceled={canceled} finished={finished} />
        </div>
    );
} 
