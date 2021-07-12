import { useSnackbar } from 'notistack'

let useSnackbarRef = null;

export const SnackbarUtilsConfigurator = () => {
  useSnackbarRef = useSnackbar();

  return null;
};

export const snackActions = {
  success(msg, options) {
    this.toast(msg, 'success', options)
  },
  warning(msg, options) {
    this.toast(msg, 'warning', options)
  },
  info(msg, options) {
    this.toast(msg, 'info', options)
  },
  error(msg, options) {
    this.toast(msg, 'error', options)
  },
  dismiss(){
    useSnackbarRef.closeSnackbar();
  },
  toast(msg, variant = 'default', options) {
    useSnackbarRef.enqueueSnackbar(msg, { variant, ...options })
  }
}
