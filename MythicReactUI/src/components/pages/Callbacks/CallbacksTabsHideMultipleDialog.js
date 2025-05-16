import React, {useEffect} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import {useQuery, gql } from '@apollo/client';
import {useMutation} from '@apollo/client';
import {hideCallbacksMutation} from './CallbackMutations';
import {snackActions} from "../../utilities/Snackbar";
import {CallbacksTableLastCheckinCell, CallbacksTablePayloadTypeCell, CallbacksTableIPCell} from "./CallbacksTableRow";
import { DataGrid } from '@mui/x-data-grid';


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

const columns = [
    { field: 'display_id', headerName: 'ID', width: 70, type: 'number', },
    {
        field: 'host',
        headerName: 'Host',
        flex: 0.5,
    },
    {
        field: 'user',
        headerName: 'User',
        flex: 0.5,
    },
    {
        field: 'pid',
        headerName: 'PID',
        type: 'number',
        width: 70,
    },
    {
        field: 'description',
        headerName: 'Description',
        flex: 1,
    },
    {
      field: 'ip',
      headerName: 'IP',
      width: 100,
      renderCell: (params) => <CallbacksTableIPCell rowData={params.row} cellData={params.row.ip} />,
        sortable: false,
      valueGetter: (value, row) => {
          try{
              return JSON.parse(row.ip)[0];
          }catch(error){
              return row.ip;
          }
      }
    },
    {
        field: "last_checkin",
        headerName: "Checkin",
        width: 100,
        valueGetter: (value, row) => new Date(row.last_checkin),
        renderCell: (params) =>
            <CallbacksTableLastCheckinCell rowData={params.row} />,
    },
    {
        field: "payload.payloadtype.name",
        headerName: "Agent",
        flex: 0.5,
        valueGetter: (value, row) => row.payload.payloadtype.name,
        renderCell: (params) => <CallbacksTablePayloadTypeCell rowData={params.row} />
    },
    {
        field: "mythictree_groups_string",
        headerName: "Groups",
        flex: 0.5,
    }
];
const CustomSelectTable = ({initialData, selectedData}) => {
    const [data, setData] = React.useState([]);
    const [rowSelectionModel, setRowSelectionModel] = React.useState({
        type: 'include',
        ids: new Set([]),
    });
    React.useEffect( () => {
        selectedData.current = data.reduce( (prev, cur) => {
            if(rowSelectionModel.ids.has(cur.id)){return [...prev, cur]}
            return [...prev];
        }, []);
    }, [data, rowSelectionModel]);
    React.useEffect( () => {
        setData(initialData.map(c => {
            return {...c};
        }));
    }, [initialData]);
    return (
        <div style={{height: "calc(80vh)"}}>
            <DataGrid
                rows={data}
                columns={columns}
                initialState={{
                    pagination: {
                        paginationModel: {
                        },
                    },
                    sorting: {
                        sortModel: [{ field: 'last_checkin', sort: 'asc' }],
                    },
                }}
                autoPageSize
                checkboxSelection
                onRowSelectionModelChange={(newRowSelectionModel) => {
                    setRowSelectionModel(newRowSelectionModel);
                }}
                rowSelectionModel={rowSelectionModel}
                density={"compact"}
            />
        </div>

    )
}
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
    useQuery(callbacksAndFeaturesQuery,{
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
            <CustomSelectTable initialData={initialData}
                               selectedData={selectedData}  />
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

