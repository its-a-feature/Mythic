import React from 'react';
import {useSubscription, gql } from '@apollo/client';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import MythicTableCell from "../../MythicComponents/MythicTableCell";
import {PayloadTypeRow} from "./PayloadTypeCard";
import {C2ProfilesRow} from "./C2ProfilesCard";
import {TranslationContainerRow} from "./TranslationContainerCard";
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import {MythicSearchTabLabel, MythicTabPanel} from "../../MythicComponents/MythicTabPanel";
import {ConsumingServicesTableRow} from '../ConsumingServices/ConsumingServicesTable';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { IconButton } from '@mui/material';
import {useTheme} from '@mui/material/styles';

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
const sub_consuming_services = gql`
subscription ConsumingContainer{
    consuming_container(order_by: {name: asc}) {
        id
        name
        description
        type
        container_running
        deleted
        subscriptions
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

const tabTypes = ["Payload Types", "C2 Profiles", "Translators", "Command Augmentation", "3rd Party", "Webhooks", "Loggers",  "Eventing", "Auth", ];

const filterDeleted = (c, showDeleted) => {
    if(showDeleted){
        return true;
    }
    return !c.deleted;

}
export function PayloadTypesC2Profiles({me}){
    const theme = useTheme();
    const [value, setValue] = React.useState(0);
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
    const consumingServices = useCustomSubscription({
        customSubscription: sub_consuming_services,
        dataKey: "consuming_container"
    });
    const [showDeleted, setShowDeleted] = React.useState(false);
    React.useEffect( () => {
        let newData = [...payloadTypes, ...c2Profiles, ...translationContainers, ...consumingServices];
        newData.sort( (a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0);
        setAllData(newData);
    }, [payloadTypes, c2Profiles, translationContainers, consumingServices])
    const handleChange = (event, newValue) => {
        setValue(newValue);
    };
    const getTabComponent = () => {
        switch(value){
            case 0:
                return <ContainersTabPayloadTypesPanel key={"Payload Types"} index={value} value={value} showDeleted={showDeleted}
                                                       containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "payloadtype" && (c.agent_type === "agent" || c.agent_type === "wrapper"))} />
            case 1:
                return <ContainersTabPayloadTypesPanel key={"C2 Profiles"} index={value} value={value} showDeleted={showDeleted}
                                                       containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "c2profile")} />
            case 2:
                return <ContainersTabPayloadTypesPanel key={"Translators"} index={value} value={value} showDeleted={showDeleted}
                                                       containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "translationcontainer")} />
            case 3:
                return <ContainersTabPayloadTypesPanel key={"Command Augmentation"} index={value} value={value} showDeleted={showDeleted}
                                                       containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "payloadtype" && (c.agent_type === "command_augment"))} />
            case 4:
                return <ContainersTabPayloadTypesPanel key={"3rd Party"} index={value} value={value} showDeleted={showDeleted}
                                                       containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "payloadtype" && (c.agent_type === "service"))} />
            case 5:
                return <ContainersTabConsumingServicesPanel key={"Webhooks"} index={value} value={value} showDeleted={showDeleted}
                                                            containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "consuming_container" && c.type === "webhook")} />
            case 6:
                return <ContainersTabConsumingServicesPanel key={"Loggers"} index={value} value={value} showDeleted={showDeleted}
                                                            containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "consuming_container" && c.type === "logging")} />
            case 7:
                return <ContainersTabConsumingServicesPanel key={"Eventing"} index={value} value={value} showDeleted={showDeleted}
                                                            containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "consuming_container" && c.type === "eventing")} />
            case 8:
                return <ContainersTabConsumingServicesPanel key={"Auth"} index={value} value={value} showDeleted={showDeleted}
                                                            containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "consuming_container" && c.type === "auth")} />
            default:
                return null;
        }
    }
    return (
        <div style={{  height: "100%", display: "flex", flexDirection: "column", width: "100%"}}>
            <Paper elevation={5} style={{backgroundColor: theme.pageHeader.main, color: theme.pageHeaderText.main}} variant={"elevation"}>
                <Typography variant="h5" style={{textAlign: "left", display: "inline-block", marginLeft: "20px"}}>
                    Installed Services
                </Typography>
                {showDeleted ? (
                    <MythicStyledTooltip title={"Hide Deleted Services"} tooltipStyle={{float: "right"}}>
                        <IconButton size="small" style={{float: "right"}} variant="contained" onClick={() => setShowDeleted(!showDeleted)}><VisibilityIcon /></IconButton>
                    </MythicStyledTooltip>

                ) : (
                    <MythicStyledTooltip title={"Show Deleted Services"} tooltipStyle={{float: "right"}}>
                        <IconButton size="small" style={{float: "right"}} variant="contained" onClick={() => setShowDeleted(!showDeleted)} ><VisibilityOffIcon /></IconButton>
                    </MythicStyledTooltip>
                )}
            </Paper>
            <AppBar position="static" color="default" className={"no-box-shadow"}>
                <Tabs
                    value={value}
                    onChange={handleChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="scrollable auto tabs example"
                >
                    {
                        tabTypes.map( (tab, index) => {
                            switch (tab){
                                case "Payload Types":
                                    return <ContainersTabPayloadTypesLabel key={"payloadtypes"}
                                                                           containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "payloadtype" && (c.agent_type === "agent" || c.agent_type === "wrapper"))}/>;
                                case "C2 Profiles":
                                    return <ContainersTabC2ProfilesLabel key={"c2profiles"}
                                                                         containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "c2profile")}/>;
                                case "Translators":
                                    return <ContainersTabTranslationsLabel key={"translators"}
                                                                           containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "translationcontainer")}/>;
                                case "Command Augmentation":
                                    return <ContainersTabCommandAugmentLabel key={"commandaugmentation"}
                                                                             containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "payloadtype" && (c.agent_type === "command_augment"))}/>;
                                case "3rd Party":
                                    return <ContainersTab3rdPartyLabel key={"3rdpartyservice"}
                                                                       containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "payloadtype" && (c.agent_type === "service"))} />;
                                case "Webhooks":
                                    return <ContainersTabWebhooksLabel key={"webhooks"}
                                                                       containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "consuming_container" && c.type === "webhook")}/>;
                                case "Loggers":
                                    return <ContainersTabLoggersLabel key={"loggers"}
                                                                      containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "consuming_container" && c.type === "logging")}/>;
                                case "Eventing":
                                    return <ContainersTabEventingLabel key={"eventing"}
                                                                       containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "consuming_container" && c.type === "eventing")}/>;
                                case "Auth":
                                    return <ContainersTabAuthLabel key={"auth"}
                                                                   containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "consuming_container" && c.type === "auth")}/>;
                                default:
                                    return null;
                            }
                        })
                    }
                </Tabs>
            </AppBar>
            {
                getTabComponent()
            }
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

const ContainersTabPayloadTypesLabel = (props) => {
    return (
        <MythicSearchTabLabel label={"Payload Types" + (props.containers.length > 0 ? " (" + props.containers.length + ") " : "")} iconComponent={
            <></>
        } {...props}/>
    )
}
const ContainersTab3rdPartyLabel = (props) => {
    return (
        <MythicSearchTabLabel label={"3rd Party Service"  + (props.containers.length > 0 ? " (" + props.containers.length + ") " : "")} iconComponent={
            <></>
        } {...props}/>
    )
}
const ContainersTabC2ProfilesLabel = (props) => {
    return (
        <MythicSearchTabLabel label={"C2 Profiles"  + (props.containers.length > 0 ? " (" + props.containers.length + ") " : "")} iconComponent={
            <></>
        } {...props}/>
    )
}
const ContainersTabTranslationsLabel = (props) => {
    return (
        <MythicSearchTabLabel label={"Translators"  + (props.containers.length > 0 ? " (" + props.containers.length + ") " : "")} iconComponent={
            <></>
        } {...props}/>
    )
}
const ContainersTabWebhooksLabel = (props) => {
    return (
        <MythicSearchTabLabel label={"Webhooks"  + (props.containers.length > 0 ? " (" + props.containers.length + ") " : "")} iconComponent={
            <></>
        } {...props}/>
    )
}
const ContainersTabLoggersLabel = (props) => {
    return (
        <MythicSearchTabLabel label={"Loggers"  + (props.containers.length > 0 ? " (" + props.containers.length + ") " : "")} iconComponent={
            <></>
        } {...props}/>
    )
}
const ContainersTabEventingLabel = (props) => {
    return (
        <MythicSearchTabLabel label={"Eventing"  + (props.containers.length > 0 ? " (" + props.containers.length + ") " : "")} iconComponent={
            <></>
        } {...props}/>
    )
}
const ContainersTabAuthLabel = (props) => {
    return (
        <MythicSearchTabLabel label={"Auth"  + (props.containers.length > 0 ? " (" + props.containers.length + ") " : "")} iconComponent={
            <></>
        } {...props}/>
    )
}
const ContainersTabCommandAugmentLabel = (props) => {
    return (
        <MythicSearchTabLabel label={"Command Augmentation"  + (props.containers.length > 0 ? " (" + props.containers.length + ") " : "")} iconComponent={
            <></>
        } {...props}/>
    )
}


const ContainersTabPayloadTypesPanel = (props) => {
    return (
        <MythicTabPanel {...props} >
            <div style={{display: "flex", flexGrow: 1, overflowY: "auto"}}>
                <TableContainer>
                    <Table stickyHeader size="small" style={{"maxWidth": "100%", "overflow": "scroll"}}>
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
                            {props.containers.map((service, index) => (
                                <PayloadTypesC2ProfilesTableRow key={"service" + index} service={service} showDeleted={props.showDeleted}/>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        </MythicTabPanel>
    )
}
const ContainersTabConsumingServicesPanel = (props) => {
    return (
        <MythicTabPanel {...props} >
            <div style={{display: "flex", flexGrow: 1, overflowY: "auto"}}>
                <TableContainer>
                    <Table stickyHeader size="small" style={{"maxWidth": "100%", "overflow": "scroll"}}>
                        <TableHead>
                            <TableRow>
                                <MythicTableCell style={{width: "3rem"}}></MythicTableCell>
                                <MythicTableCell style={{width: "30%"}}>Name</MythicTableCell>
                                <MythicTableCell style={{width: "5rem"}}>Manage</MythicTableCell>
                                <MythicTableCell>Actions</MythicTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {props.containers.map((service, index) => (
                                <ConsumingServicesTableRow key={"service" + index + service.name} service={service} showDeleted={props.showDeleted}/>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        </MythicTabPanel>
    )
}
