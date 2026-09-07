import React, {useEffect} from 'react';
import Box from '@mui/material/Box';
import {MythicActionButton} from '../../MythicComponents/MythicActionButton';
import Checkbox from '@mui/material/Checkbox';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import ClearIcon from '@mui/icons-material/Clear';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {MythicChip, SquareChip} from '../../MythicComponents/MythicChip';
import {useQuery, gql } from '@apollo/client';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';
import {
  MythicDialogBody,
  MythicDialogButton,
  MythicDialogFooter,
  MythicDialogGrid,
  MythicDialogSection,
  MythicFormField,
  MythicFormSwitchRow
} from '../../MythicComponents/MythicDialogLayout';

const ITEM_HEIGHT = 42;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 6 + ITEM_PADDING_TOP,
      width: 320,
    },
  },
  variant: "menu",
};
const operatorQuery = gql`
query operatorQuery($operation_id: Int!) {
  operation_by_pk(id: $operation_id) {
    id
    operators {
      username
      id
    }
  }
}`;

const selectedLabel = (values, singular, plural = singular) => {
  if(values.length === 0){
    return "";
  }
  return `${values.length} ${values.length === 1 ? singular : plural}`;
}

const FilterSummaryChip = ({icon, label, muted=false}) => (
  <MythicChip
    icon={icon}
    label={label}
    size="small"
    tone={muted ? "neutral" : "primary"}
  />
)

const MultiSelectField = ({label, value, options, onChange, emptyLabel}) => {
  const renderValue = (selected) => {
    if(selected.length === 0){
      return <span className="mythic-tasking-filter-select-empty text-muted text-xs font-650">{emptyLabel}</span>
    }
    return (
      <Box className="mythic-tasking-filter-select-chips items-center flex gap-2 flex-wrap min-w-0">
        {selected.map((selectedValue) => (
          <SquareChip key={selectedValue} label={selectedValue} />
        ))}
      </Box>
    );
  }

  return (
    <FormControl fullWidth={true} size="small" className="mythic-tasking-filter-select">
      <Select
        multiple
        displayEmpty
        value={value}
        onChange={onChange}
        input={<OutlinedInput />}
        renderValue={renderValue}
        MenuProps={MenuProps}
        aria-label={label}
      >
        {options.map((name) => (
          <MenuItem key={name} value={name}>
            <Checkbox color="primary" checked={value.indexOf(name) > -1} />
            <ListItemText primary={name} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

export function CallbacksTabsTaskingFilterDialog(props) {
  const me = useReactiveVar(meState);
  const [onlyOperators, setOnlyOperators] = React.useState([]);
  const [operatorUsernames, setOperatorUsernames] = React.useState([]);
  const [onlyHasComments, setOnlyHasComments] = React.useState(false);
  const [onlyCommands, setOnlyCommands] = React.useState([]);
  const [everythingBut, setEverythingBut] = React.useState([]);
  const [onlyParameters, setOnlyParameters] = React.useState("");
  const [commandOptions, setCommandOptions] = React.useState([]);
  const [hideErrors, setHideErrors] = React.useState(false);

  useQuery(operatorQuery, {variables: {operation_id: me.user.current_operation_id},
    onCompleted: (data) => {
      setOperatorUsernames(data.operation_by_pk.operators.map( (op) => op.username));
    }
  });
  useEffect( () => {
    if(props.filterOptions["operatorsList"] !== undefined){
      setOnlyOperators(props.filterOptions["operatorsList"]);
    }
    if(props.filterOptions["commentsFlag"] !== undefined){
      setOnlyHasComments(props.filterOptions["commentsFlag"]);
    }
    if(props.filterOptions["commandsList"] !== undefined){
      setOnlyCommands(props.filterOptions["commandsList"]);
    }
    if(props.filterOptions["parameterString"] !== undefined){
      setOnlyParameters(props.filterOptions["parameterString"]);
    }
    if(props.filterOptions["everythingButList"] !== undefined){
      setEverythingBut(props.filterOptions["everythingButList"]);
    }
    if(props.filterOptions["hideErrors"] !== undefined){
      setHideErrors(props.filterOptions['hideErrors']);
    }
    if(props.filterCommandOptions){
      const commandOptionNames = props.filterCommandOptions.map(c => c.cmd);
      setCommandOptions(commandOptionNames);
    }
  }, [props.filterOptions, props.filterCommandOptions]);
  const onSubmit = () => {
    props.onSubmit({
      "operatorsList": onlyOperators,
      "commentsFlag": onlyHasComments,
      "commandsList": onlyCommands,
      "everythingButList": everythingBut,
      "parameterString": onlyParameters,
      "hideErrors": hideErrors,
    });
    props.onClose();
  }
  const onChange = (name, value, error) => {
    setOnlyParameters(value);
  }
  const handleCommentsChange = (event) => {
    setOnlyHasComments(event.target.checked);
  }
  const handleHideErrorsChange = (event) => {
    setHideErrors(event.target.checked);
  }
  const handleOperatorChange = (event) => {
    const value = typeof event.target.value === "string" ? event.target.value.split(",") : event.target.value;
    setOnlyOperators(value);
  }
  const handleOnlyCommandsChange = (event) => {
    const value = typeof event.target.value === "string" ? event.target.value.split(",") : event.target.value;
    setOnlyCommands(value);
    if(value.length > 0){
      setEverythingBut([]);
    }
  }
  const handleEverythingButChange = (event) => {
    const value = typeof event.target.value === "string" ? event.target.value.split(",") : event.target.value;
    setEverythingBut(value);
    if(value.length > 0){
      setOnlyCommands([]);
    }
  }
  const clearAllOnlyCommands = () => {
    setOnlyCommands([]);
  }
  const clearAllEverythingBut = () => {
    setEverythingBut([]);
  }
  const clearAllFilters = () => {
    setOnlyOperators([]);
    setOnlyHasComments(false);
    setOnlyCommands([]);
    setEverythingBut([]);
    setOnlyParameters("");
    setHideErrors(false);
  }
  const activeFilters = [
    selectedLabel(onlyOperators, "operator"),
    onlyHasComments ? "Has comments" : "",
    hideErrors ? "Errors hidden" : "",
    selectedLabel(onlyCommands, "included command", "included commands"),
    selectedLabel(everythingBut, "excluded command", "excluded commands"),
    onlyParameters !== "" ? "Parameter regex" : "",
  ].filter(Boolean);

  return (
    <Box className="mythic-tasking-filter-dialog bg-surface-raised text-primary">
      <DialogTitle id="mythic-draggable-title" className="mythic-accent-dialog-title relative">
        <Box className="mythic-accent-dialog-title-row items-center flex gap-6 min-w-0">
          <Box className="mythic-accent-dialog-title-icon items-center inline-flex flex-none justify-center rounded">
            <FilterAltIcon fontSize="small" />
          </Box>
          <Box sx={{minWidth: 0}}>
            <Typography component="div" className="mythic-tasking-filter-title-main text-header text-base font-850 leading-115">
              Task visibility filters
            </Typography>
            <Typography component="div" className="mythic-accent-dialog-title-subtitle text-header-muted text-xs font-600 leading-125">
              Control which tasks are shown for this callback.
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent dividers={true} className="mythic-tasking-filter-dialog-content overflow-auto">
        <MythicDialogBody compact={true}>
          <Box className="mythic-tasking-filter-summary items-center flex flex-wrap gap-3">
            {activeFilters.length > 0 ? (
              activeFilters.map((filterLabel) => (
                <FilterSummaryChip key={filterLabel} icon={<FilterAltIcon />} label={filterLabel} />
              ))
            ) : (
              <FilterSummaryChip muted={true} icon={<FilterAltIcon />} label="No active filters" />
            )}
          </Box>
          <MythicDialogSection
            title="Operator and task state"
            description="Narrow the task list by operator, comments, or error state."
          >
            <MythicDialogGrid minWidth="18rem">
              <MythicFormField
                label="Operators"
                description="Only show tasks created by selected operators."
              >
                <MultiSelectField
                  label="Operators"
                  value={onlyOperators}
                  options={operatorUsernames}
                  onChange={handleOperatorChange}
                  emptyLabel="Any operator"
                />
              </MythicFormField>
              <Box className="mythic-column-stack flex flex-column gap-4 min-w-0">
                <MythicFormSwitchRow
                  label="Only tasks with comments"
                  description="Require at least one comment."
                  control={
                    <Switch
                      checked={onlyHasComments}
                      onChange={handleCommentsChange}
                      color="primary"
                      name="Only Comments"
                      inputProps={{'aria-label': 'Only tasks with comments'}}
                    />
                  }
                />
                <MythicFormSwitchRow
                  label="Hide error tasks"
                  description="Remove tasks that are currently marked as errors."
                  control={
                    <Switch
                      checked={hideErrors}
                      onChange={handleHideErrorsChange}
                      color="primary"
                      name="Hide Errors"
                      inputProps={{'aria-label': 'Hide error tasks'}}
                    />
                  }
                />
              </Box>
            </MythicDialogGrid>
          </MythicDialogSection>
          <MythicDialogSection
            title="Command scope"
            description="Choose commands to include, or choose commands to hide."
          >
            <Box className="mythic-tasking-filter-command-grid items-logical-start gap-5 min-w-0 w-full grid">
              <MythicFormField
                label="Only show commands"
                description="When set, only matching command names remain visible."
              >
                <MultiSelectField
                  label="Only show commands"
                  value={onlyCommands}
                  options={commandOptions}
                  onChange={handleOnlyCommandsChange}
                  emptyLabel="No include filter"
                />
                {onlyCommands.length > 0 &&
                  <MythicActionButton
                    className="mythic-tasking-filter-clear-button"
                    compact
                    tone="warning"
                    onClick={clearAllOnlyCommands}
                    size="small"
                    startIcon={<ClearIcon fontSize="small" />}
                    variant="outlined"
                  >
                    Clear include
                  </MythicActionButton>
                }
              </MythicFormField>
              <Box className="mythic-tasking-filter-choice-divider text-xs font-750 text-muted text-center">or</Box>
              <MythicFormField
                label="Hide commands"
                description="When set, selected command names are removed from view."
              >
                <MultiSelectField
                  label="Hide commands"
                  value={everythingBut}
                  options={commandOptions}
                  onChange={handleEverythingButChange}
                  emptyLabel="No exclude filter"
                />
                {everythingBut.length > 0 &&
                  <MythicActionButton
                    className="mythic-tasking-filter-clear-button"
                    compact
                    tone="warning"
                    onClick={clearAllEverythingBut}
                    size="small"
                    startIcon={<ClearIcon fontSize="small" />}
                    variant="outlined"
                  >
                    Clear exclude
                  </MythicActionButton>
                }
              </MythicFormField>
            </Box>
          </MythicDialogSection>
          <MythicDialogSection
            title="Parameter matching"
            description="Apply a regular expression to task parameters."
          >
            <MythicTextField
              value={onlyParameters}
              onChange={onChange}
              name="Parameter regex"
              placeholder="Regex to match task parameters"
              marginBottom="0px"
              marginTop="0px"
            />
          </MythicDialogSection>
        </MythicDialogBody>
      </DialogContent>
      <MythicDialogFooter className="mythic-tasking-filter-dialog-actions">
        <MythicDialogButton onClick={clearAllFilters}>
          Clear all
        </MythicDialogButton>
        <MythicDialogButton onClick={props.onClose}>
          Close
        </MythicDialogButton>
        <MythicDialogButton onClick={onSubmit} intent="primary">
          Apply filters
        </MythicDialogButton>
      </MythicDialogFooter>
    </Box>
  );
}
