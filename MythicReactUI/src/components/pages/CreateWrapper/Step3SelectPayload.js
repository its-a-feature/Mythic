import React from 'react';
import { styled } from '@mui/material/styles';
import {useQuery, gql} from '@apollo/client';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { snackActions } from '../../utilities/Snackbar';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import {DetailedPayloadTable} from '../Payloads/DetailedPayloadTable';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import { toLocalTime } from '../../utilities/Time';
import InfoIconOutline from '@mui/icons-material/InfoOutlined';
import IconButton from '@mui/material/IconButton';
import {b64DecodeUnicode} from '../Callbacks/ResponseDisplay';
import {MythicAgentSVGIcon} from "../../MythicComponents/MythicAgentSVGIcon";
import { Backdrop, CircularProgress } from '@mui/material';
import {PayloadsTableRowBuildStatus} from "../Payloads/PayloadsTableRowBuildStatus";
import {PayloadsTableRowBuildProgress} from "../Payloads/PayloadsTableRowBuildProgress";


const PREFIX = 'Step3SelectPayload';

const classes = {
  root: `${PREFIX}-root`,
  paper: `${PREFIX}-paper`,
  button: `${PREFIX}-button`
};

const Root = styled('div')((
  {
    theme
  }
) => ({
  [`& .${classes.root}`]: {
    margin: 'auto',
    width: "100%"
  },

  [`& .${classes.paper}`]: {
    width: 200,
    height: 230,
    overflow: 'auto',

  },

  [`& .${classes.button}`]: {
    margin: theme.spacing(0.5, 0),
  }
}));

const GET_Payload_Types = gql`
query getWrappablePayloads($payloadType: Int!) {
  payloadtype_by_pk(id: $payloadType) {
    wrap_these_payload_types {
      wrapped {
        name
        payloads(where: {auto_generated: {_eq: false}, build_phase: {_eq: "success"}, deleted: {_eq: false}}, order_by: {id: desc}) {
          id
          description
          uuid
          creation_time
          build_phase
          payload_build_steps(order_by: {step_number: asc}) {
            step_name
            step_number
            step_success
            step_skip
            start_time
            end_time
            step_stdout
            step_stderr
            id
          }
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
    const [openBackdrop, setOpenBackdrop] = React.useState(true);
    useQuery(GET_Payload_Types, {fetchPolicy: "network-only", variables: {payloadType: props.buildOptions["payload_type_id"]},
        onCompleted: (data) => {
          if(data.payloadtype_by_pk.wrap_these_payload_types.length > 0){
            let options = [];
            for(let i = 0; i < data.payloadtype_by_pk.wrap_these_payload_types.length; i++){
              for(let j = 0; j < data.payloadtype_by_pk.wrap_these_payload_types[i].wrapped.payloads.length; j++){
                options.push({name: data.payloadtype_by_pk.wrap_these_payload_types[i].wrapped.name, ...data.payloadtype_by_pk.wrap_these_payload_types[i].wrapped.payloads[j] })
              }
            }
            options = options.sort((a,b) => new Date(a.creation_time) < new Date(b.creation_time) ? 1 : -1)
            setPayloadOptions(options);
            setOpenBackdrop(false);
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
        <div style={{
            height: "100%",
            display: "flex",
            flexDirection: "column"
        }}>
            {/* Content area that can grow */}
            <div style={{
                flexGrow: 1,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                minHeight: 0 // Important for flex shrinking
            }}>
                {/* Top section - fixed height */}
                <div style={{
                    display: "flex",
                    flexShrink: 0 // Don't shrink this section
                }}>
                    <div style={{display: "flex", width: "100%", margin: "5px", border: "1px solid grey", borderRadius: "5px", padding: "10px"}}>
                        <MythicAgentSVGIcon payload_type={props.buildOptions.payload_type} style={{width: "80px", padding: "5px", objectFit: "unset"}} />
                        <div>
                            <Typography variant={"p"} style={{}}>
                                <b>OS: </b>{props.buildOptions.os}
                            </Typography><br/>
                            <Typography variant="body2" component="p" style={{whiteSpace: "pre-wrap"}}>
                                <b>Description: </b>{props.buildOptions.description}
                            </Typography>
                        </div>
                    </div>
                    <div style={{width: "100%", margin: "5px", border: "1px solid grey", borderRadius: "5px", padding: "10px"}}>
                        <div style={{width: "100%", display: "flex", alignItems: "flex-start", marginBottom: "10px", flexDirection: "column"}}>

                        </div>
                    </div>
                </div>

                {/* Bottom section - scrollable table area */}
                <div style={{
                    margin: "5px",
                    border: props.first ? "1px solid grey" : '',
                    borderRadius: "5px",
                    padding: "10px 5px 5px 10px",
                    display: "flex",
                    flexDirection: "column",
                    flexGrow: 1,
                    minHeight: 0, // Important for flex shrinking
                    overflow: "hidden"
                }}>
                    <Typography variant={"p"} style={{fontWeight: 600}}>
                        1. Select Payload to Include
                    </Typography>
                    <div style={{flexGrow: 1, overflowY: "auto", position: "relative"}}>
                        {openBackdrop &&
                            <Backdrop open={openBackdrop} onClick={()=>{setOpenBackdrop(false);}} style={{zIndex: 2000, position: "absolute"}}>
                                <CircularProgress color="inherit" disableShrink  />
                            </Backdrop>
                        }
                        <PayloadSelect payloadOptions={payloadOptions} first={props.first} last={props.last}
                                       canceled={canceled} finished={finished}/>
                    </div>
                </div>
            </div>

            {/* Navigation buttons - always at bottom */}
            <div style={{flexShrink: 0}}>
                <CreatePayloadNavigationButtons disableNext first={props.first} last={props.last}
                                                canceled={props.canceled} finished={finished}/>
                <br/><br/>
            </div>
        </div>
    );
}

export function PayloadSelect(props) {
    const finished = (payload) => {
        props.finished(payload);
    }
    return (
        <div style={{height: "100%", overflow: "auto"}}>
            <Table stickyHeader size="small" style={{tableLayout:"fixed", maxWidth: "100%",}}>
                <TableHead>
                    <TableRow>
                        <TableCell style={{width: "6rem"}}> Select</TableCell>
                        <TableCell style={{width: "15rem"}}>Timestamp</TableCell>
                        <TableCell>File</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell style={{width: "5rem"}}>Details</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>

                    {props.payloadOptions?.map( (op) => (
                        <PayloadsTableRow
                            onSelected={finished}
                            key={"payload" + op.id}
                            payload={op}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>

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
              <TableCell>
                      <PayloadsTableRowBuildStatus {...props.payload} />
                      <PayloadsTableRowBuildProgress {...props.payload} />
              </TableCell>
              <TableCell>{props.payload.description}</TableCell>
              <TableCell>
                  <IconButton size="small" color="info" onClick={() => setOpenDetailedView(true)}>
                      <InfoIconOutline />
                  </IconButton>
              </TableCell>
          </TableRow>
          <TableRow>
          {openDetailedView ? (
            <MythicDialog fullWidth={true} maxWidth="md" open={openDetailedView} me={me}
                onClose={()=>{setOpenDetailedView(false);}} 
                innerDialog={<DetailedPayloadTable {...props.payload} me={me} payload_id={props.payload.id} onClose={()=>{setOpenDetailedView(false);}} />}
            />
          ) : null }
        </TableRow>
      </React.Fragment>
      )
}