import React from 'react';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import { makeStyles } from '@material-ui/core/styles';
import {SearchTabTasksLabel, SearchTabTasksPanel} from './SearchTabTasks';
import {SearchTabFilesLabel, SearchTabFilesPanel} from './SearchTabFiles';

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    backgroundColor: theme.palette.background.paper,
  },
}));

export function Search(props){
  const classes = useStyles();
  const [value, setValue] = React.useState(0);
  const handleChange = (event, newValue) => {
      setValue(newValue);
  };
  const tabTypes = ["Tasks", "Files", "Callbacks", "Artifacts"]
return (
  <div className={classes.root} style={{height: "calc(95vh)"}}>
      <AppBar position="static" color="default">
        <Tabs 
          value={value}
          onChange={handleChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          aria-label="scrollable auto tabs example"
        >
        {
            tabTypes.map( (tab, index) => {
              switch (tab){
                case "Tasks":
                  return <SearchTabTasksLabel key={"taskstab"} />;
                case "Files":
                  return <SearchTabFilesLabel key={"filestab"} />;
                default:
                  return (null);
              }
            })
        }
        </Tabs>
      </AppBar>
      {
        tabTypes.map( (tab, index) => {
          switch(tab){
              case "Tasks":
                return <SearchTabTasksPanel key={"taskspanel"} value={value} index={index}/>
              case "Files":
                return <SearchTabFilesPanel key={"filespanel"} value={value} index={index}/>
              default:
                return (null);
          }
        })
      }
  </div>
)
} 
