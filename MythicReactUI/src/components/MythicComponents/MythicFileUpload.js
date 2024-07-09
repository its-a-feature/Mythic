import {snackActions} from '../utilities/Snackbar';

export const UploadTaskFile = async (file, comment) => {
  let formData = new FormData();
  try{
    formData.append("file", file);
    formData.append("comment", comment);
    snackActions.info("Uploading " + file.name + " to Mythic...", {autoHideDuration: 1000});
  }catch(error){
    console.log(error)
    return null;
  }
  try{
    const upload_response = await fetch('/api/v1.4/task_upload_file_webhook', {
      method: 'POST',
      body: formData,
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
        MythicSource: "web",
      }
    });
    try{
      const upload_result = upload_response.json().then(data => {
          return data?.agent_file_id || data?.error || null;
        }).catch(error => {
          snackActions.warning("Error: " + upload_response.statusText + "\nError Code: " + upload_response.status);
          console.log("Error trying to get json response", error.toString());
          return null;
        });
        return upload_result;
    }catch(error){
      snackActions.error(error.toString());
      return null;
    }
  }catch(error){
      snackActions.error(error.toString());
      return null;
  }
}
export const UploadEventFile = async (file, comment) => {
  let formData = new FormData();
  formData.append("file", file);
  formData.append("comment", comment);
  snackActions.info("Uploading " + file.name + " to Mythic...", {autoHideDuration: 1000});
  try{
    const upload_response = await fetch('/api/v1.4/eventing_import_webhook', {
      method: 'POST',
      body: formData,
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("access_token")}`
      }
    });
    try{
      return upload_response.json().then(data => {
        //console.log(data);
        return data;
      }).catch(error => {
        console.log(upload_response);
        snackActions.warning("Error: " + upload_response.statusText + "\nError Code: " + upload_response.status);
        console.log("Error trying to get json response", error.toString());
        return null;
      });
    }catch(error){
      snackActions.error(error.toString());
      return null;
    }
  }catch(error){
    snackActions.error(error.toString());
    return null;
  }
}
export const UploadEventGroupFile = async (file, eventgroup_id) => {
  let formData = new FormData();
  formData.append("eventgroup_id", eventgroup_id);
  formData.append("file", file);
  snackActions.info("Uploading " + file.name + " to Mythic...", {autoHideDuration: 1000});
  try{
    const upload_response = await fetch('/api/v1.4/eventing_register_file_webhook', {
      method: 'POST',
      body: formData,
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("access_token")}`
      }
    });
    try{
      return upload_response.json().then(data => {
        //console.log(data);
        return data;
      }).catch(error => {
        console.log(upload_response);
        snackActions.warning("Error: " + upload_response.statusText + "\nError Code: " + upload_response.status);
        console.log("Error trying to get json response", error.toString());
        return null;
      });
    }catch(error){
      snackActions.error(error.toString());
      return null;
    }
  }catch(error){
    snackActions.error(error.toString());
    return null;
  }
}