import React from 'react';
import Dialog from '@material-ui/core/Dialog';

export function MythicDialog(props) {
  const descriptionElementRef = React.useRef(null);
  React.useEffect(() => {
    if (props.open) {
      const { current: descriptionElement } = descriptionElementRef;
      if (descriptionElement !== null) {
        descriptionElement.focus();
      }
    }
  }, [props.open]);

  return (
      <Dialog
        open={props.open}
        onClose={props.onClose}
        scroll="paper"
        maxWidth={props.maxWidth}
        fullWidth={props.fullWidth}
        aria-labelledby="scroll-dialog-title"
        aria-describedby="scroll-dialog-description"
      >
        {props.innerDialog}
      </Dialog>
  );
}
