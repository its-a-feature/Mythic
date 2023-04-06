import React from 'react';
import makeStyles from '@mui/styles/makeStyles';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import { faLanguage } from '@fortawesome/free-solid-svg-icons';
import {useTheme} from '@mui/material/styles';
import CardContent from '@mui/material/CardContent';
import {useMutation, gql} from '@apollo/client';
import {snackActions} from '../../utilities/Snackbar';
import Button from '@mui/material/Button';
import {MythicConfirmDialog} from '../../MythicComponents/MythicConfirmDialog';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreFromTrashOutlinedIcon from '@mui/icons-material/RestoreFromTrashOutlined';

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    display: "flex",
    marginBottom: "10px"
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

const toggleDeleteStatus = gql`
mutation toggleC2ProfileDeleteStatus($translationcontainer_id: Int!, $deleted: Boolean!){
  update_translationcontainer_by_pk(pk_columns: {id: $translationcontainer_id}, _set: {deleted: $deleted}) {
    id
  }
}
`;

export function TranslationContainerCard(props) {
  const theme = useTheme();
  const classes = useStyles();
  const [openDelete, setOpenDeleteDialog] = React.useState(false);
    const [updateDeleted] = useMutation(toggleDeleteStatus, {
      onCompleted: data => {
      },
      onError: error => {
        if(props.deleted){
          snackActions.error("Failed to restore translation profile");
        } else {
          snackActions.error("Failed to mark translation profile as deleted");
        }
        
      }
    });
    const onAcceptDelete = () => {
      updateDeleted({variables: {translationcontainer_id: props.id, deleted: !props.deleted}})
      setOpenDeleteDialog(false);
    }
  return (
    <Card className={classes.root} elevation={5}>
        <FontAwesomeIcon icon={faLanguage} style={{width: "100px", height: "100px"}} />
        <div>
          <Typography variant="h4" component="h1" style={{textAlign:"left", marginLeft: "10px"}}>{props.name}</Typography>
          <CardContent style={{textAlign:"left"}}>
              <Typography variant="body1" component="p">
                <b>Author:</b> {props.author}
              </Typography>
              <Typography variant="body1" component="p">
                <b>Supported Agents:</b> {props.payloadtypes.filter(pt => !pt.deleted).map( (pt) => pt.name).join(", ")}
              </Typography>
              <Typography variant="body2" component="p">
                <b>Description: </b>{props.description}
              </Typography>
              <Typography variant="body2" component="p" >
                <b>Container Status: </b>
              </Typography>
              <Typography variant="body2" component="p" color={props.container_running ? theme.palette.success.main : theme.palette.error.main} >
                <b>{props.container_running ? "Online" : "Offline"}</b>
              </Typography>
          </CardContent>
        </div>
        <div style={{display: "inline-flex", paddingRight: "10px", marginLeft: "auto", justifyContent: "space-evenly", alignItems: "stretch", flexDirection: "column", alignContent: "flex-end"}}>
            <Button size="small" variant="contained" color="primary" href={"/docs/c2-profiles/" + props.name.toLowerCase()} target="_blank">
              Docs
            </Button>
            {props.deleted ? (
              <Button size="small" onClick={()=>{setOpenDeleteDialog(true);}} color="success" variant="contained"><RestoreFromTrashOutlinedIcon/> Restore</Button>
            ) : (
              <Button size="small" onClick={()=>{setOpenDeleteDialog(true);}} color="error" variant="contained"><DeleteIcon/> Delete</Button>
            )}
            {openDelete && 
              <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete} 
                open={openDelete} 
                acceptText={props.deleted ? "Restore" : "Remove"} 
                acceptColor={props.deleted ? "success": "error"} />
            }
        </div>
    </Card>
  );
}
