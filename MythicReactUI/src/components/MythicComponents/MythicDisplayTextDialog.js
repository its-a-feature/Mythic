import React from 'react';
import {MythicDialog, MythicModifyStringDialog} from './MythicDialog';

export function MythicDisplayTextDialog(props) {
  return (
    <MythicDialog fullWidth={props.fullWidth === null ? false : props.fullWidth}
                  maxWidth={props.maxWidth === null ? "sm" : props.maxWidth}
                  open={props.open}
                  onClose={()=>{props.onClose()}} innerDialog={
            <MythicModifyStringDialog title={props.title}
                                      onClose={props.onClose}
                                      value={props.value}
                                      maxRows={20} />
  } />
  );
}
