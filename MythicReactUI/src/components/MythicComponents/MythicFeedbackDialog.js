import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import { Divider, Input, MenuItem, Select } from '@mui/material';
import MythicTextField from './MythicTextField';
import {gql } from '@apollo/client';
import {snackActions} from '../utilities/Snackbar';
import {useMutation } from '@apollo/client';

const submitFeedbackMutation = gql`
  mutation submitFeedback($webhookType: String!, $webhookData: jsonb!){
    sendExternalWebhook(webhook_type: $webhookType, webhook_data: $webhookData){
      status
      error
    }
  }
`;
export function MythicFeedbackDialog(props) {
  const [message, setMessage] = React.useState("");
  const [taskID, setTaskID] = React.useState(0);
  const messageTypeOptions = [
    {display: "Bug", value: "bug"}, 
    {display: "Feature Request", value: "feature_request"}, 
    {display: "Confusing UI", value: "confusing_ui"},
    {display: "Detection", value: "detection"},
  ];
  const [messageType, setMessageType] = React.useState("bug");
  const [submitFeedback] = useMutation(submitFeedbackMutation, {
    update: (cache, {data}) => {
      if(data.sendExternalWebhook.status === "success"){
        snackActions.success("Submitted Feedback!");
      } else {
        snackActions.warning(data.sendExternalWebhook.error);
      }
      props.onClose();
    },
    onError: error => {
      console.log(error)
      snackActions.warning(error.message);
    }
  });
  const handleSubmit = () => {
      let webhookData = {};
      if(taskID > 0){
        webhookData["task_id"] = String(taskID);
      }
      webhookData["message"] =  message;
      webhookData["feedback_type"] = messageType;
      submitFeedback({variables: {webhookType: "new_feedback", webhookData: webhookData}});
  }
  const handleMessageTypeChange = (evt) => {
    setMessageType(evt.target.value);
  }
  const handleTaskIDChange = (name, value, error) => {
    setTaskID(value);
  }
  const handleMessageChange = (name, value, error) => {
    setMessage(value);
  }
  const handleOnEnter = (event) => {
    if( event.shiftKey){
      handleSubmit();
    }
  }
  
return (
  <React.Fragment>
      <DialogTitle >{props.title}</DialogTitle>
      <Divider></Divider>
      <DialogContent style={{padding: "10px"}}>
        Send a feedback report to the slack webhook configured for the current operation.
        This provides a way to easily capture a bug, feedback requests, or comments without breaking operator flow too much. <br/>
        Shift+Enter will auto-submit the form.
        <TableContainer  className="mythicElement">
            <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
                <TableBody style={{whiteSpace: "pre"}}> 
                    <TableRow hover >
                        <TableCell style={{width: "5rem"}}>
                          Feedback Type
                        </TableCell>
                        <TableCell>
                            <Select
                              labelId="demo-dialog-select-label"
                              id="demo-dialog-select"
                              value={messageType}
                              onChange={handleMessageTypeChange}
                              input={<Input style={{width: "100%"}}/>}
                            >
                              {messageTypeOptions.map( (opt) => (
                                  <MenuItem value={opt.value} key={opt.value}>{opt.display}</MenuItem>
                              ) )}
                            </Select>
                        </TableCell>
                    </TableRow>
                    <TableRow hover >
                      <TableCell style={{width: "5rem"}}>
                        Task (if applicable)
                      </TableCell>
                      <TableCell>
                        <MythicTextField value={taskID} type={"number"}
                          onChange={handleTaskIDChange} display="inline-block" name={"taskid"} showLabel={false}
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow hover>
                      <TableCell>
                        Feedback
                      </TableCell>
                      <TableCell>
                      <MythicTextField value={message} multiline={true} onEnter={handleOnEnter}
                          onChange={handleMessageChange} display="inline-block" name={"taskid"} showLabel={false}
                        />
                      </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} variant="contained" color="primary">
          Close
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="success">
          Submit Feedback
        </Button>
      </DialogActions>
</React.Fragment>
  );
}
