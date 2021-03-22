import React, {useEffect} from 'react';

export const ResponseDisplayBrowserScript = (props) =>{
    const [tables, setTables] = React.useState([]);
    const [collapse, setCollapse] = React.useState([]);
    useEffect( () => {
        let design = props.browserScripts[props.commandID](props.task, props.data.response);
        
    }, [props.task, props.data.response]);
  return (

    <div dangerouslySetInnerHTML={{__html: props.browserScripts[props.commandID](props.task, props.data.response)}}></div>
       
  )
      
}
ResponseDisplayBrowserScript.whyDidYouRender = true;

