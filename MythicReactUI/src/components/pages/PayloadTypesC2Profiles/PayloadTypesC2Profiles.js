import React from 'react';
import {useSubscription, gql } from '@apollo/client';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {useTheme} from '@mui/material/styles';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { MythicStyledTooltip } from '../../MythicComponents/MythicStyledTooltip';
import { IconButton } from '@mui/material';
import MythicTableCell from "../../MythicComponents/MythicTableCell";
import {PayloadTypeRow} from "./PayloadTypeCard";
import {C2ProfilesRow} from "./C2ProfilesCard";
import {TranslationContainerRow} from "./TranslationContainerCard";

/*
export function PayloadTypesC2Profiles(props){

    return (
      <React.Fragment>
        <Grid container spacing={0}>
          <Grid item xs={6}>
          <PayloadTypeContainerDisplay me={props.me} />
          </Grid>
          <Grid item xs={6}>
          <C2ProfileContainerDisplay me={props.me} />
          </Grid>
          <Grid item xs={12}>
          <TranslationContainerDisplay me={props.me} />
          </Grid>
        </Grid>
      </React.Fragment>
    );
}

 */
const SUB_Payload_Types = gql`
 subscription getPayloadTypesSubscription {
  payloadtype(order_by: {name: asc}) {
    author
    container_running
    id
    note
    name
    deleted
    supported_os
    wrapper
    agent_type
    translationcontainer {
        id
        name
        container_running
    }
    wrap_these_payload_types {
        id
        wrapped {
          name
        }
    }
  }
}
 `;
const SUB_C2_Profiles = gql`
subscription getPayloadTypesSubscription {
   c2profile(order_by: {name: asc}) {
   author
   id
   container_running
   description
   is_p2p
   name
   running
   deleted
   payloadtypec2profiles(order_by: {payloadtype: {name: asc}}) {
     payloadtype {
       name
       deleted
       id
     }
   }
 }
}
`;
const SUB_Translation_Containers = gql`
subscription getTranslationContainersSubscription {
 translationcontainer(order_by: {name: asc}) {
   name
   id
   container_running
   deleted
   description
   author
   payloadtypes(order_by: {name: asc}) {
       name
       deleted
       id
   }
 }
}
`;

function useCustomSubscription({customSubscription, dataKey}){
    const { data } = useSubscription(customSubscription);
    const [customData, setCustomData] = React.useState([]);
    React.useEffect( () => {
        if(data === undefined){
            setCustomData([]);
            return;
        }
        setCustomData(data[dataKey]);
    }, [data])
    return customData
}

export function PayloadTypesC2Profiles({me}){
    const theme = useTheme();
    const [allData, setAllData] = React.useState([]);
    const payloadTypes = useCustomSubscription({
        customSubscription: SUB_Payload_Types,
        dataKey: "payloadtype"
    });
    const c2Profiles = useCustomSubscription({
        customSubscription: SUB_C2_Profiles,
        dataKey: "c2profile"
    });
    const translationContainers = useCustomSubscription({
        customSubscription: SUB_Translation_Containers,
        dataKey: "translationcontainer"
    });
    const [showDeleted, setShowDeleted] = React.useState(false);
    React.useEffect( () => {
        let newData = [...payloadTypes, ...c2Profiles, ...translationContainers];
        newData.sort( (a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0);
        setAllData(newData);
    }, [payloadTypes, c2Profiles, translationContainers])
    return (
        <div style={{display: "flex", flexDirection: "column", height: "100%"}}>
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main,marginBottom: "5px",
                marginRight: "5px"}} variant={"elevation"}>
                <Typography variant="h3" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                    Payload / C2 Services
                </Typography>
                {showDeleted ? (
                    <MythicStyledTooltip title={"Hide Deleted Services"} tooltipStyle={{float: "right"}}>
                        <IconButton size="small" style={{float: "right", marginTop: "5px"}} variant="contained" onClick={() => setShowDeleted(!showDeleted)}><VisibilityIcon /></IconButton>
                    </MythicStyledTooltip>

                ) : (
                    <MythicStyledTooltip title={"Show Deleted Services"} tooltipStyle={{float: "right"}}>
                        <IconButton size="small" style={{float: "right",  marginTop: "5px"}} variant="contained" onClick={() => setShowDeleted(!showDeleted)} ><VisibilityOffIcon /></IconButton>
                    </MythicStyledTooltip>
                )}
            </Paper>
            <div style={{display: "flex", flexGrow: 1, overflowY: "auto"}}>
                <TableContainer >
                    <Table stickyHeader size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
                        <TableHead>
                            <TableRow>
                                <MythicTableCell style={{width: "4rem"}}>Delete</MythicTableCell>
                                <MythicTableCell style={{width: "90px"}}></MythicTableCell>
                                <MythicTableCell>Service</MythicTableCell>
                                <MythicTableCell style={{width: "4rem"}}>Type</MythicTableCell>
                                <MythicTableCell>Metadata</MythicTableCell>
                                <MythicTableCell>Status</MythicTableCell>
                                <MythicTableCell style={{width: "12rem"}}>Actions</MythicTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {allData.map( (service, index) => (
                                <PayloadTypesC2ProfilesTableRow key={"service" + index}
                                    service={service}
                                    showDeleted={showDeleted} />
                                ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        </div>
    );
}

const PayloadTypesC2ProfilesTableRow = ({service, showDeleted}) => {
    if(service.__typename === "payloadtype"){
        return <PayloadTypeRow service={service} showDeleted={showDeleted} />
    } else if(service.__typename === "c2profile"){
        return <C2ProfilesRow service={service} showDeleted={showDeleted} />
    } else if(service.__typename === "translationcontainer"){
        return <TranslationContainerRow service={service} showDeleted={showDeleted} />
    }
    return null
}
