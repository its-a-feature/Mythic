import React from 'react';
import { TagtypesTable } from './TagtypesTable';
import {useMutation, gql, useQuery} from '@apollo/client';
import { snackActions } from '../../utilities/Snackbar';
const tagtypeFragment = gql`
fragment tagtypeData on tagtype {
  id
  color
  description
  name
  tags_aggregate {
    aggregate {
      count
    }
  }
}
`;
const tagQuery = gql`
${tagtypeFragment}
query getOperationTags {
  tagtype(order_by: {name: asc}) {
    ...tagtypeData
  }
}
`;
const tagtypeDelete = gql`
mutation tagtypeDeleteMutation($id: Int!) {
  deleteTagtype(id: $id) {
      status
      error
      tagtype_id
  }
}
`;

export function Tags(props){
    const [tagtypes, setTagtypes] = React.useState([]);
    const mountedRef = React.useRef(true);
    useQuery(tagQuery, {
      fetchPolicy: "no-cache",
      onCompleted: data => {
        if(!mountedRef.current){
          return  null;
        }
        setTagtypes(data.tagtype);
      },
      onError: (data) => {
        snackActions.warning("Failed to get tag types");
        console.log(data);
      }
      });
    const [deleteTagtype] = useMutation(tagtypeDelete, {
        onCompleted: (data) => {
          if(data.deleteTagtype.status === "success"){
            const newtagtypes = tagtypes.filter( c => c.id !== data.deleteTagtype.tagtype_id);
            setTagtypes(newtagtypes);
            snackActions.success("Successfully deleted tagtype and all associated tags");
          } else {
            snackActions.error(data.deleteTagtype.error);
          }
          
        },
        onError: (data) => {
          snackActions.warning("Failed to delete payload");
          console.log(data);
        }
    });
    const onDeleteTagtype = (id) => {
        deleteTagtype({variables: {id}});
    }
    const onNewTag = ({name, description, id, color}) => {
      const newTagTypes = [...tagtypes, {name, description, id, color, tags_aggregate: {aggregate: {count: 0}}}];
      setTagtypes(newTagTypes);
    }
    const onUpdateTagtype = ({name, description, id, color}) => {
      const newTagTypes = tagtypes.map(c => {
        if(c.id === id){
          return {...c, name, description, id, color};
        } else {
          return c;
        }
      });
      setTagtypes(newTagTypes);
    }
    React.useEffect( () => {
      return() => {
        mountedRef.current = false;
      }
       // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return (
      <div style={{display: "flex", height: "100%", flexDirection: "column"}}>
        <TagtypesTable onDeleteTagtype={onDeleteTagtype}  tagtypes={tagtypes} onNewTag={onNewTag} onUpdateTagtype={onUpdateTagtype} me={props.me}/>
      </div>
    );
} 
