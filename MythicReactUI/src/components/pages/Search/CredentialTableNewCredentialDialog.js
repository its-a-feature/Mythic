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
  const [credentialType, setCredentialType] = React.useState("plaintext");
  const credentialOptions = [
    "plaintext", "ticket", "hash", "certificate", "key", "hex"
  ];
  const [account, setAccount] = React.useState("");
  const [realm, setRealm] = React.useState("");
  const [credential, setCredential] = React.useState("");
  const [comment, setComment] = React.useState("");


  const onSubmit = () => {
    props.onSubmit({
      realm,
      account,
      comment,
      credential,
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
