import React from 'react';
import Button from '@mui/material/Button';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {gql, useMutation} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
import MythicTextField from '../../MythicComponents/MythicTextField';
import {Typography, Box, Chip} from '@mui/material';
import {useTheme} from '@mui/material/styles';
import {
  MythicDialogBody,
  MythicDialogButton,
  MythicDialogFooter,
  MythicDialogSection,
  MythicFormField,
  MythicFormGrid
} from "../../MythicComponents/MythicDialogLayout";
import {isValidHexColor, MythicColorSwatchInput} from "../../MythicComponents/MythicColorInput";
import {getTagReadableTextColor} from "../../MythicComponents/MythicTagChip";

const newTagtypeMutation = gql`
mutation newTagType($name: String!, $description: String!, $color: String!) {
  insert_tagtype_one(object: {color: $color, description: $description, name: $name}) {
    id
  }
}
`;

const updateTagtypeMutation = gql`
mutation updateTagType($id: Int!, $name: String!, $description: String!, $color: String!){
  update_tagtype_by_pk(pk_columns: {id: $id}, _set: {color: $color, description: $description, name: $name}) {
    id
  }
}
`;

const TagColorPreview = ({mode, color, label}) => {
  const theme = useTheme();
  const darkMode = mode === "dark";
  const hasValidColor = isValidHexColor(color);
  const textColor = darkMode ? "#ffffff" : "#111827";
  const chipTextColor = hasValidColor ? getTagReadableTextColor(theme, color) : textColor;
  const surfaceColor = darkMode ? "#1f2937" : "#f8fafc";
  const surfaceBorderColor = darkMode ? "rgba(255,255,255,0.16)" : "rgba(17,24,39,0.12)";
  const chipBorderColor = hasValidColor ? (darkMode ? "rgba(255,255,255,0.2)" : "rgba(17,24,39,0.16)") : surfaceBorderColor;
  return (
    <Box
        sx={{
          minHeight: 44,
          px: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          borderRadius: "6px",
          border: "1px solid",
          borderColor: surfaceBorderColor,
          backgroundColor: surfaceColor,
          minWidth: 0,
        }}
    >
      <Typography variant="caption" sx={{color: textColor, fontWeight: 800, flex: "0 0 auto"}}>
        {darkMode ? "Dark mode" : "Light mode"}
      </Typography>
      <Chip
          label={label || "Sample Tag"}
          size="small"
          sx={{
            minWidth: 0,
            maxWidth: "100%",
            height: 22,
            backgroundColor: hasValidColor ? color : "transparent",
            border: "1px solid",
            borderColor: chipBorderColor,
            borderStyle: hasValidColor ? "solid" : "dashed",
            color: chipTextColor,
            fontWeight: 800,
            "& .MuiChip-label": {
              color: "inherit",
              px: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
            },
          }}
      />
    </Box>
  );
}

export function NewTagtypesDialog(props) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState("#6f7ddf");
  React.useEffect( () => {
    if(props.currentTag !== undefined){
      setName(props.currentTag.name);
      setDescription(props.currentTag.description);
      setColor(props.currentTag.color || "#6f7ddf");
    }
  }, [props.currentTag]);
  const [createNewTagtype] = useMutation(newTagtypeMutation, {
    update: (cache, {data}) => {
        if(data.insert_tagtype_one.id !== undefined){
          snackActions.info("Created new tagtype");
          props.onSubmit({name, description, color, id: data.insert_tagtype_one.id});
        } else {
          snackActions.error("Failed to create new tag type");
        }
        props.onClose();
    }
  }); 
  const [updateTagtype] = useMutation(updateTagtypeMutation, {
    update: (cache, {data}) => {
      if(data.update_tagtype_by_pk.id !== undefined){
        snackActions.info("Successfully updated!");
        props.onSubmit({name, description, color, id: data.update_tagtype_by_pk.id});
      } else {
        snackActions.error("Failed to update tag type");
      }
      props.onClose();
    }
  }) 
  const onCommitSubmit = () => {
    if(name === ""){
      snackActions.warning("Must supply a name");
    } else if(description === ""){
      snackActions.warning("Must supply a description");
    } else if(color !== "" && !isValidHexColor(color)){
      snackActions.warning("Must supply a valid hex color");
    } else {
      if(props.currentTag !== undefined){
        updateTagtype({variables: {name, description, color, id: props.currentTag.id}});
      } else {
        createNewTagtype({variables: {name, description, color}});
      }
      
    }
  }
  const onChangeName = (name, value, error) => {
    setName(value);
  }
  const onChangeDescription = (name, value, error) => {
    setDescription(value);
  }
  const hasValidColor = isValidHexColor(color);
  const title = props.currentTag === undefined ? "Create Tag Type" : "Edit Tag Type";
    
  return (
    <React.Fragment>
        <DialogTitle id="form-dialog-title">{title}</DialogTitle>
        <DialogContent dividers={true}>
          <MythicDialogBody>
            <MythicDialogSection title="Tag Details">
              <MythicFormGrid minWidth="14rem">
                <MythicFormField label="Name" required>
                  <MythicTextField
                      value={name}
                      name="Name"
                      onChange={onChangeName}
                      showLabel={false}
                      marginTop="0"
                      marginBottom="0"
                  />
                </MythicFormField>
                <MythicFormField label="Description" required>
                  <MythicTextField
                      value={description}
                      name="Description"
                      onChange={onChangeDescription}
                      showLabel={false}
                      marginTop="0"
                      marginBottom="0"
                  />
                </MythicFormField>
              </MythicFormGrid>
            </MythicDialogSection>
            <MythicDialogSection
                title="Tag Appearance"
                actions={
                  <>
                    <MythicColorSwatchInput
                        color={hasValidColor ? color : "#6f7ddf"}
                        label="Tag color"
                        onChange={setColor}
                    />
                    <Button size="small" variant="outlined" onClick={() => setColor("")}>
                      Clear
                    </Button>
                  </>
                }
            >
              <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", sm: "1fr 1fr"}, gap: 1}}>
                <TagColorPreview mode="dark" color={hasValidColor ? color : ""} label={name} />
                <TagColorPreview mode="light" color={hasValidColor ? color : ""} label={name} />
              </Box>
            </MythicDialogSection>
          </MythicDialogBody>
        </DialogContent>
        <MythicDialogFooter>
          <MythicDialogButton onClick={props.onClose}>
            Close
          </MythicDialogButton>
          <MythicDialogButton intent="primary" onClick={onCommitSubmit}>
            Submit
          </MythicDialogButton>
        </MythicDialogFooter>
  </React.Fragment>
  );
}
