import React, {useEffect} from 'react';
import Button from '@material-ui/core/Button';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import {muiTheme} from '../../../themes/Themes';
import AceEditor from 'react-ace';
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-github";

export function EditScriptDialog(props) {
    const [script, setScript] = React.useState("");
    const handleSubmit = () => {
    
    }
    useEffect( () => {
        setScript(atob(props.script));
    }, []);
    const onChange = (value) => {
        setScript(value);
    }
    const onSubmit = () => {
        props.onSubmitEdit(btoa(script));
        props.onClose();
    }
    const onRevert = () => {
        props.onRevert();
        props.onClose();
    }
  return (
    <React.Fragment>
        <DialogTitle >Edit BrowserScript Code</DialogTitle>
        <DialogContent dividers={true}>
           <AceEditor
                mode="javascript"
                theme="github"
                width="100%"
                value={script} 
                focus={true}
                onChange={onChange}
                setOptions={{
                
                }}
            />
        </DialogContent>
        <DialogActions>
          <Button onClick={onRevert} style={{color: muiTheme.palette.success.main}}>
            Revert
          </Button>
          <Button onClick={props.onClose} style={{color: muiTheme.palette.primary.main}}>
            Close
          </Button>
          <Button onClick={onSubmit} style={{color: muiTheme.palette.warning.main}}>
            Save
          </Button>
        </DialogActions>
  </React.Fragment>
  );
}

