import React, { createContext } from 'react';
import {LobbySettings} from '../common/LobbySettings';
import {LocalPathSettings, romPath} from '../common/LocalPathSettings';

type LobbySettingsContextValue = [
    LobbySettings,
    React.Dispatch<{
        type: 'set' | 'setOne';
        action: LobbySettings | [string, unknown];
    }>
]

type LocalPathSettingsContextValue = [
    LocalPathSettings,
    React.Dispatch<{
        type: 'set' | 'setOne' | 'addRom' | 'replaceRom';
        action: LocalPathSettings | [string, unknown] | romPath;
    }>
]

export const LobbySettingsContext = createContext<LobbySettingsContextValue>(
    (null as unknown) as LobbySettingsContextValue
);

export const LocalPathSettingsContext = createContext<LocalPathSettingsContextValue>(
    (null as unknown) as LocalPathSettingsContextValue
);