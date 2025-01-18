import {Link} from '@mui/material';
import React from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {useTheme} from '@mui/material/styles';
import { gql, useQuery } from '@apollo/client';
import {ColoredTaskLabel, StyledPaper, classes, StyledAccordionSummary, accordionClasses} from '../Callbacks/TaskDisplay';
import {GetOutputFormatAll} from '../Callbacks/ResponseDisplayInteractive';
import {b64DecodeUnicode} from "../Callbacks/ResponseDisplay";
import Accordion from '@mui/material/Accordion';
import {MythicStyledTooltip} from "../../MythicComponents/MythicStyledTooltip";


const responsesQuery = gql`
query subResponsesQuery($task_id: Int!, $task_processing_time: timestamp!, $responses_surrounding: Int!) {
  response(where: {task: {id: {_eq: $task_id}}, timestamp: {_gt: $task_processing_time}}, limit: $responses_surrounding, order_by: {timestamp: asc}) {
    id
    response: response_text
    timestamp
    is_error
  }
  task(where: {id: {_eq: $task_id}}){
    display_id
  }
}`;
export const TaskDisplayInteractiveSearch = ({me, task}) => {
    const theme = useTheme();
    const [taskDisplayID, setTaskDisplayID] = React.useState("");
    const [responsesSurrounding, setResponsesSurrounding] = React.useState(5);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const toggleTaskDropdown = React.useCallback( (event, expanded) => {
        if(window.getSelection().toString() !== ""){
            return;
        }
        setDropdownOpen(!dropdownOpen);
    }, [dropdownOpen]);
    const [alloutput, setAllOutput] = React.useState([]);
    useQuery(responsesQuery, {
        variables: {task_id: task.parent_task_id, task_processing_time: task?.status_timestamp_submitted || "1970-01-01", responses_surrounding: responsesSurrounding},
        onCompleted: (data) => {
            const output = data.response.map(r => {
                return {...r, response: b64DecodeUnicode(r.response)}
            })
            setAllOutput(output);
            setTaskDisplayID(data.task[0].display_id);
        },
        onError: (data) => {
            console.log(data.message, data);
        }
    })
    return (
        <StyledPaper className={classes.root + " no-box-shadow"} elevation={5}  id={`taskHeader-${task.id}`}>
            <Accordion TransitionProps={{ unmountOnExit: true, }} defaultExpanded={false}
                       onChange={toggleTaskDropdown} expanded={dropdownOpen}
                       style={{backgroundColor: "unset", backgroundImage: "unset"}}
            >
                <StyledAccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls={`panel1c-content-task-${task.id}`}
                    id={`panel1c-header-${task.id}`}
                    classes={accordionClasses}
                >
                    <ColoredTaskLabel theme={theme} task={task} me={me} taskDivID={'scrolltotask' + task.id}
                                      displayChildren={true} toggleDisplayChildren={()=>{}}
                                      expanded={dropdownOpen}
                    />
                </StyledAccordionSummary>
                    <span style={{backgroundColor: theme.tableHeader, position: "relative",
                        width: "100%", left: "25%"}}>
                        Output is an approximation in time surrounding when the task was issued. Full task:
                        <MythicStyledTooltip title={"View Parent Task in separate page"} >
                            <Link style={{wordBreak: "break-all"}} color={"textPrimary"} underline={"always"} target={"_blank"}
                                  href={"/new/task/" + taskDisplayID}>{taskDisplayID}</Link>
                          </MythicStyledTooltip>
                    </span>
                    <div style={{
                        overflowY: "auto", width: "100%", marginBottom: "5px", paddingLeft: "10px", maxHeight: "500px"
                    }}  id={`ptytask${task.id}`}>
                        <GetOutputFormatAll key={"getoutput"} data={alloutput}
                                             myTask={task.operator.username === (me?.user?.username || "")}
                                             taskID={task.id}
                                             useASNIColor={true}
                                             messagesEndRef={null}
                                             showTaskStatus={false}
                                             wrapText={true}/>

                    </div>
            </Accordion>
        </StyledPaper>
    )
}