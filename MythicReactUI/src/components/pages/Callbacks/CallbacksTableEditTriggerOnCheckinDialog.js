import React, {useEffect} from 'react';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import NotificationsActiveTwoToneIcon from '@mui/icons-material/NotificationsActiveTwoTone';
import MythicTextField from "../../MythicComponents/MythicTextField";
import {
    MythicDialogBody,
    MythicDialogButton,
    MythicDialogFooter,
    MythicDialogSection,
    MythicForm,
    MythicFormField
} from "../../MythicComponents/MythicDialogLayout";

export function CallbacksTableEditTriggerOnCheckinDialog(props) {
    const [comment, setComment] = React.useState(0);
    const onChange = (name, value, error) => {
        if(isNaN(parseInt(value))){
            setComment(0);
        } else {
            setComment(parseInt(value));
        }
    }
    useEffect( () => {
        setComment(props.trigger_on_checkin_after_time);
    }, [props.trigger_on_checkin_after_time]);
    const onSubmit = () => {
        props.onSubmit(comment);
    }
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">Callback check-in alert</DialogTitle>
        <DialogContent dividers={true}>
            <MythicDialogBody>
                <div className="mythic-callback-trigger-summary p-6 items-start flex gap-6 min-w-0 rounded bg-surface-muted border-subtle">
                    <span className={`mythic-callback-trigger-summary-icon items-center inline-flex flex-none justify-center rounded bg-neutral-1 border-subtle text-muted${comment > 0 ? " mythic-callback-trigger-summary-icon-active" : ""}`}>
                        <NotificationsActiveTwoToneIcon fontSize="small" />
                    </span>
                    <div className="mythic-callback-trigger-summary-copy min-w-0">
                        <Typography className="mythic-callback-trigger-summary-title">
                            {comment > 0 ? `Alert after ${comment} minute${comment === 1 ? "" : "s"} without a check-in` : "Alerting disabled"}
                        </Typography>
                        <Typography className="mythic-callback-trigger-summary-description">
                            This setting only triggers when the callback checks in after crossing the configured threshold.
                        </Typography>
                    </div>
                </div>
                <MythicDialogSection
                    title="Threshold"
                    description="Set how many minutes this callback can remain silent before its next check-in can trigger eventing."
                >
                    <MythicForm>
                        <MythicFormField
                            label="Minutes without a check-in"
                            description="Use 0 to disable this alert for the callback."
                        >
                            <div className="mythic-form-field-control min-w-0 w-full">
                                <MythicTextField
                                    autoFocus={true}
                                    onChange={onChange}
                                    type="number"
                                    value={comment}
                                    onEnter={onSubmit}
                                    name="Trigger threshold"
                                    showLabel={false}
                                    marginTop="0"
                                    marginBottom="0"
                                    InputProps={{inputProps: {min: 0}}}
                                />
                            </div>
                        </MythicFormField>
                    </MythicForm>
                </MythicDialogSection>
                <MythicDialogSection title="Eventing behavior">
                    <div className="mythic-callback-trigger-rule-list gap-4 grid">
                        <div className="mythic-callback-trigger-rule text-xs leading-140 rounded bg-surface-muted border-subtle text-muted">
                            Trigger name: <strong>callback_checkin</strong>
                        </div>
                        <div className="mythic-callback-trigger-rule text-xs leading-140 rounded bg-surface-muted border-subtle text-muted">
                            Matching workflow filters still apply, including payload type and supported OS restrictions.
                        </div>
                        <div className="mythic-callback-trigger-rule text-xs leading-140 rounded bg-surface-muted border-subtle text-muted">
                            If no matching workflow exists, no workflow will run.
                        </div>
                    </div>
                </MythicDialogSection>
            </MythicDialogBody>
        </DialogContent>
        <MythicDialogFooter>
          <MythicDialogButton onClick={props.onClose}>
            Close
          </MythicDialogButton>
            {props.onSubmit &&
                <MythicDialogButton onClick={onSubmit} intent="primary">
                    Save Threshold
                </MythicDialogButton>
            }
        </MythicDialogFooter>
    </React.Fragment>
  );
}
