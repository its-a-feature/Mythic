import React from 'react';
import {Alert, CircularProgress, DialogContent} from '@mui/material';
import {MythicDraggableDialogTitle} from '../../MythicComponents/MythicDraggableDialogTitle';
import {
  MythicDialogButton,
  MythicDialogFooter,
} from '../../MythicComponents/MythicDialogLayout';
import {ResponseDisplayPlaintext} from './ResponseDisplayPlaintext';
import {getTextSyntaxForFilename} from './ResponseDisplayMedia';

export const FileEditorStagedPreview = ({
  preview,
  saving,
  taskReadOnly,
  onClose,
  onForceOverwrite,
}) => {
  return (
    <>
      <MythicDraggableDialogTitle>
        Review staged edit{preview.filename ? ` · ${preview.filename}` : ''}
      </MythicDraggableDialogTitle>
      <DialogContent dividers style={{
        display: 'flex',
        flexDirection: 'column',
        height: '70vh',
        minHeight: 320,
        padding: 0,
      }}>
        {preview.loading ?
          <div style={{
            alignItems: 'center',
            display: 'flex',
            flex: '1 1 auto',
            flexDirection: 'column',
            gap: 12,
            justifyContent: 'center',
          }}>
            <CircularProgress size={28} />
            <span>Loading the staged edit from Mythic…</span>
          </div> :
          <>
            {preview.description &&
              <Alert severity="info" style={{borderRadius: 0, flex: '0 0 auto'}}>
                {preview.description}
              </Alert>
            }
            {preview.error ?
              <Alert severity="error" style={{borderRadius: 0}}>
                {preview.error}
              </Alert> :
              <div style={{display: 'flex', flex: '1 1 auto', minHeight: 0}}>
                <ResponseDisplayPlaintext
                  plaintext={preview.content}
                  expand
                  initial_mode={getTextSyntaxForFilename(preview.filename)}
                  autoFormat={false}
                  readOnly
                  toolbarTitle="Contents to overwrite with"
                  initial_show_options
                  enableCredentialCreation={false}
                />
              </div>
            }
          </>
        }
      </DialogContent>
      <MythicDialogFooter>
        <MythicDialogButton onClick={onClose}>
          Close
        </MythicDialogButton>
        <MythicDialogButton
          disabled={preview.loading || Boolean(preview.error) || saving || taskReadOnly}
          intent="success"
          onClick={onForceOverwrite}>
          Save anyway
        </MythicDialogButton>
      </MythicDialogFooter>
    </>
  );
};
