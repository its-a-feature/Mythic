import React, { useEffect, useMemo } from 'react';
import {MythicTransferListDialog} from '../../MythicComponents/MythicTransferList';
import {MythicDialog} from '../../MythicComponents/MythicDialog';
import {
  unlockCallbackMutation, 
  lockCallbackMutation, 
  updateDescriptionCallbackMutation, 
  updateIPsCallbackMutation,
  updateSleepInfoCallbackMutation} from './CallbackMutations';
import {snackActions} from '../../utilities/Snackbar';
import {useMutation } from '@apollo/client';
import {
  CallbacksTableIDCell,
  CallbacksTableStringCell,
  CallbacksTableLastCheckinCell,
  CallbacksTablePayloadTypeCell,
  CallbacksTableC2Cell,
  CallbacksTableOSCell,
  CallbacksTableSleepCell,
  CallbacksTableIPCell
} from './CallbacksTableRow';
import MythicResizableGrid from '../../MythicComponents/MythicResizableGrid';
import {TableFilterDialog} from './TableFilterDialog';

function CallbacksTablePreMemo(props){
    
    const [allData, setAllData] = React.useState([]);
    const [sortData, setSortData] = React.useState({"sortKey": null, "sortDirection": null, "sortType": null});
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const [openAdjustColumnsDialog, setOpenAdjustColumnsDialog] = React.useState(false);
    const [filterOptions, setFilterOptions] = React.useState({});
    const [selectedColumn, setSelectedColumn] = React.useState({});
    const [columnVisibility, setColumnVisibility] = React.useState({
        "visible": ["Interact", "Host", "Domain", "User", "Description", "Last Checkin", "Agent", "C2", "IP", "OS"],
        "hidden": ["Arch", "PID", "Sleep", "Process Name", "External IP"]
    });
    const [lockCallback] = useMutation(lockCallbackMutation, {
      update: (cache, {data}) => {
        if(data.updateCallback.status === "success"){
            snackActions.success("Locked callback");
        }else{
            snackActions.warning(data.updateCallback.error);
        }
        
    },
    onError: data => {
        console.log(data);
        snackActions.warning(data);
    }
    });
    const [unlockCallback] = useMutation(unlockCallbackMutation, {
      update: (cache, {data}) => {
        if(data.updateCallback.status === "success"){
            snackActions.success("Unlocked callback");
        }else{
            snackActions.warning(data.updateCallback.error);
        }
        
    },
    onError: data => {
        console.log(data);
        snackActions.warning(data);
    }
    });
    const [updateDescription] = useMutation(updateDescriptionCallbackMutation, {
      update: (cache, {data}) => {
        if(data.updateCallback.status === "success"){
            snackActions.success("Updated Callback");
        }else{
            snackActions.warning(data.updateCallback.error);
        }
        
      },
      onError: data => {
          console.log(data);
          snackActions.warning(data);
      }
    });
    const [updateSleep] = useMutation(updateSleepInfoCallbackMutation, {
      update: (cache, {data}) => {
        snackActions.success("Updated Callback");
        
      },
      onError: data => {
          console.log(data);
          snackActions.warning(data);
      }
    });
    const [updateIPs] = useMutation(updateIPsCallbackMutation, {
      update: (cache, {data}) => {
        if(data.updateCallback.status === "success"){
          snackActions.success("Updated Callback");
        } else {
          snackActions.warning(data.updateCallback.error);
        }
        
      },
      onError: data => {
        console.log(data)
        snackActions.warning(data);
      }
    })
    const onSubmitAdjustColumns = ({left, right}) => {
      setColumnVisibility({visible: right, hidden: left});
      localStorage.setItem("callbacks_table_columns", JSON.stringify(right));
    }
    React.useEffect( () => {
      // on startup, want to see if `callbacks_table_columns` exists in storage and load it if possible
      try {
        const storageItem = localStorage.getItem("callbacks_table_columns");
        if(storageItem !== null){
          let loadedColumnNames = JSON.parse(storageItem);
          let allColumns = [...columnVisibility["visible"].map(c => c), ...columnVisibility["hidden"].map(c => c)];
          let newHidden = [];
          allColumns.forEach((v,i,a) => {
            if(!loadedColumnNames.includes(v)){
              newHidden.push(v);
            }
          })
          setColumnVisibility({visible: loadedColumnNames, hidden: newHidden});
        }
      }catch(error){
        console.log("Failed to load callbacks_table_columns", error);
      }
    }, [])
    const columns = useMemo( 
      () => 
        [
          {key: "id", type: 'number', name: "Interact", width: 150},
          {key: "ip", type: 'string', name: "IP", width: 150},
          {key: "external_ip",type: 'string', name: "External IP", width: 150},
          {key: "host", type: 'string', name: "Host", fillWidth: true},
          {key: "user", type: 'string', name: "User", fillWidth: true},
          {key: "domain", type: 'string', name: "Domain", fillWidth: true},
          {key: "os", type: 'string', name: "OS", width: 75},
          {key: "architecture", type: 'string', name: "Arch", width: 75},
          {key: "pid", type: 'number', name: "PID", width: 75},
          {key: "last_checkin", type: 'string', name: "Last Checkin", width: 150, disableSort: true},
          {key: "description", type: 'string', name: "Description", width: 400},
          {key: "sleep", type: 'string', name: "Sleep", width: 75, disableSort: true},
          {key: "agent", type: 'string', name: "Agent", width: 100, disableSort: true},
          {key: "c2", type: 'string', name: "C2", width: 75, disableSort: true},
          {key: "process_name", type: 'string', name: "Process Name", fillWidth: true},
          
        ].reduce( (prev, cur) => {
          if(columnVisibility.visible.includes(cur.name) || cur.name === "Interact"){
            if(filterOptions[cur.key] && String(filterOptions[cur.key]).length > 0){
                return [...prev, {...cur, filtered: true}];
            }else{
                return [...prev, {...cur}];
            }
          }else{
              return [...prev];
          }
        }, [])
      , [filterOptions, columnVisibility]
    );
    const onClickHeader = (e, columnIndex) => {
      const column = columns[columnIndex];
      if(column.disableSort){
          return;
      }
      if (!column.key) {
          setSortData({"sortKey": null, "sortType":null, "sortDirection": "ASC"});
      }
      if (sortData.sortKey === column.key) {
          if (sortData.sortDirection === 'ASC') {
              setSortData({...sortData, "sortDirection": "DESC"});
          } else {
              setSortData({"sortKey": null, "sortType":null, "sortDirection": "ASC"});
          }
      } else {
          setSortData({"sortKey": column.key, "sortType":column.type, "sortDirection": "ASC"});
      }
    };
    const onRowDoubleClick = React.useCallback( () => {

    }, []);
    const contextMenuOptions = [
        {
            name: 'Filter Column', 
            click: ({event, columnIndex}) => {
                if(columns[columnIndex].disableFilterMenu){
                    snackActions.warning("Can't filter that column");
                    return;
                }
                setSelectedColumn(columns[columnIndex]);
                setOpenContextMenu(true);
            }
        },
        {
            name: "Show/Hide Columns",
            click: ({event, columnIndex}) => {
                if(columns[columnIndex].disableFilterMenu){
                    snackActions.warning("Can't filter that column");
                    return;
                }
                setOpenAdjustColumnsDialog(true);
            }
        }
    ];
    useEffect( () => {
      let localSettings = localStorage.getItem("callbacks_table_columns");
      if(localSettings !== null){
      }
    }, [columns]);
    const toggleLock = React.useCallback( ({callback_display_id, locked}) => {
      if(locked){
        unlockCallback({variables: {callback_display_id: callback_display_id}})
      }else{
        lockCallback({variables: {callback_display_id: callback_display_id}})
      }
    }, []);
    const updateDescriptionSubmit = React.useCallback( ({callback_display_id, description}) => {
      updateDescription({variables: {callback_display_id: callback_display_id, description}})
    }, []);
    const updateSleepInfo = React.useCallback( ({callback_display_id, sleep_info}) => {
      updateSleep({variables: {callback_display_id: callback_display_id, sleep_info}})
    }, [])
    const updateIPsInfo = React.useCallback( ({callback_display_id, ips}) => {
      updateIPs({variables: {callback_display_id: callback_display_id, ips}})
    })
    const filterRow = (row) => {
      for(const [key,value] of Object.entries(filterOptions)){
          if(key === "agent"){
            if(!String(row.payload.payloadtype.name).toLowerCase().includes(value)){
              return true;
            }
          }else{
            if(!String(row[key]).toLowerCase().includes(value)){
              return true;
            }
          }
          
      }
      return false;
    }
    const sortedData = React.useMemo(() => {
      if (sortData.sortKey === null || sortData.sortType === null) {
          return allData;
      }
      const tempData = [...allData];

      if (sortData.sortType === 'number' || sortData.sortType === 'size' || sortData.sortType === 'date') {
          tempData.sort((a, b) => (parseInt(a[sortData.sortKey]) > parseInt(b[sortData.sortKey]) ? 1 : -1));
      } else if (sortData.sortType === 'string') {
        tempData.sort((a, b) => (a[sortData.sortKey].toLowerCase() > b[sortData.sortKey].toLowerCase() ? 1 : -1));
      }
      if (sortData.sortDirection === 'DESC') {
          tempData.reverse();
      }
      return tempData;
    }, [allData, sortData]);
    const gridData = React.useMemo(
      () =>
          sortedData.reduce((prev, row) => { 
              if(filterRow(row)){
                  return [...prev];
              }else{
                  return [...prev, columns.map( c => {
                      switch(c.name){
                          case "Interact":
                              return <CallbacksTableIDCell 
                                rowData={row} 
                                onOpenTab={props.onOpenTab} 
                                toggleLock={toggleLock}
                                updateDescription={updateDescriptionSubmit}
                                />;
                          case "IP":
                              return <CallbacksTableIPCell cellData={row.ip} rowData={row} callback_id={row.id} updateIPs={updateIPsInfo} />;
                          case "External IP":
                            return <CallbacksTableStringCell cellData={row.external_ip} rowData={row} />;
                          case "Host":
                              return <CallbacksTableStringCell cellData={row.host} rowData={row} />;
                          case "User":
                              return <CallbacksTableStringCell cellData={row.user} rowData={row} />;
                          case "Domain":
                              return <CallbacksTableStringCell cellData={row.domain} rowData={row} />;
                          case "OS":
                              return <CallbacksTableOSCell rowData={row} cellData={row.os} />;
                          case "Arch":
                              return <CallbacksTableStringCell rowData={row} cellData={row.architecture} />;
                          case "PID":
                            return <CallbacksTableStringCell cellData={row.pid} rowData={row} />;
                          case "Last Checkin":
                            return <CallbacksTableLastCheckinCell rowData={row} cellData={row.last_checkin} parentMountedRef={props.parentMountedRef}/>;
                          case "Description":
                            return <CallbacksTableStringCell cellData={row.description} rowData={row} />;
                          case "Sleep":
                            return <CallbacksTableSleepCell rowData={row} cellData={row.sleep_info} updateSleepInfo={updateSleepInfo} />;
                          case "Agent":
                            return <CallbacksTablePayloadTypeCell rowData={row} cellData={row.payload.payloadtype.name}/>;
                          case "C2":
                            return <CallbacksTableC2Cell rowData={row} initialCallbackGraphEdges={props.callbackgraphedges} />;
                          case "Process Name":
                            return <CallbacksTableStringCell cellData={row.process_name} rowData={row} />;
                      }
                  })];
              }
          }, []),
      [sortedData, props.onTaskRowAction, filterOptions, columnVisibility, props.callbackgraphedges, props.onOpenTab, toggleLock]
    );
    const onSubmitFilterOptions = (newFilterOptions) => {
      setFilterOptions(newFilterOptions);
    }
    const sortColumn = columns.findIndex((column) => column.key === sortData.sortKey);
    React.useEffect( () => {
      setAllData([...props.callbacks]);
    }, [props.callbacks]);
    return (
        <div style={{ width: '100%', height: '100%' }}>
          <MythicResizableGrid
              columns={columns}
              sortIndicatorIndex={sortColumn}
              sortDirection={sortData.sortDirection}
              items={gridData}
              rowHeight={40}
              onClickHeader={onClickHeader}
              onDoubleClickRow={onRowDoubleClick}
              contextMenuOptions={contextMenuOptions}
          />
          {openContextMenu &&
              <MythicDialog fullWidth={true} maxWidth="xs" open={openContextMenu} 
                  onClose={()=>{setOpenContextMenu(false);}} 
                  innerDialog={<TableFilterDialog 
                      selectedColumn={selectedColumn} 
                      filterOptions={filterOptions} 
                      onSubmit={onSubmitFilterOptions} 
                      onClose={()=>{setOpenContextMenu(false);}} />}
              />
          }
          {openAdjustColumnsDialog &&
              <MythicDialog fullWidth={true} maxWidth="md" open={openAdjustColumnsDialog} 
                onClose={()=>{setOpenAdjustColumnsDialog(false);}} 
                innerDialog={
                  <MythicTransferListDialog onClose={()=>{setOpenAdjustColumnsDialog(false);}} 
                    onSubmit={onSubmitAdjustColumns} right={columnVisibility.visible} rightTitle="Show these columns"
                    leftTitle={"Hidden Columns"} left={columnVisibility.hidden} dialogTitle={"Edit which columns are shown"}/>}
              />
          }       
        </div>             
    )
}
export const CallbacksTable = React.memo(CallbacksTablePreMemo);