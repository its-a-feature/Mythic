import { toast } from 'react-toastify';

export const snackActions = {
  success(msg, options) {
    toast(msg, {position: toast.POSITION.TOP_CENTER, type: "success", ...options});
  },
  warning(msg, options) {
    toast(msg, {position: toast.POSITION.TOP_CENTER, type: "warning", ...options});
  },
  info(msg, options) {
    toast(msg, {position: toast.POSITION.TOP_CENTER, type: "info", ...options});
  },
  error(msg, options) {
    toast(msg, {position: toast.POSITION.TOP_CENTER, type: "error", ...options});
  },
  update(msg, toastID, options) {
    if(toast.isActive){
      toast.update(toastID, {...options, render: msg});
    }    
  },
  loading(msg, options) {
    toast.loading(msg,{position: toast.POSITION.TOP_CENTER, ...options})
  },
  dismiss(){
    toast.dismiss();
  },
  clearAll(){
    toast.clearWaitingQueue();
  }
}