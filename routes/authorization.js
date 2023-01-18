import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import * as path from 'path'
import * as fs from 'fs'
import {fileURLToPath} from 'url'
import busboy from 'busboy'
import auth from '../middlewares/auth.js'
import User from '../models/user.js'

const router = express.Router()

router.post('/register', async (req, res) => {
    const {name, email, password, passwordConfirm} = req.body
    if (!name || !email || !password || !passwordConfirm)
        return res.status(400).json({
            status: false,
            type: 'EMPTY_FIELDS',
            message: 'Please fill in all fields correctly.',
        })

    if (!email.match(new RegExp(process.env.VALID_EMAIL))) return res.status(400).json({
        status: false,
        type: 'INCORRECT_EMAIL',
        message: 'Please enter a valid email.'
    })

    const foundUser = await User.findOne({email})

    if (foundUser)
        return res.status(403).json({
            status: false,
            type: 'REGISTERED_EMAIL',
            message: 'There is a registered user with this email address.',
        })

    if (password !== passwordConfirm)
        return res.status(400).json({
            status: false,
            type: 'PASSWORDS_NOT_MATCH',
            message: 'Passwords do not match.',
        })

    const passwordMinLength = process.env.PASSWORD_MIN_LENGTH || '6'
    if (password.length < parseInt(passwordMinLength))
        return res.status(400).json({
            status: false,
            type: 'PASSWORD_TOO_SHORT',
            message: 'The password is too short.',
            min: passwordMinLength,
        })

    const salt = await bcrypt.genSalt(parseInt(process.env.CRYPT_SALT))
    const hashedPassword = bcrypt.hashSync(password, salt)
    const user = new User({name, email, password: hashedPassword})

    await user.save(e => {
        if (e) {
            console.error(e)
            return res.status(500).json({
                status: false,
                type: 'ERROR_CREATING_USER',
                message: 'An error occurred while creating user.',
            })
        }
    })

    res.status(200).json({
        status: true,
        type: 'USER_CREATED',
        message: 'User created successfully.',
    })
})

router.post('/login', async (req, res) => {
    const {email, password, remember} = req.body

    if (!email || !password) return res.status(400).json({
        status: false,
        type: 'EMPTY_FIELDS',
        message: 'Please fill out all fields.',
    })

    const user = await User.findOne({email}, {
        fields: {
            password: 0,
        },
    })
    if (!user) return res.status(400).json({
        status: false,
        type: 'USER_NOT_FOUND',
        message: 'User not found.',
    })

    bcrypt.compare(password, user.password, (err, result) => {
        if (err) return res.status(500).json({
            status: false,
            type: 'ERROR_LOGGING_IN',
            message: 'An error occurred.',
            error: err,
        })

        if (result) {
            try {
                jwt.sign({user}, process.env.ACCESS_TOKEN, {
                    expiresIn: remember ? '30d' : '24h'
                }, (err, token) => {
                    if (err) throw err

                    res.status(200).json({
                        status: true,
                        type: 'LOGGED_IN',
                        message: 'User logged in.',
                        user: user,
                        token,
                    })
                })
            } catch (e) {
                res.status(500).json({
                    status: false,
                    type: 'ERROR_LOGGING_IN',
                    message: e.message,
                })
            }
        } else res.status(400).json({
            status: false,
            type: 'INCORRECT_PASSWORD',
            message: 'Incorrect password.'
        })
    })
})

router.get('/user', auth, async (req, res) => {
    res.status(200).json({
        user: req.user,
    })
})

router.post('/update', auth, async (req, res) => {
    const {name, email} = req.body

    if (!name.trim() || !email.trim()) return res.status(400).json({
        status: false,
        type: 'EMPTY_FIELDS',
        message: 'Please fill out all fields.',
    })

    try {
        const user = await User.findById(req.user._id)
        user.name = name
        user.email = email
        await user.save()

        res.status(200).json({
            status: true,
            type: 'USER_UPDATED',
            message: 'User updated.',
        })
    } catch (e) {
        res.status(500).json({
            status: false,
            type: 'ERROR_UPDATING_USER',
            message: e.message,
        })
    }
})

router.post('/password', auth, async (req, res) => {
    const {currentPassword, password, confirmPassword} = req.body

    if (!currentPassword || !password || !confirmPassword) return res.status(400).json({
        status: false,
        type: 'EMPTY_FIELDS',
        message: 'Please fill out all fields.',
    })

    if (password !== confirmPassword) return res.status(400).json({
        status: false,
        type: 'PASSWORDS_NOT_MATCH',
        message: 'Passwords not match.',
    })

    const passwordMinLength = process.env.PASSWORD_MIN_LENGTH || '6'
    if (password.length < parseInt(passwordMinLength))
        return res.status(400).json({
            status: false,
            type: 'PASSWORD_TOO_SHORT',
            message: 'The password is too short.',
            min: passwordMinLength,
        })

    const user = await User.findById(req.user._id)

    bcrypt.compare(currentPassword, user.password, async (err, result) => {
        if (err) return res.status(500).json({
            status: false,
            type: 'ERROR_UPDATING_USER',
            message: err.message,
        })

        if (result) {
            if (password === currentPassword) return res.status(400).json({
                status: false,
                type: 'SAME_PASSWORD',
                message: 'The new password cannot be the same as the old password',
            })

            try {
                const salt = await bcrypt.genSalt(parseInt(process.env.CRYPT_SALT))
                user.password = bcrypt.hashSync(password, salt)
                await user.save()

                res.status(200).json({
                    status: true,
                    type: 'USER_UPDATED',
                    message: 'User updated.',
                })
            } catch (e) {
                res.status(500).json({
                    status: false,
                    type: 'ERROR_UPDATING_USER',
                    message: e.message,
                })
            }
        } else res.status(400).json({
            status: false,
            type: 'INCORRECT_PASSWORD',
            message: 'Incorrect password.'
        })
    })
})

router.post('/photo', auth, async (req, res) => {
    const {remove} = req.body
    const destination = path.join(fileURLToPath(import.meta.url), '..', '..', 'public', 'images')

    if (!remove) {
        const fileTypes = process.env.ALLOWED_FILE_TYPES.split(',')
        let fileName
        const bb = busboy({
            headers: req.headers,
            limits: {
                files: 1,
                fileSize: parseInt(process.env.MAX_FILESIZE_BYTES || 1000000),
            },
        })

        bb.on('file', (name, file, info) => {
            const {filename, mimeType} = info
            if (!fileTypes.includes(mimeType)) return res.status(400).json({
                status: false,
                type: 'UNSUPPORTED_FILE_TYPE',
                message: 'This file type is not supported.',
            })

            fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(filename)}`
            const saveTo = path.join(destination, fileName)
            file.pipe(fs.createWriteStream(saveTo))
        })

        bb.on('close', async () => {
            if (fileName) {
                try {
                    const user = await User.findById(req.user._id)
                    if (user.photo) {
                        const imagePath = path.join(destination, user.photo)
                        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath)
                    }
                    user.photo = fileName
                    await user.save()
                    res.status(200).json({
                        status: true,
                        type: 'PROFILE_PHOTO_UPLOADED',
                        message: 'Profile photo uploaded successfully.',
                        image: user.photo,
                    })
                } catch (e) {
                    res.status(500).json({
                        status: false,
                        type: 'ERROR_UPLOADING_IMAGE',
                        message: e.message,
                    })
                }
            } else {
                res.status(400).json({
                    status: false,
                    type: 'MISSING_PARAMETERS',
                    message: 'Image file is required.'
                })
            }
        })

        req.pipe(bb)
    } else {
        try {
            const user = await User.findById(req.user._id)
            const imagePath = path.join(destination, user.photo)
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath)
            user.photo = null
            await user.save()
            res.status(200).json({
                status: true,
                type: 'PROFILE_PHOTO_REMOVED',
                message: 'Profile photo removed successfully.',
            })
        } catch (e) {
            res.status(500).json({
                status: false,
                type: 'ERROR_REMOVING_PROFILE_PHOTO',
                message: e.message,
            })
        }
    }
})

export default router