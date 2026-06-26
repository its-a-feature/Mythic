import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import ListItemText from '@mui/material/ListItemText';
import {
  MythicDialogBody,
  MythicDialogGrid,
  MythicDialogSection
} from '../../MythicComponents/MythicDialogLayout';

export function CredentialTableNewCredentialDialog(props) {
  const initialValues = props.initialValues || {};
  const stringifyMetadata = (metadata) => {
    if(metadata === undefined || metadata === null){
      return "{}";
    }
    if(typeof metadata === "string"){
      try{
        return JSON.stringify(JSON.parse(metadata), null, 2);
      }catch(error){
        return metadata;
      }
    }
    return JSON.stringify(metadata, null, 2);
  }
  const defaultCredentialOptions = [
    "plaintext", "ticket", "hash", "certificate", "key", "hex", "cookie"
  ];
  const credentialOptions = Array.isArray(props.credentialOptions) && props.credentialOptions.length > 0 ? props.credentialOptions : defaultCredentialOptions;
  const initialCredentialType = initialValues.type && credentialOptions.includes(initialValues.type) ? initialValues.type : credentialOptions[0];
  const [credentialType, setCredentialType] = React.useState(initialCredentialType || "plaintext");
  const [account, setAccount] = React.useState(initialValues.account || "");
  const [realm, setRealm] = React.useState(initialValues.realm || "");
  const [credential, setCredential] = React.useState(initialValues.credential || "");
  const [comment, setComment] = React.useState(initialValues.comment || "");
  const [metadata, setMetadata] = React.useState(stringifyMetadata(initialValues.metadata));

  const validateMetadata = (value) => {
    try{
      const parsedMetadata = value.trim() === "" ? {} : JSON.parse(value);
      return parsedMetadata === null || Array.isArray(parsedMetadata) || typeof parsedMetadata !== "object";
    }catch(error){
      return true;
    }
  }

  const onSubmit = () => {
    let parsedMetadata = {};
    try{
      parsedMetadata = metadata.trim() === "" ? {} : JSON.parse(metadata);
      if(parsedMetadata === null || Array.isArray(parsedMetadata) || typeof parsedMetadata !== "object"){
        return;
      }
    }catch(error){
      return;
    }
    props.onSubmit({
      realm,
      account,
      comment,
      credential,
      metadata: parsedMetadata,
      "type": credentialType
    });
    props.onClose();
  }
  const onAccountChange = (name, value, error) => {
    setAccount(value);
  }
  const onCommentChange = (name, value, error) => {
    setComment(value);
  }
  const onRealmChange = (name, value, error) => {
    setRealm(value);
  }
  const onCredentialChange = (name, value, error) => {
    setCredential(value);
  }
  const onMetadataChange = (name, value, error) => {
    setMetadata(value);
  }
  const handleCredentialTypeChange = (event) => {
    setCredentialType(event.target.value);
  }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Register New Credential</DialogTitle>
        <DialogContent dividers={true}>
            <MythicDialogBody>
              <MythicDialogSection title="Credential Details">
                <MythicDialogGrid>
                  <FormControl fullWidth size="small">
                    <InputLabel id="credential-type-label">Credential Type</InputLabel>
                    <Select
                      labelId="credential-type-label"
                      id="credential-type"
                      value={credentialType}
                      label="Credential Type"
                      onChange={handleCredentialTypeChange}
                    >
                      {credentialOptions.map((name) => (
                        <MenuItem key={name} value={name}>
                          <ListItemText primary={name} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <MythicTextField value={realm} onChange={onRealmChange} name="Realm or Domain"/>
                  <MythicTextField value={account} onChange={onAccountChange} name="Account Name"/>
                </MythicDialogGrid>
              </MythicDialogSection>
              <MythicDialogSection title="Credential Material">
                <MythicTextField multiline value={credential} onChange={onCredentialChange} name="Credential"/>
                <MythicTextField value={comment} onChange={onCommentChange} name="Comment"/>
                <MythicTextField multiline value={metadata} onChange={onMetadataChange} name="Metadata" validate={validateMetadata} errorText="Metadata must be a JSON object"/>
              </MythicDialogSection>
            </MythicDialogBody>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" >
            Close
          </Button>
          <Button onClick={onSubmit} color="success" variant="contained" >
            Create
          </Button>
        </DialogActions>
    </React.Fragment>
  );
}
