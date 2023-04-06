import React from 'react';
import {useQuery, gql} from '@apollo/client';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import Select from '@mui/material/Select';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import Typography from '@mui/material/Typography';
import {snackActions} from '../../utilities/Snackbar';


const GET_Payload_Types = gql`
query getPayloadTypesQuery {
  payloadtype(where: {deleted: {_eq: false}, wrapper: {_eq: true}}) {
    id
    supported_os
  }
}
 `;

export function Step1SelectOS(props){
    const [os, setOS] = React.useState('');
    const [osOptions, setOSOptions] = React.useState([]);
    const { loading } = useQuery(GET_Payload_Types, {fetchPolicy: "network-only",
    onCompleted: (data) => {
        const optionsReduced= data.payloadtype.reduce((currentOptions, payloadtype) => {
            const adds = payloadtype.supported_os.reduce( (prev, os) => {
                    if(!currentOptions.includes(os)){
                        return [...prev, os];
                    }
                    return prev;
                }, []);
            return [...currentOptions, ...adds];
        }, []);
        const sortedOptions = optionsReduced.sort();
        if(props.prevData !== undefined){
            setOS(props.prevData);
        }
        else if(os === "" && sortedOptions.length > 0){
            setOS(sortedOptions[0]);
        } else if(sortedOptions.length === 0 ){
            snackActions.warning("No Wrappers exist within Mythic. Try importing one first via the mythic-cli binary")
        
        }
        setOSOptions(sortedOptions);
    },
    onError: (data) => {
        console.error(data);
        snackActions.error(data.message)
    }
    });

    if (loading) {
     return <div><CircularProgress /></div>;
    }
    const finished = () => {
        if(osOptions.length === 0){
            snackActions.warning("No Wrappers exist within Mythic. Try importing one first via the mythic-cli binary");
            return;
        } else if (os === ""){
            snackActions.error("Must select an operating system first");
        } else {
            props.finished(os);
        }
        
    }
    const canceled = () => {
        props.canceled();
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
                osOptions.map((opt) => (
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
