import React, {useRef} from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import Input from '@mui/material/Input';
import {useQuery, gql } from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import {snackActions} from "../../utilities/Snackbar";

const PREFIX = 'ManuallyAddEdgeDialog';

const classes = {
  formControl: `${PREFIX}-formControl`,
  selectEmpty: `${PREFIX}-selectEmpty`
};

const Root = styled('div')((
  {
    theme
  }
) => ({
  [`& .${classes.formControl}`]: {
    margin: theme.spacing(1),
    minWidth: 120,
    width: "97%"
  },

  [`& .${classes.selectEmpty}`]: {
    marginTop: theme.spacing(2),
  }
}));

const getP2PProfilesAndCallbacks = gql`
query getP2PProfilesAndCallbacks{
  c2profile(where: {is_p2p: {_eq: true}, deleted: {_eq: false}}) {
    callbackc2profiles(where: {callback: {active: {_eq: true}}}) {
      id
      callback {
        id
        display_id
        description
      }
    }
    name
    id
  }
}
`;
export function ManuallyAddEdgeDialog(props) {

    const [callbackOptions, setCallbackOptions] = React.useState([]);
    const [profileOptions, setProfileOptions] = React.useState([]);
    const [selectedDestination, setSelectedDestination] = React.useState('');
    const [selectedProfile, setSelectedProfile] = React.useState('');
    const inputRefC2 = useRef(null); 
    const inputRefDestination = useRef(null); 
    const handleChangeProfile = (event) => {
      setSelectedProfile(event.target.value);
      if(event.target.value === ""){
        setCallbackOptions([]);
        setSelectedDestination("");
      }else{
        const cbopts = event.target.value["callbackc2profiles"].filter( (cb) => cb.callback.id !== props.source.id );
        setCallbackOptions(cbopts);
        if(cbopts.length > 0){
            setSelectedDestination(cbopts[0]);
        }
      }
      
    };
    const handleChangeDestination = (event) => {
      setSelectedDestination(event.target.value);
    };
    const handleSubmit = () => {
        if(selectedDestination === ""){
            snackActions.error("Must select a valid destination");
            return;
        }
        props.onSubmit(props.source.display_id, selectedProfile, selectedDestination.callback);
        props.onClose();
    }
    const { loading, error } = useQuery(getP2PProfilesAndCallbacks, {
        onCompleted: data => {
            setProfileOptions([...data.c2profile]);
            if(data.c2profile.length > 0){
                setSelectedProfile(data.c2profile[0]);
                const cbopts = data.c2profile[0]["callbackc2profiles"].filter( (cb) => cb.callback.id !== props.source.id );
                setCallbackOptions(cbopts);
                if(cbopts.length > 0){
                    setSelectedDestination(cbopts[0]);
                }
            }
        },
        fetchPolicy: "network-only"
    });
    if (loading) {
     return <LinearProgress style={{marginTop: "10px"}} />;
    }
    if (error) {
     console.error(error);
     return <div>Error! {error.message}</div>;
    }
  return (
    <Root>
        <DialogTitle >Manually Add Edge From Callback {props.source.display_id}</DialogTitle>
        <DialogContent dividers={true}>
            <React.Fragment>
                Manually add an edge from Callback {props.source.display_id} to another callback via a P2P C2 Profile.<br/>
                <FormControl className={classes.formControl}>
                  <InputLabel ref={inputRefC2}>Profile</InputLabel>
                  <Select
                    labelId="demo-dialog-select-label-profile"
                    id="demo-dialog-select"
                    value={selectedProfile}
                    onChange={handleChangeProfile}
                    style={{minWidth: "30%"}}
                    input={<Input />}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {profileOptions.map( (opt) => (
                        <MenuItem value={opt} key={"profile:" + opt.id}>{opt.name}</MenuItem>
                    ) )}
                  </Select>
                </FormControl><br/>
                <FormControl className={classes.formControl}>
                  <InputLabel ref={inputRefDestination}>Destination</InputLabel>
                  <Select
                    labelId="demo-dialog-select-label-destination"
                    id="demo-dialog-select-destination"
                    value={selectedDestination}
                    onChange={handleChangeDestination}
                    input={<Input />}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {callbackOptions.map( (opt) => (
                        <MenuItem value={opt} key={"callback:" + opt.callback.id}>{opt.callback.display_id} ({opt.callback.description})</MenuItem>
                    ) )}
                  </Select>
                </FormControl>
            </React.Fragment>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Close
          </Button>
          <Button disabled={selectedDestination === ""} onClick={handleSubmit} variant="contained" color="success">
            Add
          </Button>
        </DialogActions>
  </Root>
  );
}

