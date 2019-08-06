import React from 'react';
import ReactDOM from 'react-dom';

import logo from './logo.svg';
import './FirstPage.css';
import openSocket from 'socket.io-client';
import {withRouter} from 'react-router';
import $ from 'jquery';
import Message from "./Message";


class FirstPage extends React.Component {

    constructor(props) {
        super(props);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.state = {
            name: '',
        };
        this.handleNameChange = this.handleNameChange.bind(this);
    }

    handleNameChange(event) {
        this.setState({
            name: event.target.value
        });
    }

    handleSubmit(event) {
        event.preventDefault();
        let name = this.state.name;
        // проверяем, ввел ли пользователь свое имя корректно и показываем/прячем ошибку
        if (name === null || name.match(/^ *$/) !== null) {
            document.getElementById('name-error').style.visibility = 'visible';
        } else {
            document.getElementById('name-error').style.visibility = 'hidden';

            this.props.stateNameChanger(name);
            let changeState = this.props.stateRoomIdChanger;
            let redirect = (path) => (this.props.history.push(path));

            // в зависимости от того, установлен ли roomId в родительском компоненте
            // либо создаем новую комнату, либо добавляемся в уже существующую
            if (this.props.parentState.roomId === -1) {
                this.props.parentState.socket.emit('newRoom', name);
                this.props.parentState.socket.on("roomCreated",
                    function (createdRoomId) {
                        changeState(
                            createdRoomId);
                        redirect(`/room/${createdRoomId}`); //return <Redirect to="/room"/>
                    });
            } else {
                this.props.parentState.socket.emit('enterExistingRoom',
                    name, this.props.parentState.roomId);
                this.props.parentState.socket.on("roomEntered",
                    function (enteredRoomId) {
                        redirect(`/room/${enteredRoomId}`); //return <Redirect to="/room"/>
                    });
            }
        }
    }

    render() {
        return (
            <div>
                <form id="name-form" onSubmit={this.handleSubmit}>
                    <h3>Input your name</h3>
                    <input id="name-input" type="text" value={this.state.name}
                           onChange={this.handleNameChange} placeholder="John Doe"/><br/>
                    <label id="name-error">Empty name field</label><br/>
                    <input id="submit" type="submit" value="Enter the chat"/>
                </form>
            </div>
        );
    }
}

export default withRouter(FirstPage);
