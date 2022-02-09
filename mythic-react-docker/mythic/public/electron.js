const electron = require("electron");
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const path = require("path");
const isDev = require("electron-is-dev");
let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({ 
    width: 900, 
    height: 680,
    titleBarStyle: "hidden"
  });
  console.log(`file://${path.join(__dirname, "index.html")}`)
  mainWindow.loadURL(
    isDev ? "https://192.168.53.139:7443" : `file://${path.join(__dirname, "index.html")}`
  );
  mainWindow.on("closed", () => (mainWindow = null));
}
app.commandLine.appendSwitch('ignore-certificate-errors')
app.on("ready", createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});