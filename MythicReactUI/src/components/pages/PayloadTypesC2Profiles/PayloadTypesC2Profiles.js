import React from 'react';
import {PayloadTypeContainerDisplay} from './PayloadTypeContainerDisplay';
import {C2ProfileContainerDisplay} from './C2ProfileContainerDisplay';
import {TranslationContainerDisplay} from './TranslationContainerDisplay';
import Grid from '@mui/material/Grid';

export function PayloadTypesC2Profiles(props){

    return (
      <React.Fragment>
        <Grid container spacing={0}>
          <Grid item xs={6}>
          <PayloadTypeContainerDisplay me={props.me} />
          </Grid>
          <Grid item xs={6}>
          <C2ProfileContainerDisplay me={props.me} />
          </Grid>
          <Grid item xs={12}>
          <TranslationContainerDisplay me={props.me} />
          </Grid>
        </Grid>
      </React.Fragment>
    );
}
