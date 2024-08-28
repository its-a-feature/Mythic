import React  from 'react';
import { gql, useMutation, useSubscription } from '@apollo/client';
import {BrowserScriptsTable} from './BrowserScriptsTable';
import {snackActions} from '../../utilities/Snackbar';
import { Backdrop } from '@mui/material';
import {CircularProgress} from '@mui/material';


const SUB_BrowserScripts = gql`
subscription SubscribeBrowserScripts($operator_id: Int!) {
  browserscript(where: {operator_id: {_eq: $operator_id}, for_new_ui: {_eq: true}}, order_by: {payloadtype: {name: asc}}) {
    active
    author
    user_modified
    script
    payloadtype {
      name
      id
    }
    id
    creation_time
    container_version_author
    container_version
    command {
      cmd
      id
    }
  }
}
 `;

const updateBrowserScriptActive = gql`
mutation updateBrowserScriptActive($browserscript_id: Int!, $active: Boolean!) {
  update_browserscript_by_pk(pk_columns: {id: $browserscript_id}, _set: {active: $active}) {
    id
  }
}
`;
const updateBrowserScriptScript = gql`
mutation updateBrowserScriptScript($browserscript_id: Int!, $script: String!, $command_id: Int!, $payload_type_id: Int!) {
  update_browserscript_by_pk(pk_columns: {id: $browserscript_id}, _set: {script: $script, user_modified: true, command_id: $command_id, payload_type_id: $payload_type_id}) {
    id
  }
}
`;
const updateBrowserScriptRevert = gql`
mutation updateBrowserScriptRevert($browserscript_id: Int!, $script: String!) {
  update_browserscript_by_pk(pk_columns: {id: $browserscript_id}, _set: {script: $script, user_modified: false}) {
    id
  }
}
`;
const addBrowserScript = gql`
mutation insertNewBrowserScript($script: String!, $payload_type_id: Int!, $command_id: Int!, $author: String!){
  insert_browserscript_one(object: {script: $script, payload_type_id: $payload_type_id, command_id: $command_id, author: $author}){
    id
  }
}
`;


export function BrowserScripts({me}){
    const [browserScripts, setBrowserScripts] = React.useState([]);
    const mountedRef = React.useRef(true);
    const [backdropOpen, setBackdropOpen] = React.useState(true);
    useSubscription(SUB_BrowserScripts, {
      variables: {operator_id: me?.user?.id || 0}, fetchPolicy: "no-cache",
      shouldResubscribe: true,
      onSubscriptionData: ({subscriptionData}) => {
        //console.log(subscriptionData)
        if(!mountedRef.current){return}
        let scripts = [...subscriptionData.data.browserscript];
        scripts.sort((a,b) => {
          if(a.payloadtype.name === b.payloadtype.name){
            return a.command.cmd.localeCompare(b.command.cmd);
          }else{
            return 0;
          }
        } )
        setBrowserScripts(scripts);
        setBackdropOpen(false);
      }
    });
    const [toggleActive] = useMutation(updateBrowserScriptActive, {
        onCompleted: data => {
            snackActions.success("Successfully Updated!", {autoHideDuration: 1000});
        },
        onError: data => {
            console.error(data);
            snackActions.error("Failed to update status");
        }
    });
    const [updateScript] = useMutation(updateBrowserScriptScript, {
        onCompleted: data => {
            snackActions.success("Successfully Updated!", {autoHideDuration: 1000});
        },
        onError: data => {
            console.error(data);
            snackActions.error("Failed to update script");
        }
    });
    const [revertScript] = useMutation(updateBrowserScriptRevert, {
        onCompleted: data => {
            snackActions.success("Successfully Updated!", {autoHideDuration: 1000});
        },
        onError: data => {
            console.error(data);
            snackActions.error("Failed to revert script");
        }
    });
    const [createBrowserScript] = useMutation(addBrowserScript, {
      onCompleted: data => {
        snackActions.success("Successfully created new browser script!");
      },
      onError: data => {
        snackActions.error("Failed to create new script: " + data);
      }
    });
    const onToggleActive = ({browserscript_id, active}) => {
        setBackdropOpen(true);
        toggleActive({variables: {browserscript_id, active}});
    }
    const onSubmitEdit = ({browserscript_id, script, command_id, payload_type_id}) => {
        updateScript({variables: {browserscript_id, script, command_id, payload_type_id}});
    }
    const onRevert = ({browserscript_id, script}) => {
        revertScript({variables:{browserscript_id, script}});
    }
    const onSubmitCreateNewBrowserScript = ({script, payload_type_id, command_id}) => {
      createBrowserScript({variables: {author: me?.user?.username || "", script, payload_type_id, command_id}});
    }
    React.useRef( () => {
      return () => {
        mountedRef.current = false;
      }
    }, [])
    return (
    <React.Fragment>
        <Backdrop open={backdropOpen} style={{zIndex: 2, position: "absolute"}} invisible={false}>
            <CircularProgress color="inherit" />
        </Backdrop>
        <BrowserScriptsTable
            browserscripts={browserScripts} operation_id={me?.user?.current_operation_id || 0} onToggleActive={onToggleActive}
            me={me}
            onSubmitEdit={onSubmitEdit} onRevert={onRevert} onSubmitNew={onSubmitCreateNewBrowserScript}
        />

    </React.Fragment>
    );
}
