import React, {useEffect} from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import {useQuery, gql} from '@apollo/client';
import MythicTextField from '../../MythicComponents/MythicTextField';
import { snackActions } from '../../utilities/Snackbar';
import {classes, StyledButton} from '../../MythicComponents/MythicTransferList';
import {
  MythicDialogBody,
  MythicDialogButton,
  MythicDialogFooter,
  MythicDialogSection,
  MythicFormField
} from '../../MythicComponents/MythicDialogLayout';

const commandSort = (a, b) => (a?.cmd || "").localeCompare(b?.cmd || "");
const commandID = (command) => command?.id || command?.cmd || "";
const normalizeCommandSelection = (selection) => {
  if(!selection || typeof selection !== "object"){
    return {};
  }
  return Object.entries(selection).reduce((prev, [name, commands]) => {
    prev[name] = Array.isArray(commands) ? commands.filter(Boolean).sort(commandSort) : [];
    return prev;
  }, {});
};
const flattenCommands = (commandsByPayloadType) => {
  return Object.values(commandsByPayloadType || {}).flat().filter(Boolean);
};
const getSelectedCommandCount = (commandsByPayloadType, payloadTypeName) => {
  return (commandsByPayloadType?.[payloadTypeName] || []).length;
};

function PayloadTypeBlockListPreMemo({left: allCommands = [], right = [], leftTitle, rightTitle, name, onChange, itemKey}){

    const [checked, setChecked] = React.useState([]);
    const rightCommandIDs = React.useMemo(() => new Set(right.map(commandID)), [right]);
    const left = React.useMemo(() => {
      return (allCommands || []).filter((command) => !rightCommandIDs.has(commandID(command))).sort(commandSort);
    }, [allCommands, rightCommandIDs]);
    const sortedRight = React.useMemo(() => [...right].sort(commandSort), [right]);
    const checkedCommandIDs = React.useMemo(() => new Set(checked), [checked]);
    const leftChecked = React.useMemo(() => left.filter((command) => checkedCommandIDs.has(commandID(command))), [left, checkedCommandIDs]);
    const rightChecked = React.useMemo(() => sortedRight.filter((command) => checkedCommandIDs.has(commandID(command))), [sortedRight, checkedCommandIDs]);
    const moveCommands = React.useCallback((selected) => {
      setChecked([]);
      onChange({selected: [...selected].sort(commandSort), name});
    }, [name, onChange]);
    const handleToggle = (value) => () => {
      const selectedCommandID = commandID(value);
      setChecked((current) => {
        if(current.includes(selectedCommandID)){
          return current.filter((existingID) => existingID !== selectedCommandID);
        }
        return [...current, selectedCommandID];
      });
    };
    const handleAllRight = () => {
      moveCommands([...sortedRight, ...left]);
    };
    const handleCheckedRight = () => {
      const movingCommandIDs = new Set(leftChecked.map(commandID));
      moveCommands([...sortedRight, ...left.filter((command) => movingCommandIDs.has(commandID(command)))]);
    };
    const handleCheckedLeft = () => {
      const movingCommandIDs = new Set(rightChecked.map(commandID));
      moveCommands(sortedRight.filter((command) => !movingCommandIDs.has(commandID(command))));
    };
    const handleAllLeft = () => {
      moveCommands([]);
    };
    useEffect(() => {
      const visibleCommandIDs = new Set([...left, ...sortedRight].map(commandID));
      setChecked((current) => current.filter((existingID) => visibleCommandIDs.has(existingID)));
    }, [left, sortedRight]);
    const customList = (title, items) => (
      <div className="mythic-transfer-list">
          <div className="mythic-transfer-list-header">{title}</div>
          <div className="mythic-transfer-list-body">
            <List dense component="div" role="list" style={{padding:0}}>
              {items.map((valueObj) => {
                const value = itemKey === undefined ? valueObj : valueObj[itemKey];
                const valueID = commandID(valueObj);
                const labelId = `transfer-list-item-${value}-label`;
                return (
                  <ListItem style={{padding:0}} key={valueID} role="listitem" disablePadding>
                    <ListItemButton onClick={handleToggle(valueObj)} dense>
                      <ListItemIcon>
                        <Checkbox
                          checked={checkedCommandIDs.has(valueID)}
                          tabIndex={-1}
                          disableRipple
                          inputProps={{ 'aria-labelledby': labelId }}
                        />
                      </ListItemIcon>
                      <ListItemText id={labelId} primary={value} />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </div>
      </div>
    );
    
  return (
    <MythicDialogSection title={name} className="mythic-transfer-section">
    <div className="mythic-block-list-transfer-grid">
      <div>{customList(leftTitle, left)}</div>
      <div>
        <div className="mythic-transfer-controls">
          <StyledButton
            variant="contained"
            size="small"
            className={classes.button}
            onClick={handleAllRight}
            disabled={left.length === 0}
            aria-label="move all right"
          >
            ≫
          </StyledButton>
          <StyledButton
            variant="contained"
            size="small"
            className={classes.button}
            onClick={handleCheckedRight}
            disabled={leftChecked.length === 0}
            aria-label="move selected right"
          >
            &gt;
          </StyledButton>
          <StyledButton
            variant="contained"
            size="small"
            className={classes.button}
            onClick={handleCheckedLeft}
            disabled={rightChecked.length === 0}
            aria-label="move selected left"
          >
            &lt;
          </StyledButton>
          <StyledButton
            variant="contained"
            size="small"
            className={classes.button}
            onClick={handleAllLeft}
            disabled={right.length === 0}
            aria-label="move all left"
          >
            ≪
          </StyledButton>
        </div>
      </div>
      <div>{customList(rightTitle, sortedRight)}</div>
    </div>
    </MythicDialogSection>
  );
}
const PayloadTypeBlockList = React.memo(PayloadTypeBlockListPreMemo);
const getPayloadTypesAndCommandsQuery = gql`
  query getPayloadTypesAndCommands{
    payloadtype(where: {deleted: {_eq: false}, wrapper: {_eq: false}}, order_by: {name: asc}) {
      commands(order_by: {cmd: asc}) {
        cmd
        id
      }
      id
      name
    }
  }
`;
export function EditBlockListDialog({dialogTitle, onSubmit, blockListName: propBlockListName, onClose, currentSelected, editable}) {
  const [selectedCommands, setSelectedCommands] = React.useState(() => normalizeCommandSelection(currentSelected));
  const [blockListName, setBlockListName] = React.useState("");
  const [activePayloadTypeName, setActivePayloadTypeName] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const {data, loading} = useQuery(getPayloadTypesAndCommandsQuery, {
    fetchPolicy: "cache-first",
    onError: () => {
      snackActions.error("Failed to load payload type commands");
    }
  });
  const normalizedCurrentSelected = React.useMemo(() => normalizeCommandSelection(currentSelected), [currentSelected]);
  const payloadtypes = React.useMemo(() => {
    return (data?.payloadtype || []).map((payloadtype) => ({
      ...payloadtype,
      commands: [...(payloadtype.commands || [])].sort(commandSort),
      selected: selectedCommands[payloadtype.name] || [],
    }));
  }, [data, selectedCommands]);
  const activePayloadType = React.useMemo(() => {
    return payloadtypes.find((payloadtype) => payloadtype.name === activePayloadTypeName) || payloadtypes[0] || null;
  }, [activePayloadTypeName, payloadtypes]);
  const selectedCommandCount = React.useMemo(() => flattenCommands(selectedCommands).length, [selectedCommands]);
  React.useEffect(() => {
    setBlockListName(propBlockListName || "");
  }, [propBlockListName]);
  React.useEffect(() => {
    setSelectedCommands(normalizedCurrentSelected);
  }, [normalizedCurrentSelected]);
  React.useEffect(() => {
    if(payloadtypes.length === 0){
      return;
    }
    if(!payloadtypes.some((payloadtype) => payloadtype.name === activePayloadTypeName)){
      const firstSelectedPayloadType = payloadtypes.find((payloadtype) => getSelectedCommandCount(selectedCommands, payloadtype.name) > 0);
      setActivePayloadTypeName((firstSelectedPayloadType || payloadtypes[0]).name);
    }
  }, [activePayloadTypeName, payloadtypes, selectedCommands]);
  const onChange = React.useCallback(({selected, name}) => {
    setSelectedCommands((current) => ({...current, [name]: selected}));
  }, []);
  const onChangeBlockListName = (name, value) => {
    setBlockListName(value);
  };
  const submit = async () => {
    if(blockListName.trim() === ""){
      snackActions.warning("Must supply a block list name");
      return;
    }
    if(editable && selectedCommandCount === 0){
      snackActions.warning("Select at least one command for the block list");
      return;
    }
    let toAdd = [];
    let toRemove = [];
    const existingCommandIDs = new Set(flattenCommands(normalizedCurrentSelected).map(commandID));
    const selectedCommandIDs = new Set(flattenCommands(selectedCommands).map(commandID));
    for(const value of Object.values(selectedCommands)){
      for(let i = 0; i < value.length; i++){
        if(!existingCommandIDs.has(commandID(value[i]))){
          toAdd.push({command_id: value[i].id, name: blockListName.trim()});
        }
      }
    }
    for(const value of Object.values(normalizedCurrentSelected)){
      for(let i = 0; i < value.length; i++){
        if(!selectedCommandIDs.has(commandID(value[i]))){
          toRemove.push({command_id: value[i].id, name: blockListName.trim()});
        }
      }
    }
    if(toAdd.length === 0 && toRemove.length === 0){
      onClose();
      return;
    }
    setSubmitting(true);
    try{
      const result = await onSubmit({toAdd, toRemove});
      if(result !== false){
        onClose();
      }
    }catch(error){
      snackActions.warning("Unable to update block list");
      console.log(error);
    }finally{
      setSubmitting(false);
    }
  }
  return (
    <>
      <DialogTitle id="form-dialog-title">{dialogTitle}</DialogTitle>
      <DialogContent dividers={true} className="mythic-block-list-dialog-content">
        <MythicDialogBody className="mythic-block-list-dialog-body">
          <MythicDialogSection title="Block List">
            <MythicFormField label="Block List Name" required>
              <MythicTextField
                disabled={!editable}
                onChange={onChangeBlockListName}
                value={blockListName}
                name="command_block_list_title"
                showLabel={false}
                autoFocus
                autoComplete="new-password"
                inputProps={{
                  id: "mythic-command-block-list-title",
                  name: "mythic-command-block-list-title",
                  "data-form-type": "other",
                }}
                requiredValue
                marginTop="0px"
                marginBottom="0px"
              />
            </MythicFormField>
          </MythicDialogSection>
          <MythicDialogSection
            title="Commands"
            actions={<Chip size="small" label={`${selectedCommandCount} blocked`} />}
          >
            {loading && payloadtypes.length === 0 ? (
              <Box className="mythic-block-list-loading">
                <CircularProgress size={20} />
                <Typography variant="body2">Loading commands</Typography>
              </Box>
            ) : payloadtypes.length === 0 ? (
              <Box className="mythic-block-list-loading">
                <Typography variant="body2">No payload type commands available</Typography>
              </Box>
            ) : (
              <>
                <Tabs
                  className="mythic-block-list-payload-tabs"
                  value={activePayloadType?.name || false}
                  onChange={(event, value) => setActivePayloadTypeName(value)}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  {payloadtypes.map((payloadtype) => (
                    <Tab
                      aria-label={`${payloadtype.name}, ${getSelectedCommandCount(selectedCommands, payloadtype.name)} blocked commands`}
                      id={`block-list-payload-tab-${payloadtype.id}`}
                      key={payloadtype.name}
                      value={payloadtype.name}
                      label={
                        <Box component="span" className="mythic-block-list-payload-tab-label">
                          <span>{payloadtype.name}</span>
                          <span className="mythic-block-list-payload-tab-count">{getSelectedCommandCount(selectedCommands, payloadtype.name)}</span>
                        </Box>
                      }
                    />
                  ))}
                </Tabs>
                {activePayloadType &&
                  <PayloadTypeBlockList
                    key={activePayloadType.name}
                    leftTitle={"Not Blocked"}
                    onChange={onChange}
                    rightTitle={"Blocked Commands"}
                    itemKey={"cmd"}
                    right={activePayloadType.selected}
                    left={activePayloadType.commands}
                    name={activePayloadType.name}
                  />
                }
              </>
            )}
          </MythicDialogSection>
        </MythicDialogBody>
      </DialogContent>
      <MythicDialogFooter>
        <MythicDialogButton onClick={onClose} disabled={submitting}>
          Close
        </MythicDialogButton>
        <MythicDialogButton intent="primary" onClick={submit} disabled={submitting || loading}>
          {submitting ? "Saving" : "Submit"}
        </MythicDialogButton>
      </MythicDialogFooter>
    </>
  );
}
