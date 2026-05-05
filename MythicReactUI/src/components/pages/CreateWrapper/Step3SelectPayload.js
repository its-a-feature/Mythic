import React from 'react';
import {useQuery, gql} from '@apollo/client';
import { CreatePayloadNavigationButtons} from './CreatePayloadNavigationButtons';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { snackActions } from '../../utilities/Snackbar';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
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
import { Backdrop } from '@mui/material';
import {PayloadsTableRowBuildStatus} from "../Payloads/PayloadsTableRowBuildStatus";
import {PayloadsTableRowBuildProgress} from "../Payloads/PayloadsTableRowBuildProgress";
import {MythicLoadingState, MythicTableEmptyState} from "../../MythicComponents/MythicStateDisplay";
import MythicStyledTableCell from "../../MythicComponents/MythicTableCell";
import {MythicClientSideTablePagination, useMythicClientPagination} from "../../MythicComponents/MythicTablePagination";


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
            setOpenBackdrop(false);
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
        <div className="mythic-create-flow-shell">
            <div className="mythic-create-flow-content">
                <div className="mythic-create-selection-grid">
                    <section className="mythic-create-section">
                        <div className="mythic-create-agent-summary">
                            <div className="mythic-create-agent-icon">
                                <MythicAgentSVGIcon payload_type={props.buildOptions.payload_type} style={{width: "100%", height: "100%", objectFit: "contain"}} />
                            </div>
                            <div className="mythic-create-meta-list">
                                <div>
                                    <span className="mythic-create-meta-label">Operating system</span>
                                    <div className="mythic-create-meta-value">{props.buildOptions.os}</div>
                                </div>
                                <div>
                                    <span className="mythic-create-meta-label">Description</span>
                                    <div className="mythic-create-meta-value">{props.buildOptions.description}</div>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section className="mythic-create-section">
                        <div className="mythic-create-section-header">
                            <div>
                                <Typography component="div" className="mythic-create-section-title">
                                    Select payload to include
                                </Typography>
                                <Typography component="div" className="mythic-create-section-description">
                                    Pick the existing payload that this wrapper should embed.
                                </Typography>
                            </div>
                        </div>
                    </section>
                </div>

                <section className="mythic-create-section mythic-create-section-fill">
                    <div className="mythic-create-section-header">
                        <div>
                            <Typography component="div" className="mythic-create-section-title">
                                Compatible payloads
                            </Typography>
                            <Typography component="div" className="mythic-create-section-description">
                                Only payloads matching the selected wrapper type and operating system are shown.
                            </Typography>
                        </div>
                    </div>
                    <div style={{display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0, overflow: "hidden", position: "relative"}}>
                        {openBackdrop &&
                            <Backdrop open={openBackdrop} style={{zIndex: 2000, position: "absolute"}}>
                                <MythicLoadingState compact title="Loading payloads" description="Fetching compatible payloads." sx={{color: "inherit"}} />
                            </Backdrop>
                        }
                        {!openBackdrop &&
                            <PayloadSelect payloadOptions={payloadOptions} first={props.first} last={props.last}
                                           canceled={canceled} finished={finished}/>
                        }
                    </div>
                </section>
            </div>

            <div className="mythic-create-flow-footer">
                <CreatePayloadNavigationButtons disableNext first={props.first} last={props.last}
                                                canceled={props.canceled} finished={finished}/>
                <br/><br/>
            </div>
        </div>
    );
}

export function PayloadSelect(props) {
    const payloadOptions = React.useMemo(() => {
        return Array.isArray(props.payloadOptions) ? props.payloadOptions : [];
    }, [props.payloadOptions]);
    const resetKey = React.useMemo(() => {
        return payloadOptions.map((payload) => payload.id).join(",");
    }, [payloadOptions]);
    const pagination = useMythicClientPagination({
        items: payloadOptions,
        resetKey,
        rowsPerPage: 25,
    });
    const finished = (payload) => {
        props.finished(payload);
    }
    return (
        <div style={{display: "flex", flexDirection: "column", height: "100%", minHeight: 0}}>
            <TableContainer
                className="mythicElement mythic-fixed-row-table-wrap"
                style={{flex: "1 1 auto", minHeight: 0, overflowY: "auto"}}
            >
                <Table stickyHeader size="small" style={{tableLayout:"fixed", height: "auto", maxWidth: "100%"}}>
                    <TableHead>
                        <TableRow>
                            <MythicStyledTableCell style={{width: "6rem"}}>Select</MythicStyledTableCell>
                            <MythicStyledTableCell style={{width: "15rem"}}>Timestamp</MythicStyledTableCell>
                            <MythicStyledTableCell>File</MythicStyledTableCell>
                            <MythicStyledTableCell>Status</MythicStyledTableCell>
                            <MythicStyledTableCell>Description</MythicStyledTableCell>
                            <MythicStyledTableCell style={{width: "5rem"}}>Details</MythicStyledTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>

                        {payloadOptions.length === 0 ? (
                            <MythicTableEmptyState
                                colSpan={6}
                                compact
                                title="No compatible payloads"
                                description="Start fresh or adjust the selected payload type and operating system."
                                minHeight={180}
                            />
                        ) : (
                            pagination.pageData.map( (op) => (
                                <PayloadsTableRow
                                    onSelected={finished}
                                    key={"payload" + op.id}
                                    payload={op}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <MythicClientSideTablePagination id="create-payload-select-pagination" pagination={pagination} />
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
          <TableRow key={"payload" + props.payload.uuid} hover onClick={onSelected} style={{cursor: "pointer"}}>
              <MythicStyledTableCell>
              <Button className="mythic-table-row-action mythic-table-row-action-hover-info" size="small" onClick={(event) => {event.stopPropagation(); onSelected();}} variant="contained">Select</Button>
              </MythicStyledTableCell>
              <MythicStyledTableCell>{toLocalTime(props.payload.creation_time, me.user.view_utc_time)}</MythicStyledTableCell>
              <MythicStyledTableCell>{b64DecodeUnicode(props.payload.filemetum.filename_text)}</MythicStyledTableCell>
              <MythicStyledTableCell>
                  <div className="mythic-payload-progress-cell">
                      <PayloadsTableRowBuildStatus {...props.payload} />
                      <PayloadsTableRowBuildProgress {...props.payload} />
                  </div>
              </MythicStyledTableCell>
              <MythicStyledTableCell>{props.payload.description}</MythicStyledTableCell>
              <MythicStyledTableCell>
                  <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-info" size="small" onClick={(event) => {event.stopPropagation(); setOpenDetailedView(true);}}>
                      <InfoIconOutline fontSize="small" />
                  </IconButton>
              </MythicStyledTableCell>
          </TableRow>
          {openDetailedView ? (
              <TableRow style={{display: "none"}}>
                  <MythicStyledTableCell colSpan={6}>
                      <MythicDialog fullWidth={true} maxWidth="md" open={openDetailedView} me={me}
                          onClose={()=>{setOpenDetailedView(false);}}
                          innerDialog={<DetailedPayloadTable {...props.payload} me={me} payload_id={props.payload.id} onClose={()=>{setOpenDetailedView(false);}} />}
                      />
                  </MythicStyledTableCell>
              </TableRow>
          ) : null }
      </React.Fragment>
      )
}
