import React, {useState} from 'react';
import {useTheme} from '@mui/material/styles';
import { useSnackbar, SnackbarContent } from 'notistack';
import Button from '@mui/material/Button';
import clsx from 'clsx';
import makeStyles from '@mui/styles/makeStyles';
import Collapse from '@mui/material/Collapse';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

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
                          size="large">
                          <ExpandMoreIcon />
                      </IconButton>
                      <IconButton className={classes.expand} onClick={handleDismiss} size="large">
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