const io = require('socket.io')();

let rooms = [];

class Room {
    constructor(name, socket) {
        this.connections = [
            {                               // класс может быть упрощен или вовсе удален: мы можем запоминать
                name: name,                 // только сокеты, но в будущем мы можем улучшить чатрумы,
                socket: socket              // к примеру,добавить юзерпики, лого чата,имя чата итд
            }
        ];
    }
}

io.on('connection', (socket) => {

    socket.on('newRoom', function (name) {
        rooms.push(new Room(name, socket));             // создаем новую комнату и "кладем"
        socket.emit('roomCreated', rooms.length - 1);   // туда первого пользователя
        socket.emit('newUser', name);
    });


    socket.on('enterExistingRoom', function (name, roomId) {
        rooms[roomId].connections.push({
            name: name,
            socket: socket
        });
        socket.emit('roomEntered', roomId);
        rooms[roomId].connections.forEach(function (connection) {
            // новому пользователю отправляем имена всех уже присутствующих участников чата,
            // всем присутствующим отправляем только имя нового участника
            let lastConnectionIndex = rooms[roomId].connections.length - 1;
            if (rooms[roomId].connections[lastConnectionIndex] === connection) {
                rooms[roomId].connections.forEach(function (connection_) {
                    connection.socket.emit('newUser', connection_.name);
                });
            } else {
                connection.socket.emit('newUser', name);
            }
        });
    });


    socket.on('disconnect', function () {
        console.log(typeof rooms);
        rooms.some(function (room) {

            // чтобы не тратить больше времени на прогон всех комнат и соединений,
            // используем some a не forEach
            let isFound = room.connections.some(function (connection) {
                if (connection.socket === socket) {
                    // находим комнату, из которой вышел пользователь
                    // и отправляем всем её участникам его имя
                    let roomIndex = rooms.indexOf(room);
                    let leftUserName = connection.name;
                    let connectionIndex = rooms[roomIndex].connections.indexOf(connection);
                    rooms[roomIndex].connections.splice(connectionIndex, 1);
                    room.connections.forEach(function (connection_) {
                        connection_.socket.emit('removeUser', leftUserName)
                    });
                    return true;
                }
            });
            if (isFound)
                return true;
        });
    });


    socket.on('sendMessage', function (name, roomId, message) {

        //отправляем сообщение всем пользователяем в комнату, а также
        // отправляем и дату получения сообщения в формате mm:hh dd/mm

        let today = new Date();
        let day = today.getDate().toString();
        let month = (today.getMonth() + 1).toString();
        let hours = today.getHours().toString();
        let minutes = today.getMinutes().toString();
        let dateString = (hours.length === 1 ? '0' + hours : hours) + ':' +
            (minutes.length === 1 ? '0' + minutes : minutes) + ' ' +
            (day.length === 1 ? '0' + day : day) + '/' +
            (month.length === 1 ? '0' + month : month);

        rooms[roomId].connections.forEach(function (connection) {
            connection.socket.emit('newMessage', name, message, dateString)
        });
    });


    //Далее - часть кода, связанная с WebRTC

    socket.on('startStreaming', function (roomId) {
        // отдаем передатчику всех зрителей
        rooms[roomId].connections.forEach(function (connection) {
            if (connection.socket !== socket) {
                socket.emit('getViewerId', connection.socket.id);
            }
        });
    });

    socket.on('sendOffer', function (viewerId, sdp) {
        // передаем зрителю оффер от передатчика
        socket.to(viewerId).emit('receiveOffer', socket.id, sdp);
    });

    socket.on('sendAnswer', function (broadcasterId, message) {
        // передаем передатчику answer от зрителя
        socket.to(broadcasterId).emit('receiveAnswer', socket.id, message);
    });

    socket.on('sendIceCandidateToViewer', function (viewerId, candidate) {
        // передаем зрителю ICECandidate от передатчика
        socket.to(viewerId).emit('addIceCandidateOnViewer', socket.id, candidate);
    });

    socket.on('sendIceCandidateToBroadcaster', function (broadcasterId, candidate) {
        // передаем передатчику ICECandidate от зрителя
        socket.to(broadcasterId).emit('addIceCandidateOnBroadcaster', socket.id, candidate);
    });

});

const port = 8000;
io.listen(port);