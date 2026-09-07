import {MythicActionButton} from "../../MythicComponents/MythicActionButton";
import React from 'react';
import {UploadEventFile} from "../../MythicComponents/MythicFileUpload";
import {snackActions} from "../../utilities/Snackbar";
import {ResponseDisplayPlaintext} from "../Callbacks/ResponseDisplayPlaintext";
import { gql, useLazyQuery } from '@apollo/client';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";
import CategoryIcon from '@mui/icons-material/Category';
import {EventStepRenderDialog} from "./EventStepRender";
import {MythicDialog} from "../../MythicComponents/MythicDialog";
import {CreateEventingStepper} from "./CreateEventingStepper";

export const testFileWebhookMutation = gql`
    query testEventGroupFile($file_contents: String!, $output_format: String){
        eventingTestFile(file_contents: $file_contents, output_format: $output_format){
            status
            error
            parsed_workflow
            formatted_output
        }
    }
`;

export function TestEventGroupFileDialog({onClose, initialWorkflow}){
    const [openEventStepRender, setOpenEventStepRender] = React.useState({open: false, data: {}});
    const [openCreateEventingStepper, setOpenCreateEventingStepper] = React.useState(false);
    const fileText = React.useRef(initialWorkflow);
    const onChangeFileText = (newText) => {
        fileText.current = newText;
    }
    const submitAsFile = async (evt) => {
        let blob = new Blob([fileText.current], { type: 'text/plain' });
        let file = new File([blob], "manual_eventing.yaml", {type: "text/plain"});
        let uploadStatus = await UploadEventFile(file, "New Manual Eventing Workflow");
        if(!uploadStatus){
            snackActions.error("Failed to upload file");
        }
        if(uploadStatus.status === "error"){
            snackActions.error(uploadStatus.error);
        }
        onClose();
    }
    const [testFileMutation] = useLazyQuery(testFileWebhookMutation, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            if(data.eventingTestFile.status === "success"){
                snackActions.success("No error detected");
            } else {
                snackActions.error(data.eventingTestFile.error);
            }
        },
        onError: (data) => {
            console.log(data);
        }
    })
    const [testFileForGraphMutation] = useLazyQuery(testFileWebhookMutation, {
        fetchPolicy: "no-cache",
        onCompleted: (data) => {
            if(data.eventingTestFile.status === "success"){
                setOpenEventStepRender({open: true, data: data.eventingTestFile.parsed_workflow});
            } else {
                snackActions.error(data.eventingTestFile.error);
            }
        },
        onError: (data) => {
            console.log(data);
        }
    })
    const testFile = () => {
        testFileMutation({variables: {file_contents: fileText.current}});
    }
    const previewGraph = () => {
        testFileForGraphMutation({variables: {file_contents: fileText.current}});
    }
    const onCloseStepper = (e, success) => {
        setOpenCreateEventingStepper(false);
        if(success === true){
            onClose();
        }
    }
    return (
        <React.Fragment>
            <DialogTitle id="form-dialog-title" className="mythic-eventing-editor-dialog-title items-start flex justify-between border-b-subtle">
                <div>
                    <div className="mythic-eventing-editor-title">Create and verify eventing workflow</div>
                    <div className="mythic-eventing-editor-subtitle text-xs font-600 leading-135 text-muted">Edit workflow source and validate it before upload.</div>
                </div>
                <div className="mythic-eventing-editor-title-actions flex flex-none gap-3">
                    <MythicStyledTooltip title={"Preview graph"}>
                        <MythicActionButton iconOnly appearance="raised" colorMode="hover" tone="info" size="small" onClick={previewGraph}>
                            <AccountTreeIcon fontSize="small" />
                        </MythicActionButton>
                    </MythicStyledTooltip>
                    <MythicStyledTooltip title={"Create with GUI wizard"} >
                        <MythicActionButton iconOnly appearance="raised" colorMode="hover" tone="success" size="small"
                        onClick={() => setOpenCreateEventingStepper(true)}>
                            <CategoryIcon fontSize="small" />
                        </MythicActionButton>
                    </MythicStyledTooltip>
                </div>
                {openEventStepRender.open &&
                    <MythicDialog fullWidth={true} maxWidth="xl" open={openEventStepRender.open}
                                  onClose={() => {
                                      setOpenEventStepRender({open: false, data: {}});
                                  }}
                                  innerDialog={<EventStepRenderDialog onClose={() => {
                                      setOpenEventStepRender({open: false, data: {}});
                                  }} selectedEventGroup={openEventStepRender.data} useSuppliedData={true}/>}
                    />
                }
                {openCreateEventingStepper &&
                    <MythicDialog fullWidth={true} maxWidth="xl" open={openCreateEventingStepper}
                                  onClose={onCloseStepper}
                                  innerDialog={<CreateEventingStepper onClose={onCloseStepper} />}
                    />
                }
            </DialogTitle>
            <DialogContent className="mythic-eventing-editor-dialog-content overflow-hidden">
                <ResponseDisplayPlaintext plaintext={fileText.current} onChangeContent={onChangeFileText} initial_mode={"yaml"} expand={true} />
            </DialogContent>
            <DialogActions className="mythic-eventing-wizard-actions gap-4 border-t-subtle">
                <MythicActionButton compact variant="outlined" onClick={onClose}>
                    Close
                </MythicActionButton>
                <MythicActionButton compact tone="info" variant={"outlined"} onClick={testFile}>
                    Test
                </MythicActionButton>
                <MythicActionButton compact tone="success" variant={"outlined"} onClick={submitAsFile}>
                    Save and Submit
                </MythicActionButton>
            </DialogActions>
        </React.Fragment>
    )
}
