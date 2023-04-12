var app = require('express')();
let jwt = require('jsonwebtoken')
var http = require('http').Server(app);
let Chat = require('./model/chat')
let User = require('./model/User')
let mongoose = require('mongoose')
let Community = require('./model/Community')
let UserSocket = require('./model/UserSocket')
let UserChat = require('./model/UserChat')
let Notification = require('./model/Notification')
const OneToOne = require('./model/OneToOne')
require('dotenv').config()
var io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
require('./utils/mongoose')
//Whenever someone connects this gets executed
io.on('connection', function (socket) {
    socket.on('changereadstate', async (data) => {
        try {
            const u = jwt.verify(data.jwt, process.env.JSONSECRETTOKEN)
            const index = await OneToOne.aggregate([{ $match: { userName: u.userName, userName: data.userName } }, { $project: { index: { $indexOfArray: ["$readEd._id", mongoose.Types.ObjectId(data.id)] } } }])
            console.log(index)
            await OneToOne.findOneAndUpdate({ userName: [u.userName, data.userName], readEd: u.userName }, { $set: { 'readEd.$.read': index[0].index } })
            socket.emit('changereadstate', true)
        } catch (error) {
            console.log(error)
            socket.emit('changereadstate', false)
        }
    })
    socket.on('loaduserlist', async (data) => {
        try {
            const temp = []
            const user = jwt.verify(data.jwt, process.env.JSONSECRETTOKEN)
            const userList = await OneToOne.find({ userName: user.userName }, { chats: 0, _id: 0 })
            for (let i = 0; i < userList.length; i++) {
                const t = userList[i].userName.filter((value) => (value !== user.userName))[0]
                const us = await User.findOne({ userName: t }).lean()
                temp.push(us)
            }
            socket.emit('loaduserlist', temp)
        } catch (error) {
            console.log(error)
            socket.emit('loaduserlist', [])
        }
    })
    socket.on('sendchattouser', async (data, cb) => {
        try {
            const user = jwt.verify(data.jwt, process.env.JSONSECRETTOKEN)
            const us = await UserSocket.findOne({ userName: data.userName })
            const u = await User.findOne({ userName: user.userName }).lean()
            const check = await OneToOne.findOne({ $and: [{ userName: user.userName }, { userName: data.userName }] })
            const _id = new mongoose.Types.ObjectId()
            if (check) {
                await OneToOne.updateOne({ $and: [{ userName: user.userName }, { userName: data.userName }] }, {
                    $push: {
                        chats: {
                            userName: user.userName,
                            chat: data.chat,
                            time: Date.now(),
                            _id: _id
                        }
                    }
                })
            }
            else {
                await new OneToOne({
                    userName: [user.userName, data.userName], chats: [{
                        userName: user.userName,
                        chat: data.chat,
                        time: Date.now(),
                        _id: _id
                    }], readEd: [{ userName: user.userName, read: 0 }, { userName: data.userName, read: 0 }]
                }).save()
            }
            const timee = Date.now()
            cb({ chat: data.chat, time: timee, _id: _id })
            socket.to(us.socketId).emit('receivechatfromuser', { name: u.name, userName: user.userName, chat: data.chat, time: timee, profilePath: u.profilePath, _id: _id })
        } catch (error) {
            console.log(error)
            socket.emit('sendchattouser', {})
        }
    })
    socket.on('loadusermessage', async (data) => {
        try {
            if (!data.page) data.page = 1
            const limit = 10
            const user = jwt.verify(data.jwt, process.env.JSONSECRETTOKEN)
            const u = await User.findOne({ userName: data.userName }).lean()
            const c = await OneToOne.aggregate([{ $match: { $and: [{ userName: user.userName }, { userName: data.userName }] } }, { $unwind: '$chats' }, { $project: { chats: 1 } }, { $sort: { 'chats.time': -1 } }, { $skip: (data.page - 1) * limit }, { $limit: limit }])
            socket.emit('loadusermessage', {
                other: { name: u.name, profilePath: u.profilePath },
                chats: c
            })
        }
        catch (error) {
            socket.emit('loadusermessage', [])
        }
    })
    socket.on('notification', async (data) => {
        try {
            const user = jwt.verify(data.jwt, process.env.JSONSECRETTOKEN)
            const socketId = await Notification.aggregate([{ $match: { userName: user.userName } }, { $unwind: '$notification' }, { $project: { notification: 1 } }, { $sort: { 'notification.date': -1 } }, { $skip: (data.page - 1) * 10 }, { $limit: 10 }])
            if (socketId) {
                let temp = []
                for (let i = 0; i < socketId.length; i++) {
                    const u = await User.findOne({ userName: socketId[i].notification.user }).lean()
                    temp.push({ notification: socketId[i].notification, name: u.name, profile: u.profilePath, userName: socketId[i].notification.user })
                }
                socket.emit('notification', { data: temp })
            }
            else {
                socket.emit('notification', { data: [] })
            }
        } catch (error) {
            socket.emit('notification', { data: [] })
        }
    })
    socket.on('sendnotificationtouser', async (data) => {
        data.notification.date = new Date()
        const notification = await Notification.findOne({ userName: data.userName })
        if (notification) {
            await Notification.updateOne({ userName: data.userName }, { $push: { notification: data.notification } })
        }
        else {
            await new Notification({ userName: data.userName, notification: [data.notification] }).save()
        }
        const socketId = await UserSocket.findOne({ userName: data.userName })
        if (socketId) {
            const u = await User.findOne({ userName: data.notification.user }).lean()
            socket.to(socketId.socketId).emit('sendnotificationtouser', { notification: data.notification, userName: u.userName, name: u.name, profile: u.profilePath })
        }
    })
    socket.on('sendsocketidtoserver', async (data) => {
        try {
            const user = jwt.verify(data.jwt, process.env.JSONSECRETTOKEN)
            const socketId = await UserSocket.findOne({ userName: user.userName })
            if (socketId) {
                Object.assign(socketId, { socketId: socket.id })
                await socketId.save()
            }
            else {
                await new UserSocket({ userName: user.userName, socketId: socket.id }).save()
            }
            socket.emit('sendsocketidtoserver', { done: true })
        } catch (error) {
            socket.emit('sendsocketidtoserver', { done: false })
        }
    })
    // socket.on('profileload', async (data) => {
    socket.on('loadcommunities', async (data) => {
        try {
            const user = jwt.verify(data.jwt, process.env.JSONSECRETTOKEN)
            if (!data.page) data.page = 1
            const chatuser = await UserChat.findOne({ userName: user.userName })
            let response = []
            if (chatuser?.communityId?.length) {
                for (let i = 0; i < chatuser.communityId.length; i++) {
                    let userName = chatuser.communityId[i].split('-')[0]
                    let community = await Community.findOne({ userName: userName }).lean()
                    community = community.community.filter((value) => value.communityId === chatuser.communityId[i])[0]
                    const chat = await Chat.aggregate([{ $match: { communityId: community.communityId } }, { $unwind: '$chats' }, { $project: { chats: 1 } }, { $sort: { 'chats.time': -1 } }, { $skip: (data.page - 1) * 10 }, { $limit: 10 }])
                    let temp = []
                    for (let i = 0; i < chat.length; i++) {
                        temp.push(chat[i].chats)
                    }
                    for (let i = 0; i < temp.length; i++) {
                        const user = await User.findOne({ userName: temp[i].userName }).lean()
                        temp[i].name = user.name
                        temp[i].profilePath = user.profilePath
                    }
                    response.push({ communityName: community.communityName, communityId: community.communityId, profilePath: community.profilePath, chats: temp })
                    socket.join(community.communityId)
                }
                socket.emit('loadcommunities', response)
            }
            else
                socket.emit('loadcommunities', [])
        }
        catch (error) {
            socket.emit('loadcommunities', [])
        }
    })
    socket.on('sendchattocommunities', async (data, callback) => {
        try {
            const user = jwt.verify(data.jwt, process.env.JSONSECRETTOKEN)
            const _id = new mongoose.Types.ObjectId()
            const timee = Date.now()
            const chat = await Chat.findOneAndUpdate({ communityId: data.communityId }, { $push: { chats: { userName: user.userName, chat: data.chat, time: Date.now(), _id: _id } } })
            const u = await User.findOne({ userName: user.userName }).lean()
            callback({ chat: data.chat, time: timee, _id: _id })
            socket.to(chat.communityId).emit("receivechatfromcommunity", { name: u.name, userName: user.userName, chat: data.chat, time: timee, communityId: data.communityId, profilePath: u.profilePath, _id: _id });
        } catch (error) {
            socket.emit('sendchattocommunities', { msg: 'not sent' })
        }
    })
    socket.on('loadmessage', async (data) => {
        try {
            if (!data.page) data.page = 1
            const user = jwt.verify(data.jwt, process.env.JSONSECRETTOKEN)
            let chat = await Chat.aggregate([{ $match: { communityId: data.communityId } }, { $unwind: '$chats' }, { $project: { chats: 1 } }, { $sort: { 'chats.time': -1 } }, { $skip: (data.page - 1) * 10 }, { $limit: 10 }])
            if (chat.length) {
                console.log(chat.length)
                const index = chat.findIndex((value) => (value.chats._id ===mongoose.Types.ObjectId(data.id)))
                console.log(index)
                console.log(chat[9])
            }
            let temp = []
            for (let i = 0; i < chat.length; i++) {
                temp.push(chat[i].chats)
            }
            for (let i = 0; i < temp.length; i++) {
                const user = await User.findOne({ userName: temp[i].userName }).lean()
                temp[i].name = user.name
                temp[i].profilePath = user.profilePath
            }
            if (temp.length)
                socket.emit("loadmessage", temp);
            else
                socket.emit("loadmessage", []);
        } catch (error) {
            socket.emit('loadmessage', [])
        }
    })
    socket.on('joincommunityroom', async (data) => {
        try {
            const user = jwt.verify(data.jwt, process.env.JSONSECRETTOKEN)
            // console.log(user)
            if (!user) {
                socket.emit('joincommunityroom', { joined: false })
            }
            else {
                const users = await User.findOne({ userName: user.userName })
                const room = await Chat.findOne({ communityId: data.communityId })
                if (!room) {
                    var chat = await Chat.create({
                        communityId: data.communityId,
                        userId: [users._id]
                    })
                    const u = await UserChat.findOne({ userName: user.userName })
                    if (!u)
                        var chatuser = await UserChat.create({
                            userName: user.userName,
                            communityId: [data.communityId]
                        })
                    else {
                        chatuser = await UserChat.findOneAndUpdate({ userName: user.userName }, { $addToSet: { communityId: data.communityId } })
                    }
                }
                else {
                    chat = await Chat.findOneAndUpdate({ communityId: data.communityId }, { $addToSet: { userId: users._id } })
                    const u = await UserChat.findOne({ userName: user.userName })
                    if (!u)
                        var chatuser = await UserChat.create({
                            userName: user.userName,
                            communityId: [data.communityId]
                        })
                    else {
                        chatuser = await UserChat.findOneAndUpdate({ userName: user.userName }, { $addToSet: { communityId: data.communityId } })
                    }
                    // console.log(chat)
                    // console.log(chat.id)
                    /* {
                        acknowledged: true,
                        modifiedCount: 0,
                        upsertedId: null,
                        upsertedCount: 0,
                        matchedCount: 1
                    } */
                }
                socket.join(chat.communityId)
                socket.emit('joincommunityroom', { joined: true })
            }
        }
        catch (error) {
            console.log(error)
            socket.emit('joincommunityroom', { joined: false })
        }

    })
    //Whenever someone disconnects this piece of code executed
    socket.on('disconnect', function () {
        console.log('A user disconnected');
    });
});
http.listen(3000, function () {
    console.log('listening on *:3000');
});