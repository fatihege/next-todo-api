import {model, Schema} from 'mongoose'
import {TodoItem} from './todo-item.js'

export const TodoList = new Schema({
    title: String,
    description: String,
    star: Boolean,
    archive: Boolean,
    todos: [TodoItem],
}, {
    timestamps: true,
    autoCreate: false,
})

export default model('TodoList', TodoList)