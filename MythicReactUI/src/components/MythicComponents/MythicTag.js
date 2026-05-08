import React from 'react';
import Button from '@mui/material/Button';
import DialogContent from '@mui/material/DialogContent';
import MythicTextField from './MythicTextField';
import {useQuery, gql, useMutation} from '@apollo/client';
import { Box, Select, MenuItem, Link, IconButton } from '@mui/material';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-xcode';
import {useTheme} from '@mui/material/styles';
import { snackActions } from '../utilities/Snackbar';
import { MythicDialog } from './MythicDialog';
import {MythicConfirmDialog} from './MythicConfirmDialog';
import DeleteIcon from '@mui/icons-material/Delete';
import WebhookIcon from '@mui/icons-material/Webhook';
import Chip from '@mui/material/Chip';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import {MythicStyledTooltip} from "./MythicStyledTooltip";
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import {meState} from "../../cache";
import { useReactiveVar } from '@apollo/client';
import {MythicDraggableDialogTitle} from "./MythicDraggableDialogTitle";
import {NewTagtypesDialog} from "../pages/Tags/NewTagtypesDialog";
import {getTagReadableTextColor, TagTypeChip} from "./MythicTagChip";
import {
  MythicDialogBody,
  MythicDialogButton,
  MythicDialogFooter,
  MythicDialogSection,
  MythicFormField,
  MythicFormGrid,
  MythicFormNote
} from "./MythicDialogLayout";

const createNewTagMutationTemplate = ({target_object}) => {
  // target_object should be something like "task_id"
  // target_object_id should be something like "89"
  return gql`
  mutation createNewTag($url: String!, $data: jsonb!, $source: String!, $${target_object}: Int!, $tagtype_id: Int!){
    createTag(url: $url, data: $data, source: $source, ${target_object}: $${target_object}, tagtype_id: $tagtype_id){
      id
      status
      error
    }
  }
  `;
}
const updateTagMutationTemplate = gql`
  mutation updateNewTag($url: String!, $data: jsonb!, $source: String!, $tag_id: Int!){
    update_tag_by_pk(pk_columns: {id: $tag_id}, _set: {url: $url, source: $source, data: $data}){
      id
    }
  }
  `;
const getObjectTagsQueryTemplate = ({target_object}) => {
return gql`
query getObjectTags ($${target_object}: Int!) {
  tag(where: {${target_object}: {_eq: $${target_object}}}, order_by: {tagtype: {name: asc}}) {
    source
    url
    id
    data
    tagtype {
      name
      description
      color
      id
    }
  }
}
`;
}
const getTagtypesQuery = gql`
query getTagtype {
  tagtype(order_by: {name: asc}) {
    name
    color
    description
    id
  }
}
`;
export const deleteTagMutation = gql`
mutation deleteTag($tag_id: Int!){
  delete_tag_by_pk(id: $tag_id){
    id
  }
}
`;
const getSingleTag = gql`
query getSingleTag($tag_id: Int!){
  tag_by_pk(id: $tag_id){
    source
    url
    id
    data
    apitokens_id
    credential_id
    filemeta_id
    keylog_id
    mythictree_id
    operation_id
    response_id
    callback_id
    payload_id
    task_id
    taskartifact_id
    tagtype {
      name
      description
      color
      id
    }
  }
}
`
export const TagsDisplay = ({tags, expand}) => {
  return (
      tags?.map( tt => (
          <TagChipDisplay tag={tt} key={tt.id} expand={expand} />
        ))
  )
}
const TagChipDisplay = ({tag, expand}) => {
  const theme = useTheme();
  const [openTagDisplay, setOpenTagDisplay] = React.useState(false);
  const [label, setLabel] = React.useState(expand ? tag.tagtype.name : tag.tagtype.name[0]);
  const color = tag?.tagtype?.color || "";
  const textColor = getTagReadableTextColor(theme, color);
  const onSelectTag = (event, tag) => {
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }
    setOpenTagDisplay(true);
  }
  const onClose = (event) => {
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }
    setOpenTagDisplay(false);
  }
  const onMouseOver = () => {
    if(expand === undefined || !expand){
      setLabel(tag.tagtype.name);
    }
  }
  const onMouseOut = () => {
    if(expand === undefined || !expand){
      setTimeout( () => {
        setLabel(tag.tagtype.name[0]);
      }, 10000); // wait 10s then go back to just a single letter
    }
  }
  return (
    <React.Fragment>
      <Chip onMouseOver={onMouseOver} onMouseOut={onMouseOut} label={label} size="small" onClick={(e) => onSelectTag(e)}
            sx={{
              backgroundColor: color || "transparent",
              color: textColor,
              float: "right",
              height: "15px",
              "& .MuiChip-label": {
                color: "inherit",
                overflow: "visible"
              },
              "&:hover": {
                backgroundColor: color || "transparent",
              },
            }}
      />
      {openTagDisplay && 
        <MythicDialog fullWidth={true} maxWidth="xl" open={openTagDisplay}
          onClose={onClose}
          innerDialog={<ViewTagDialog onClose={onClose} target_object_id={tag.id}/>}
      />}
    </React.Fragment>
  )
}
const StringTagDataEntry = ({name, value}) => {
  // want to match markdown [display](url)
  const regex = "^\\[.*\\]\\(.*\\)";
  const captureRegex = "^\\[(?<display>.*)\\]\\((?<url>.*)\\)(?<other>.*)";
  const targetRegex = ":target=[\"\'](?<target>.*?)[\"\']";
  const colorRegex = ":color=[\"\'](?<color>.*?)[\"\']";
  const onClick = (e, url) => {
    e.preventDefault();
    fetch(url).then((response) => {
      if (response.status !== 200) {
        snackActions.warning("HTTP " + response.status + " response");
      } else {
        snackActions.success("Successfully contacted url");
      }
    }).catch(error => {
      if(error.toString() === "TypeError: Failed to fetch"){
        snackActions.warning("Failed to make connection - this could be networking issues or ssl certs that need to be accepted first");
      } else {
        snackActions.warning("Error talking to server: " + error.toString());
      }
      console.log("There was an error!", error);
    })
  }
  if(RegExp(regex)?.test(value)){
    const capturePieces = RegExp(captureRegex).exec(value);
    const targetPieces = RegExp(targetRegex).exec(capturePieces[3]);
    const colorPieces = RegExp(colorRegex).exec(capturePieces[3]);
    if(targetPieces && targetPieces["groups"]["target"] === "api"){
      let color = "textPrimary";
      if(colorPieces && colorPieces["groups"]["color"]){
        color = colorPieces["groups"]["color"];
      }
      return (
          <MythicStyledTooltip title={"Make API Request"}>
            <WebhookIcon style={{cursor: "pointer", marginRight: "10px"}}
                         onClick={(e) => onClick(e, capturePieces[2])}
                         color={color}
            />
            {capturePieces[1]}
          </MythicStyledTooltip>
      )
    }
    return (
          <Link href={capturePieces[2]} color="textPrimary" target={"_blank"} >{capturePieces[1]}</Link>
    )
  } else if(value.startsWith("http:") || value.startsWith("https:")){
    return (
        <>
          {"Click for: "}
          <Link href={value} color="textPrimary" target="_blank" >{name}</Link>
        </>
    )
  }
  return value;
}
const RenderedTagDataPreview = ({data}) => {
  const trimmedData = typeof data === "string" ? data.trim() : data;
  if(trimmedData === ""){
    return <Box className="mythic-tag-data-preview-empty">No JSON data to render.</Box>;
  }
  try {
    const parsedData = typeof data === "string" ? JSON.parse(data) : data;
    if(parsedData === null || typeof parsedData !== "object"){
      return (
          <Box className="mythic-tag-data-preview-row">
            <Box className="mythic-tag-data-preview-key">value</Box>
            <Box className="mythic-tag-data-preview-value">{String(parsedData)}</Box>
          </Box>
      );
    }
    const entries = Array.isArray(parsedData) ?
        parsedData.map((value, index) => [`[${index}]`, value]) :
        Object.entries(parsedData);
    if(entries.length === 0){
      return <Box className="mythic-tag-data-preview-empty">JSON object is empty.</Box>;
    }
    return (
        <Box className="mythic-tag-data-preview-list">
          {entries.map(([key, value]) => (
              <Box className="mythic-tag-data-preview-row" key={key}>
                <Box className="mythic-tag-data-preview-key">{key}</Box>
                <Box className="mythic-tag-data-preview-value">
                  {typeof value === "string" ? (
                      <StringTagDataEntry name={key} value={value} />
                  ) : typeof value === "boolean" ? (
                      value ? "True" : "False"
                  ) : typeof value === "object" && value !== null ? (
                      <pre>{JSON.stringify(value, null, 2)}</pre>
                  ) : (
                      String(value)
                  )}
                </Box>
              </Box>
          ))}
        </Box>
    );
  } catch (error) {
    return <Box className="mythic-tag-data-preview-empty">Enter valid JSON to render a preview.</Box>;
  }
}
const TagReadonlyValue = ({children}) => (
    <Box className="mythic-tag-readonly-value">
      {children || "None"}
    </Box>
)
function ViewTagDialog(props) {
  const theme = useTheme();
  const [selectedTag, setSelectedTag] = React.useState({});
  const [objectInfo, setObjectInfo] = React.useState({object_type: "", object_id: ""});
  const {} = useQuery(getSingleTag, {
    variables: {tag_id: props.target_object_id},
    onCompleted: data => {
      if(data.tag_by_pk.apitokens_id !== null){
        setObjectInfo({object_type: "apitokens_id", object_id: data.tag_by_pk.apitokens_id});
      }else if(data.tag_by_pk.credential_id !== null){
        setObjectInfo({object_type: "credential_id", object_id: data.tag_by_pk.credential_id});
      }else if(data.tag_by_pk.filemeta_id !== null){
        setObjectInfo({object_type: "filemeta_id", object_id: data.tag_by_pk.filemeta_id});
      }else if(data.tag_by_pk.keylog_id !== null){
        setObjectInfo({object_type: "keylog_id", object_id: data.tag_by_pk.keylog_id});
      }else if(data.tag_by_pk.mythictree_id !== null){
        setObjectInfo({object_type: "mythictree_id", object_id: data.tag_by_pk.mythictree_id});
      }else if(data.tag_by_pk.response_id !== null){
        setObjectInfo({object_type: "response_id", object_id: data.tag_by_pk.response_id});
      }else if(data.tag_by_pk.task_id !== null){
        setObjectInfo({object_type: "task_id", object_id: data.tag_by_pk.task_id});
      }else if(data.tag_by_pk.taskartifact_id !== null){
        setObjectInfo({object_type: "taskartifact_id", object_id: data.tag_by_pk.taskartifact_id});
      }else if(data.tag_by_pk.payload_id !== null){
        setObjectInfo({object_type: "payload_id", object_id: data.tag_by_pk.payload_id});
      }else if(data.tag_by_pk.callback_id !== null){
        setObjectInfo({object_type: "callback_id", object_id: data.tag_by_pk.callback_id});
      }
      let newTag = {...data.tag_by_pk};
      let tagData = newTag;
      try{
        if(newTag.data.constructor === Object){
          newTag.data = {...data.tag_by_pk.data};
          newTag.is_json = true;
        } else if(typeof newTag.data === "string"){
          tagData = JSON.parse(newTag.data);
          newTag.data = tagData;
          newTag.is_json = true;
        }

      }catch(error){
        newTag.is_json = false;
      }
      setSelectedTag(newTag);
    },
    onError: error => {
      console.log("query error", error);
    },
    fetchPolicy: "network-only"
  })
  const onClose = (event) => {
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }
    props.onClose(event);
  }
  const stopPropagation = (e) => {
    e.stopPropagation();
  }
  const rawData = selectedTag?.is_json ? JSON.stringify(selectedTag?.data || {}, null, 2) : selectedTag?.data || "";
return (
  <React.Fragment>
      <MythicDraggableDialogTitle>View Tag</MythicDraggableDialogTitle>
      <DialogContent dividers={true} style={{width: "100%"}} onClick={stopPropagation}>
        <MythicDialogBody>
          <MythicDialogSection
              title="Tag Type"
              description={selectedTag?.tagtype?.description || "No description provided."}
              actions={
                objectInfo.object_type !== "" &&
                  <ViewEditTags target_object={objectInfo.object_type} target_object_id={objectInfo.object_id} me={props.me} />
              }
          >
            {selectedTag?.tagtype &&
              <TagTypeChip tagtype={selectedTag.tagtype} />
            }
          </MythicDialogSection>
          <MythicDialogSection title="Reference Details">
            <MythicFormGrid minWidth="16rem">
              <MythicFormField label="Source">
                <TagReadonlyValue>{selectedTag?.source || "None"}</TagReadonlyValue>
              </MythicFormField>
              <MythicFormField label="External URL">
                <TagReadonlyValue>
                  {selectedTag?.url ? (
                      <Link href={selectedTag.url} color="textPrimary" target="_blank" referrerPolicy='no'>
                        {selectedTag.url}
                      </Link>
                  ) : (
                      "No reference link provided"
                  )}
                </TagReadonlyValue>
              </MythicFormField>
            </MythicFormGrid>
          </MythicDialogSection>
          <MythicDialogSection title="Tag Data">
            {selectedTag?.is_json ? (
                <Box className="mythic-tag-data-preview-frame mythic-tag-data-preview-frame-full">
                  <RenderedTagDataPreview data={selectedTag?.data || {}} />
                </Box>
            ) : (
                <Box className="mythic-tag-editor-frame">
                  <AceEditor
                      mode="json"
                      theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
                      fontSize={14}
                      showGutter={true}
                      showPrintMargin={false}
                      minLines={8}
                      maxLines={18}
                      highlightActiveLine={false}
                      readOnly={true}
                      value={rawData}
                      width={"100%"}
                      setOptions={{
                        showLineNumbers: true,
                        tabSize: 4,
                        useWorker: false,
                        wrapBehavioursEnabled: true,
                        wrap: true
                      }}/>
                </Box>
            )}
          </MythicDialogSection>
        </MythicDialogBody>
      </DialogContent>
      <MythicDialogFooter onClick={stopPropagation}>
        <MythicDialogButton onClick={onClose}>
          Close
        </MythicDialogButton>
      </MythicDialogFooter>
</React.Fragment>
);
}
export function ViewEditTagsDialog(props) {
  const theme = useTheme();
  const [newSource, setNewSource] = React.useState("");
  const [newURL, setNewURL] = React.useState("");
  const [newData, setNewData] = React.useState("");
  const [selectedTag, setSelectedTag] = React.useState("");
  const [existingTags, setExistingTags] = React.useState([]);
  const [openNewDialog, setOpenNewDialog] = React.useState(false);
  const [openDelete, setOpenDeleteDialog] = React.useState(false);
  const {} = useQuery(getObjectTagsQueryTemplate({target_object: props.target_object}), {
    variables: {[props.target_object]: props.target_object_id},
    onCompleted: data => {
      setExistingTags(data.tag);
      if(data.tag.length > 0){
        setSelectedTag(data.tag[0]);
        setNewSource(data.tag[0].source);
        setNewURL(data.tag[0].url);
        try{
          if(typeof data.tag[0].data !== "string"){
            setNewData(JSON.stringify(data.tag[0].data, null, 2));
          } else {
            setNewData(String(data.tag[0].data));
          }
        }catch(error){
          setNewData(String(data.tag[0].data));
        }

      }
    },
    onError: error => {
      console.log(error);
    },
    fetchPolicy: "network-only"
  })
  const [deleteTag] = useMutation(deleteTagMutation, {
    onCompleted: data => {
      snackActions.success("Successfully deleted tag");
      const newTags = existingTags.filter (c => c.id !== data.delete_tag_by_pk.id);
      setExistingTags(newTags);
      if(newTags.length > 0){
        setSelectedTag(newTags[0]);
        try{
          setNewData(JSON.stringify(newTags[0].data, null, 2));
        }catch(error){
          setNewData(String(newTags[0].data));
        }
        setNewSource(newTags[0].source);
        setNewURL(newTags[0].url);
      } else {
        setSelectedTag("");
        setNewData("");
        setNewSource("");
        setNewURL("");
      }
    },
    onError: error => {
      snackActions.error("Failed to delete tag: " + error.message);
    }
});
  const [updateTag] = useMutation(updateTagMutationTemplate, {
    onCompleted: data => {
      snackActions.success("Successfully updated tag");
      props.onClose();
    },
    onError: error => {
      snackActions.error("Failed to update: " + error.message);
    }
  })

const onSubmit = () => {
  updateTag({variables: {tag_id: selectedTag.id, source:newSource, url:newURL, data:newData}});
  if(props.onSubmit !== undefined){
    props.onSubmit({source:newSource, url:newURL, data:newData, tag_id:selectedTag.id});
  }
}
const onChangeSource = (name, value, error) => {
  setNewSource(value);
}
const onChangeURL = (name, value, error) => {
  setNewURL(value);
}
const onEditorChange = (value, event) => {
  setNewData(value);
}
const handleTaskTypeChange = (evt) => {
  setSelectedTag(evt.target.value);
  setNewSource(evt.target.value.source);
  setNewURL(evt.target.value.url);
  try{
    setNewData(JSON.stringify(evt.target.value.data, null, 2));
  }catch(error){
    setNewData(String(evt.target.value.data));
  }
}
const handleNewTagCreate = ({tagtype_id, source, url, data, id, tagtype}) => {
  const newTag = {id, source, url, data, tagtype_id, tagtype};
  const newTags = [...existingTags, newTag].sort((a, b) => a.tagtype.name.localeCompare(b.tagtype.name));
  setExistingTags(newTags);
  setSelectedTag(newTag);
  setNewSource(source);
  setNewURL(url);
  setNewData(data);
  setOpenNewDialog(false);
}
const onAcceptDelete = () => {
  deleteTag({variables: {tag_id: selectedTag.id}});
  setOpenDeleteDialog(false);
}

return (
  <React.Fragment>
      <MythicDraggableDialogTitle >Edit Tags </MythicDraggableDialogTitle>
      <DialogContent dividers={true} style={{width: "100%"}}>
      {openNewDialog && <MythicDialog fullWidth={true} maxWidth="lg" open={openNewDialog}
          onClose={()=>{setOpenNewDialog(false);}} 
          innerDialog={<NewTagDialog me={props.me} 
            target_object={props.target_object} 
            target_object_id={props.target_object_id} 
            onClose={()=>{setOpenNewDialog(false);}} 
            onSubmit={handleNewTagCreate} />}
      />}
        <MythicDialogBody>
          <MythicDialogSection
              title="Tag Selection"
              description={existingTags.length === 0 ? "No tags are attached yet." : "Choose the tag you want to update."}
              actions={
                <MythicStyledTooltip title={"Add New Tag"}>
                  <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-success" size="small" onClick={() => setOpenNewDialog(true)}>
                    <AddCircleOutlineIcon fontSize="small" />
                  </IconButton>
                </MythicStyledTooltip>
              }
          >
            {existingTags.length === 0 ? (
              <MythicFormNote>
                Add a tag to capture source, reference, and structured data for this item.
              </MythicFormNote>
            ) : (
              <Box sx={{display: "grid", gap: 1, gridTemplateColumns: {xs: "1fr", md: selectedTag.id ? "minmax(0, 1fr) auto" : "1fr"}, alignItems: "end"}}>
                <MythicFormField label="Existing Tag">
                  <Select
                      fullWidth
                      size="small"
                      value={selectedTag}
                      onChange={handleTaskTypeChange}
                      renderValue={(tag) => tag?.id ? <TagTypeChip tagtype={tag.tagtype} /> : "Select a tag"}
                  >
                    {existingTags.map( (opt) => (
                        <MenuItem value={opt} key={opt.id}>
                          <TagTypeChip tagtype={opt.tagtype} />
                        </MenuItem>
                    ) )}
                  </Select>
                </MythicFormField>
                {selectedTag.id &&
                  <MythicStyledTooltip title={"Delete Tag"}>
                    <Box sx={{alignItems: "center", alignSelf: "end", display: "flex", height: 38}}>
                      <IconButton className="mythic-table-row-icon-action mythic-table-row-icon-action-hover-danger" size="small" onClick={()=>{setOpenDeleteDialog(true);}}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </MythicStyledTooltip>
                }
                {selectedTag.id && selectedTag?.tagtype?.description &&
                  <Box sx={{gridColumn: "1 / -1"}}>
                    <MythicFormNote>{selectedTag.tagtype.description}</MythicFormNote>
                  </Box>
                }
              </Box>
            )}
            {openDelete &&
              <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete} open={openDelete}/>
            }
          </MythicDialogSection>
          {selectedTag.id &&
            <>
              <MythicDialogSection title="Reference Details">
                <MythicFormGrid minWidth="16rem">
                  <MythicFormField label="Source">
                    <MythicTextField value={newSource} onChange={onChangeSource} name="Source of tag data" showLabel={false} marginTop="0" marginBottom="0" />
                  </MythicFormField>
                  <MythicFormField label="External URL">
                    <MythicTextField value={newURL} onChange={onChangeURL} name="External URL reference" showLabel={false} marginTop="0" marginBottom="0" />
                    {newURL &&
                      <Link href={newURL} color="textPrimary" target="_blank" referrerPolicy='no' sx={{display: "inline-flex", mt: 0.5, fontSize: "0.78rem"}}>
                        Open reference
                      </Link>
                    }
                  </MythicFormField>
                </MythicFormGrid>
              </MythicDialogSection>
              <MythicDialogSection title="JSON Data">
                <Box className="mythic-tag-data-split">
                  <Box className="mythic-tag-editor-frame">
                    <AceEditor
                        mode="json"
                        theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
                        onChange={onEditorChange}
                        fontSize={14}
                        showGutter={true}
                        showPrintMargin={false}
                        minLines={10}
                        maxLines={18}
                        highlightActiveLine={true}
                        value={newData}
                        width={"100%"}
                        setOptions={{
                          showLineNumbers: true,
                          tabSize: 4,
                          useWorker: false,
                          wrap: true
                        }}/>
                  </Box>
                  <Box className="mythic-tag-data-preview-frame">
                    <RenderedTagDataPreview data={newData} />
                  </Box>
                </Box>
              </MythicDialogSection>
            </>
          }
        </MythicDialogBody>
      </DialogContent>
      <MythicDialogFooter>
        <MythicDialogButton onClick={props.onClose}>
          Close
        </MythicDialogButton>
        {selectedTag.id &&
            <MythicDialogButton intent="primary" onClick={onSubmit}>
              Submit
            </MythicDialogButton>
        }
      </MythicDialogFooter>
</React.Fragment>
);
}
export function NewTagDialog(props) {
    const theme = useTheme();
    const [newSource, setNewSource] = React.useState("");
    const [newURL, setNewURL] = React.useState("");
    const [newData, setNewData] = React.useState("");
    const [selectedTagType, setSelectedTagType] = React.useState("");
    const [existingTagTypes, setExistingTagTypes] = React.useState([]);
    const [openNewTagTypeDialog, setOpenNewTagTypeDialog] = React.useState(false);
    useQuery(getTagtypesQuery, {
        onCompleted: data => {
          setExistingTagTypes(data.tagtype);
          if(data.tagtype.length > 0){
            setSelectedTagType(data.tagtype[0]);
          }
        },
        fetchPolicy: "network-only"
    });
  const [newTag] = useMutation(createNewTagMutationTemplate({target_object: props.target_object}), {
    onCompleted: data => {
      if(data.createTag.status === "success"){
        snackActions.success("Successfully created new tag!");
        props.onSubmit({source:newSource, url:newURL, data:newData, tagtype_id:selectedTagType.id, id: data.createTag.id, tagtype: selectedTagType});
        props.onClose()
      } else {
        snackActions.error(data.createTag.error);
      }

    },
    onError: error => {
      snackActions.error(error.message);
    }
  })
  const handleTaskTypeChange = (evt) => {
    setSelectedTagType(evt.target.value);
  }
  const onNewTagType = ({name, description, id, color}) => {
    const newTagType = {name, description, id, color};
    setExistingTagTypes((prev) => [...prev, newTagType].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedTagType(newTagType);
  }
  const onSubmit = () => {
    newTag({variables: 
      {source:newSource, url:newURL, data:newData, 
      tagtype_id:selectedTagType.id, 
      [props.target_object]: props.target_object_id
    }})
  }
  const onChangeSource = (name, value, error) => {
    setNewSource(value);
  }
  const onChangeURL = (name, value, error) => {
    setNewURL(value);
  }
  const onEditorChange = (value, event) => {
    setNewData(value);
  }

  return (
    <React.Fragment>
        {openNewTagTypeDialog &&
          <MythicDialog fullWidth={true} maxWidth="md" open={openNewTagTypeDialog}
                        onClose={()=>{setOpenNewTagTypeDialog(false);}}
                        innerDialog={
                          <NewTagtypesDialog
                              onClose={()=>{setOpenNewTagTypeDialog(false);}}
                              onSubmit={onNewTagType}
                          />
                        }
          />
        }
        <MythicDraggableDialogTitle >Add New Tag</MythicDraggableDialogTitle>
        <DialogContent dividers={true} style={{width: "100%"}}>
          <MythicDialogBody>
            <MythicDialogSection
                title="Tag Type"
                description="Select the taxonomy entry this tag should use."
                actions={
                  <Button className="mythic-table-row-action mythic-table-row-action-hover-info" size="small" variant="outlined" onClick={() => setOpenNewTagTypeDialog(true)}>
                    Manage Tag Types
                  </Button>
                }
            >
              <MythicFormField label="Tag">
                <Select
                    fullWidth
                    size="small"
                    value={selectedTagType}
                    onChange={handleTaskTypeChange}
                    displayEmpty
                    renderValue={(tagtype) => tagtype?.id ? <TagTypeChip tagtype={tagtype} /> : "No tag types available"}
                >
                  {existingTagTypes.map( (opt) => (
                      <MenuItem value={opt} key={opt.name}>
                        <TagTypeChip tagtype={opt} />
                      </MenuItem>
                  ) )}
                </Select>
              </MythicFormField>
              {selectedTagType?.description &&
                <MythicFormNote>{selectedTagType.description}</MythicFormNote>
              }
            </MythicDialogSection>
            <MythicDialogSection title="Reference Details">
              <MythicFormGrid minWidth="16rem">
                <MythicFormField label="Source">
                  <MythicTextField value={newSource} onChange={onChangeSource} name="Source of tag data" showLabel={false} marginTop="0" marginBottom="0" />
                </MythicFormField>
                <MythicFormField label="External URL">
                  <MythicTextField value={newURL} onChange={onChangeURL} name="External URL reference" showLabel={false} marginTop="0" marginBottom="0" />
                  {newURL &&
                    <Link href={newURL} color="textPrimary" target="_blank" referrerPolicy='no' sx={{display: "inline-flex", mt: 0.5, fontSize: "0.78rem"}}>
                      Open reference
                    </Link>
                  }
                </MythicFormField>
              </MythicFormGrid>
            </MythicDialogSection>
            <MythicDialogSection title="JSON Data">
              <Box className="mythic-tag-data-split">
                <Box className="mythic-tag-editor-frame">
                  <AceEditor
                      mode="json"
                      theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
                      onChange={onEditorChange}
                      fontSize={14}
                      showGutter={true}
                      showPrintMargin={false}
                      minLines={10}
                      maxLines={18}
                      highlightActiveLine={true}
                      value={newData}
                      width={"100%"}
                      setOptions={{
                        showLineNumbers: true,
                        tabSize: 4,
                        useWorker: false,
                        wrap: true
                      }}/>
                </Box>
                <Box className="mythic-tag-data-preview-frame">
                  <RenderedTagDataPreview data={newData} />
                </Box>
              </Box>
            </MythicDialogSection>
          </MythicDialogBody>
        </DialogContent>
        <MythicDialogFooter>
          <MythicDialogButton onClick={props.onClose}>
            Close
          </MythicDialogButton>
          {selectedTagType !== "" &&
              <MythicDialogButton intent="primary" onClick={onSubmit}>
                Submit
              </MythicDialogButton>
          }
        </MythicDialogFooter>
  </React.Fragment>
  );
}
export const ViewEditTags = ({target_object, target_object_id}) => {
  const me = useReactiveVar(meState);
  const [openTagDialog, setOpenTagDialog] = React.useState(false);
  const toggleTagDialog = (event, open) => {
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }
    setOpenTagDialog(open);
  }
  return(
    <React.Fragment>
    <IconButton onClick={(e) => toggleTagDialog(e, true)} size="small"
                style={{display: "inline-block", float: "right", padding: "0px"}}>
      <LocalOfferOutlinedIcon />
    </IconButton>
    {openTagDialog &&
      <MythicDialog fullWidth={true} maxWidth="xl" open={openTagDialog}
        onClose={(e)=>{toggleTagDialog(e, false)}}
        innerDialog={<ViewEditTagsDialog me={me} target_object={target_object} target_object_id={target_object_id} onClose={(e)=>{toggleTagDialog(e, false)}} />}
    />}
    </React.Fragment>
  )
  
}
