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
        this.state = {
            message: '',
            receivedMessages: [],
            users: []
        };

        // при переходе в комнату по ссылке запоминаем номер комнаты, отправляем вводить имя
        if (this.props.parentState.roomId === -1) {
            this.props.stateRoomIdChanger(this.props.roomId);
            this.props.history.push('/'); //return <Redirect to="/"/>
        }

        this.handleMessageChange = this.handleMessageChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.startStream = this.startStream.bind(this);

        let socket = this.props.parentState.socket;
        let roomId = this.props.roomId;


        // добавление сообщения в state компонента, после чего оно будет добавлено в all-messages
        let addMessage = (name, message, timestamp) => {
            this.setState(state => {
                const receivedMessages = state.receivedMessages.concat({
                    author: name,
                    messageText: message,
                    timestamp: timestamp
                });
                return {
                    receivedMessages,
                }
            });
        };
        socket.on('newMessage',
            function (name, message, timestamp) {
                addMessage(name, message, timestamp);
                document.getElementById('all-messages').scrollBy(0, 1000000); // при добавлении нового собщения проматываем скролл до самого низа
            });


        // добавление нового пользователя в state компонента, после чего он будет добавлен users-panel
        let addUserToRoom = (name) => {
            this.setState(state => {
                const users = state.users.concat(name);
                return {
                    users,
                }
            });
        };
        socket.on('newUser',
            function (name) {
                addUserToRoom(name);
            });


        // удаление пользователя, после его выхода из чата
        let removeUserFromRoom = (name) => {
            this.setState(state => {
                let userList = state.users;
                userList.splice(userList.indexOf(name), 1);
                const users = userList;
                return {
                    users,
                }
            });
        };
        socket.on('removeUser',
            function (name) {
                removeUserFromRoom(name);
            });

        //Далее - часть кода, связанная с WebRTC
        let peerConnection = new RTCPeerConnection();
        // получаем оффер от т.н. передатчика
        socket.on('receiveOffer',
            function (broadcasterId, message) {
                peerConnection = new RTCPeerConnection();
                peerConnection.setRemoteDescription(message)
                    .then(() => peerConnection.createAnswer()) // создаем answer и отправляем его передатчику
                    .then(sdp => peerConnection.setLocalDescription(sdp))
                    .then(function () {
                        socket.emit('sendAnswer', broadcasterId,
                            peerConnection.localDescription);
                    });
                peerConnection.onaddstream = function (event) {
                    if (event.stream) {
                        let newStream = document.createElement('video');   // создаем и добавляем на страницу новый элемент video,
                        newStream.srcObject = event.stream;                        // чей source будет являться потоком от передатчика
                        newStream.controls = true;
                        newStream.autoplay = true;
                        document.getElementById('videos').appendChild(newStream);
                    }
                };
                peerConnection.onicecandidate = function (event) {
                    if (event.candidate) {                                // передача своего ICECandidate передатчику
                        socket.emit('sendIceCandidateToBroadcaster',  // для установления p2p-соединения
                            broadcasterId, event.candidate);
                    }
                };
                socket.on('addIceCandidateOnViewer',
                    function (broadcasterId, candidate) {                                // при  получении ICECandidate передатчика,
                        peerConnection.addIceCandidate(new RTCIceCandidate(candidate));  // устанавливаем его
                    });
            });
    }

    handleMessageChange(event) {
        this.setState({
            message: event.target.value
        });
    }

    startStream(event) {

        let socket = this.props.parentState.socket;
        let roomId = this.props.roomId;
        let outgoingConnections = {};
        navigator.mediaDevices.getUserMedia({
            video: true,                                 // устанавливаем настройки самого "потока"
            audio: true
        }).then(function (stream) {
            let hostVideo = document.getElementById('yourVideo');
            hostVideo.srcObject = stream;                // выводим пользователю вид с его же камеры,
            hostVideo.style.display = 'block';           // причём в самом начале страницы
            socket.emit('startStreaming', roomId);        // в ответ на startStreaming нам
        }).catch(error => console.error(error));    // придут все id "зрителей"


        socket.on('getViewerId', function (viewerId) {
            const peerConnection = new RTCPeerConnection();    // после получения id зрителя, создаем оффер
            outgoingConnections[viewerId] = peerConnection;    // и отправляем его ему
            peerConnection.addStream(document.getElementById('yourVideo').srcObject);
            peerConnection.createOffer()
                .then(sdp =>
                    peerConnection.setLocalDescription(sdp))
                .then(function () {
                    socket.emit('sendOffer', viewerId,
                        peerConnection.localDescription);
                });
            peerConnection.onicecandidate = function (event) {
                if (event.candidate) {
                    socket.emit('sendIceCandidateToBroadcaster',
                        viewerId, event.candidate);
                }
            };
        });

        socket.on('receiveAnswer', function (viewerId, message) {
            outgoingConnections[viewerId].setRemoteDescription(message);
        });

        socket.on('addIceCandidateOnBroadcaster', function (viewerId, candidate) {
            outgoingConnections[viewerId].addIceCandidate(new RTCIceCandidate(candidate));
        });
    }

    handleSubmit(event) {
        event.preventDefault();
        this.props.parentState.socket.emit('sendMessage',
            this.props.parentState.name,
            this.props.parentState.roomId,
            this.state.message);
        this.setState({        // после отправки сообщения, зачищаем стейт и,
            message: ''             // соответственно, само поле ввода сообщения
        });
    }

    componentDidMount() {

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
                    {/*   при обновлении state.users пользователи в самом элементе
                          будут изменяться (добавляться или удаляться)  */}
                    {
                        this.state.users.map((user) =>
                            <h5>{user}</h5>
                        )
                    }
                </div>
                <div id="chat-panel">
                    <div id="all-messages">

                        {/*  при обновлении state.receivedMessages
                          будут добавляться сообщения   */}
                        {
                            this.state.receivedMessages.map((message) =>
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
                    <div id="videos">
                        <video controls autoPlay muted={true} id="yourVideo"/>
                    </div>
                    <div id="start-stream">
                        <button id="start-stream-btn" onClick={this.startStream}>Start streaming</button>
                    </div>
                </div>
            </div>
        );
    }
}

export default withRouter(ChatRoom);