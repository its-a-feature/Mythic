import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {gql, useMutation} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {HexColorInput, HexColorPicker} from 'react-colorful';
import {Typography, Box} from '@mui/material';

const newTagtypeMutation = gql`
mutation newTagType($name: String!, $description: String!, $color: String!) {
  insert_tagtype_one(object: {color: $color, description: $description, name: $name}) {
    id
  }
}
`;

const updateTagtypeMutation = gql`
mutation updateTagType($id: Int!, $name: String!, $description: String!, $color: String!){
  update_tagtype_by_pk(pk_columns: {id: $id}, _set: {color: $color, description: $description, name: $name}) {
    id
  }
}
`;

export function NewTagtypesDialog(props) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState("");
  React.useEffect( () => {
    if(props.currentTag !== undefined){
      setName(props.currentTag.name);
      setDescription(props.currentTag.description);
      setColor(props.currentTag.color);
    }
  }, []);
  const [createNewTagtype] = useMutation(newTagtypeMutation, {
    update: (cache, {data}) => {
        if(data.insert_tagtype_one.id !== undefined){
          snackActions.info("Created new tagtype");
          props.onSubmit({name, description, color, id: data.insert_tagtype_one.id});
        } else {
          snackActions.error("Failed to create new tag type");
        }
        props.onClose();
    }
  }); 
  const [updateTagtype] = useMutation(updateTagtypeMutation, {
    update: (cache, {data}) => {
      if(data.update_tagtype_by_pk.id !== undefined){
        snackActions.info("Successfully updated!");
        props.onSubmit({name, description, color, id: data.update_tagtype_by_pk.id});
      } else {
        snackActions.error("Failed to update tag type");
      }
      props.onClose();
    }
  }) 
  const onCommitSubmit = () => {
    if(name === ""){
      snackActions.warning("Must supply a name");
    } else if(description === ""){
      snackActions.warning("Must supply a description");
    } else {
      if(props.currentTag !== undefined){
        updateTagtype({variables: {name, description, color, id: props.currentTag.id}});
      } else {
        createNewTagtype({variables: {name, description, color}});
      }
      
    }
  }
  const onChangeName = (name, value, error) => {
    setName(value);
  }
  const onChangeDescription = (name, value, error) => {
    setDescription(value);
  }
    
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Create a new type of tag</DialogTitle>

        <TableContainer component={Paper} className="mythicElement">
          <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
              <TableHead>
                  <TableRow>
                      <TableCell>Field</TableCell>
                      <TableCell>Value</TableCell>
                  </TableRow>
              </TableHead>
              <TableBody>
                <TableRow hover>
                  <TableCell>Name</TableCell>
                  <TableCell>
                    <MythicTextField value={name} onChange={onChangeName} showLabel={false} />
                  </TableCell>
                </TableRow>
                <TableRow hover>
                  <TableCell>Description</TableCell>
                  <TableCell>
                  <MythicTextField value={description} onChange={onChangeDescription} showLabel={false} />
                  </TableCell>
                </TableRow>
                <TableRow hover>
                  <TableCell>Color</TableCell>
                  <TableCell>
                    <HexColorPicker style={{width: "100%"}} color={color} onChange={setColor} />
                    <HexColorInput style={{width: "100%"}} color={color} onChange={setColor} />
                    <Box sx={{width: "100%", height: 25, backgroundColor: color}} >
                    <Typography style={{textAlign: "center"}} >
                      {"Sample Text"}
                    </Typography>
                  </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
        </TableContainer>
        <DialogActions>
          <Button variant="contained" onClick={props.onClose} color="primary">
            Close
          </Button>
          <Button variant="contained" onClick={onCommitSubmit} color="success">
            Submit
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

