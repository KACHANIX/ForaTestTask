import React from 'react';
import logo from './logo.svg';
import './FirstPage.css';
import openSocket from 'socket.io-client';
import {withRouter} from 'react-router';
import './Message.css';

class Message extends React.Component {

    constructor(props) {
        super(props);

    }

    render() {
        return (
            <div className="message-block">
                <b className="name">{this.props.name}:</b>
                <div className="text-div">
                    <p className="message-span">{this.props.message}</p>
                </div>
                <div className='timestamp'>
                    <small>{this.props.timestamp}</small>
                </div>
            </div>
        );
    }
}

export default Message;
