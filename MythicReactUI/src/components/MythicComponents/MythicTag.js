import React from 'react';
import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MythicTextField from './MythicTextField';
import {useQuery, gql, useMutation} from '@apollo/client';
import { Select, Input, MenuItem, Link, IconButton, } from '@mui/material';
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

const createNewTagMutationTemplate = ({target_object}) => {
  // target_object should be something like "task_id"
  // target_object_id should be something like "89"
  return gql`
  mutation createNewTag($url: String!, $data: jsonb!, $source: String!, $${target_object}: Int!, $tagtype_id: Int!){
    insert_tag_one(object: {url: $url, data: $data, source: $source, ${target_object}: $${target_object}, tagtype_id: $tagtype_id}){
      id
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
  tag(where: {${target_object}: {_eq: $${target_object}}}) {
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
  tagtype {
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
    tagtype {
      name
      description
      color
      id
    }
  }
}
`
export const TagsDisplay = ({tags}) => {
  return (
      tags?.map( tt => (
          <TagChipDisplay tag={tt} key={tt.id} />
        ))
  )
}
const TagChipDisplay = ({tag}) => {
  const [openTagDisplay, setOpenTagDisplay] = React.useState(false);
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
  return (
    <React.Fragment>
      <Chip label={tag.tagtype.name} size="small" onClick={(e) => onSelectTag(e)} style={{float: "right", backgroundColor:tag.tagtype.color}} />
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
  if(RegExp(regex).test(value)){
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
  } else if(value.startsWith("http")){
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
  const {} = useQuery(getSingleTag, {
    variables: {tag_id: props.target_object_id},
    onCompleted: data => {
      let newTag = {...data.tag_by_pk};
      let tagData = newTag;
      try{
        tagData = JSON.parse(newTag.data);
        newTag.data = tagData;
        newTag.is_json = true;
      }catch(error){
        newTag.is_json = false;
      }
      setSelectedTag(newTag);
    },
    onError: error => {
      console.log(error);
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

return (
  <React.Fragment>
      <DialogTitle id="form-dialog-title" onClick={(e) => e.stopPropagation()}>View Tag</DialogTitle>
        <TableContainer className="mythicElement">
          <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
              <TableBody>
                <TableRow hover>
                  <TableCell style={{width: "20%"}}>Tag Type</TableCell>
                  <TableCell style={{display: "inline-flex", flexDirection: "row", width: "100%"}}>
                    <Chip label={selectedTag?.tagtype?.name||""} size="small" style={{float: "right", backgroundColor:selectedTag?.tagtype?.color||""}} />
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
                    <Link href={selectedTag?.url || "#"} color="textPrimary" target="_blank" referrerPolicy='no'>{selectedTag?.url ? "click here" : "No reference link provided"}</Link>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>
                    {selectedTag?.is_json || false ? (
                      <TableContainer  className="mythicElement">
                        <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
                          <TableBody>
                            {Object.keys(selectedTag.data).map( key => (
                              <TableRow key={key} hover>
                                <TableCell>{key}</TableCell>
                                {typeof selectedTag.data[key] === "string" ? (
                                    <TableCell>
                                      <StringTagDataEntry name={key} value={selectedTag.data[key]} />
                                    </TableCell>
                                ) : typeof selectedTag.data[key] === "object" ? (
                                    <TableCell>{selectedTag.data[key].toString()}</TableCell>
                                ) : typeof selectedTag.data[key] === "boolean" ? (
                                    <TableCell>{selectedTag.data[key] ? "True" : "False"}</TableCell>
                                ) :
                                (
                                    <TableCell>{selectedTag.data[key]}</TableCell>
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
        setNewData(data.tag[0].data);
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
        setNewData(newTags[0].data);
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
  setNewData(evt.target.value.data);
  setNewSource(evt.target.value.source);
  setNewURL(evt.target.value.url);
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
      <Button variant='contained' color="success" style={{float: "right"}} onClick={() => setOpenNewDialog(true)} >New</Button>
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
                  <TableCell style={{width: "30%"}}>Select Existing Tag to Edit</TableCell>
                  <TableCell style={{display: "inline-flex", flexDirection: "row-reverse"}}>
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
                  </TableCell>
                </TableRow>
                <TableRow hover>
                  <TableCell>Tag Description</TableCell>
                  <TableCell>{selectedTag?.tagtype?.description || ""}</TableCell>
                </TableRow>
                <TableRow hover>
                  <TableCell>Source</TableCell>
                  <TableCell>
                    <MythicTextField value={newSource} onChange={onChangeSource} name="Source of tag data" />
                  </TableCell>
                </TableRow>
                <TableRow hover>
                  <TableCell>External URL</TableCell>
                  <TableCell>
                    <MythicTextField value={newURL} onChange={onChangeURL} name="External URL reference" />
                    <Link href={newURL} color="textPrimary" target="_blank" referrerPolicy='no'>{newURL ? "click here" : ""}</Link>
                  </TableCell>
                </TableRow>
                <TableRow hover>
                  <TableCell>JSON Data</TableCell>
                  <TableCell>
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
                  </TableCell>
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
      snackActions.success("Successfully created new tag!");
      props.onSubmit({source:newSource, url:newURL, data:newData, tagtype_id:selectedTagType.id, id: data.insert_tag_one.id});
      props.onClose()
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
        <DialogTitle id="form-dialog-title">Create new Tag Instance</DialogTitle>
        <DialogContent dividers={true}>
          <TableContainer className="mythicElement">
            <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
                <TableBody>
                  <TableRow hover>
                    <TableCell style={{width: "30%"}}>Select Existing Tag Type</TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                  <TableRow hover>
                    <TableCell>Source</TableCell>
                    <TableCell>
                      <MythicTextField value={newSource} onChange={onChangeSource} name="Source of tag data" />
                    </TableCell>
                  </TableRow>
                  <TableRow hover>
                    <TableCell>External URL</TableCell>
                    <TableCell>
                      <MythicTextField value={newURL} onChange={onChangeURL} name="External URL reference" />
                      <Link href={newURL} color="textPrimary" target="_blank" referrerPolicy='no'>{newURL}</Link>
                    </TableCell>
                  </TableRow>
                  <TableRow hover>
                    <TableCell>JSON Data</TableCell>
                    <TableCell>
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
                    </TableCell>
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
export const ViewEditTags = ({target_object, target_object_id, me}) => {
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
    <IconButton onClick={(e) => toggleTagDialog(e, true)} size="small" style={{display: "inline-block", float: "right"}}><LocalOfferOutlinedIcon /></IconButton>
    {openTagDialog ?
      (<MythicDialog fullWidth={true} maxWidth="xl" open={openTagDialog}
        onClose={(e)=>{toggleTagDialog(e, false)}}
        innerDialog={<ViewEditTagsDialog me={me} target_object={target_object} target_object_id={target_object_id} onClose={(e)=>{toggleTagDialog(e, false)}} />}
    />) : null}
    </React.Fragment>
  )
  
}