import React from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import Select from '@mui/material/Select';
import Input from '@mui/material/Input';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import ListItemText from '@mui/material/ListItemText';
const PREFIX = 'CredentialTableNewCredentialDialog';

const classes = {
  formControl: `${PREFIX}-formControl`,
  chips: `${PREFIX}-chips`,
  chip: `${PREFIX}-chip`,
  noLabel: `${PREFIX}-noLabel`
};

const Root = styled('div')((
  {
    theme
  }
) => ({
  [`& .${classes.formControl}`]: {
    margin: theme.spacing(1),
    width: "100%",
  },

  [`& .${classes.chips}`]: {
    display: 'flex',
    flexWrap: 'wrap',
  },

  [`& .${classes.chip}`]: {
    margin: 2,
  },

  [`& .${classes.noLabel}`]: {
    marginTop: theme.spacing(2),
  }
}));

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
    <Root>
        <DialogTitle id="form-dialog-title">Register New Credential</DialogTitle>
        <DialogContent dividers={true}>
            <React.Fragment>
                <FormControl className={classes.formControl}>
                <InputLabel id="operator-chip-label">Which Type of Credential</InputLabel>
                <Select
                  labelId="operator-chip-label"
                  id="operator-chip"
                  value={credentialType}
                  onChange={handleCredentialTypeChange}
                  input={<Input />}
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
              <MythicTextField multiline value={credential} onChange={onCredentialChange} name="Credential"/>
              <MythicTextField value={comment} onChange={onCommentChange} name="Comment"/>
              
            </React.Fragment>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" >
            Close
          </Button>
          <Button onClick={onSubmit} color="success" variant="contained" >
            Create
          </Button>
        </DialogActions>
  </Root>
  );
}

