import React from 'react';
import {useTheme} from '@mui/material/styles';
import makeStyles from '@mui/styles/makeStyles';
import Typography from '@mui/material/Typography';
import { Link } from '@mui/material';

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

export const MythicSnackDownload = (props) => {

    const theme = useTheme();
    const classes = useStyles(theme);
    return (
        <React.Fragment>
            <Typography variant="subtitle2" className={classes.typography}>
                {props.title}
            </Typography>
                <React.Fragment>
                    <Typography gutterBottom>File ready for download</Typography>
                    <Link download={true} href={"/direct/download/" + props.file_id} target="_blank">
                        Download here
                    </Link>
                </React.Fragment>
        </React.Fragment>

    );
};