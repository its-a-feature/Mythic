import { toast } from 'react-toastify';

export const snackActions = {
  success(msg, options) {
    toast.success(msg, {position: toast.POSITION.TOP_CENTER, ...options});
  },
  warning(msg, options) {
    toast.warn(msg, {position: toast.POSITION.TOP_CENTER, ...options});
  },
  info(msg, options) {
    toast.info(msg, {position: toast.POSITION.TOP_CENTER, ...options});
  },
  error(msg, options) {
    toast.error(msg, {position: toast.POSITION.TOP_CENTER, ...options});
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
}