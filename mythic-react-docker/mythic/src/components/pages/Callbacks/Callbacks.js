import React  from 'react';
import {useSubscription, gql } from '@apollo/client';
import LinearProgress from '@material-ui/core/LinearProgress';
import {CallbacksTable} from './CallbacksTable';
import {CallbacksGraph} from './CallbacksGraph';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import {CallbacksTabs} from './CallbacksTabs';
import SpeedDial from '@material-ui/lab/SpeedDial';
import SpeedDialIcon from '@material-ui/lab/SpeedDialIcon';
import SpeedDialAction from '@material-ui/lab/SpeedDialAction';
import { makeStyles } from '@material-ui/core/styles';
import AspectRatioIcon from '@material-ui/icons/AspectRatio';
import TocIcon from '@material-ui/icons/Toc';
import AssessmentIcon from '@material-ui/icons/Assessment';
import {HeightsDialog} from './HeightsDialog';
import { MythicDialog } from '../../MythicComponents/MythicDialog';

const SUB_Callbacks = gql`
subscription CallbacksSubscription ($operation_id: Int!){
  callback(where: {active: {_eq: true}, operation_id: {_eq: $operation_id}}, order_by: {id: desc}) {
    architecture
    description
    domain
    external_ip
    host
    id
    integrity_level
    ip
    last_checkin
    locked
    sleep_info
    pid
    os
    user
    agent_callback_id
    operation_id
    process_name
    payload {
      os
      payloadtype {
        ptype
        id
      }
      id
    }
    callbacktokens(where: {deleted: {_eq: false}}) {
      token {
        TokenId
        id
      }
      id
    }
  }
}
 `;
const SUB_Edges = gql`
subscription CallbacksSubscription ($operation_id: Int!){
  callbackgraphedge(where: {operation_id: {_eq: $operation_id}}, order_by: {id: desc}) {
    id
    end_timestamp
    direction
    destination {
      active
      id
      operation_id
      user
      host
      payload {
        payloadtype {
          ptype
          id
        }
      }
      callbackc2profiles {
        c2profile {
          name
        }
      }
    }
    source {
      active
      id
      user
      operation_id
      host
      payload {
        payloadtype {
          ptype
          id
        }
      }
      callbackc2profiles {
        c2profile {
          name
        }
      }
    }
    c2profile {
      id
      is_p2p
      name
    }
  }
}
 `;
 const useStyles = makeStyles((theme) => ({
  root: {
    transform: 'translateZ(0px)',
    flexGrow: 1,
  },
  speedDial: {
    position: 'absolute',
    '&.MuiSpeedDial-directionUp, &.MuiSpeedDial-directionLeft': {
      bottom: theme.spacing(2),
      right: theme.spacing(2),
    },
    '&.MuiSpeedDial-directionDown, &.MuiSpeedDial-directionRight': {
      top: theme.spacing(2),
      right: theme.spacing(2),
    },
  },
}));
export function Callbacks(props){
    const me = useReactiveVar(meState);
    const classes = useStyles();
    const [open, setOpen] = React.useState(false);
    const [topDisplay, setTopDisplay] = React.useState("table");
    const [openTabs, setOpenTabs] = React.useState([]);
    const [clickedTabId, setClickedTabId] = React.useState("");
    const [heights, setHeights] = React.useState({top: 30, bottom: 56});
    const [openHeightsDialog, setOpenHeightsDialog] = React.useState(false);
    const { loading, error, data } = useSubscription(SUB_Callbacks, {
        variables: {operation_id: me.user.current_operation_id}, fetchPolicy: "network-only",
        shouldResubscribe: true
    });
    const { loading: loadingEdges , data: dataEdges } = useSubscription(SUB_Edges, {
        variables: {operation_id: me.user.current_operation_id}, fetchPolicy: "network-only",
        shouldResubscribe: true
    });
    const onOpenTab = ({tabID, tabType, callbackID}) => {
        let found = false;
        openTabs.forEach( (tab) => {
            if(tab.tabID === tabID) found = true;
            if(tab.tabType === "fileBrowser" && tabType === "fileBrowser") found = true;
        });
        //console.log(tabID, tabType, callbackID, found);
        if(!found){
            for(let i = 0; i < data.callback.length; i++){
              if(data.callback[i]["id"] === callbackID){
                const tabs = [...openTabs, {tabID, tabType, callbackID, 
                    payloadtype: data.callback[i]["payload"]["payloadtype"]["ptype"],
                    os: data.callback[i]["payload"]["os"]}];
                setOpenTabs(tabs);
              }
            }
        }
        setClickedTabId(tabID);
    }
    const onCloseTab = ({tabID, index}) => {
        const tabSet = openTabs.filter( (tab) => {
            return tab.tabID !== tabID;
        });
        //console.log("closing tab and setting to:", tabSet);
        setOpenTabs(tabSet);
    }
    const clearSelectedTab = () => {
        setClickedTabId("");
    }
    const actions = [
      { icon: <TocIcon />, name: 'Table layout', onClick: () => {setTopDisplay("table")}},
      { icon: <AssessmentIcon />, name: 'Graph layout', onClick: () => {setTopDisplay("graph")}},
      { icon: <AspectRatioIcon />, name: 'Adjust Top/Bottom Size' , onClick: () => {setOpenHeightsDialog(true);setOpen(false);}},
    ];
    const getTopDisplay = () => {
        switch(topDisplay){
            case "graph":
                return (<CallbacksGraph maxHeight={`calc(${heights.top}vh)`} topHeight={heights.top} key={"callbacksgraph"} onOpenTab={onOpenTab} callbacks={data.callback} callbackgraphedges={dataEdges.callbackgraphedge} />)
            case "table":
            default:
                return (<CallbacksTable maxHeight={`calc(${heights.top}vh)`} topHeight={heights.top} key={"callbackstable"} onOpenTab={onOpenTab} callbacks={data.callback} callbackgraphedges={dataEdges.callbackgraphedge} />)
        }
    }
    const onSubmitHeights = (newHeights) => {
        setHeights(newHeights);
        setOpen(false);
    }
    return (
        <div style={{maxWidth: "100%",height: "calc(94vh)", marginRight: "5px"}}>
            
            
            {loading || loadingEdges ? (<LinearProgress style={{marginTop: "20px"}} />) : (
            error ? (<div>Error!</div>) : (
              <React.Fragment>
                {getTopDisplay()}
                <CallbacksTabs onCloseTab={onCloseTab} clearSelectedTab={clearSelectedTab} tabHeight={heights.bottom} maxHeight={`calc(${heights.bottom}vh)`} key={"callbackstabs"} clickedTabId={clickedTabId} openTabs={openTabs} callbacks={data.callback} />
              </React.Fragment>
              )
            )}
            <SpeedDial
              ariaLabel="SpeedDial example"
              className={classes.speedDial}
              icon={<SpeedDialIcon />}
              onClose={()=>{setOpen(false);}}
              onOpen={()=>{setOpen(true);}}
              FabProps={{ color: "secondary" }}
              open={open}
              direction="down"
            >
              {actions.map((action) => (
                <SpeedDialAction
                  key={action.name}
                  icon={action.icon}
                  tooltipTitle={action.name}
                  onClick={action.onClick}
                />
              ))}
            </SpeedDial>
            <MythicDialog fullWidth={true} maxWidth="sm" open={openHeightsDialog} 
                    onClose={()=>{setOpenHeightsDialog(false);setOpen(false);}} 
                    innerDialog={<HeightsDialog onClose={()=>{setOpenHeightsDialog(false);setOpen(false);}} heights={heights} onSubmit={onSubmitHeights} />}
                />
        </div>
    );
}
