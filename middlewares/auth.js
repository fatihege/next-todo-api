import jwt from 'jsonwebtoken'
import User from '../models/user.js'

export default (req, res, next) => {
    const bearer = req.header('authorization')

    if (!bearer) return res.status(401).json({
        status: false,
        type: 'UNAUTHORIZED_ACCESS',
        message: 'Unauthorized.',
    })

    const token = bearer.split(' ')[1]

    try {
        jwt.verify(token, process.env.ACCESS_TOKEN, async (err, decoded) => {
            if (err) return res.status(400).json({
                status: false,
                message: 'Invalid token.',
                error: err,
            })

            const user = await User.findById(decoded.user._id)
            req.user = user
            next()
        })
    } catch (e) {
        res.status(500).json({
            status: false,
            message: e.message,
        })
    }
}