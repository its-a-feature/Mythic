import React from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import {useQuery, gql } from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
const PREFIX = 'SelectPayloadTypeDialog';

const classes = {
  formControl: `${PREFIX}-formControl`
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
  }
}));

const getPayloadTypes = gql`
query getAllPayloadTypes{
  payloadtype(where: {wrapper: {_eq: false}}, order_by: {name: asc}) {
    name
  }
}
`;
export function SelectPayloadTypeDialog(props) {

    const [payloadtypeOptions, setPayloadtypeOptions] = React.useState([]);
    const [selectedPayloadType, setSelectedPayloadType] = React.useState('');
    const handleSubmit = () => {
        if(selectedPayloadType === ""){
          props.onClose();
          return;
        }
        props.onSubmit(selectedPayloadType);
        props.onClose();
    }
    const handleChange = (event) => {
      setSelectedPayloadType(event.target.value);
    }
    const { loading, error } = useQuery(getPayloadTypes, {
        onCompleted: data => {
            const options = data.payloadtype.map( p => p.name);
            if(options.length > 0){
              setSelectedPayloadType(options[0]);
            }
            setPayloadtypeOptions(options);
        },
        fetchPolicy: "network-only"
    });
    if (loading) {
     return <LinearProgress style={{marginTop: "10px"}} />;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
  return (
    <Root>
        <DialogTitle >Select a Payload Type to Filter On</DialogTitle>
        <DialogContent dividers={true}>
            <React.Fragment>
                <FormControl className={classes.formControl}>
                  <Select
                    labelId="demo-dialog-select-label-profile"
                    id="demo-dialog-select"
                    
                    value={selectedPayloadType}
                    onChange={handleChange}
                    style={{minWidth: "30%"}}
                  >
                    <MenuItem value="">
                      None
                    </MenuItem>
                    {payloadtypeOptions.map( (opt) => (
                        <MenuItem value={opt} key={opt}>{opt}</MenuItem>
                    ) )}
                  </Select>
                </FormControl>
            </React.Fragment>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Close
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="success">
            Select
          </Button>
        </DialogActions>
  </Root>
  );
}

