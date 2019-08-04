import React from 'react';
import ReactDOM from 'react-dom';
import logo from './logo.svg';
import './FirstPage.css';
import openSocket from 'socket.io-client';
import {withRouter} from 'react-router';
import Message from './Message';
import $ from 'jquery';
import './ChatRoom.css';


class ChatRoom extends React.Component {
    constructor(props) {
        super(props);
        // alert(`name : ${this.props.parentState.name}\nroomId : ${this.props.parentState.roomId}`);

        this.state = {
            message: '',
            receivedMessage: [],
            users: []
        };
        if (this.props.parentState.roomId === -1) {
            this.props.stateRoomIdChanger(this.props.roomId);
            this.props.history.push('/'); //return <Redirect to="/"/>
        }

        this.handleMessageChange = this.handleMessageChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);


        let addMessage = (name, message, timestamp) => {
            this.setState(state => {
                const receivedMessage = state.receivedMessage.concat({
                    author: name,
                    messageText: message,
                    timestamp: timestamp
                });
                return {
                    receivedMessage,
                }
            });
        };
        this.props.parentState.socket.on('newMessage',
            function (name, message, timestamp) {
                addMessage(name, message, timestamp);
                document.getElementById('all-messages').scrollBy(0, 1000000);
            });

        let addUserToRoom = (name) => {
            this.setState(state => {
                // alert(state.users);
                const users = state.users.concat(name);
                return {
                    users,
                }
            });
        };
        this.props.parentState.socket.on('newUser',
            function (name) {

                addUserToRoom(name);
            });

        let removeUserFromRoom = (name) => {
            this.setState(state => {
                console.log(state.users);
                let userList = state.users;
                userList.splice(userList.indexOf(name), 1)
                const users = userList;

                console.log(users);
                return {
                    users,
                }
            });
        };
        this.props.parentState.socket.on('removeUser',
            function (name) {
                removeUserFromRoom(name);
            });


        let peerConnection = new RTCPeerConnection();
        let socket = this.props.parentState.socket;
        let roomId = this.props.roomId;
        this.props.parentState.socket.on('receiveOffer',
            function (message, broadcasterId) {
                alert('offer prishol');
                peerConnection = new RTCPeerConnection();
                peerConnection.setRemoteDescription(message)
                    .then(() => peerConnection.createAnswer())
                    .then(sdp => peerConnection.setLocalDescription(sdp))
                    .then(function () {
                        socket.emit('sendAnswer', roomId, peerConnection.localDescription,
                            broadcasterId);
                    });
                peerConnection.onaddstream = function (event) {
                    // alert('stream dobavlen');
                    document.getElementById('audio').srcObject = event.stream;
                };
            });

    }

    handleMessageChange(event) {
        this.setState({
            message: event.target.value
        });
    }

    handleSubmit(event) {
        event.preventDefault();
        this.props.parentState.socket.emit('sendMessage',
            this.props.parentState.name, this.props.parentState.roomId,
            this.state.message);
    }

    componentDidMount() {

        let peerConnections = {};
        let peerConnection = new RTCPeerConnection();
        let socket = this.props.parentState.socket;
        let roomId = this.props.roomId;
        navigator.mediaDevices.getUserMedia({
            audio: true
        }).then(function (stream) {
            peerConnection.addStream(stream);
            peerConnection.createOffer()
                .then(sdp =>
                    peerConnection.setLocalDescription(sdp))
                .then(function () {
                    socket.emit('sendOffer', roomId,
                        peerConnection.localDescription);
                });
            // document.getElementById('audio').srcObject = stream;
            // socket.emit('broadcaster');
        }).catch(error => console.error(error));
        this.props.parentState.socket.on('receiveAnswer', function (message) {
            peerConnection.setRemoteDescription(message);
        })
    }

    componentWillUnmount() {
        if (this.props.parentState.roomId !== -1) {
            this.props.parentState.socket.emit('disconnect',
                this.props.parentState.roomId);
        }
    }

    render() {
        return (
            <div id="chat">
                <div id="users-panel">
                    <h4><strong>Users online</strong></h4>
                    {
                        this.state.users.map((user) =>
                            <h5>{user}</h5>
                        )
                    }
                </div>
                <div id="chat-panel">
                    <div id="all-messages">
                        {
                            this.state.receivedMessage.map((message) =>
                                <Message name={message.author} message={message.messageText}
                                         timestamp={message.timestamp}/>
                            )
                        }
                    </div>
                    <form id="send-message-block" onSubmit={this.handleSubmit}>
                        <div id='textarea-block'>
                            <textarea id="message-input" rows='3'
                                      onChange={this.handleMessageChange}
                                      placeholder="Your message goes here"
                                      value={this.state.message}> </textarea>
                        </div>
                        <div id='submit-block'>
                            <input id="send-message-btn" type="submit" value="Send"/>
                        </div>
                    </form>
                </div>
                <div id="video-panel">
                    <audio autoPlay controls id="audio"/>
                </div>
            </div>
        );
    }
}

export default withRouter(ChatRoom);