import React, {useState} from 'react';
import {useQuery, gql, useMutation} from '@apollo/client';
import LinearProgress from '@mui/material/LinearProgress';
import { snackActions } from '../../utilities/Snackbar';
import {b64DecodeUnicode} from '../Callbacks/ResponseDisplay';
import {MythicModifyStringDialog} from "../../MythicComponents/MythicDialog";

const updateDescriptionMutation = gql`
mutation updateDescription ($file_id: Int!, $filename: bytea!) {
  update_filemeta_by_pk(pk_columns: {id: $file_id}, _set: {filename: $filename}) {
    filename_text
    id
  }
}
`;
const getFilenameQuery = gql`
query getFilenameQuery ($payload_id: Int!) {
  payload_by_pk(id: $payload_id) {
    filemetum {
      filename_text
      id
    }
    id
  }
}
`;

export function PayloadFilenameDialog(props) {
    const [description, setDescription] = useState("");
    const [fileId, setFileId] = useState();
    const { loading, error } = useQuery(getFilenameQuery, {
        variables: {payload_id: props.payload_id},
        onCompleted: data => {
            setDescription(b64DecodeUnicode(data.payload_by_pk.filemetum.filename_text));
            setFileId(data.payload_by_pk.filemetum.id);
        },
        fetchPolicy: "network-only"
    });
    const [updateDescription] = useMutation(updateDescriptionMutation, {
        onCompleted: (data) => {
          snackActions.success("Updated filename");
          props.onClose();
        }
    });
    if (loading) {
     return <LinearProgress style={{marginTop: "10px"}} />;
    }
    if (error) {
     console.error(error);
     return <div>Error!</div>;
    }
    const onCommitSubmit = (newDescription) => {
        updateDescription({variables: {file_id: fileId, filename: newDescription}});

    }

  return (
    <React.Fragment>
        <MythicModifyStringDialog title={"Edit Payload Filename"}
                                  maxRows={2}
                                  onClose={props.onClose}
                                  value={description}
                                  dontCloseOnSubmit={true}
                                  onSubmit={onCommitSubmit} />
  </React.Fragment>
  );
}

