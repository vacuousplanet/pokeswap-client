import { app, BrowserWindow, ipcMain, dialog} from 'electron';
import { spawn, ChildProcess } from 'child_process'

import gameType from './electron/gba_checker';

type romPath = {
    path: string;
    name: string;
};

var rom_list: romPath[] = [];
var bizhawk_path: string = '';

var bizhawk_proc: ChildProcess | null = null;

const createWindow = (): void => {
    let win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
        },
    });

    win.loadFile('index.html');
}

ipcMain.on('rom_update', (event, ...args) => {
    const options: Electron.OpenDialogOptions = {
        properties: ['openFile'],
    };

    dialog.showOpenDialog(options).then(result => {
        if(!result.canceled && !rom_list.map(rompath => rompath.path).includes(result.filePaths[0])) {
            const rom_name = gameType(result.filePaths[0]);
            if (rom_name === undefined) {
                console.log('Not a known rom');
                event.returnValue = rom_list;
                return;
            }
            if(args[0] !== ''){
                const rl_index = rom_list.map(rompath => rompath.path).indexOf(args[0]);

                rom_list[rl_index] = {
                    path : result.filePaths[0],
                    name : rom_name,
                };
            } else {
                rom_list.push({
                    path: result.filePaths[0],
                    name: rom_name,
                });
            }
        }
        event.returnValue = rom_list
    }).catch(err => console.log(err));
    return;
});

ipcMain.on('get_roms_list', (event, ...args) => {
    event.returnValue = rom_list;
});

ipcMain.on('bizhawk_path_update', (event, ...args) => {
    const options: Electron.OpenDialogOptions = {
        properties: ['openFile'],
        filters: [{ name: 'Executables', extensions: ['exe']}],
    };

    dialog.showOpenDialog(options).then(result => {
        if(!result.canceled && !(bizhawk_path === result.filePaths[0])) {
            bizhawk_path = result.filePaths[0];
            event.returnValue = result.filePaths[0];
        } else {
            event.returnValue = '';
        }
    }).catch(err => console.log(err));
})

ipcMain.on('get_bizhawk_path', (event, ...args) => {
    event.returnValue = bizhawk_path;
})


ipcMain.on('start_bizhawk', (event, ...args) => {
    console.log(`${bizhawk_path} '${args[0]}'`);
    bizhawk_proc = spawn(bizhawk_path, [args[0]]);
})

app.on('ready', createWindow);
