import React from 'react';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import {gql } from '@apollo/client';
import {snackActions} from '../utilities/Snackbar';
import {useMutation } from '@apollo/client';
import {
  MythicDialogBody,
  MythicDialogButton,
  MythicDialogFooter,
  MythicDialogGrid,
  MythicDialogSection,
  MythicForm,
  MythicFormField,
  MythicFormNote
} from './MythicDialogLayout';

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
  const [taskID, setTaskID] = React.useState("");
  const messageTypeOptions = [
    {display: "Bug", value: "bug", description: "Something is broken or behaving unexpectedly."},
    {display: "Feature Request", value: "feature_request", description: "A workflow, capability, or quality-of-life improvement."},
    {display: "Confusing UI", value: "confusing_ui", description: "A part of the interface is unclear or hard to use."},
    {display: "Detection", value: "detection", description: "Detection, telemetry, or visibility feedback."},
  ];
  const [messageType, setMessageType] = React.useState("bug");
  const [submitFeedback, {loading}] = useMutation(submitFeedbackMutation, {
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
      const trimmedMessage = message.trim();
      if(trimmedMessage.length === 0){
        snackActions.warning("Please include feedback before submitting.");
        return;
      }
      let webhookData = {};
      if(Number(taskID) > 0){
        webhookData["task_display_id"] = String(Number(taskID));
      }
      webhookData["message"] =  trimmedMessage;
      webhookData["feedback_type"] = messageType;
      submitFeedback({variables: {webhookType: "new_feedback", webhookData: webhookData}});
  }
  const handleMessageTypeChange = (evt) => {
    setMessageType(evt.target.value);
  }
  const handleTaskIDChange = (evt) => {
    setTaskID(evt.target.value);
  }
  const handleMessageChange = (evt) => {
    setMessage(evt.target.value);
  }
  const onSubmitForm = (event) => {
    event.preventDefault();
    handleSubmit();
  }
  const selectedMessageType = messageTypeOptions.find((opt) => opt.value === messageType);
  const canSubmit = message.trim().length > 0 && !loading;
  
return (
  <React.Fragment>
      <DialogTitle>{props.title || "Submit Feedback"}</DialogTitle>
      <DialogContent dividers={true}>
        <MythicDialogBody>
          <MythicDialogSection
              title="Feedback Destination"
              description="Send this report to the feedback webhook configured for the current operation."
          >
            <MythicFormNote>
              Use this for bugs, workflow friction, feature ideas, detection notes, or anything operators should be able to capture without leaving Mythic.
            </MythicFormNote>
          </MythicDialogSection>
          <MythicDialogSection
              title="Report Details"
              description="Capture the category, optional task context, and the feedback details."
          >
            <MythicForm onSubmit={onSubmitForm}>
              <MythicDialogGrid minWidth="14rem">
                <MythicFormField label="Feedback Type" description={selectedMessageType?.description} required>
                  <FormControl fullWidth size="small">
                    <Select
                        labelId="feedback-type-select-label"
                        id="feedback-type-select"
                        value={messageType}
                        onChange={handleMessageTypeChange}
                    >
                      {messageTypeOptions.map( (opt) => (
                          <MenuItem value={opt.value} key={opt.value}>{opt.display}</MenuItem>
                      ) )}
                    </Select>
                  </FormControl>
                </MythicFormField>
                <MythicFormField
                    label="Task"
                    description="Optional task display ID for feedback tied to specific output or tasking."
                >
                  <TextField
                      fullWidth
                      size="small"
                      type="number"
                      value={taskID}
                      onChange={handleTaskIDChange}
                      placeholder="Optional"
                      inputProps={{min: 0}}
                  />
                </MythicFormField>
              </MythicDialogGrid>
              <MythicFormField
                  label="Feedback"
                  description="Include the context an operator or maintainer would need to understand the issue."
                  required
              >
                <TextField
                    autoFocus
                    fullWidth
                    multiline
                    minRows={6}
                    maxRows={10}
                    value={message}
                    onChange={handleMessageChange}
                    placeholder="What happened, what did you expect, and what would make this easier?"
                />
              </MythicFormField>
            </MythicForm>
          </MythicDialogSection>
        </MythicDialogBody>
      </DialogContent>
      <MythicDialogFooter>
        <MythicDialogButton onClick={props.onClose}>
          Close
        </MythicDialogButton>
        <MythicDialogButton onClick={handleSubmit} intent="primary" disabled={!canSubmit}>
          {loading ? "Submitting..." : "Submit Feedback"}
        </MythicDialogButton>
      </MythicDialogFooter>
</React.Fragment>
  );
}
