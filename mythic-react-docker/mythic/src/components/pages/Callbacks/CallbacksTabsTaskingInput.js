import { IconButton } from '@material-ui/core';
import SendIcon from '@material-ui/icons/Send';
import React, {useEffect} from 'react';
import {TextField} from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import TuneIcon from '@material-ui/icons/Tune';
import { MythicDialog } from '../../MythicComponents/MythicDialog';
import {CallbacksTabsTaskingFilterDialog} from './CallbacksTabsTaskingFilterDialog';


export function CallbacksTabsTaskingInput(props){
    const [message, setMessage] = React.useState("");
    const [highlighted, setHighlighted] = React.useState("");
    const [autocompleteOptions, setAutocompleteOptions] = React.useState([]);
    const [loadedOptions, setLoadedOptions] = React.useState([]);
    const [taskOptions, setTaskOptions] = React.useState([]);
    const [openFilterOptionsDialog, setOpenFilterOptionsDialog] = React.useState(false);
    useEffect( () => {
        setLoadedOptions( props.loadedOptions.map( (option) => option.cmd) );
        if(props.taskOptions){
            const prevCmds = props.taskOptions.task.map( (task) => {
                if(task.command){return task.command.cmd + " " + task.original_params;}
                else{return task.original_params};
            });
            const deDup = prevCmds.reduce( (prev, cur) => {
                if(prev.includes(cur)){return prev}
                return [...prev, cur]
            }, []);
            setTaskOptions(deDup);
        }else{
            setTaskOptions([]);
        }
    }, [props.loadedOptions, props.taskOptions]);

    const handleAutocompleteChange = (evt, value) => {
        if(value !== undefined){
            setMessage(value);
            return;
        }
        if(evt.type === "change"){
            setMessage(evt.target.value);
        }else if(evt.type === "click"){
            setMessage(evt.target.innerText);
        }else{
            return;
        }
        if(evt.target.value.length === 0){
            setAutocompleteOptions([]);
        }else if(autocompleteOptions.length === 0){
            setAutocompleteOptions(loadedOptions);
        }
    }
    const onKeyDown = (evt) => {
        if(evt.code === "ArrowUp" || evt.code === "ArrowDown"){
            if(autocompleteOptions.length === 0){
                setAutocompleteOptions(taskOptions);
            }
        }else if(evt.key === "Tab"){
            if(highlighted !== ""){
                const highlight = highlighted;
                setMessage(highlight + " ");
                setHighlighted("");
                evt.preventDefault();
                evt.stopPropagation();
            }
        }
    }
    const onSubmitCommandLine = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        props.onSubmitCommandLine(message);
        setMessage("");
    }
    const onClickFilter = () => {
        setOpenFilterOptionsDialog(true);
    }
    return (
        <div style={{ position: "absolute", width: "100%"}}>
            <form onSubmit={onSubmitCommandLine}>
                <Autocomplete
                    freeSolo
                    autoComplete={true}
                    autoHighlight={true}
                    autoSelect={true}
                    id="free-solo-2-demo"
                    disableClearable
                    disableListWrap
                    inputValue={message}
                    size="small"
                    openOnFocus={false}
                    onChange={handleAutocompleteChange}
                    options={autocompleteOptions}
                    renderInput={(params) => {
                        params.InputProps.onKeyDown = onKeyDown;
                        return(
                          <TextField
                            {...params}
                            onChange={handleAutocompleteChange}
                            onKeyDown={onKeyDown}                         
                            size="small"
                            variant="outlined"
                            InputProps={{ ...params.InputProps, type: 'search',
                                endAdornment:
                                <React.Fragment>
                                <IconButton color="primary" variant="contained" onClick={onSubmitCommandLine}><SendIcon/></IconButton>
                                <IconButton color="secondary" variant="contained" onClick={onClickFilter}><TuneIcon/></IconButton>
                                </React.Fragment>
                           
                            }}
                          />
                        )
                    }}
                  />
              </form>
              <MythicDialog fullWidth={true} maxWidth="md" open={openFilterOptionsDialog} 
                    onClose={()=>{setOpenFilterOptionsDialog(false);}} 
                    innerDialog={<CallbacksTabsTaskingFilterDialog filterCommandOptions={loadedOptions} onSubmit={props.onSubmitFilter} filterOptions={props.filterOptions} onClose={()=>{setOpenFilterOptionsDialog(false);}} />}
                />
        </div>  
    )
}
