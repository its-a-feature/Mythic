import React, {useState} from 'react';
import {useQuery, gql} from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

export const allTokenDataFragment = gql`
fragment allTokenData on token {
  app_container_sid
	app_container_number
  capabilities
  default_dacl
  groups
  handle
  integrity_level_sid
  logon_sid
  privileges
  restricted
  session_id
  thread_id
  token_id
  user
  task_id
  description
  id
	host
	operation_id
	timestamp
	process_id
}
`;
const getTokenInfo = gql`
${allTokenDataFragment}
query getTokenInfo ($token_id: Int!) {
  token_by_pk(id: $token_id) {
    ...allTokenData
  }
}
`;

export function TaskTokenDialog(props) {
    const [tokenData, setTokenData] = useState([]);
    const tokenKeys = [
        "app_container_number",
        "app_container_sid",
        "capabilities",
        "default_dacl",
        "groups",
        "handle",
        "integrity_level_sid",
        "logon_sid",
        "privileges",
        "restricted",
        "session_id",
        "thread_id",
        "token_id",
        "user",
        "description",
        "process_id"
    ]
    useQuery(getTokenInfo, {
        variables: {token_id: props.token_id},
        onCompleted: data => {
            if(data.token_by_pk !== null){
                setTokenData(data.token_by_pk);
                const reducedTokenData = tokenKeys.reduce( (prev, key) => {
                  if(data.token_by_pk[key] !== undefined && data.token_by_pk[key] !== null && data.token_by_pk[key] !== ""){
                      return [...prev, {"name": key, "value": data.token_by_pk[key]}]
                  }
                  else{
                    return [...prev];
                  }
                }, []);
                setTokenData(reducedTokenData);  
            }
        },
        onError: data => {
            snackActions.error(data)
        },
        fetchPolicy: "network-only"
    });
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Token Information</DialogTitle>
            <TableContainer className="mythicElement">
              <Table size="small" style={{"tableLayout": "fixed", "maxWidth": "calc(100vw)", "overflow": "scroll"}}>
                    <TableHead>
                        <TableRow>
                            <TableCell style={{width: "30%"}}>Token Property</TableCell>
                            <TableCell>Token Value</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                      {tokenData.map( (element, index) => (
                        <TableRow key={'row' + index} hover>
                          <TableCell>{element.name}</TableCell>
                          <TableCell>{element.value === true ? ("True") : (element.value === false ? ("False") : (element.value) ) }</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                </Table>
              </TableContainer>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
    </React.Fragment>
  );
}

