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
                return <ContainersTabPayloadTypesPanel key={"Payload Types"} type={"Payload Types"} index={value} value={value} showDeleted={showDeleted}
                                                       containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "payloadtype" && (c.agent_type === "agent" || c.agent_type === "wrapper"))} />
            case 1:
                return <ContainersTabPayloadTypesPanel key={"C2 Profiles"} type={"C2 Profiles"} index={value} value={value} showDeleted={showDeleted}
                                                       containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "c2profile")} />
            case 2:
                return <ContainersTabPayloadTypesPanel key={"Translators"} type={"Translators"} index={value} value={value} showDeleted={showDeleted}
                                                       containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "translationcontainer")} />
            case 3:
                return <ContainersTabPayloadTypesPanel key={"Command Augmentation"} type={"Command Augmentation"} index={value} value={value} showDeleted={showDeleted}
                                                       containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "payloadtype" && (c.agent_type === "command_augment"))} />
            case 4:
                return <ContainersTabPayloadTypesPanel key={"3rd Party"} type={"3rd Party"} index={value} value={value} showDeleted={showDeleted}
                                                       containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "payloadtype" && (c.agent_type === "service"))} />
            case 5:
                return <ContainersTabConsumingServicesPanel key={"Webhooks"} type={"Webhooks"} index={value} value={value} showDeleted={showDeleted}
                                                            containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "consuming_container" && c.type === "webhook")} />
            case 6:
                return <ContainersTabConsumingServicesPanel key={"Loggers"} type={"Loggers"} index={value} value={value} showDeleted={showDeleted}
                                                            containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "consuming_container" && c.type === "logging")} />
            case 7:
                return <ContainersTabConsumingServicesPanel key={"Eventing"} type={"Eventing"} index={value} value={value} showDeleted={showDeleted}
                                                            containers={allData.filter(c => filterDeleted(c, showDeleted)).filter(c => c.__typename === "consuming_container" && c.type === "eventing")} />
            case 8:
                return <ContainersTabConsumingServicesPanel key={"Auth"} type={"Auth"} index={value} value={value} showDeleted={showDeleted}
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
    const getEmptyServiceListMessage = () => {
        let message = "";
        switch(props.type){
            case "Payload Types":
                message = `Payload Types are the backbone of Mythic and represent the kinds of payloads you can create.
github.com/MythicAgents has a wide selection depending on what you're wanting to do.
https://mythicmeta.github.io/overview/ has a graphical overview and metadata about these community resources.`;
                break;
            case "C2 Profiles":
                message = `C2 Profiles represent how Payload Types connect back to Mythic or between themselves.
github.com/C2Profiles has a wide selection depending on what you're wanting to do.
https://mythicmeta.github.io/overview/ has a graphical overview and metadata about these community resources.`;
                break;
            case "Translators":
                message = `Sometimes Payload Types don't want to or can't use Mythic's normal JSON messaging.
Translation containers allow a Payload Type to use a custom message format while still interfacing with Mythic properly.`;
                break;
            case "Command Augmentation":
                message = `Command Augmentation containers allow agent-agnostic commands that can be leveraged within many Payload Types.
github.com/MythicAgents/forge is an example of this that provides more direct support for BOFs and Assemblies while being agnostic if any specific payload type.
Command Augmentation container commands get "injected" into the callbacks of supported Payload Types, so you'll never see them when building a payload.`;
                break;
            case "3rd Party":
                message = `To help ease the burden of context switching between applications while operating, Mythic supports 3rd Party Agents.
These are containers that generate "callbacks" and allow you to interact with a 3rd Party Service over an API from Mythic's standard tasking workflow.
A few examples are github.com/MythicAgents/bloodhound and github.com/MythicAgents/ghostwriter.`;
                break;
        }
        return (
            <div style={{overflowY: "hidden", flexGrow: 1}}>
                <div style={{
                    position: "absolute",
                    left: "35%",
                    top: "40%",
                    borderRadius: "4px",
                    border: "1px solid black",
                    padding: "5px",
                    backgroundColor: "rgba(37,37,37,0.92)", color: "white",
                    whiteSpace: "pre-wrap"
                }}>
                    {message}
                </div>
            </div>
        )
    }
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
                            {props.containers.length === 0 && getEmptyServiceListMessage()}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        </MythicTabPanel>
    )
}
const ContainersTabConsumingServicesPanel = (props) => {
    const getEmptyServiceListMessage = () => {
        let message = "";
        switch(props.type){
            case "Webhooks":
                message = `Mythic supports webhooks, but doesn't have any way to send them natively.
To enable webhooks, you first need to install a webhook container (or create your own).
github.com/MythicC2Profiles/basic_webhook is a good default for Slack webhooks.`;
                break;
            case "Loggers":
                message = `Mythic supports customized logging, but doesn't save this anywhere outside of the database natively.
To enable custom logging, you first need to install a logging container (or create your own).
github.com/MythicC2Profiles/basic_logger is a good default for capturing to standard out or to a file.`;
                break;
            case "Eventing":
                message = `Mythic supports dynamic eventing workflows that take a series of actions based on some trigger.
Some of these actions Mythic can do itself (such as sending a webhook or issuing a task), but if you want more customized logic, then you'll need a container.
You can easily create your own containers, or you can use github.com/MythicAgents/hydra as a dynamic way to add your own functions as you go.`;
                break;
            case "Auth":
                message = `Mythic supports basic username/password authentication to users within its database.
You can extend this auth capability to support your own LDAP, SSO, or otherwise customized authentication flow with auth containers.`;
                break;
        }
        return (
            <div style={{overflowY: "hidden", flexGrow: 1}}>
                <div style={{
                    position: "absolute",
                    left: "35%",
                    top: "40%",
                    borderRadius: "4px",
                    border: "1px solid black",
                    padding: "5px",
                    backgroundColor: "rgba(37,37,37,0.92)", color: "white",
                    whiteSpace: "pre-wrap"
                }}>
                    {message}
                </div>
            </div>
        )
    }
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
                            {props.containers.length === 0 && getEmptyServiceListMessage()}
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        </MythicTabPanel>
    )
}
