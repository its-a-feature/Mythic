import React, {useEffect} from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import {useQuery, gql } from '@apollo/client';
import {TaskFromUIButton} from './TaskFromUIButton';
import {CallbacksTabsTaskingInput} from "./CallbacksTabsTaskingInput";
import {CallbacksTableIPCell, CallbacksTableLastCheckinCell} from "./CallbacksTableRow";
import { DataGrid } from '@mui/x-data-grid';
import { validate as uuidValidate } from 'uuid';
import {snackActions} from "../../utilities/Snackbar";


const callbacksAndFeaturesQuery = gql`
query callbacksAndFeatures($payloadtype_id: Int!) {
  callback(where: {active: {_eq: true}, payload: {payloadtype: { id: {_eq: $payloadtype_id}}}}, order_by: {id: asc}) {
    id
    host
    user
    process_name
    description
    integrity_level
    pid
    display_id
    last_checkin
    ip
    dead
    mythictree_groups_string
    payload {
        payloadtype {
            agent_type
        }
    }
  }
}`;

const columns = [
    { field: 'display_id', headerName: 'ID', width: 80, type: 'number', },
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
        width: 80,
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
                        sortModel: [{ field: 'display_id', sort: 'desc' }],
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
export function CallbacksTabsTaskMultipleDialog({onClose, callback}) {
    const mountedRef = React.useRef(true);
    const [selectedToken, setSelectedToken] = React.useState({});
    const [openTaskingButton, setOpenTaskingButton] = React.useState(false);
    const taskingData = React.useRef({});
    const finalTaskedParameters = React.useRef(null);
    const [initialData, setInitialData] = React.useState([]);
    const selectedData = React.useRef([]);
    useQuery(callbacksAndFeaturesQuery, {variables: {payloadtype_id: callback.payload.payloadtype.id},
      fetchPolicy: "no-cache",
      onCompleted: (data) => {
          setInitialData(data.callback.map( c => {
          const display = `${c.id} - ${c.user}${c.integrity_level > 2 ? "*" : ""}@${c.host} (${c.pid}) - ${c.description}`;
          return {...c, display};
        }));
      }
    });
    const submitTasking = () => {
      //console.log("selectedFeature", selectedFeature)
      if(selectedData.current.length === 0){
        //onClose();
          snackActions.warning("No callbacks selected");
        return;
      }
        const callbacks = selectedData.current.map( c => c.display_id)
        if(callbacks.length > 0){
            if(finalTaskedParameters.current){
                taskingData.current = {...taskingData.current, callback_ids: callbacks, openDialog: false, parameters: finalTaskedParameters.current};
            }else{
                taskingData.current = {...taskingData.current, callback_ids: callbacks, openDialog: true};
            }
            setOpenTaskingButton(true);
        }else{
            //setOpenProgressIndicator(false);
            //onClose();
            return;
        }
    }
    const onTasked = ({tasked, variables}) => {
        //onClose();
        setOpenTaskingButton(false);
    }
    const onSubmitCommandLine = (message, cmd, parsed, force_parsed_popup, cmdGroupNames, previousTaskingLocation) => {
        //console.log(message, cmd, parsed);
        if(selectedData.current.length === 0){
            //onClose();
            snackActions.warning("No callbacks selected");
            return;
        }
        let params = message.split(" ");
        delete params[0];
        params = params.join(" ").trim();
        let newTaskingLocation = "parsed_cli";
        if(previousTaskingLocation.includes("modal")){
            newTaskingLocation = "modal_modified"
        }else if(previousTaskingLocation.includes("browserscript")){
            newTaskingLocation = "browserscript_modified";
        }
        if(cmd.commandparameters.length === 0){
            // if there are no parameters, just send whatever the user types along
            finalTaskedParameters.current = params;
            taskingData.current = {
                cmd: cmd.cmd,
                callback_id: callback.id,
                openDialog: false,
                parameters: params,
                tasking_location: newTaskingLocation,
                dontShowSuccessDialog: false,
                payload_type: cmd.payloadtype?.name,
            };
            submitTasking();
            return;
        }else{
            // check if there's a "file" component that needs to be displayed
            const fileParamExists = cmd.commandparameters.find(param => {
                if(param.parameter_type === "File" && cmdGroupNames.includes(param.parameter_group_name)){
                    if(!(param.cli_name in parsed || param.name in parsed || param.display_name in parsed)){
                        return true;
                    }
                    if(param.cli_name in parsed && uuidValidate(parsed[param.cli_name])){
                        return false; // no need for a popup, already have a valid file specified
                    } else if(param.name in parsed && uuidValidate(parsed[param.name])){
                        return false;
                    } else if(param.display_name in parsed && uuidValidate(parsed[param.display_name])){
                        return false;
                    }
                }

            });//console.log("missing File for group? ", fileParamExists, cmdGroupNames);
            let missingRequiredPrams = false;
            if(cmdGroupNames.length === 1){
                const missingParams = cmd.commandparameters.filter(param => param.required && param.parameter_group_name === cmdGroupNames[0] && !(param.cli_name in parsed || param.name in parsed || param.display_name in parsed));
                if(missingParams.length > 0){
                    missingRequiredPrams = true;
                    console.log("missing required params", missingParams,parsed);
                }
            }else if(cmdGroupNames > 1 && !force_parsed_popup){
                // need to force a popup because the tasking is ambiguous
                console.log("command is ambiguous");
                force_parsed_popup = true;
            }
            if(fileParamExists || force_parsed_popup || missingRequiredPrams){
                //need to do a popup
                if(cmdGroupNames.length > 0){
                    finalTaskedParameters.current = undefined;
                    taskingData.current = {
                        cmd: cmd.cmd,
                        callback_id: callback.id,
                        openDialog: true,
                        parsedParameters: parsed,
                        groupName: cmdGroupNames[0],
                        parameters: params,
                        tasking_location: newTaskingLocation,
                        dontShowSuccessDialog: false,
                        payload_type: cmd.payloadtype?.name,
                    };
                }else{
                    finalTaskedParameters.current = undefined;
                    taskingData.current = {
                        cmd: cmd.cmd,
                        callback_id: callback.id,
                        openDialog: true,
                        parsedParameters: parsed,
                        parameters: params,
                        tasking_location: newTaskingLocation,
                        dontShowSuccessDialog: false,
                        payload_type: cmd.payloadtype?.name,
                    };
                }
                submitTasking();
                return;
            }else{
                delete parsed["_"];
                finalTaskedParameters.current = parsed;
                taskingData.current = {
                    cmd: cmd.cmd,
                    callback_id: callback.id,
                    openDialog: false,
                    parameters: parsed,
                    original_params: params,
                    parsedParameters: parsed,
                    tasking_location: newTaskingLocation,
                    dontShowSuccessDialog: false,
                    parameter_group_name: cmdGroupNames[0],
                    payload_type: cmd.payloadtype?.name,
                };
                submitTasking();
            }
        }
    }
    const changeSelectedToken = (token) => {
        if(token === "Default Token"){
            setSelectedToken("Default Token");
            return;
        }
        if(token.token_id !== selectedToken.token_id){
            setSelectedToken(token);
        }
    }
  return (
      <React.Fragment>
          <DialogTitle id="form-dialog-title">Task Multiple {callback.payload.payloadtype.name} Callbacks at Once</DialogTitle>
          <CustomSelectTable initialData={initialData}
                             selectedData={selectedData}  />
          <Grid size={12}>
              <CallbacksTabsTaskingInput filterTasks={false} onSubmitFilter={()=>{}} onSubmitCommandLine={onSubmitCommandLine}
                                         changeSelectedToken={changeSelectedToken}
                                         payloadtype_name={callback.payload.payloadtype.name}
                                         filterOptions={{}} callback_id={callback.id} callback_os={callback.payload.os} parentMountedRef={mountedRef} />
          </Grid>
          {openTaskingButton && 
              <TaskFromUIButton cmd={taskingData.current?.cmd} 
                  callback_id={taskingData?.current?.callback_id || 0}
                  callback_ids={taskingData?.current?.callback_ids || undefined}
                  parameters={taskingData.current?.parameters || ""}
                  openDialog={taskingData.current?.openDialog || false}
                  tasking_location={taskingData.current?.tasking_location || "command_line"}
                  dontShowSuccessDialog={taskingData.current?.dontShowSuccessDialog || false}
                  selectCallback={taskingData.current?.selectCallback || false}
                  onTasked={onTasked}/>
          }
          <DialogActions>
            <Button onClick={onClose} variant="contained" color="primary">
              Cancel
            </Button>
          </DialogActions>
      </React.Fragment>
  );
}

