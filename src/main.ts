import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { spawn, ChildProcess } from 'child_process'
import { createServer, Socket } from 'net';
import { resolve, relative } from 'path';

import io from 'socket.io-client';

import gameType from './electron/gba_checker';

interface romPath {
    path: string;
    name: string;
};

interface LobbySettings {
    username: string;
    gamepath: string;
    lobby_size: number;
    lobby_code: string;
    lobby_password: string;
}

//TODO: cache/load these on close/open respectively
var rom_list: romPath[] = [];
var bizhawk_path: string = '';
var server_URL: string = 'http://localhost:3000';
var lobby_settings: LobbySettings = <LobbySettings>{
    username: '',
    gamepath: '',
    lobby_size: 2,
    lobby_code: '',
    lobby_password: ''
};

var server_socket: SocketIOClient.Socket;

const local_lua_path: string = './src/lua/biz_client.lua'; 

var bizhawk_proc: ChildProcess | null = null;

// bizhawk socket server
const port: number = 4902;
var lua_socket : Socket | null = null;
createServer(socket => {
    console.log('client connected');

    lua_socket = socket;

    // TODO: figure out generic method of processing this!
    socket.on('data', data => {
        // assuming data is just space separated team data for now...
        let data_buf = Buffer.from(data.toString().split(" ").map( (num_string) =>
            Number(num_string)
        ));

        // send data_buf to pokeswap server
    })
}).listen(port);

// electron stuff
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
});

ipcMain.on('get_bizhawk_path', (event, ...args) => {
    event.returnValue = bizhawk_path;
});


ipcMain.on('start_bizhawk', (event, ...args) => {
    bizhawk_proc = spawn(bizhawk_path, [
        args[0],
        '--socket_ip=127.0.0.1',
        `--socket_port=${port}`,
        `--lua=${resolve(bizhawk_path, relative(bizhawk_path, local_lua_path))}`
    ]);
});


ipcMain.on('get_server_url', (event, ...args) => {
    event.returnValue = server_URL;
});

ipcMain.on('check_server_url', (event, ...args) => {
    // TODO: actually check validity of server
    event.returnValue = true;
});

ipcMain.on('server_url_update', (event, ...args) => {
    // TODO: test validity of new url
    server_URL = args[0];
    console.log(server_URL);
    event.returnValue = server_URL;
});

ipcMain.on('get_lobby_settings', (event, ...args) => {
    event.returnValue = lobby_settings;
});

ipcMain.on('update_lobby_settings', (event, ...args) => {
    lobby_settings = Object.defineProperty(args[0], args[1], {value: args[2]});
    event.returnValue = lobby_settings;
});

ipcMain.on('pokeswap-server-init', (event, ...args) => {
    const mode: string = args[0];
    
    server_socket = io(server_URL);

    const server_settings: LobbySettings = Object.create(lobby_settings);
    server_settings.gamepath = gameType(lobby_settings.gamepath) || '';

    // TODO: formalize server_socket communication
    //       this also, includes adding status callbacks!
    server_socket.emit(mode, server_settings, (responce: any) => {
        ipcMain.emit('pokeswap-server-init-responce', responce);
    });

    /*
    switch (mode) {
        case 'create':
            // TODO: fix rom_list[0] for testing
            server_socket.emit('create', server_settings, (responce: any) => {
                ipcMain.emit('pokeswap-server-init-responce', responce);
            });
            break;
        case 'join':
            server_socket.emit('join', lobby_settings.username, lobby_settings.lobby_code, lobby_settings.lobby_password);
            break;
        default:
            break;
    }
    */
});

/*
ipcMain.on('test_write', (event, ...args) => {
    if (lua_socket !== null) {
        lua_socket.write('yo waddup lua');
    }
    event.returnValue = null;
});
*/
app.on('ready', createWindow);
