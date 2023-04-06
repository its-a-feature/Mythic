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
import Paper from '@mui/material/Paper';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-xcode';
import {useTheme} from '@mui/material/styles';
import { snackActions } from '../utilities/Snackbar';
import { MythicDialog } from './MythicDialog';
import {MythicConfirmDialog} from './MythicConfirmDialog';
import DeleteIcon from '@mui/icons-material/Delete';
import Chip from '@mui/material/Chip';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';

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
query getObjectTags ($operation_id: Int!, $${target_object}: Int!) {
  tag(where: {operation_id: {_eq: $operation_id}, ${target_object}: {_eq: $${target_object}}}) {
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
query getTagtype ($operation_id: Int!) {
  tagtype(where: {operation_id: {_eq: $operation_id}}) {
    name
    color
    description
    id
  }
}
`;
const deleteTagMutation = gql`
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
      tags.map( tt => (
          <TagChipDisplay tag={tt} key={tt.id} />
        ))
  )
}
const TagChipDisplay = ({tag}) => {
  const [openTagDisplay, setOpenTagDisplay] = React.useState(false);
  const onSelectTag = (evt, tag) => {
    evt.preventDefault();
    evt.stopPropagation();
    setOpenTagDisplay(true);
  }
  const onClose = (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    setOpenTagDisplay(false);
  }
  return (
    <React.Fragment>
      <Chip label={tag.tagtype.name} size="small" onClick={(e) => onSelectTag(e)} style={{float: "right", backgroundColor:tag.tagtype.color}} />
      {openTagDisplay && 
        <MythicDialog fullWidth={true} maxWidth="sm" open={openTagDisplay} 
          onClose={onClose} 
          innerDialog={<ViewTagDialog onClose={onClose} target_object_id={tag.id}/>}
      />}
    </React.Fragment>
  )
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
  const onClose = (e) => {
    e.stopPropagation();
    props.onClose(e);
  }

return (
  <React.Fragment>
      <DialogTitle id="form-dialog-title" onClick={(e) => e.stopPropagation()}>View Tag</DialogTitle>
        <TableContainer component={Paper} className="mythicElement">
          <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
              <TableBody>
                <TableRow hover>
                  <TableCell style={{width: "20%"}}>Tag Type</TableCell>
                  <TableCell style={{display: "inline-flex", flexDirection: "row-reverse"}}>
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
                  <TableCell>External URL</TableCell>
                  <TableCell>
                    <Link href={selectedTag?.url || "#"} target="_blank" referrerPolicy='no'>{selectedTag?.url ? "click here" : "No link provided"}</Link>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>
                    {selectedTag?.is_json || false ? (
                      <TableContainer component={Paper} className="mythicElement">
                        <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
                          <TableBody>
                            {Object.keys(selectedTag.data).map( key => (
                              <TableRow key={key} hover>
                                <TableCell>{key}</TableCell>
                                <TableCell>{selectedTag.data[key]}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <AceEditor 
                        mode="json"
                        theme={theme.palette.type === "dark" ? "monokai" : "xcode"}
                        fontSize={14}
                        showGutter={true}
                        maxLines={20}
                        highlightActiveLine={true}
                        value={selectedTag?.data || ""}
                        width={"100%"}
                        setOptions={{
                          showLineNumbers: true,
                          tabSize: 4,
                          useWorker: false
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
    variables: {operation_id: props.me?.user?.current_operation_id || 0, [props.target_object]: props.target_object_id},
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
      const newTags = existingTags.filter (c => c.id != data.delete_tag_by_pk.id);
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
  
  props.onClose();
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
        (<MythicDialog fullWidth={true} maxWidth="md" open={openNewDialog} 
          onClose={()=>{setOpenNewDialog(false);}} 
          innerDialog={<NewTagDialog me={props.me} 
            target_object={props.target_object} 
            target_object_id={props.target_object_id} 
            onClose={()=>{setOpenNewDialog(false);}} 
            onSubmit={handleNewTagCreate} />}
      />) : (null)}
        <TableContainer component={Paper} className="mythicElement">
          <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
              <TableBody>
                <TableRow hover>
                  <TableCell style={{width: "20%"}}>Select Tag to Edit</TableCell>
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
                      <IconButton size="small" style={{float: "right"}} onClick={()=>{setOpenDeleteDialog(true);}} color="error" variant="contained"><DeleteIcon/></IconButton>
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
                    <Link href={newURL} target="_blank" referrerPolicy='no'>{newURL ? "click here" : ""}</Link>
                  </TableCell>
                </TableRow>
                <TableRow hover>
                  <TableCell>JSON Data</TableCell>
                  <TableCell>
                  <AceEditor 
                    mode="json"
                    theme={theme.palette.type === "dark" ? "monokai" : "xcode"}
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
        <Button onClick={onSubmit} variant="contained" color="success">
          Submit
        </Button>
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
        variables: {operation_id: props.me?.user?.current_operation_id || 0},
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
        <DialogTitle id="form-dialog-title">Create new Tag</DialogTitle>
        <DialogContent dividers={true}>
          <TableContainer component={Paper} className="mythicElement">
            <Table size="small" style={{ "maxWidth": "100%", "overflow": "scroll"}}>
                <TableBody>
                  <TableRow hover>
                    <TableCell style={{width: "20%"}}>Select Tag Type</TableCell>
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
                      <Link href={newURL} target="_blank" referrerPolicy='no'>{newURL}</Link>
                    </TableCell>
                  </TableRow>
                  <TableRow hover>
                    <TableCell>JSON Data</TableCell>
                    <TableCell>
                    <AceEditor 
                      mode="json"
                      theme={theme.palette.type === "dark" ? "monokai" : "xcode"}
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
          <Button onClick={onSubmit} variant="contained" color="success">
            Submit
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}
export const ViewEditTags = ({target_object, target_object_id, me}) => {
  const [openTagDialog, setOpenTagDialog] = React.useState(false);
  return(
    <React.Fragment>
    <IconButton onClick={() => setOpenTagDialog(true)} size="small" style={{display: "inline-block", float: "right"}}><LocalOfferOutlinedIcon /></IconButton>
    {openTagDialog ?
      (<MythicDialog fullWidth={true} maxWidth="md" open={openTagDialog} 
        onClose={()=>{setOpenTagDialog(false);}} 
        innerDialog={<ViewEditTagsDialog me={me} target_object={target_object} target_object_id={target_object_id} onClose={()=>{setOpenTagDialog(false);}} />}
    />) : (null)}
    </React.Fragment>
  )
  
}