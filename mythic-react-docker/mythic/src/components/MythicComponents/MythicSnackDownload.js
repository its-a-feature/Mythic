import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {useTheme} from '@material-ui/core/styles';
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

export const MythicSnackDownload = React.forwardRef((props, ref) => {
  
  const propTypes = {
    title: PropTypes.string,
    innerText: PropTypes.string,
    downloadLink: PropTypes.func,
  }
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
                  <Typography variant="subtitle2" className={classes.typography}>{props.title}</Typography>
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
                      <Typography gutterBottom>{props.innerText}</Typography>
                      <Button size="small" className={classes.button} download href={props.downloadLink}>
                          <CheckCircleIcon className={classes.checkIcon} />
                          Download now
                      </Button>
                  </Paper>
              </Collapse>
          </Card>
      </SnackbarContent>
  );
});