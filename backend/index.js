const io = require('socket.io')();

let rooms = [];

class Room {
    constructor(name, socket) {
        this.connections = [
            {                               // class can be simplified or even removed: we can remember only sockets,
                name: name,                 // but the chatrooms might be improved in a better way in the future
                socket: socket              // (we can add userpics, chat-logo, chat-name etc)
            }
        ];
    }
}

io.on('connection', (socket) => {
    console.log("asd");

    socket.on('newRoom', function (name) {
        rooms.push(new Room(name, socket));
        console.log(rooms.length - 1);
        rooms.forEach(function (e) {
            console.log(`\n_________ ${e.id} ----- ${e.connections.length} _________`)
        });
        console.log(typeof []);
        socket.emit('roomCreated', rooms.length - 1);
        socket.emit('newUser', name);
    });


    socket.on('enterExistingRoom', function (name, roomId) {
        rooms[roomId].connections.push({
            name: name,
            socket: socket
        });
        rooms.forEach(function (e) {
            console.log(`\n_________ ${e.id} ----- ${e.connections.length} _________`)
        });
        socket.emit('roomEntered', roomId);
        rooms[roomId].connections.forEach(function (connection) {
            if (rooms[roomId].connections[rooms[roomId].connections.length - 1] === connection) {
                let names = [];
                rooms[roomId].connections.forEach(function (connection_) {
                    names.push(connection_.name);
                });
                console.log(names);
                names.forEach(function (name_) {
                    connection.socket.emit('newUser', name_);
                })
            } else {
                connection.socket.emit('newUser', name);
            }
        });
    });


    socket.on('disconnect', function () {
        console.log(typeof rooms);
        rooms.some(function (room) {
            let isFound = room.connections.some(function (connection) {
                if (connection.socket === socket) {
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
        rooms.forEach(function (room) {
            console.log(`${rooms.indexOf(room)}       ${room.connections.length}`);
        });
    });



    socket.on('sendMessage', function (name, roomId, message) {
        console.log(message);

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
    })
});

const port = 8000;
io.listen(port);