import React, {useEffect, useState} from 'react';
import {gql, useSubscription} from '@apollo/client';
import { useSnackbar, SnackbarContent } from 'notistack';
import Button from '@material-ui/core/Button';
import clsx from 'clsx';
import { makeStyles } from '@material-ui/core/styles';
import Collapse from '@material-ui/core/Collapse';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import {useTheme} from '@material-ui/core/styles';
import {snackActions} from '../../utilities/Snackbar';

//fromNow must be in ISO format for hasura/postgres stuff
//new Date().toISOString() will do it
const subscribe_payloads = gql`
subscription NewPayloadsSubscription($fromNow: timestamp!) {
  payload(limit: 1, where: {deleted: {_eq: false}, creation_time: {_gte: $fromNow}}, order_by: {creation_time: desc}) {
    build_message
    build_phase
    build_stderr
    build_stdout
    uuid
    tag
    id
    filemetum{
        agent_file_id
    }
  }
}
 `;
const useStyles =  makeStyles(theme => ({
    root: {
        [theme.breakpoints.up('sm')]: {
            minWidth: '344px !important',
        },
    },
    typography: {
        fontWeight: 'bold',
    },
    actionRoot: {
        padding: '8px 8px 8px 16px',
    },
    icons: {
        marginLeft: 'auto',
        float: "right"
    },
    expand: {
        padding: '8px 8px',
        transform: 'rotate(0deg)',
        transition: theme.transitions.create('transform', {
            duration: theme.transitions.duration.shortest,
        }),
    },
    expandOpen: {
        transform: 'rotate(180deg)',
    },
    collapse: {
        padding: 16,
    },
    checkIcon: {
        fontSize: 20,
        color: '#b3b3b3',
        paddingRight: 4,
    },
    button: {
        padding: 0,
        textTransform: 'none',
    },
}));

const SnackMessage = React.forwardRef((props, ref) => {
    
    const theme = useTheme();
    const classes = useStyles(theme);
    
    const { closeSnackbar } = useSnackbar();
    const [expanded, setExpanded] = useState(true);

    const handleExpandClick = () => {
        setExpanded(!expanded);
    };

    const handleDismiss = () => {
        closeSnackbar(props.id);
    };

    return (
        <SnackbarContent ref={ref} className={classes.root}>
            <Card style={{backgroundColor: theme.palette.success.main}} >
                <CardActions classes={{ root: classes.actionRoot }}>
                    <Typography variant="subtitle2" className={classes.typography}>Payload successfuly built!</Typography>
                    <div className={classes.icons}>
                        <IconButton
                            aria-label="Show more"
                            className={clsx(classes.expand, { [classes.expandOpen]: expanded })}
                            onClick={handleExpandClick}
                        >
                            <ExpandMoreIcon />
                        </IconButton>
                        <IconButton className={classes.expand} onClick={handleDismiss}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                </CardActions>
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <Paper className={classes.collapse}>
                        <Typography gutterBottom>Agent ready for download</Typography>
                        <Button size="small" className={classes.button} download href={window.location.origin + "/direct/download/" + props.file_id}>
                            <CheckCircleIcon className={classes.checkIcon} />
                            Download now
                        </Button>
                    </Paper>
                </Collapse>
            </Card>
        </SnackbarContent>
    );
});
const SnackMessageError = React.forwardRef((props, ref) => {
    
    const theme = useTheme();
    const classes = useStyles(theme);
    const { closeSnackbar } = useSnackbar();
    const [expanded, setExpanded] = useState(false);

    const handleExpandClick = () => {
        setExpanded(!expanded);
    };

    const handleDismiss = () => {
        closeSnackbar(props.id);
    };

    return (
        <SnackbarContent ref={ref} className={classes.root}>
            <Card style={{backgroundColor: theme.palette.error.main}} >
                <CardActions classes={{ root: classes.actionRoot }}>
                    <Typography variant="subtitle2" className={classes.typography}>Payload Failed to build!</Typography>
                    <div className={classes.icons}>
                        <IconButton
                            aria-label="Show more"
                            className={clsx(classes.expand, { [classes.expandOpen]: expanded })}
                            onClick={handleExpandClick}
                        >
                            <ExpandMoreIcon />
                        </IconButton>
                        <IconButton className={classes.expand} onClick={handleDismiss}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                </CardActions>
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <Paper className={classes.collapse}>
                        {props.display}
                    </Paper>
                </Collapse>
            </Card>
        </SnackbarContent>
    );
});
export function PayloadSubscriptionNotification(props) {
    const [fromNow, setFromNow] = React.useState(null);
    const { loading, error, data } = useSubscription(subscribe_payloads, {variables: {fromNow}});
    
    
    useEffect( () => {
        setFromNow(new Date().toISOString());
    }, []);
    useEffect( () => {
        if(!loading && !error && data && data.payload.length > 0){
            if(data.payload[0].build_phase === "success"){
                snackActions.dismiss();
                snackActions.success(data.payload[0].build_message, {persist: true, content: key => <SnackMessage id={key} file_id={data.payload[0].filemetum.agent_file_id} />});
            }else if(data.payload[0].build_phase === "building"){
                snackActions.info(`Building payload ${data.payload[0].uuid}...`, {autoHideDuration: 5000});
            }else{
                snackActions.dismiss();
                if(data.payload[0].build_error !== ""){
                    snackActions.error(data.payload[0].build_stderr, {persist: true, content: key => <SnackMessageError id={key} display={data.payload[0].build_stderr} />});
                }else{
                    snackActions.error(data.payload[0].build_message, {persist: true, content: key => <SnackMessageError id={key} display={data.payload[0].build_message} />});
                }
            } 
        }else if(error){
            console.log(error);
            snackActions.error("Mythic encountered an error: " + error.toString());
        }
    }, [loading, data, error]);
    return (    
       null
    );
}

