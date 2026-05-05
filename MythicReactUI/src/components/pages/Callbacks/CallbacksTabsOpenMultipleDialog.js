import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql } from '@apollo/client';
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

export function CallbacksTabsOpenMultipleDialog({onClose, tabType, onOpenTabs}) {
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
    const onRowClick = (rowData) => {
      onOpenTabs([rowData]);
    }


  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Select Callback to open {tabType} tab</DialogTitle>
        <DialogContentText style={{textAlign: "center"}}>
            <b>Note: </b> Last checkin times are based on when this window opened and won't refresh.
        </DialogContentText>
            <CallbacksTabsSelectTable initialData={initialData}
                                      loading={loading}
                                      onRowClick={onRowClick}
                                      selectable={false}
                                      sortModel={{ field: 'display_id', sort: 'desc' }}
                                      tableId={`open-multiple-${tabType}-callbacks-table`}
                                      tableLabel={`Open ${tabType} callback`}
            />
        <DialogActions>
          <Button onClick={onClose} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}
