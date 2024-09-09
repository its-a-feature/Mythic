import React from 'react';
import {useSubscription, gql } from '@apollo/client';
import Badge from '@mui/material/Badge';
import PlayCircleFilledTwoToneIcon from '@mui/icons-material/PlayCircleFilledTwoTone';
import { Link } from 'react-router-dom';
import { IconButton } from '@mui/material';
import {snackActions} from './utilities/Snackbar';
import {MythicStyledTooltip} from "./MythicComponents/MythicStyledTooltip";

const OperationEventingCounts = gql`
subscription OperationEventingCounts {
  eventgroupinstance_stream(cursor: {initial_value: {updated_at: "1970-01-01"}, ordering: ASC}, batch_size: 50) {
    id
    end_timestamp
  }
}
 `;

export function TopAppBarEventingNotifications(props) {
    const [totalRunning, setTotalRunning] = React.useState([]);
    const { loading, error, data } = useSubscription(OperationEventingCounts, {
      onData: ({data}) => {
        const newRunningCounts = data.data.eventgroupinstance_stream.reduce( (prev, cur) => {
            let existingIndex = prev.findIndex( e => e.id === cur.id);
            if(existingIndex >= 0){
                if(cur.end_timestamp !== null){
                    prev.splice(existingIndex, 1);
                }
                return [...prev];
            }
            if(cur.end_timestamp === null){
                return [...prev, cur];
            }
            return [...prev];
        }, totalRunning);
        setTotalRunning(newRunningCounts);
      },
    onError: data => {
        snackActions.error("Mythic encountered an error getting eventing counts: " + data.toString());
        console.error(data);
    }
  });

    return (
            <MythicStyledTooltip title="Eventing Counts">
                <IconButton
                    color="inherit"
                    component={Link}
                    disableFocusRipple={true}
                    disableRipple={true}
                    to='/new/Eventing'>
                    {error ? (
                        <Badge color="secondary" badgeContent={0}>
                            <PlayCircleFilledTwoToneIcon fontSize={"large"}  />
                        </Badge>
                    ) : (
                        <Badge badgeContent={totalRunning.length}  color="warning">
                            <PlayCircleFilledTwoToneIcon fontSize={"large"}  />
                        </Badge>
                    )}
                </IconButton>
            </MythicStyledTooltip>
    );
}

