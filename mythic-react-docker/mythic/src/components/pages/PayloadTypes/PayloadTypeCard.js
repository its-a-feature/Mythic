import React from 'react';
import { makeStyles, withStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardMedia from '@material-ui/core/CardMedia';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Badge from '@material-ui/core/Badge';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {PayloadTypeBuildDialog} from './PayloadTypeBuildDialog';

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    display: "flex",
    margin: "10px"
  },
  expand: {
    transform: 'rotate(0deg)',
    marginLeft: 'auto',
    transition: theme.transitions.create('transform', {
      duration: theme.transitions.duration.shortest,
    }),
  },
  expandOpen: {
    transform: 'rotate(180deg)',
  },
  running: {
    backgroundColor: '#44b700',
    color: '#44b700',
  },
  notrunning: {
    backgroundColor: 'red',
    color: 'red',
  },
}));
const StyledAvatar = withStyles((theme) => ({
    badge: {
        boxShadow: "0 0 0 2px white",
        '&::after': {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          animation: '$ripple 1.2s infinite ease-in-out',
          border: '1px solid currentColor',
          content:'""'
        },
      },
  '@keyframes ripple': {
    '0%': {
      transform: 'scale(.8)',
      opacity: 1,
    },
    '100%': {
      transform: 'scale(2.4)',
      opacity: 0,
    },
  },
}))(Badge);

export function PayloadTypeCard(props) {
  const classes = useStyles();
  const [openBuildingDialog, setOpenBuildingDialog] = React.useState(false);
  let date = new Date();
  let now = date.getTime() + date.getTimezoneOffset() * 60000;
  let heartbeat = new Date(props.last_heartbeat);
  let difference = (now - heartbeat.getTime()) / 1000;
  const running = difference < 30 ? 'running' : 'notrunning';

  return (
    <Card className={classes.root} elevation={5} style={{maxWidth: "99%"}}>
        <div>
        <StyledAvatar overlap="circle" classes={{badge: classes[running]}} invisible={false} anchorOrigin={{vertical: "bottom", horizontal: "right"}}>
            <CardMedia
            className={classes.media}
            component="img"
            style={{width: "100px", padding: "10px"}}
            src={process.env.PUBLIC_URL + "/new/agents/" + props.ptype + ".svg"}
          />
        </StyledAvatar>
        </div>
      <div>
        <Typography variant="h4" component="h1" style={{textAlign:"left", marginLeft: "10px"}}>{props.ptype}</Typography>
        <CardContent style={{textAlign:"left"}}>
            <Typography variant="body1" component="p">
              <b>Author:</b> {props.author}
            </Typography>
            <Typography variant="body1" component="p">
              <b>Supported Operating Systems:</b> {props.supported_os}
            </Typography>
            <Typography variant="body2" component="p">
              {props.note}
            </Typography>
            {props.translationcontainer === null ? (null) : (
                <Typography variant="body1" component="p">
                  <b>Translation Container:</b> {props.translationcontainer.name}
                </Typography>
            ) }
        </CardContent>
        <CardActions >
            <Button size="small" color="primary" href={"/docs/agents/" + props.ptype} target="_blank">
              Docs
            </Button>
            <Button onClick={()=>{setOpenBuildingDialog(true);}} color="primary" variant="contained">Building</Button>
                <MythicDialog fullWidth={true} maxWidth="lg" open={openBuildingDialog} 
                    onClose={()=>{setOpenBuildingDialog(false);}} 
                    innerDialog={<PayloadTypeBuildDialog {...props} payload_name={props.ptype} />}
                 />
          </CardActions>
      </div>
    </Card>
  );
}
