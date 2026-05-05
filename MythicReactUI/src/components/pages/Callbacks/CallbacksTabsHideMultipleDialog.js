import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql } from '@apollo/client';
import {useMutation} from '@apollo/client';
import {hideCallbacksMutation} from './CallbackMutations';
import {snackActions} from "../../utilities/Snackbar";
import  DialogContentText  from '@mui/material/DialogContentText';
import {CallbacksTabsSelectTable} from "./CallbacksTabsSelectTable";


const callbacksAndFeaturesQuery = gql`
query callbacksAndFeatures{
  callback(where: {active: {_eq: true}}, order_by: {id: asc}) {
    id
    display_id
    host
    ip
    user
    process_name
    pid
    description
    last_checkin
    dead
    payload {
        payloadtype {
            name
            id
            agent_type
        }
    }
    mythictree_groups_string
  }
}`;

export function CallbacksTabsHideMultipleDialog({onClose}) {

    const selectedData = React.useRef([]);
    const [initialData, setInitialData] = React.useState([]);
    const [hideCallback] = useMutation(hideCallbacksMutation, {
        onCompleted: data => {
            snackActions.success("Successfully hid callbacks!")
            onClose();
        },
        onError: data => {
            console.log(data);
            snackActions.error(data.message);
            onClose();
        }
    });
    const {loading} = useQuery(callbacksAndFeaturesQuery,{
      fetchPolicy: "no-cache",
      onCompleted: (data) => {
        const callbackData = data.callback.map( c => {
          // for each callback, get a unique set of supported features
          const display = `${c.display_id} - ${c.user}@${c.host} (${c.pid}) - ${c.description}`;
          return {...c, display};
        });
          setInitialData(callbackData);
      }
    });
    const submitTasking = () => {
      if(selectedData.current.length === 0){
        onClose();
        return;
      }
      let callbackIDs = selectedData.current.map(c => c.display_id);
      snackActions.info("Hiding callbacks...");
      hideCallback({variables: {callback_display_ids: callbackIDs}});
    }


  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Hide Multiple Callbacks at Once</DialogTitle>
        <DialogContentText style={{textAlign: "center"}}>
            <b>Note: </b> Last checkin times are based on when this window opened and won't refresh.
        </DialogContentText>
            <CallbacksTabsSelectTable initialData={initialData}
                                      loading={loading}
                                      selectedData={selectedData}
                                      sortModel={{ field: 'last_checkin', sort: 'asc' }}
                                      tableId="hide-multiple-callbacks-table"
                                      tableLabel="Hide multiple callbacks"
            />
        <DialogActions>
          <Button onClick={onClose} variant="contained" color="primary">
            Close
          </Button>
          <Button onClick={submitTasking} variant="contained" color="warning">
            Hide
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}
export function CallbacksTabsSelectMultipleDialog({onClose, onSubmit}) {

    const selectedData = React.useRef([]);
    const [initialData, setInitialData] = React.useState([]);
    const {loading} = useQuery(callbacksAndFeaturesQuery,{
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            const callbackData = data.callback.map( c => {
                // for each callback, get a unique set of supported features
                const display = `${c.display_id} - ${c.user}@${c.host} (${c.pid}) - ${c.description}`;
                return {...c, display};
            });
            setInitialData(callbackData);
        }
    });
    const submitTasking = () => {
        if(selectedData.current.length === 0){
            onClose();
            return;
        }
        onSubmit(selectedData.current);
    }


    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title">Select Multiple Callbacks</DialogTitle>
            <DialogContentText style={{textAlign: "center"}}>
                <b>Note: </b> Last checkin times are based on when this window opened and won't refresh.
            </DialogContentText>
            <CallbacksTabsSelectTable initialData={initialData}
                                      loading={loading}
                                      selectedData={selectedData}
                                      sortModel={{ field: 'display_id', sort: 'desc' }}
                                      tableId="select-multiple-callbacks-table"
                                      tableLabel="Select multiple callbacks"
            />
            <DialogActions>
                <Button onClick={onClose} variant="contained" color="primary">
                    Close
                </Button>
                <Button onClick={submitTasking} variant="contained" color="warning">
                    Use Selection
                </Button>
            </DialogActions>
        </React.Fragment>
    );
}
