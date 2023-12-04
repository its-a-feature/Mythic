import React, { useEffect, useMemo } from 'react';
import {MythicTransferListDialog} from '../../MythicComponents/MythicTransferList';
import {MythicDialog} from '../../MythicComponents/MythicDialog';
import {
  updateDescriptionCallbackMutation,
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
import {CallbacksTabsHideMultipleDialog} from "./CallbacksTabsHideMultipleDialog";
import {CallbacksTabsTaskMultipleDialog} from "./CallbacksTabsTaskMultipleDialog";
import ip6 from 'ip6';

export const ipCompare = (a, b) => {
    let aJSON = JSON.parse(a);
    if(aJSON.length === 0){return 0}
    let bJSON = JSON.parse(b);
    if(bJSON.length === 0){return 0}
    let aPieces = aJSON[0].split("/");
    if(aPieces.length === 0){return 0}
    let bPieces = bJSON[0].split("/");
    if(bPieces.length === 0){return 0}
    // now we're only looking at the address and not the cidr notation if it exists
    let aIsIPv4 = aPieces[0].includes(".");
    let aIsIPv6 = aPieces[0].includes(":");
    let bIsIPv4 = bPieces[0].includes(".");
    let bIsIPv6 = bPieces[0].includes(":");
    if(aIsIPv4 && bIsIPv4){
        // we have two ipv4 addresses
        let aNums = aPieces[0].split(".").map( c => Number(c))
        let bNums = bPieces[0].split(".").map( c => Number(c))
        for(let i = 0; i < aNums.length; i++){
            if(aNums[i] < bNums[i]){return -1}
            else if(aNums[i] > bNums[i]){return 1}
        }
        return 0;
    } else if(aIsIPv4 && bIsIPv6) {
        return -1; // always sorting IPv4 before IPv6
    } else if(aIsIPv6 && bIsIPv4) {
        return 1; // always sorting IPv4 before IPv6
    } else if(aIsIPv6 && bIsIPv6) {
        // we have two ipv6 addresses
        let aNums = ip6.normalize(aPieces[0]).split(":").map( c => Number(c))
        let bNums = ip6.normalize(bPieces[0]).split(":").map( c => Number(c))
        for(let i = 0; i < aNums.length; i++){
            if(aNums[i] < bNums[i]){return -1}
            else if(aNums[i] > bNums[i]){return 1}
        }
        return 0;
    }
}
function CallbacksTablePreMemo(props){
    const [sortData, setSortData] = React.useState({"sortKey": null, "sortDirection": null, "sortType": null});
    const [openContextMenu, setOpenContextMenu] = React.useState(false);
    const [openAdjustColumnsDialog, setOpenAdjustColumnsDialog] = React.useState(false);
    const [openHideMultipleDialog, setOpenHideMultipleDialog] = React.useState(false);
    const [openTaskMultipleDialog, setOpenTaskMultipleDialog] = React.useState({open: false, data: {}});
    const [filterOptions, setFilterOptions] = React.useState({});
    const [selectedColumn, setSelectedColumn] = React.useState({});
    const [columnVisibility, setColumnVisibility] = React.useState({
        "visible": ["Interact", "Host", "Domain", "User", "Description", "Last Checkin", "Agent",  "IP", "PID"],
        "hidden": ["Arch", "Sleep", "Process Name", "External IP", "C2",  "OS", "Groups"]
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
          {key: "mythictree_groups", type: 'array', name: "Groups"},
          {key: "ip", type: 'ip', name: "IP", width: 150},
          {key: "external_ip",type: 'string', name: "External IP", width: 150},
          {key: "host", type: 'string', name: "Host", fillWidth: true},
          {key: "user", type: 'string', name: "User", fillWidth: true},
          {key: "domain", type: 'string', name: "Domain", fillWidth: true},
          {key: "os", type: 'string', name: "OS", width: 75},
          {key: "architecture", type: 'string', name: "Arch", width: 75},
          {key: "pid", type: 'number', name: "PID", width: 75},
          {key: "last_checkin", type: 'timestamp', name: "Last Checkin", width: 150, disableFilterMenu: true},
          {key: "description", type: 'string', name: "Description", width: 400},
          {key: "sleep", type: 'string', name: "Sleep", width: 75, disableSort: true},
          {key: "agent", type: 'string', name: "Agent", width: 100, disableSort: true},
          {key: "c2", type: 'string', name: "C2", width: 75, disableSort: true, disableFilterMenu: true},
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
                event.preventDefault();
                event.stopPropagation();
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
                event.preventDefault();
                event.stopPropagation();
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
    const updateDescriptionSubmit = React.useCallback( ({callback_display_id, description}) => {
      updateDescription({variables: {callback_display_id: callback_display_id, description}})
    }, []);
    const updateSleepInfo = React.useCallback( ({callback_display_id, sleep_info}) => {
      updateSleep({variables: {callback_display_id: callback_display_id, sleep_info}})
    }, [])
    const filterRow = (row) => {
      for(const [key,value] of Object.entries(filterOptions)){
          if(key === "agent"){
            if(!String(row.payload.payloadtype.name).toLowerCase().includes(String(value).toLowerCase())){
              return true;
            }
          }else{
            if(!String(row[key]).toLowerCase().includes(String(value).toLowerCase())){
              return true;
            }
          }
          
      }
      return false;
    }
    const sortedData = React.useMemo(() => {
      const tempData = [...props.callbacks];

      if (sortData.sortType === 'number' || sortData.sortType === 'size' || sortData.sortType === 'date') {
          tempData.sort((a, b) => (parseInt(a[sortData.sortKey]) > parseInt(b[sortData.sortKey]) ? 1 : -1));
      } else if (sortData.sortType === 'string') {
          tempData.sort((a, b) => (a[sortData.sortKey].toLowerCase() > b[sortData.sortKey].toLowerCase() ? 1 : -1));
      } else if(sortData.sortType === "ip") {
          tempData.sort((a, b) => (ipCompare(a[sortData.sortKey], b[sortData.sortKey])));
      } else if(sortData.sortType === "array"){
          tempData.sort( (a, b) => (
              a[sortData.sortKey] > b[sortData.sortKey] ? 1 : -1
          ))
      } else if(sortData.sortType === "timestamp") {
          tempData.sort((a, b) => {
              let aDate = new Date(a[sortData.sortKey]);
              let bDate = new Date(b[sortData.sortKey]);
              if(aDate.getFullYear() === 1970){
                  if(bDate.getFullYear() === 1970){
                      return 0;
                  }
                  return 1;
              } else if (bDate.getFullYear() === 1970){
                  return -1;
              }
              if(aDate > bDate){return 1}
              else if(bDate > aDate){return -1}
              return 0;
          })
      }
      if (sortData.sortDirection === 'DESC') {
          tempData.reverse();
      }
      return  tempData.reduce((prev, row) => {
            if(filterRow(row)){
                return [...prev];
            }else{
                return [...prev, columns.map( c => {
                    switch(c.name){
                        case "Interact":
                            return <CallbacksTableIDCell
                                rowData={row}
                                key={`callback${row.id}_${c.name}`}
                                onOpenTab={props.onOpenTab}
                                updateDescription={updateDescriptionSubmit}
                                setOpenHideMultipleDialog={setOpenHideMultipleDialog}
                                setOpenTaskMultipleDialog={setOpenTaskMultipleDialog}
                            />;
                        case "Groups":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`} cellData={row.mythictree_groups.join(", ")} />;
                        case "IP":
                            return <CallbacksTableIPCell key={`callback${row.id}_${c.name}`} cellData={row.ip} rowData={row} callback_id={row.id} />;
                        case "External IP":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`} cellData={row.external_ip} rowData={row} />;
                        case "Host":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`} cellData={row.host} rowData={row} />;
                        case "User":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`} cellData={row.user} rowData={row} />;
                        case "Domain":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`} cellData={row.domain} rowData={row} />;
                        case "OS":
                            return <CallbacksTableOSCell key={`callback${row.id}_${c.name}`} rowData={row} cellData={row.os} />;
                        case "Arch":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`} rowData={row} cellData={row.architecture} />;
                        case "PID":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`} cellData={row.pid} rowData={row} />;
                        case "Last Checkin":
                            return <CallbacksTableLastCheckinCell key={`callback${row.id}_${c.name}`} rowData={row} cellData={row.last_checkin} />;
                        case "Description":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`} cellData={row.description} rowData={row} />;
                        case "Sleep":
                            return <CallbacksTableSleepCell key={`callback${row.id}_${c.name}`} rowData={row} cellData={row.sleep_info} updateSleepInfo={updateSleepInfo} />;
                        case "Agent":
                            return <CallbacksTablePayloadTypeCell key={`callback${row.id}_${c.name}`} rowData={row} cellData={row.payload.payloadtype.name}/>;
                        case "C2":
                            return <CallbacksTableC2Cell key={`callback${row.id}_c2`} rowData={row} />
                        case "Process Name":
                            return <CallbacksTableStringCell key={`callback${row.id}_${c.name}`} cellData={row.process_name} rowData={row} />;
                    }
                })];
            }
        }, [])
    }, [props.callbacks, sortData, filterOptions, columnVisibility]);

    const onSubmitFilterOptions = (newFilterOptions) => {
      setFilterOptions(newFilterOptions);
    }
    const sortColumn = columns.findIndex((column) => column.key === sortData.sortKey);
    return (
        <div style={{ width: '100%', height: '100%', position: "relative" }}>
          <MythicResizableGrid
              columns={columns}
              sortIndicatorIndex={sortColumn}
              sortDirection={sortData.sortDirection}
              items={sortedData}
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
            {openHideMultipleDialog &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth="lg"
                    open={openHideMultipleDialog}
                    onClose={() => {setOpenHideMultipleDialog(false);}}
                    innerDialog={
                        <CallbacksTabsHideMultipleDialog onClose={() => {setOpenHideMultipleDialog(false);}} />
                    }
                />
            }
            {openTaskMultipleDialog.open &&
                <MythicDialog
                    fullWidth={true}
                    maxWidth="lg"
                    open={openTaskMultipleDialog.open}
                    onClose={() => {setOpenTaskMultipleDialog({open: false, data: {}});}}
                    innerDialog={
                        <CallbacksTabsTaskMultipleDialog callback={openTaskMultipleDialog.data}
                                                         onClose={() => {setOpenTaskMultipleDialog({open: false, data: {}});}}
                                                         me={props.me}/>
                    }
                />
            }
        </div>             
    )
}
export const CallbacksTable = React.memo(CallbacksTablePreMemo);

/*


                      switch(c.name){
                          case "Interact":
                            return {
                                "column": c.name,
                                "rowData": row,
                                "key": `callback${row.id}_${c.name}`,
                                "onOpenTab": props.onOpenTab,
                                "updateDescription": updateDescriptionSubmit,
                                "setOpenHideMultipleDialog": setOpenHideMultipleDialog,
                                "setOpenTaskMultipleDialog": setOpenTaskMultipleDialog,
                              }
                          case "IP":
                              return {"key": `callback${row.id}_${c.name}`,"column": c.name, "cellData": row.ip, "rowData": row, "callback_id": row.id};
                          case "External IP":
                              return {"key": `callback${row.id}_${c.name}`,"column": c.name, "cellData": row.external_ip, "rowData": row};
                          case "Host":
                              return {"key": `callback${row.id}_${c.name}`,"column": c.name, "cellData": row.host, "rowData": row};
                          case "User":
                              return {"key": `callback${row.id}_${c.name}`,"column": c.name, "cellData": row.user, "rowData": row};
                          case "Domain":
                              return {"key": `callback${row.id}_${c.name}`,"column": c.name, "cellData": row.domain, "rowData": row};
                          case "OS":
                              return {"key": `callback${row.id}_${c.name}`,"column": c.name, "rowData": row , "cellData": row.os};
                          case "Arch":
                              return {"key": `callback${row.id}_${c.name}`,"column": c.name, "rowData": row , "cellData": row.architecture};
                          case "PID":
                              return {"key": `callback${row.id}_${c.name}`,"column": c.name, "cellData": row.pid, "rowData": row};
                          case "Last Checkin":
                              return {"key": `callback${row.id}_${c.name}`,"column": c.name, "rowData": row , "cellData": row.last_checkin, "parentMountedRef": props.parentMountedRef};
                          case "Description":
                              return {"key": `callback${row.id}_${c.name}`,"column": c.name, "cellData": row.description, "rowData": row};
                          case "Sleep":
                              return {"key": `callback${row.id}_${c.name}`,"column": c.name, "rowData": row , "cellData": row.sleep_info, "updateSleepInfo": updateSleepInfo};
                          case "Agent":
                              return {"key": `callback${row.id}_${c.name}`,"column": c.name, "rowData": row , "cellData": row.payload.payloadtype.name};
                          case "C2":
                              return {"key": `callback${row.id}_c2`,"column": c.name, "rowData": row};
                          case "Process Name":
                              return {"key": `callback${row.id}_${c.name}`,"column": c.name, "cellData": row.process_name, "rowData": row};
                      }
 */