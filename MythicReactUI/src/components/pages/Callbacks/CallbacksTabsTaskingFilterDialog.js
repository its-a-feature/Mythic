import React, {useEffect} from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from '../../MythicComponents/MythicTextField';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import Chip from '@mui/material/Chip';
import Input from '@mui/material/Input';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import {useQuery, gql } from '@apollo/client';
import { meState } from '../../../cache';
import {useReactiveVar} from '@apollo/client';

const PREFIX = 'CallbacksTabsTaskingFilterDialog';

const classes = {
  formControl: `${PREFIX}-formControl`,
  chips: `${PREFIX}-chips`,
  chip: `${PREFIX}-chip`,
  noLabel: `${PREFIX}-noLabel`
};

const Root = styled('div')((
  {
    theme
  }
) => ({
  [`& .${classes.formControl}`]: {
    margin: theme.spacing(1),
    width: "100%",
  },

  [`& .${classes.chips}`]: {
    display: 'flex',
    flexWrap: 'wrap',
  },

  [`& .${classes.chip}`]: {
    margin: 2,
  },

  [`& .${classes.noLabel}`]: {
    marginTop: theme.spacing(2),
  }
}));

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
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
  }, [props.filterOptions]);
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
    setOnlyOperators(event.target.value);
  }
  const handleOnlyCommandsChange = (event) => {
    setOnlyCommands(event.target.value);
    if(event.target.value.length > 0){
      setEverythingBut([]);
    }
  }
  const handleEverythingButChange = (event) => {
    setEverythingBut(event.target.value);
    if(event.target.value.length > 0){
      setOnlyCommands([]);
    }
  }
  const clearAllOnlyCommands = () => {
    setOnlyCommands([]);
  }
  const clearAllEverythingBut = () => {
    setEverythingBut([]);
  }
  return (
    <Root>
        <DialogTitle id="form-dialog-title">Filter Which Tasks Are Visible in this Callback</DialogTitle>
        <DialogContent dividers={true} style={{overflow: "hidden"}}>
            <React.Fragment>
                <FormControl className={classes.formControl}>
                <InputLabel id="operator-chip-label">Only Show Tasks by the Following Operators</InputLabel>
                <Select
                  labelId="operator-chip-label"
                  multiple
                  id="operator-chip"
                  value={onlyOperators}
                  onChange={handleOperatorChange}
                  input={<Input />}
                  renderValue={(selected) => (
                    <div className={classes.chips}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} className={classes.chip} />
                      ))}
                    </div>
                  )}
                  MenuProps={MenuProps}
                >
                  {operatorUsernames.map((name) => (
                    <MenuItem key={name} value={name}>
                      <Checkbox color="primary" checked={onlyOperators.indexOf(name) > -1} />
                      <ListItemText primary={name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
                Only Show Tasks with Comments: <Switch checked={onlyHasComments} onChange={handleCommentsChange} color="primary" name="Only Comments" inputProps={{'aria-label': 'primary checkbox'}}/>
                <br/>
              Hide Error Tasks:<Switch checked={hideErrors} onChange={handleHideErrorsChange} color="primary" name="Hide Errors" inputProps={{'aria-label': 'primary checkbox'}}/>
              <FormControl className={classes.formControl}>
                  <InputLabel id="include-chip-label">Only Show These Commands</InputLabel>
                  <Select
                    labelId="include-chip-label"
                    multiple
                    id="include-chip"
                    value={onlyCommands}
                    onChange={handleOnlyCommandsChange}
                    input={<Input />}
                    renderValue={(selected) => (
                      <div className={classes.chips}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} className={classes.chip} />
                        ))}
                      </div>
                    )}
                    MenuProps={MenuProps}
                  >
                    {commandOptions.map((name) => (
                      <MenuItem key={name} value={name}>
                        <Checkbox color="primary" checked={onlyCommands.indexOf(name) > -1} />
                        <ListItemText primary={name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              {onlyCommands.length > 0 &&
                  <Button onClick={clearAllOnlyCommands} variant={"contained"}>Clear</Button>
              }
                <FormControl className={classes.formControl}>
                  <InputLabel id="exclude-chip-label">Do Not Show These Commands</InputLabel>
                  <Select
                    labelId="exclude-chip-label"
                    multiple
                    id="exclude-chip"
                    value={everythingBut}
                    onChange={handleEverythingButChange}
                    input={<Input />}
                    renderValue={(selected) => (
                      <div className={classes.chips}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} className={classes.chip} />
                        ))}
                      </div>
                    )}
                    MenuProps={MenuProps}
                  >
                    {commandOptions.map((name) => (
                      <MenuItem key={name} value={name}>
                        <Checkbox color="primary" checked={everythingBut.indexOf(name) > -1} />
                        <ListItemText primary={name} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              {everythingBut.length > 0 &&
                  <Button onClick={clearAllEverythingBut} variant={"contained"}>Clear</Button>
              }
                <MythicTextField value={onlyParameters} onChange={onChange} name="Only Show Tasks with the Following Parameter Regex"/>
            </React.Fragment>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" >
            Close
          </Button>
          <Button onClick={onSubmit} color="success" variant="contained" >
            Filter
          </Button>
        </DialogActions>
  </Root>
  );
}

