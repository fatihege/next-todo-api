import {model, Schema} from 'mongoose'

export const TodoItem = new Schema({
    title: String,
    description: String,
    completed: Boolean,
}, {
    timestamps: true,
    autoCreate: false,
})

export default model('TodoItem', TodoItem)