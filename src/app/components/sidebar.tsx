import React, { useState } from 'react';
import {
    BrowserRouter as Router,
    Switch,
    Route,
    Link,
    Redirect
} from "react-router-dom";

import Config from './config';
import Lobby from './lobby';

import './sidebar.scss';

/*
type SidebarProps = {
    name: string;
}
*/

//TODO: Lock out config + sidebar menu when connected

const Sidebar = () => {
    const [collapsed, toggleCollapse] = useState(true);

    return (
        <>
        <Router>
            <div className={collapsed ? "closed" : "open"}>
                <Link to="/lobby">Lobby</Link>
                <Link to="/config">Configuration</Link>
            </div>
            <button
                    className={(collapsed ? "inactive" : "active") + " square"}
                    onClick={() => toggleCollapse(collapsed => !collapsed)}
                >
                    ☰
            </button>
            <div className={collapsed ? "full" : "partial"}>
                <Switch>
                    <Route path="/lobby">
                        <Lobby />
                    </Route>
                    <Route path="/config">
                        <Config />
                    </Route>
                    <Redirect from="/" to="/lobby"/>
                </Switch>
            </div>
        </Router>
        </>
    );
};

export default Sidebar;