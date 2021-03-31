/** @jsxImportSource @welldone-software/why-did-you-render */
import React from 'react';
const whyDidYouRender = require('@welldone-software/why-did-you-render');
whyDidYouRender(React, {
trackAllPureComponents: true,
trackHooks: true,
logOnDifferentValues: true,
include: [/^EventFeed/]
});
