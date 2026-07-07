import React from 'react';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import {Step1SelectOS} from './Step1SelectOS';
import {Step3SelectCommands} from './Step3SelectCommands';
import {Step4C2Profiles} from './Step4C2Profiles';
import {Step5Build} from './Step5Build';
import Typography from '@mui/material/Typography';
import { snackActions } from '../../utilities/Snackbar';
import {MythicPageBody} from "../../MythicComponents/MythicPageBody";

function getSteps(){
    return ['Select Target OS', 'Configure Payload', 'Select Commands', 'Select C2 Profiles', 'Build']
}

export function CreatePayload(props){
    const me = props.me;
    const noOperation = (me?.user?.current_operation_id || 0) > 0 ? false : true;
    const [payload, setPayload] = React.useState({}); 
    const [activeStep, setActiveStep] = React.useState(0);
    const getStepContent = (step) => {
          switch (step) {
            case 0:
              return <Step1SelectOS buildOptions={payload} prevData={payload[0]} setAllData={setAllData} finished={handleStepData} canceled={cancelStep} first={true} last={false}/>;
            case 1:
              return <Step1SelectOS buildOptions={payload} prevData={payload[1]} finished={handleStepData} canceled={cancelStep} first={false} last={false}/>;
            case 2:
              return <Step3SelectCommands buildOptions={payload[1]} prevData={payload[2]} finished={handleStepData} canceled={cancelStep} first={false} last={false} />;
            case 3:
              return <Step4C2Profiles buildOptions={payload[1]} prevData={payload[3]} finished={handleStepData} canceled={cancelStep} first={false} last={false} />;
            case 4:
              return <Step5Build me={me} buildOptions={payload} moveToStep={moveToStep} canceled={cancelStep} first={false} last={true} startOver={startOver} />;
            default:
              return 'Unknown step';
          }
        }
      const setAllData = (stepData) => {
        setPayload(stepData);
        handleNext();
      }
      const handleStepData = (stepData, clearNextPreviousData) => {
        let newPayload = {...payload, [activeStep]: stepData};
        if(clearNextPreviousData){
            newPayload[activeStep+1] = undefined;
        }
        setPayload(newPayload);
        //console.log(activeStep, newPayload);
        handleNext();
      }
      const cancelStep = () => {
        handleBack();
      }
      const steps = getSteps();

      const handleNext = () => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
      };

      const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
      };
      const startOver = () => {
        setActiveStep(0);
      }
      const moveToStep = (step) => {
          setActiveStep(step);
      }
      React.useEffect( () => {
        if(noOperation){
          snackActions.error("No current operation set! Set a current operation to continue");
        }
      }, [noOperation])

    return (
        <MythicPageBody>
        <div className="mythic-create-flow-shell">
            <div className="mythic-detail-section-header">
                <Typography variant="h5" className="mythic-detail-section-title">
                    Payload Creation
                </Typography>
                <div className="mythic-create-section-fill">
                <Stepper activeStep={activeStep} alternativeLabel>
                    {steps.map((label, index) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>

                        </Step>
                    ))}
                </Stepper>
                </div>
            </div>
            <div className="mythic-create-flow-content mythic-create-section-scroll">
                {getStepContent(activeStep)}
            </div>
        </div>
        </MythicPageBody>
    );
} 
