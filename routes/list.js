import express from 'express'
import User from '../models/user.js'
import TodoList from '../models/todo-list.js';
import todoItem from "../models/todo-item.js";
const router = express.Router()

router.post('/create', async (req, res) => {
    const {title, description = '', todos = []} = req.body

    if (!title) return res.status(400).json({
        status: false,
        type: 'MISSING_PARAMETERS',
        message: 'Title is required.',
    })

    const user = await User.findById(req.user._id)
    const todoList = new TodoList({title, description, todos: todos && todos.length ? todos : []})
    if (!user.lists) user.lists = []
    user.lists.push(todoList)

    try {
        await user.save()
        res.status(200).json({
            status: true,
            type: 'TODO_LIST_CREATED',
            message: 'Todo list created.',
            list: todoList,
        })
    } catch (e) {
        res.status(500).json({
            status: false,
            type: 'ERROR_CREATING_TODO_LIST',
            message: e.message,
        })
    }
})

router.post('/update', async (req, res) => {
    const {id, title, description = '', todos = []} = req.body

    if (!id || !title) return res.status(400).json({
        status: false,
        type: 'MISSING_PARAMETERS',
        message: 'ID and title are required.',
    })

    const user = await User.findById(req.user._id)
    user.lists.find(l => {
        if (l._id.toString() === id.toString()) {
            l.title = title
            l.description = description
            l.todos = todos
        }
    })

    try {
        await user.save()
        res.status(200).json({
            status: true,
            type: 'TODO_LIST_UPDATED',
            message: 'Todo list updated.',
        })
    } catch (e) {
        res.status(500).json({
            status: false,
            type: 'ERROR_UPDATING_TODO_LIST',
            message: e.message,
        })
    }
})

router.post('/delete', async (req, res) => {
    const {id} = req.body

    if (!id) return res.status(400).json({
        status: false,
        type: 'MISSING_PARAMETERS',
        message: 'ID is required.',
    })

    const user = await User.findById(req.user._id)
    user.lists = user.lists.filter(l => l._id.toString() !== id.toString())

    try {
        await user.save()
        res.status(200).json({
            status: true,
            type: 'TODO_LIST_DELETED',
            message: 'Todo list deleted.',
        })
    } catch (e) {
        res.status(500).json({
            status: false,
            type: 'ERROR_DELETING_TODO_LIST',
            message: e.message,
        })
    }
})

router.post('/star', async (req, res) => {
    const {id, unstar = false} = req.body

    if (!id) return res.status(400).json({
        status: false,
        type: 'MISSING_PARAMETERS',
        message: 'ID is required.',
    })

    const user = await User.findById(req.user._id)
    user.lists.find(l => {
        if (l._id.toString() === id.toString())
            l.star = !unstar
    })

    try {
        await user.save()
        res.status(200).json({
            status: true,
            type: !unstar ? 'TODO_LIST_STARRED' : 'TODO_LIST_UNSTARRED',
            message: !unstar ? 'Todo list starred.' : 'Todo list unstarred.',
        })
    } catch (e) {
        res.status(500).json({
            status: false,
            type: !unstar ? 'ERROR_STARRING_LIST' : 'ERROR_UNSTARRING_LIST',
            message: e.message,
        })
    }
})

router.post('/archive', async (req, res) => {
    const {id, unarchive = false} = req.body

    if (!id) return res.status(400).json({
        status: false,
        type: 'MISSING_PARAMETERS',
        message: 'ID is required.',
    })

    const user = await User.findById(req.user._id)
    user.lists.find(l => {
        if (l._id.toString() === id.toString())
            l.archive = !unarchive
    })

    try {
        await user.save()
        res.status(200).json({
            status: true,
            type: !unarchive ? 'TODO_LIST_ARCHIVED' : 'TODO_LIST_UNARCHIVED',
            message: !unarchive ? 'Todo list archived.' : 'Todo list unarchived.',
        })
    } catch (e) {
        res.status(500).json({
            status: false,
            type: !unarchive ? 'ERROR_ARCHIVING_LIST' : 'ERROR_UNARCHIVING_LIST',
            message: e.message,
        })
    }
})

router.post('/complete', async (req, res) => {
    const {listId, taskId, uncomplete = false} = req.body

    if (!listId || !taskId) return res.status(400).json({
        status: false,
        type: 'MISSING_PARAMETERS',
        message: 'List ID and task ID are required.',
    })

    const user = await User.findById(req.user._id)
    user.lists.find(l => {
        if (l._id.toString() === listId.toString())
            l.todos.map(t => {
                if (t._id.toString() === taskId.toString())
                    t.completed = !uncomplete
            })
    })

    try {
        await user.save()
        res.status(200).json({
            status: true,
            type: !uncomplete ? 'TASK_COMPLETED' : 'TASK_UNCOMPLETED',
            message: !uncomplete ? 'Task completed.' : 'Task uncompleted.',
        })
    } catch (e) {
        res.status(500).json({
            status: false,
            type: !uncomplete ? 'ERROR_COMPLETING_TASK' : 'ERROR_UNCOMPLETING_TASK',
            message: e.message,
        })
    }
})

export default router