import React from 'react';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import {DialogContent, Button} from '@mui/material';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import {snackActions} from "../../utilities/Snackbar";
import {useLazyQuery, gql} from '@apollo/client';
import {APITokenRow} from "./SettingsOperatorAPITokenRow";
import MythicTextField from "../../MythicComponents/MythicTextField";
import {deleteAPITokenMutation, toggleAPITokenActiveMutation} from "./SettingsOperatorTableRow";
import {useMutation} from '@apollo/client';

const searchAPITokensQuery = gql`
query searchAPITokensQuery($apitoken: String!) {
    apitokens(where: {token_value: {_eq: $apitoken}}) {
          token_value
          token_type
          id
          active
          name
          deleted
          eventstepinstance {
            eventstep {
                id
                name
            }
            eventgroupinstance {
                id
                eventgroup {
                    id
                    name
                }
            }
          }
          created_by_operator {
            username
            id
          }
    }
}
`;
export function SettingsOperatorAPITokenSearchDialog(props) {
    const [search, setSearch] = React.useState("");
    const [searchResults, setSearchResults] = React.useState([]);
    const [searchTokens] = useLazyQuery(searchAPITokensQuery, {
        fetchPolicy: "no-cache",
        onCompleted: (result) => {
            setSearchResults(result.apitokens);
        },
        onError: (err) => {
            console.log(err);
            snackActions.error("Unable to search apitokens");
        }
    });
    const onAccept = () => {
        searchTokens({variables: {apitoken: search }});
    }
    const onChangeSearch = (name, value, error, evt) => {
        setSearch(value);
    }
    const updatingTokenIdRef = React.useRef(0);
    const [deleteAPIToken] = useMutation(deleteAPITokenMutation, {
        onCompleted: (data) => {
            if(data.deleteAPIToken.status === "error"){
                snackActions.error(data.deleteAPIToken.error);
                return
            }
            const updatedSearchResults = searchResults.map( t => {
                if(t.id === updatingTokenIdRef.current){
                    return {...t, deleted: true};
                }
                return {...t};
            })
            setSearchResults(updatedSearchResults);
            snackActions.success("successfully deleted API Token");
        },
        onError: (data) => {
            console.log(data);
        }
    });
    const [toggleAPITokenActive] = useMutation(toggleAPITokenActiveMutation, {
        onCompleted: (data) => {
            const updatedSearchResults = searchResults.map( t => {
                if(t.id === updatingTokenIdRef.current){
                    return {...t, active: data.update_apitokens_by_pk.active};
                }
                return {...t};
            })
            setSearchResults(updatedSearchResults);
        },
        onError: (data) => {

        }
    })
    const onDeleteAPIToken = (id) => {
        updatingTokenIdRef.current = id;
        deleteAPIToken({variables: {id}})
    }
    const onToggleActive = (id, active) => {
        updatingTokenIdRef.current = id;
        toggleAPITokenActive({variables:{id, active}})
    }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Search API Tokens</DialogTitle>
        <DialogContent>
            <MythicTextField fullWidth={true} value={search} onEnter={onAccept} onChange={onChangeSearch}
                             placeholder={"Search full API Token here..."}/>
        </DialogContent>

        <TableContainer className="mythicElement">
            <Table size="small" aria-label="tokens" style={{"tableLayout": "fixed", "overflowWrap": "break-word", width: "100%"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "2rem"}}></TableCell>
                        <TableCell style={{width: "5rem"}}>Active</TableCell>
                        <TableCell style={{width: "12rem"}}>Created By</TableCell>
                        <TableCell style={{width: "7rem"}}>Token</TableCell>
                        <TableCell style={{width: "9rem"}}>Type</TableCell>
                        <TableCell >Name</TableCell>
                        <TableCell >Eventing</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {
                        searchResults.map((token) => (
                            <APITokenRow {...token} key={"token" + token.id}
                                         onDeleteAPIToken={onDeleteAPIToken}
                                         onToggleActive={onToggleActive}
                            />))
                    }
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

