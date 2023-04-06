import React from 'react';
import {useQuery, gql} from '@apollo/client';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import makeStyles from '@mui/styles/makeStyles';
import { snackActions } from '../../utilities/Snackbar';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import {DetailedPayloadTable} from '../Payloads/DetailedPayloadTable';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import { toLocalTime } from '../../utilities/Time';
import InfoIcon from '@mui/icons-material/Info';
import IconButton from '@mui/material/IconButton';
import {b64DecodeUnicode} from '../Callbacks/ResponseDisplay';

const useStyles = makeStyles((theme) => ({
  root: {
    margin: 'auto',
    width: "100%"
  },
  paper: {
    width: 200,
    height: 230,
    overflow: 'auto',

  },
  button: {
    margin: theme.spacing(0.5, 0),
  },
}));

const GET_Payload_Types = gql`
query getWrappablePayloads($payloadType: Int!) {
  payloadtype_by_pk(id: $payloadType) {
    wrap_these_payload_types {
      wrapped {
        name
        payloads(where: {auto_generated: {_eq: false}, build_phase: {_eq: "success"}, deleted: {_eq: false}}) {
          id
          description
          uuid
          creation_time
          filemetum {
            agent_file_id
            filename_text
            id
          }
        }
      }
    }
  }
}
 `;

export function Step3SelectPayload(props){
    const [payloadOptions, setPayloadOptions] = React.useState([]);
    const { data } = useQuery(GET_Payload_Types, {fetchPolicy: "network-only", variables: {payloadType: props.buildOptions["payload_type_id"]},
        onCompleted: () => {
          if(data.payloadtype_by_pk.wrap_these_payload_types.length > 0){
            let options = [];
            for(let i = 0; i < data.payloadtype_by_pk.wrap_these_payload_types.length; i++){
              for(let j = 0; j < data.payloadtype_by_pk.wrap_these_payload_types[i].wrapped.payloads.length; j++){
                options.push({name: data.payloadtype_by_pk.wrap_these_payload_types[i].wrapped.name, ...data.payloadtype_by_pk.wrap_these_payload_types[i].wrapped.payloads[j] })
              }
            }
            setPayloadOptions(options);
          }else{
            snackActions.warning("No supported payload for that wrapper");
          }
          
        }
    });
    const finished = (selectedPayload) => {
      if(selectedPayload.uuid === undefined){
        snackActions.error("Can't continue without selecting a payload");
        return;
      }
      props.finished(selectedPayload.uuid);
    }
    const canceled = () => {
        props.canceled();
    }
    return (
        <div >
        <Typography variant="h3" align="left" id="selectcommands" component="div" 
            style={{ "marginLeft": "10px"}}>
              Wrap Agent Into New Payload
        </Typography> <br/>
        <PayloadSelect payloadOptions={payloadOptions} first={props.first} last={props.last}
          canceled={canceled} finished={finished}/>
        </div>
    );
} 

function PayloadSelect(props) {
  const finished = (payload) => {
    props.finished(payload);
  }
return (
  <React.Fragment>
      <TableContainer component={Paper}>
            <Table stickyHeader size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "4rem"}}> Select</TableCell>
                        <TableCell style={{width: "15rem"}}>Timestamp</TableCell>
                        <TableCell>File</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell style={{width: "5rem"}}>Details</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                
                {props.payloadOptions.map( (op) => (
                    <PayloadsTableRow
                        onSelected={finished}
                        key={"payload" + op.id}
                        payload={op}
                    />
                ))}
                </TableBody>
            </Table>
        </TableContainer>
        <div style={{paddingTop: "20px"}}>
           <CreatePayloadNavigationButtons disableNext first={props.first} last={props.last} canceled={props.canceled} finished={finished} />
        </div>
      
  </React.Fragment>
);
}

export function PayloadsTableRow(props){
  const [openDetailedView, setOpenDetailedView] = React.useState(false);
  const me = useReactiveVar(meState);
  const onSelected = () => {
      props.onSelected(props.payload);
  }
  return (
      <React.Fragment>
          <TableRow key={"payload" + props.payload.uuid} hover>
              <TableCell>
              <Button size="small" onClick={onSelected} color="primary" variant="contained">Select</Button>
              </TableCell>
              <TableCell>{toLocalTime(props.payload.creation_time, me.user.view_utc_time)}</TableCell>
              <TableCell>{b64DecodeUnicode(props.payload.filemetum.filename_text)}</TableCell>
              <TableCell>{props.payload.description}</TableCell>
              <TableCell>
                  <IconButton size="small" color="primary" onClick={() => setOpenDetailedView(true)}>
                      <InfoIcon />
                  </IconButton>
              </TableCell>
          </TableRow>
          <TableRow>
          {openDetailedView ? (
            <MythicDialog fullWidth={true} maxWidth="md" open={openDetailedView} me={me}
                onClose={()=>{setOpenDetailedView(false);}} 
                innerDialog={<DetailedPayloadTable {...props} me={me} payload_id={props.payload.id} onClose={()=>{setOpenDetailedView(false);}} />}
            />
          ) : (null) }
        </TableRow>
      </React.Fragment>
      )
}