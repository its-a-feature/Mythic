import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from './MythicTextField';
import {useQuery, gql, useMutation} from '@apollo/client';
import { Select, Input, MenuItem, Link, IconButton } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
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
import Typography from '@mui/material/Typography';
import MythicStyledTableCell from "./MythicTableCell";
import {meState} from "../../cache";
import { useReactiveVar } from '@apollo/client';

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
  const [openTagDisplay, setOpenTagDisplay] = React.useState(false);
  const [label, setLabel] = React.useState(expand ? tag.tagtype.name : tag.tagtype.name[0]);
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
            style={{float: "right", backgroundColor:tag.tagtype.color, height: "15px"}}
            sx={{
              "& .MuiChip-label": {overflow: "visible"}
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
  const stopClicks = (e) => {
    e.stopPropagation();
    e.preventDefault();
  }
return (
  <React.Fragment>
      <DialogTitle id="form-dialog-title" onClick={stopClicks}>View Tag</DialogTitle>
        <TableContainer className="mythicElement" onClick={stopClicks}>
          <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
              <TableBody>
                <TableRow hover>
                  <TableCell style={{width: "20%"}}>Tag Type</TableCell>
                  <TableCell style={{display: "inline-flex", flexDirection: "row", width: "100%"}}>
                    <Chip label={selectedTag?.tagtype?.name||""} size="small" style={{float: "right", backgroundColor:selectedTag?.tagtype?.color||""}} />
                    <ViewEditTags target_object={objectInfo.object_type} target_object_id={objectInfo.object_id} me={props.me} />
                  </TableCell>
                </TableRow>
                <TableRow hover>
                  <TableCell>Description</TableCell>
                  <TableCell>{selectedTag?.tagtype?.description || ""}</TableCell>
                </TableRow>
                <TableRow hover>
                  <TableCell>Source</TableCell>
                  <TableCell>
                    {selectedTag?.source ||""}
                  </TableCell>
                </TableRow>
                <TableRow hover>
                  <TableCell>Reference URL</TableCell>
                  <TableCell>
                    {selectedTag?.url === "" ? (
                        "No reference link provided"
                    ) : (
                        <Link href={selectedTag?.url || "#"} color="textPrimary" target="_blank" referrerPolicy='no'>{selectedTag?.url ? "click here" : "No reference link provided"}</Link>
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>
                    {selectedTag?.is_json ? (
                      <TableContainer  className="mythicElement">
                        <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
                          <TableBody>
                            {Object.keys(selectedTag.data).map( key => (
                              <TableRow key={key} hover>
                                <TableCell>{key}</TableCell>
                                {typeof selectedTag.data[key] === "string" ? (
                                    <TableCell style={{whiteSpace: "pre-wrap"}}>
                                      <StringTagDataEntry name={key} value={String(selectedTag.data[key])} />
                                    </TableCell>
                                ) : typeof selectedTag.data[key] === "object" ? (
                                    Array.isArray(selectedTag.data[key]) ? (
                                        <TableCell style={{whiteSpace: "pre-wrap"}}>{JSON.stringify(selectedTag.data[key], null, 2)}</TableCell>
                                    ) : (
                                        <Table size={"small"} >
                                          {Object.keys(selectedTag.data[key]).map(key2 => (
                                              <TableRow key={key2} >
                                                <TableCell>{key2}</TableCell>
                                                <TableCell>
                                                  <StringTagDataEntry name={key2} value={String(selectedTag.data[key][key2])} />
                                                </TableCell>
                                              </TableRow>
                                          ))}
                                        </Table>
                                    )
                                ) : typeof selectedTag.data[key] === "boolean" ? (
                                    <TableCell>{selectedTag.data[key] ? "True" : "False"}</TableCell>
                                ) :
                                (
                                    <TableCell>{String(selectedTag.data[key])}</TableCell>
                                )
                                }

                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <AceEditor 
                        mode="json"
                        theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
                        fontSize={14}
                        showGutter={true}
                        maxLines={20}
                        highlightActiveLine={false}
                        value={selectedTag?.data || ""}
                        width={"100%"}
                        setOptions={{
                          showLineNumbers: true,
                          tabSize: 4,
                          useWorker: false,
                          wrapBehavioursEnabled: true,
                          wrap: true
                        }}/>
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
          </Table>
        </TableContainer>
      <DialogActions onClick={(e) => e.stopPropagation()}>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
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
const handleNewTagCreate = ({tagtype_id, source, url, data, id}) => {
  props.onClose();
}
const onAcceptDelete = () => {
  deleteTag({variables: {tag_id: selectedTag.id}});
  setOpenDeleteDialog(false);
}

return (
  <React.Fragment>
      <DialogTitle id="form-dialog-title">Edit Tags
      </DialogTitle>
      <DialogContent dividers={true}>
      {openNewDialog ?
        (<MythicDialog fullWidth={true} maxWidth="xl" open={openNewDialog}
          onClose={()=>{setOpenNewDialog(false);}} 
          innerDialog={<NewTagDialog me={props.me} 
            target_object={props.target_object} 
            target_object_id={props.target_object_id} 
            onClose={()=>{setOpenNewDialog(false);}} 
            onSubmit={handleNewTagCreate} />}
      />) : null}
        <TableContainer className="mythicElement">
          <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
              <TableBody>
                <TableRow hover>
                  <MythicStyledTableCell style={{width: "30%"}}>Select Existing Tag to Edit or Add New</MythicStyledTableCell>
                  <MythicStyledTableCell style={{display: "inline-flex", flexDirection: "row-reverse"}}>
                    <MythicStyledTooltip title={"Add New Tag"}>
                      <IconButton variant='contained' color="success" style={{float: "right"}} onClick={() => setOpenNewDialog(true)} >
                        <AddCircleOutlineIcon />
                      </IconButton>
                    </MythicStyledTooltip>
                    <Select
                        labelId="demo-dialog-select-label"
                        id="demo-dialog-select"
                        value={selectedTag}
                        onChange={handleTaskTypeChange}
                        input={<Input />}
                      >
                        {existingTags.map( (opt) => (
                            <MenuItem value={opt} key={opt.id}>
                              <Chip label={opt.tagtype.name} size="small" style={{float: "right", backgroundColor:opt.tagtype.color}} />
                            </MenuItem>
                        ) )}
                      </Select>
                    {selectedTag.id &&
                        <IconButton size="small" style={{float: "right"}} onClick={()=>{setOpenDeleteDialog(true);}} color="error" variant="contained"><DeleteIcon/></IconButton>
                    }
                      {openDelete && 
                        <MythicConfirmDialog onClose={() => {setOpenDeleteDialog(false);}} onSubmit={onAcceptDelete} open={openDelete}/>
                      }
                  </MythicStyledTableCell>
                </TableRow>
                <TableRow hover>
                  <MythicStyledTableCell>Tag Description</MythicStyledTableCell>
                  <MythicStyledTableCell>{selectedTag?.tagtype?.description || ""}</MythicStyledTableCell>
                </TableRow>
                <TableRow hover>
                  <MythicStyledTableCell>Source</MythicStyledTableCell>
                  <MythicStyledTableCell>
                    <MythicTextField value={newSource} onChange={onChangeSource} name="Source of tag data" />
                  </MythicStyledTableCell>
                </TableRow>
                <TableRow hover>
                  <MythicStyledTableCell>External URL</MythicStyledTableCell>
                  <MythicStyledTableCell>
                    <MythicTextField value={newURL} onChange={onChangeURL} name="External URL reference" />
                    <Link href={newURL} color="textPrimary" target="_blank" referrerPolicy='no'>{newURL ? "click here" : ""}</Link>
                  </MythicStyledTableCell>
                </TableRow>
                <TableRow hover>
                  <MythicStyledTableCell>JSON Data</MythicStyledTableCell>
                  <MythicStyledTableCell>
                  <AceEditor 
                    mode="json"
                    theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
                    onChange={onEditorChange}
                    fontSize={14}
                    showGutter={true}
                    maxLines={20}
                    highlightActiveLine={true}
                    value={newData}
                    width={"100%"}
                    setOptions={{
                      showLineNumbers: true,
                      tabSize: 4,
                      useWorker: false
                    }}/>
                  </MythicStyledTableCell>
                </TableRow>
              </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} variant="contained" color="primary">
          Close
        </Button>
        {selectedTag.id &&
            <Button onClick={onSubmit} variant="contained" color="success">
              Submit
            </Button>
        }

      </DialogActions>
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
    const { loading, error } = useQuery(getTagtypesQuery, {
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
        props.onSubmit({source:newSource, url:newURL, data:newData, tagtype_id:selectedTagType.id, id: data.createTag.id});
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
        <DialogTitle id="form-dialog-title">Add New Tag</DialogTitle>
        <DialogContent dividers={true}>
          <TableContainer className="mythicElement">
            <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
                <TableBody>
                  <TableRow hover>
                    <MythicStyledTableCell style={{width: "20%"}}>
                      <Typography>
                        Tag
                      </Typography>
                      <Typography  size="small" component="span" style={{fontSize: theme.typography.pxToRem(15)}}>
                        To create a new tag type click <Link style={{wordBreak: "break-all"}}
                                                             color="textPrimary"
                                                             href={"/new/tagtypes"}
                                                             underline="always" target="_blank">
                        here
                      </Link>
                      </Typography>
                    </MythicStyledTableCell>
                    <MythicStyledTableCell>
                      <Select
                        labelId="demo-dialog-select-label"
                        id="demo-dialog-select"
                        value={selectedTagType}
                        onChange={handleTaskTypeChange}
                        input={<Input style={{width: "100%"}}/>}
                      >
                        {existingTagTypes.map( (opt) => (
                            <MenuItem value={opt} key={opt.name}>
                              <Chip label={opt.name} size="small" style={{ backgroundColor:opt.color}} />
                            </MenuItem>
                        ) )}
                      </Select>
                    </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                    <MythicStyledTableCell>Source</MythicStyledTableCell>
                    <MythicStyledTableCell>
                      <MythicTextField value={newSource} onChange={onChangeSource} name="Source of tag data" />
                    </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                    <MythicStyledTableCell>External URL</MythicStyledTableCell>
                    <MythicStyledTableCell>
                      <MythicTextField value={newURL} onChange={onChangeURL} name="External URL reference" />
                      <Link href={newURL} color="textPrimary" target="_blank" referrerPolicy='no'>{newURL}</Link>
                    </MythicStyledTableCell>
                  </TableRow>
                  <TableRow hover>
                    <MythicStyledTableCell>JSON Data</MythicStyledTableCell>
                    <MythicStyledTableCell>
                    <AceEditor 
                      mode="json"
                      theme={theme.palette.mode === "dark" ? "monokai" : "xcode"}
                      onChange={onEditorChange}
                      fontSize={14}
                      showGutter={true}
                      maxLines={20}
                      highlightActiveLine={true}
                      value={newData}
                      width={"100%"}
                      setOptions={{
                        showLineNumbers: true,
                        tabSize: 4,
                        useWorker: false
                      }}/>
                    </MythicStyledTableCell>
                  </TableRow>
                </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} variant="contained" color="primary">
            Close
          </Button>
          {selectedTagType !== "" &&
              <Button onClick={onSubmit} variant="contained" color="success">
                Submit
              </Button>
          }

        </DialogActions>
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