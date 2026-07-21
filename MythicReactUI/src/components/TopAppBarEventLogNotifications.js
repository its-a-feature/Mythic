import React from 'react';
import {useSubscription, gql } from '@apollo/client';
import Badge from '@mui/material/Badge';
import NotificationsActiveTwoToneIcon from '@mui/icons-material/NotificationsActiveTwoTone';
import { useTheme } from '@mui/material/styles';
import {alertCount} from "../cache";
import {MeContext} from "./App";
import {requestCurrentOperationSync} from "./utilities/MythicConnection";

const SUB_Event_Logs = gql`
subscription OperationAlertCounts($operation_id: Int!, $operator_id: Int!){
  operation_by_pk(id: $operation_id) {
    id
    alert_count
    operators(where: {id: {_eq: $operator_id}}) {
      id
    }
  }
}
 `;

export function TopAppBarVerticalEventLogNotifications() {
    const theme = useTheme();
    const me = React.useContext(MeContext);
    const [alerts, setAlerts] = React.useState(alertCount());
    const syncRequestedForOperation = React.useRef(null);
    React.useEffect(() => {
        syncRequestedForOperation.current = null;
    }, [me?.user?.current_operation_id]);
    const {error} = useSubscription(SUB_Event_Logs, {
        variables: {
            operation_id: me?.user?.current_operation_id || 0,
            operator_id: me?.user?.user_id || 0,
        },
        skip: !me?.user?.current_operation_id || !me?.user?.user_id,
        onError: data => {
            console.log("vertical event log error")
            console.error(data);
        },
        onData: ({data}) => {
            const operation = data.data?.operation_by_pk;
            if(!operation){
                return;
            }
            if(operation.operators.length === 0 &&
                syncRequestedForOperation.current !== operation.id){
                syncRequestedForOperation.current = operation.id;
                requestCurrentOperationSync();
                return;
            }
            const newAlertCount = operation.alert_count;
            if(newAlertCount !== alerts){
                setAlerts(newAlertCount);
                alertCount(newAlertCount);
            }
        }
    });

    return (
            error ? (
                <Badge color="secondary" badgeContent={"X"}>
                    <NotificationsActiveTwoToneIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"}  />
                </Badge>
            ) : (
                <Badge badgeContent={alerts}
                       color="error" max={99}
                >
                    <NotificationsActiveTwoToneIcon style={{color: theme.navBarTextIconColor}} fontSize={"medium"}/>
                </Badge>
            )
    );
}
