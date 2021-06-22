import React from 'react';

export const ResponseDisplayBrowserScript = (props) =>{

  return (

    <div dangerouslySetInnerHTML={{__html: props.browserScripts[props.commandID](props.task, props.data.response)}}></div>
       
  )
      
}
ResponseDisplayBrowserScript.whyDidYouRender = true;

