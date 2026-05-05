import React from 'react';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import ListItemText from '@mui/material/ListItemText';
import FormControlLabel from '@mui/material/FormControlLabel';
import { gql, useQuery} from '@apollo/client';
import {
  MythicDialogBody,
  MythicDialogChoiceDivider,
  MythicDialogChoiceRow,
  MythicDialogSection
} from '../../MythicComponents/MythicDialogLayout';

const artifactHostSearch = gql`
query artifactHostAndTypeQuery {
    taskartifact(distinct_on: base_artifact) {
      base_artifact
    }
    artifactHosts: taskartifact(distinct_on: host) {
      host
    }
    callback(distinct_on: host) {
      host
    }
}
`;

export function ArtifactTableNewArtifactDialog(props) {
  const [baseArtifact, setBaseArtifact] = React.useState("");
  const [baseArtifactOptions, setBaseArtifactOptions] = React.useState([]);
  const [customBaseArtifact, setCustomBaseArtifact] = React.useState("");
  const [host, setHost] = React.useState("");
  const [customHost, setCustomHost] = React.useState("");
  const [hostOptions, setHostOptions] = React.useState([]);
  const [artifact, setArtifact] = React.useState("");
  const [needsCleanup, setNeedsCleanup] = React.useState(false);
  const [resolved, setResolved] = React.useState(false);
  useQuery(artifactHostSearch, {fetchPolicy: "no-cache",
    onCompleted: (data) => {
        setBaseArtifactOptions(data.taskartifact.map(t => t.base_artifact).sort());
        let hosts = data.callback.map(c => c.host);
        hosts = data.artifactHosts.reduce( (prev, cur) => {
          if(hosts.includes(cur.host)){
            return [...prev];
          }
          return [...prev, cur.host];
        }, hosts);
        hosts.sort();
        setHostOptions(hosts);
        if(data.taskartifact.length > 0){
          setBaseArtifact(data.taskartifact[0].base_artifact);
        }
        if(hosts.length > 0){
          setHost(hosts[0]);
        }
    }
  })
  const onSubmit = () => {
    props.onSubmit({
      host: customHost === "" ? host : customHost,
      artifact,
      needs_cleanup: needsCleanup,
      resolved,
      base_artifact: customBaseArtifact === "" ? baseArtifact : customBaseArtifact
    });
    props.onClose();
  }
  const onCustomHostChange = (name, value, error) => {
    setCustomHost(value);
  }
  const onHostChange = (e) => {
    setHost(e.target.value);
  }
  const onArtifactChange = (name, value, error) => {
    setArtifact(value);
  }
  const onNeedsCleanupChange = (e) => {
    setNeedsCleanup(e.target.checked);
  }
  const onNeedsResolvedChanged = (e) => {
    setResolved(e.target.checked);
  }
  const handleBaseArtifactChange = (event) => {
    setBaseArtifact(event.target.value);
  }
  const handleCustomBaseArtifactChange = (name, value, error) => {
    setCustomBaseArtifact(value);
  }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Register New Artifact</DialogTitle>
      <DialogContent dividers={true}>
        <MythicDialogBody>
          <MythicDialogSection title="Artifact Type">
            <MythicDialogChoiceRow>
              <FormControl fullWidth size="small">
                <InputLabel id="artifact-type-label">Existing Artifact Type</InputLabel>
                <Select
                    labelId="artifact-type-label"
                    id="artifact-type"
                    value={baseArtifact}
                    label="Existing Artifact Type"
                    disabled={customBaseArtifact !== ""}
                    onChange={handleBaseArtifactChange}
                >
                  {baseArtifactOptions.map((name) => (
                      <MenuItem key={name} value={name}>
                        <ListItemText primary={name}/>
                      </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <MythicDialogChoiceDivider />
              <MythicTextField value={customBaseArtifact} onChange={handleCustomBaseArtifactChange}
                               name="Custom Artifact Type"/>
            </MythicDialogChoiceRow>
          </MythicDialogSection>
          <MythicDialogSection title="Host">
            <MythicDialogChoiceRow>
              <FormControl fullWidth size="small">
                <InputLabel id="artifact-host-label">Existing Host</InputLabel>
                <Select
                    labelId="artifact-host-label"
                    id="artifact-host"
                    value={host}
                    label="Existing Host"
                    disabled={customHost !== ""}
                    onChange={onHostChange}
                >
                  {hostOptions.map((name) => (
                      <MenuItem key={name} value={name}>
                        <ListItemText primary={name}/>
                      </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <MythicDialogChoiceDivider />
              <MythicTextField value={customHost} onChange={onCustomHostChange}
                               name="New Host"/>
            </MythicDialogChoiceRow>
          </MythicDialogSection>
          <MythicDialogSection title="Artifact">
            <MythicTextField multiline value={artifact} onChange={onArtifactChange} name="Artifact"/>
          </MythicDialogSection>
          <MythicDialogSection title="Cleanup State">
            <FormControlLabel
                className="mythic-dialog-switch-row"
                label={"Artifact needs to be cleaned up"}
                control={
                  <Switch
                      checked={needsCleanup}
                      onChange={onNeedsCleanupChange}
                      color="info"
                      inputProps={{'aria-label': 'primary checkbox'}}
                      name="needs_cleanup"
                  />
                }
                labelPlacement={"start"}
            />
            {needsCleanup &&
                <FormControlLabel
                    className="mythic-dialog-switch-row"
                    label={"Artifact is already cleaned up"}
                    labelPlacement={"start"}
                    control={<Switch
                        checked={resolved}
                        onChange={onNeedsResolvedChanged}
                        color="info"
                        inputProps={{'aria-label': 'primary checkbox'}}
                        name="resolved"
                    />}
                />
            }
          </MythicDialogSection>

        </MythicDialogBody>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} variant="contained">
          Close
        </Button>
        <Button onClick={onSubmit} color="success" variant="contained">
          Create
        </Button>
      </DialogActions>
    </React.Fragment>
  );
}
