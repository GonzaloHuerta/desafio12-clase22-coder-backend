import express from 'express';
import http from 'http'
import {Server as ioServer} from 'socket.io';
import {mensajesDao as api} from './src/daos/index.js';
import session from 'express-session';
import MongoStore from 'connect-mongo';

const MONGO_USER = process.env.MONGO_USER;
const MONGO_PASS = process.env.MONGO_PASS;
const SESSION_DB_NAME = process.env.SESSION_DB_NAME;

const app = express();

const httpServer = http.createServer(app);

const io = new ioServer(httpServer);

app.set('views', './public/views');
app.set('view engine', 'ejs');

app.use(session({
    saveUninitialized: false,
    resave: false,
    secret: 'secretKey',
    store: MongoStore.create({mongoUrl:`mongodb+srv://${MONGO_USER}:${MONGO_PASS}@cluster0.o7pgm.mongodb.net/${SESSION_DB_NAME}?retryWrites=true&w=majority`}),
    cookie:{maxAge: 60000}
}));
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

const mensajes = await api.getAll();

app.get('/', (req, res)=>{
    if(req.session.user){
        res.render('home', {logueado: true, nombre: req.session.user});
    }else{
        res.redirect('/login')
    } 
})

app.get('/login', (req, res)=>{
    if(req.session.user){
        res.redirect('/')
    }else{
        res.render('login');
    }
})

app.post('/login', (req, res)=>{
    const {usuario} = req.body;
    if(usuario == ''){
        res.send({error: 'Error al loguearse. Debe ingresar un usuario'})
        return;
    }
    if(usuario){
        req.session.user = usuario;
        res.redirect('/')
    }else{
        res.send({error: 'Error al loguearse. Intente nuevamente.'})
    }
})

app.get('/logout', (req, res)=>{
    const nombre = req.session.user;
    req.session.destroy(err=>{
        res.render('hasta-luego', {nombre: nombre})
    })
})

io.on('connection', (socket)=>{
    console.log("Cliente conectado", socket.id);;
    socket.emit('mensajes', mensajes);

    socket.on('nuevo-mensaje', async(mensaje)=>{
        mensajes.push(mensaje);
        await api.create(mensaje);
        console.log(mensajes)
        io.sockets.emit('mensajes', mensajes);
    })
})

const PORT = 8080;
httpServer.listen(PORT, ()=>{
    console.log("Corriendo en el puerto ", PORT)
})


