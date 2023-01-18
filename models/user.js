import {Schema, model} from 'mongoose'
import {TodoList} from './todo-list.js'

const User = new Schema({
    name: String,
    email: String,
    password: String,
    photo: String,
    lists: [TodoList],
}, {
    timestamps: true,
})

export default model('User', User)