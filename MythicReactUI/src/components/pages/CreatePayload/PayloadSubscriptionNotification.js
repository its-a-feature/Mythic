import React from 'react';
import { styled } from '@mui/material/styles';
import {gql, useSubscription} from '@apollo/client';
import {useTheme} from '@mui/material/styles';
import {snackActions} from '../../utilities/Snackbar';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-xcode';
import {PayloadsTableRowBuildProgress} from '../Payloads/PayloadsTableRowBuildProgress';
import { toast } from 'react-toastify';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {Button, Link, Typography} from '@mui/material';

const PREFIX = 'PayloadSubscriptionNotification';

const classes = {
    root: `${PREFIX}-root`,
    typography: `${PREFIX}-typography`,
    actionRoot: `${PREFIX}-actionRoot`,
    icons: `${PREFIX}-icons`,
    expand: `${PREFIX}-expand`,
    collapse: `${PREFIX}-collapse`,
    checkIcon: `${PREFIX}-checkIcon`,
    button: `${PREFIX}-button`
};

const StyledMythicDialog = styled(MythicDialog)((
    {
        theme
    }
) => ({
    [`& .${classes.root}`]: {
        [theme.breakpoints.up('sm')]: {
            minWidth: '344px !important',
        },
    },

    [`& .${classes.typography}`]: {
        fontWeight: 'bold',
    },

    [`& .${classes.actionRoot}`]: {
        padding: '0px 8px 0px 16px',
    },

    [`& .${classes.icons}`]: {
        marginLeft: 'auto',
        float: "right"
    },

    [`& .${classes.expand}`]: {
        padding: '8px 8px',
        transition: theme.transitions.create('transform', {
            duration: theme.transitions.duration.shortest,
        }),
    },

    [`& .${classes.collapse}`]: {
        padding: 16,
    },

    [`& .${classes.checkIcon}`]: {
        fontSize: 20,
        color: '#b3b3b3',
        paddingRight: 4,
    },

    [`& .${classes.button}`]: {
        padding: 0,
        textTransform: 'none',
    }
}));

//fromNow must be in ISO format for hasura/postgres stuff
//new Date().toISOString() will do it
const subscribe_payloads = gql`
subscription NewPayloadsSubscription($fromNow: timestamp!) {
  payload_stream(batch_size: 1, cursor: {initial_value: {timestamp: $fromNow}, ordering: ASC}, where: { deleted: {_eq: false}}) {
    build_message
    build_phase
    build_stderr
    build_stdout
    uuid
    description
    id
    filemetum{
        agent_file_id
    }
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
  }
}
 `;

const SnackMessage = (props) => {
    return (
        <div style={{display: "flex", flexDirection: "column"}}>
            <Typography variant="subtitle2" className={classes.typography}>
                    {props.payloadData.build_phase === "success" ? (
                        "Payload successfully built!"
                    ) : (
                        "Payload Building..."
                    )}
                    
            </Typography>
            <PayloadsTableRowBuildProgress {...props.payloadData} />
            {props.payloadData.build_phase === "success" &&
                <React.Fragment>
                    <Typography gutterBottom>Agent ready for download</Typography>
                    <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" target="_blank" href={"/direct/download/" + props.file_id}>
                        Download here
                    </Link>
                </React.Fragment>
            }
        </div>

    );
};
const SnackMessageError = (props) => {
    
    const theme = useTheme();
    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title">Payload Failed to Build!!</DialogTitle>
            <AceEditor 
                mode="text"
                theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
                fontSize={14}
                showGutter={true}
                highlightActiveLine={true}
                value={"Build Message:\n" + props.payloadData.build_message + "\nStdErr: \n" + props.payloadData.build_stderr + "\nStdOut: \n" + props.payloadData.build_stdout}
                focus={true}
                width={"100%"}
                setOptions={{
                    showLineNumbers: true,
                    useWorker: false,
                    tabSize: 4
                }}/>
        <DialogActions>
          <Button variant="contained" onClick={props.onClose} color="primary">
            Close
          </Button>
        </DialogActions>
        </React.Fragment>
    );
};

export function PayloadSubscriptionNotification(props) {
    const [payloadData, setPayloadData] = React.useState({});
    const displayingToast = React.useRef(false);
    const [displayErrorDialog, setDisplayErrorDialog] = React.useState(false);
    const dismissedUUIDs = React.useRef([]);
    const mountedRef = React.useRef(true);
    const getSnackMessage = () => {
        return <SnackMessage
            file_id={payloadData.filemetum.agent_file_id} 
            payloadData={payloadData}
            handleDismiss={handleDismiss}
            />
    };
    const handleDismiss = () => {
        displayingToast.current = false;
        dismissedUUIDs.current.push(payloadData.uuid);
    }
    const handleErrorClose = () => {
        dismissedUUIDs.current.push(payloadData.uuid);
        setDisplayErrorDialog(false);
    }

    React.useEffect(() => {
        return () => {
            if(displayingToast.current){
                snackActions.dismiss();
            }
            mountedRef.current = false;
        }
    }, []);
    React.useEffect( () => {
        if(payloadData.uuid === undefined){
            return;
        }
        if(dismissedUUIDs.current.includes(payloadData.uuid)){
            return
        }
        if(!displayingToast.current){
            if(payloadData.build_phase === "success" || payloadData.build_phase === "building"){
                snackActions.dismiss();
                snackActions.clearAll();
                snackActions.info(getSnackMessage(), {toastId: payloadData.uuid, autoClose: false, onClose: handleDismiss, closeOnClick: false, closeButton: undefined});
            }
            displayingToast.current = true;
            
        }
        if(payloadData.build_phase === "error"){
            snackActions.dismiss();
            setDisplayErrorDialog(true);
        } else if(displayingToast.current) {
            snackActions.update(getSnackMessage(), payloadData.uuid, {
                type: payloadData.build_phase === "success" ? "success" : "info",
            });
        }
        
    }, [payloadData, getSnackMessage]);
    useSubscription(subscribe_payloads, {variables: {fromNow: props.fromNow},
    onData: ({data}) => {
        if(data.data.payload_stream[0].uuid === props.subscriptionID){
            if(!mountedRef.current){
                return;
            }
            setPayloadData({...data.data.payload_stream[0]});
        } else {
            console.log(data.data.payload_stream[0])
        }
    }
    });
    return displayErrorDialog &&
    <StyledMythicDialog fullWidth={true} maxWidth="xl" open={displayErrorDialog} 
                    onClose={handleErrorClose} 
                    innerDialog={<SnackMessageError payloadData={payloadData} onClose={handleErrorClose} />}
                />;
}

