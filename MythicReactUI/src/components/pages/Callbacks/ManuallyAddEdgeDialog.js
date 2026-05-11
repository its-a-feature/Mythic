import React from 'react';
import Box from '@mui/material/Box';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Typography from '@mui/material/Typography';
import {useQuery, gql } from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import {snackActions} from "../../utilities/Snackbar";
import {
    MythicDialogBody,
    MythicDialogButton,
    MythicDialogFooter,
    MythicDialogGrid,
    MythicDialogSection,
    MythicFormField
} from "../../MythicComponents/MythicDialogLayout";

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
const CallbackSummary = ({callback, label}) => (
    <Box className="mythic-c2-edge-callback-summary">
        {label &&
            <Typography component="div" className="mythic-c2-edge-summary-label">
                {label}
            </Typography>
        }
        <Box className="mythic-c2-edge-summary-main">
            <span className="mythic-c2-edge-callback-id">#{callback?.display_id}</span>
            <span className="mythic-c2-edge-summary-description">
                {callback?.description || "No description"}
            </span>
        </Box>
    </Box>
);
const getDestinationOptions = (profiles, sourceId) => {
    const destinations = new Map();
    profiles.forEach((profile) => {
        profile.callbackc2profiles.forEach((callbackProfile) => {
            if(callbackProfile.callback.id === sourceId){return}
            const key = callbackProfile.callback.id;
            const current = destinations.get(key) || {
                callback: callbackProfile.callback,
                profiles: [],
            };
            current.profiles.push(profile);
            destinations.set(key, current);
        });
    });
    return Array.from(destinations.values()).sort((a, b) => b.callback.display_id - a.callback.display_id);
};
export function ManuallyAddEdgeDialog(props) {

    const [callbackOptions, setCallbackOptions] = React.useState([]);
    const [profileOptions, setProfileOptions] = React.useState([]);
    const [selectedDestination, setSelectedDestination] = React.useState('');
    const [selectedProfile, setSelectedProfile] = React.useState('');
    const handleChangeProfile = (event) => {
        setSelectedProfile(event.target.value);
    };
    const handleChangeDestination = (event) => {
        const destination = event.target.value;
        setSelectedDestination(destination);
        if(destination === ""){
            setSelectedProfile("");
            return;
        }
        const availableProfiles = destination.profiles || [];
        const profileStillValid = availableProfiles.some((profile) => profile.id === selectedProfile?.id);
        if(!profileStillValid){
            setSelectedProfile(availableProfiles[0] || "");
        }
    };
    const handleSubmit = () => {
        if(selectedDestination === ""){
            snackActions.error("Must select a valid destination");
            return;
        }
        if(selectedProfile === ""){
            snackActions.error("Must select a valid P2P C2 profile");
            return;
        }
        props.onSubmit(props.source.display_id, selectedProfile, selectedDestination.callback);
        props.onClose();
    }
    const { loading, error } = useQuery(getP2PProfilesAndCallbacks, {
        onCompleted: data => {
            const profiles = [...data.c2profile];
            const destinations = getDestinationOptions(profiles, props.source.id);
            setProfileOptions(profiles);
            setCallbackOptions(destinations);
            if(destinations.length > 0){
                setSelectedDestination(destinations[0]);
                setSelectedProfile(destinations[0].profiles[0] || "");
            }else{
                setSelectedDestination("");
                setSelectedProfile("");
            }
        },
        fetchPolicy: "network-only"
    });
    const availableProfileOptions = selectedDestination === "" ? profileOptions : selectedDestination.profiles || [];
    if (loading) {
     return (
        <>
            <DialogTitle className="mythic-c2-action-title">Add P2P Edge</DialogTitle>
            <DialogContent dividers={true}>
                <LinearProgress />
            </DialogContent>
        </>
     );
    }
    if (error) {
     console.error(error);
     return (
        <>
            <DialogTitle className="mythic-c2-action-title">Add P2P Edge</DialogTitle>
            <DialogContent dividers={true}>
                <MythicDialogBody>
                    <MythicDialogSection title="Unable to load edge options" description={error.message} />
                </MythicDialogBody>
            </DialogContent>
            <MythicDialogFooter>
                <MythicDialogButton onClick={props.onClose}>Close</MythicDialogButton>
            </MythicDialogFooter>
        </>
     );
    }
  return (
    <>
        <DialogTitle className="mythic-c2-action-title">
            <div className="mythic-dialog-title-row">
                <div>
                    <Typography component="div" className="mythic-c2-action-title-text">
                        Add P2P Edge
                    </Typography>
                    <Typography component="div" className="mythic-c2-action-title-subtitle">
                        Create a manual route from callback {props.source.display_id} through a peer-to-peer C2 profile.
                    </Typography>
                </div>
            </div>
        </DialogTitle>
        <DialogContent dividers={true}>
            <MythicDialogBody>
                <MythicDialogSection
                    title="Route"
                    description="Choose the destination callback first, then the P2P C2 profile for that route."
                >
                    <MythicDialogGrid minWidth="15rem" className="mythic-c2-edge-endpoints-grid">
                        <MythicFormField label="Source callback" className="mythic-c2-edge-source-field">
                            <CallbackSummary callback={props.source} />
                        </MythicFormField>
                        <MythicFormField
                            label="Destination callback"
                            required
                        >
                            <FormControl fullWidth size="small">
                                <InputLabel id="manual-c2-edge-destination-label">Destination</InputLabel>
                                <Select
                                    labelId="manual-c2-edge-destination-label"
                                    id="manual-c2-edge-destination"
                                    value={selectedDestination}
                                    onChange={handleChangeDestination}
                                    input={<OutlinedInput label="Destination" />}
                                >
                                    <MenuItem value="">
                                        <em>None</em>
                                    </MenuItem>
                                    {callbackOptions.map( (opt) => (
                                        <MenuItem value={opt} key={"callback:" + opt.callback.id}>
                                            #{opt.callback.display_id} {opt.callback.description ? `- ${opt.callback.description}` : ""}
                                        </MenuItem>
                                    ) )}
                                </Select>
                            </FormControl>
                        </MythicFormField>
                    </MythicDialogGrid>
                    <Box className="mythic-c2-edge-profile-row">
                        <MythicFormField
                            label="P2P C2 profile"
                            description="Only profiles available for the selected destination are shown."
                            required
                        >
                            <FormControl fullWidth size="small">
                                <InputLabel id="manual-c2-edge-profile-label">Profile</InputLabel>
                                <Select
                                    labelId="manual-c2-edge-profile-label"
                                    id="manual-c2-edge-profile"
                                    value={selectedProfile}
                                    onChange={handleChangeProfile}
                                    input={<OutlinedInput label="Profile" />}
                                >
                                    <MenuItem value="">
                                        <em>None</em>
                                    </MenuItem>
                                    {availableProfileOptions.map( (opt) => (
                                        <MenuItem value={opt} key={"profile:" + opt.id}>
                                            {opt.name}
                                        </MenuItem>
                                    ) )}
                                </Select>
                            </FormControl>
                        </MythicFormField>
                    </Box>
                </MythicDialogSection>
            </MythicDialogBody>
        </DialogContent>
        <MythicDialogFooter>
          <MythicDialogButton onClick={props.onClose}>
            Close
          </MythicDialogButton>
          <MythicDialogButton disabled={selectedDestination === "" || selectedProfile === ""} onClick={handleSubmit} intent="primary">
            Add Edge
          </MythicDialogButton>
        </MythicDialogFooter>
    </>
  );
}
