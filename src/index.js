const { app, BrowserWindow, ipcMain, Notification, Tray, nativeImage, Menu } = require('electron');
const path = require('path');
let tray;
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    fullscreenable: true,
    resizable: true,
    minimizable: true,
    icon: path.join(__dirname, 'assets/img/favicon.ico'),
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  ipcMain.handle('minimize', (evt, arg) => {
    mainWindow.minimize();
  })

  ipcMain.handle('maxOrUnmax', (evt, arg) => {
    if (BrowserWindow.getFocusedWindow().isMaximized()) {
      ipcMain.emit('maxOrUnmax', 'unmaximize');
      mainWindow.unmaximize();
    } else {
      ipcMain.emit('maxOrUnmax', 'maximize');
      mainWindow.maximize();
    }
  })



  
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets/img/favicon.ico'));
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
 
  
  tray.on('click', e => {
    mainWindow.show();
  })
  

  const contextMenu = Menu.buildFromTemplate([
    { label: app.name, type: 'normal', enabled: false, icon: icon.resize({ width: 16, height: 16 }) },
    { label: '', type: 'separator', enabled: false },
    { label: 'Iniciar', type: 'normal', 
      click() {
        mainWindow.webContents.send('start');
      } 
    },
    { label: 'Resumir', type: 'normal', visible: false,
      click() {
        mainWindow.webContents.send('start');
      } 
    },
    { label: 'Pausar', type: 'normal',  visible: false,
    click() {
      mainWindow.webContents.send('pause');
      } 
    },
    { label: 'Parar', type: 'normal', visible: false,  
      click() {
        mainWindow.webContents.send('stop');
      } 
    },
    { label: '', type: 'separator', visible: false },
    { label: 'Minimizar bandeja', type: 'normal', icon: nativeImage.createFromPath(path.join(__dirname, 'assets/icons/min-w-30.png')).resize({ width: 8, height: 8 }),
      click() {
        mainWindow.hide();
      }
    },
    { label: 'Maximizar', type: 'normal', visible: false, icon: nativeImage.createFromPath(path.join(__dirname, 'assets/icons/max-w-30.png')).resize({ width: 8, height: 8 }),
    click() {
      mainWindow.show();
    }
    },
    { label: 'Fechar', type: 'normal', icon: nativeImage.createFromPath(path.join(__dirname, 'assets/icons/close-w-30.png')).resize({ width: 8, height: 8 }),
      click() {
        app.quit();
      } 
    }
  ])
  

  tray.setContextMenu(contextMenu);
  
  ipcMain.handle('stateChange', (e, state) => {
    switch(state){
      case 'TIMING':
        contextMenu.items[2].visible = false;
        contextMenu.items[3].visible = false;
        contextMenu.items[4].visible = true;
        contextMenu.items[5].visible = true;
        break;
        case 'PAUSED':
          contextMenu.items[2].visible = false;
          contextMenu.items[3].visible = true;
          contextMenu.items[4].visible = false;
          contextMenu.items[5].visible = true;
        break;
        case 'FINISHED':
          contextMenu.items[2].label = 'Iniciar';
          contextMenu.items[2].visible = true;
          contextMenu.items[3].visible = false;
          contextMenu.items[4].visible = false;
          contextMenu.items[5].visible = false;
          break;
        }
      })
      
      
      ipcMain.handle('close', () => {
        mainWindow.hide();
      });

      mainWindow.on('hide', e => {
        tray.displayBalloon({
          title: app.name,
          content: 'Estou aberto em modo bandeija',
          respectQuietTime: true,
        });
        setTimeout(() => {
          tray.removeBalloon();
        }, 10 * 1000);

        contextMenu.items[8].visible = true;
        contextMenu.items[7].visible = false;
      });

      mainWindow.on('show', e => {
        contextMenu.items[7].visible = true;
        contextMenu.items[8].visible = false;
      });
      
      tray.setTitle(app.name);
      tray.setToolTip(app.name);
      
      // Open the DevTools.
      // mainWindow.webContents.openDevTools();
    };
    
    
    
    ipcMain.handle('notification', (e, data) => {
      const notification = new Notification({
        title: data.title,
        body: data.body,
        closeButtonText:'OK',
        timeoutType: 'default',
        icon: path.join(__dirname, 'assets/img/favicon.ico')
      });
      notification.show();
    });



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);




// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.setAppUserModelId(app.name);
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});



// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
