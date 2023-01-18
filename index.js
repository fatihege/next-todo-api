import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'
import * as dotenv from 'dotenv'

import auth from './middlewares/auth.js'

import listRoutes from './routes/list.js'
import authorizationRoutes from './routes/authorization.js'

dotenv.config()

const PORT = process.env.PORT

const app = express()
mongoose.set('strictQuery', true)
mongoose.connect(process.env.DB_URI)
    .then(m => {
        console.log('Connected to MongoDB')
        return m.connection.getClient()
    })

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
}))
app.use(express.static('public'))

app.use('/list', auth, listRoutes)
app.use('/', authorizationRoutes)

app.listen(PORT, () => console.log(`Listening on port ${PORT}`))