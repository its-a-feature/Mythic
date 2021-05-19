import { gql} from '@apollo/client';

export const sort_tableDefinition = (th, content="string") =>{
    //sort the table
    const getCellValue = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;
    let comparer;
    if(content === "string"){
        comparer = (idx, asc) => (a, b) => ((v1, v2) =>
            v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2.toString())
    )(getCellValue(asc ? a : b, idx), getCellValue(asc ? b : a, idx));
    }else if(content === "date"){
        comparer = (idx, asc) => (a, b) => ((v1, v2) =>
           new Date(v1) - new Date(v2)
    )(getCellValue(asc ? a : b, idx), getCellValue(asc ? b : a, idx));
    }else if(content === "int"){
        comparer = (idx, asc) => (a, b) => ((v1, v2) =>
            parseInt(v1) - parseInt(v2)
    )(getCellValue(asc ? a : b, idx), getCellValue(asc ? b : a, idx));
    }

    let table = th.parentElement.parentElement;
    Array.from(table.querySelectorAll('tr:nth-child(n+2)'))
        .sort(comparer(Array.from(th.parentNode.children).indexOf(th), this.asc = !this.asc))
        .forEach(tr => table.appendChild(tr));
    // deal with carets and the right directions
    let imgs_to_remove = th.parentElement.querySelectorAll("i");
    for (let i = 0; i < imgs_to_remove.length; i++) {
        imgs_to_remove[i].remove();
    }
    let el = document.createElement('i');
    if (this.asc) {
        el.setAttribute('class', 'fas fa-sort-up');
    } else {
        el.setAttribute('class', 'fas fa-sort-down');
    }
    th.appendChild(el);
}
export const scriptsQuery = gql`
query browserscriptsQuery($operator_id: Int!, $operation_id: Int!) {
  browserscript(where: {active: {_eq: true}, operator_id: {_eq: $operator_id}, for_new_ui: {_eq: true}}) {
    script
    id
    name
    command_id
    payloadtype {
        ptype
    }
  }
  browserscriptoperation(where: {operation_id: {_eq: $operation_id}, browserscript: {for_new_ui: {_eq:true}}}) {
    browserscript {
      script
      id
      name
      command_id
      payloadtype {
        ptype
      }
    }
  }
}`;
export function getBrowserScripts(data){
    const scripts = data.browserscript.reduce( (prev, scpt) => {
        if(scpt.command_id === null){
            return prev;
        }else{
            return {...prev, [scpt.command_id]: scpt.script};
        }
    }, {});
    const opscripts = data.browserscriptoperation.reduce( (prev, scpt) => {
        if(scpt.browserscript.command_id === null){
            return prev;
        }else{
            return {...prev, [scpt.browserscript.command_id]: scpt.browserscript.script};
        }
    }, {}); 
    const finalscripts = {...scripts, ...opscripts};
    let scriptstring = "browserscripts = {";
    for(const [key, value] of Object.entries(finalscripts)){
        scriptstring += key + ":" + atob(value) + ",";
    }
    scriptstring += "};";
    return scriptstring;

}
export function getSupportScripts(data){
    const support_scpts = data.browserscript.reduce( (prev, scpt) => {
        if(scpt.command_id === null){
            return {...prev, [scpt.payloadtype.ptype.toLowerCase() + "_" + scpt.name]: scpt.script};
        }else{
            return prev;
        }
    }, {});
    const support_opscripts = data.browserscriptoperation.reduce( (prev, scpt) => {
        if(scpt.browserscript.command_id === null){
            return {...prev, [scpt.browserscript.payloadtype.ptype.toLowerCase() + "_" + scpt.browserscript.name]: scpt.browserscript.script};
        }else{
            return prev;
        }
    }, {}); 
    const final_support_scripts = {...support_scpts, ...support_opscripts};
    let support_scriptstring = "support_scripts = {";
    for(const [key, value] of Object.entries(final_support_scripts)){
        support_scriptstring += key + ":" + atob(value) + ",";
    }
    support_scriptstring += "};";
    return support_scriptstring
}
