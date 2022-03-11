const { app, BrowserWindow, ipcMain, Notification, Tray, nativeImage, Menu, autoUpdater  } = require('electron');
const path = require('path');
const log = require('electron-log');
const isDev = require('electron-is-dev');

const server = 'https://update.electronjs.org'
const feed = `${server}/marcoantonio0/My-Pomodoro/${process.platform}/${app.getVersion()}/RELEASES`

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

log.info('App starting...');
autoUpdater.setFeedURL(feed);


let tray;
let win;

  // Handle creating/removing shortcuts on Windows when installing/uninstalling.
  if (require('electron-squirrel-startup')) {
    // eslint-disable-line global-require
    app.quit();
  }

  const gotTheLock = app.requestSingleInstanceLock()
    
  if (!gotTheLock) {
    app.quit()
  } else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      if (win) {
        win.show();
      }
    })
      
    app.on('ready', () => {
      createWindow();
    
      win.webContents.on('did-finish-load', () => {
        win.webContents.send('version', app.getVersion())
      })
    
    });
  }


  const createWindow = () => {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    visualEffectState: "active",
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
  win.loadFile(path.join(__dirname, 'index.html'));

  win.once('ready-to-show', () => {
    
    if(!isDev){
      autoUpdater.checkForUpdates();
  
      setInterval(() => {
        autoUpdater.checkForUpdates();
      }, 10 * 60 * 1000);
    }
  
    autoUpdater.on('checking-for-update', (e) => {
      win.webContents.send('checking-for-update');
    })
  
    autoUpdater.on('update-available', (e) => {
      win.webContents.send('update-available');
    })
  
    autoUpdater.on('update-not-available', (e) => {
      win.webContents.send('update-not-available');
    })
  
    ipcMain.handle('quitAndInstall', () => {
      autoUpdater.quitAndInstall();
    })
    
    
    autoUpdater.on('update-downloaded', (info) => {
      win.webContents.send('update-downloaded');
    })
  
    autoUpdater.on('error', e => {
      win.webContents.send('error');
    })
  })

  ipcMain.handle('minimize', (evt, arg) => {
    win.minimize();
  })

  ipcMain.handle('maxOrUnmax', (evt, arg) => {
    if (BrowserWindow.getFocusedWindow().isMaximized()) {
      win.webContents.send('minOrmax', 'unmaximize');
      win.unmaximize();
    } else {
      win.webContents.send('minOrmax', 'maximize');
      win.maximize();
    }
  })

  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets/img/favicon.ico'));
  tray = new Tray(icon.resize({ width: 16, height: 16 }))


  tray.on('click', e => {
    win.show();
  })


  const contextMenu = Menu.buildFromTemplate([
    { label: app.name, type: 'normal', enabled: false, icon: icon.resize({ width: 16, height: 16 }) },
    { label: '', type: 'separator', enabled: false },
    { label: 'Iniciar', type: 'normal', 
      click() {
        win.webContents.send('start');
      } 
    },
    { label: 'Resumir', type: 'normal', visible: false,
      click() {
        win.webContents.send('start');
      } 
    },
    { label: 'Pausar', type: 'normal',  visible: false,
    click() {
      win.webContents.send('pause');
      } 
    },
    { label: 'Parar', type: 'normal', visible: false,  
      click() {
        win.webContents.send('stop');
      } 
    },
    { label: '', type: 'separator', visible: false },
    { label: 'Minimizar bandeja', type: 'normal', icon: nativeImage.createFromPath(path.join(__dirname, 'assets/icons/min-w-30.png')).resize({ width: 8, height: 8 }),
      click() {
        win.hide();
      }
    },
    { label: 'Maximizar', type: 'normal', visible: false, icon: nativeImage.createFromPath(path.join(__dirname, 'assets/icons/max-w-30.png')).resize({ width: 8, height: 8 }),
    click() {
      win.show();
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
        win.hide();
      });

      win.on('hide', e => {
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

      win.on('show', e => {
        contextMenu.items[7].visible = true;
        contextMenu.items[8].visible = false;
      });
      
      tray.setTitle(app.name);
      tray.setToolTip(app.name);
    

      // Open the DevTools.
      if(isDev) win.webContents.openDevTools();
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



