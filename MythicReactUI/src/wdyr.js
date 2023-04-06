import React from 'react';

if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    include: [new RegExp("Callbacks.*"), new RegExp("CallbacksTable.*"), new RegExp("Speed.*")]
  });
}