import React from 'react';
import './App.css';
import './FirstPage';
import FirstPage from "./FirstPage";
import ChatRoom from "./ChatRoom";
import {BrowserRouter as Router, Route} from "react-router-dom";


const io = require('socket.io-client');
class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            name: '',
            socket: io('http://localhost:8000'),
            roomId: -1
        };

        this.changeStateName = this.changeStateName.bind(this);
        this.changeStateRoomId = this.changeStateRoomId.bind(this);
    }

    changeStateName(name) {
        // this.setState({          // this.setState doesn't work
        //     name: name           // here(i don't really understand why),
        // });                      // so i mutate the state directly
        this.state.name = name;
    }

    changeStateRoomId(roomId) {
        this.setState({
            roomId: roomId
        });
    }
    render() {
        return (
            <div>
                <Router>
                    <Route exact path="/"
                           render={() =>
                               <FirstPage stateNameChanger={this.changeStateName}
                                          stateRoomIdChanger={this.changeStateRoomId}
                                          parentState={this.state}/>}/>
                    <Route path="/room/:roomId"
                           render={(props) =>
                               <ChatRoom
                                   roomId={props.match.params.roomId}
                                   stateNameChanger={this.changeStateName}
                                   stateRoomIdChanger={this.changeStateRoomId}
                                   parentState={this.state}/>}/>
                </Router>
            </div>
        );
    }
}

export default App;
