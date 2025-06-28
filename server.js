require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const { initializeApp } = require("firebase/app");
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } = require("firebase/auth");
const { title } = require('process');
let parser = bodyParser.urlencoded({ extended: true });

const cors = require('cors');

var corsOptions = {
    origin: '*', //no hay front 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
    //credentials: true //solo si si hay frontend y se necesita enviar cookies o headers
}
let corsPolicy = cors(corsOptions);

app.use(corsPolicy);
app.use(parser);


const port = process.env.PORT || 3000;
const uri = process.env.MONGO_URI;

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
};

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
}
);

const firebase = initializeApp(firebaseConfig);
const auth = getAuth(firebase);

async function run() {
    try {
        await client.connect();
        console.log("Conectados a la DB")
        await client.db("Examen_UX").command({ ping: 1 });
        console.log("ping exitoso! ")
    } catch (error) {
        console.log(error);
    }
}

app.listen(port, () => {
    console.log("El servidor se esta ejecutando en el puerto ", port);
    run();
});



app.post('/logIn', async (req, res) => {
    try {

        if (!req.body.email || !req.body.password) {
            return res.status(400).send({ mensaje: "Email y contraseña son requeridos" });
        }

        const credentials = 
        await signInWithEmailAndPassword(auth, req.body.email,  req.body.password);


        
        const db = client.db("Examen_UX");
        const usersCollection = db.collection("Users");
        const userdata = await usersCollection.findOne({ Email: req.body.email });
        if (userdata === null) {
            return res.status(404).send({ mensaje: "Usuario no encontrado" });
        };
        const postCollection = db.collection("Post");
        const post = await postCollection.find({ authorId: userdata._id }).toArray();
        return res.status(200).send({
            Email: userdata.Email,
            nombre: userdata.nombre,
            apellido: userdata.apellido,
            post: post
        });

    } catch (Error) {
        return res.status(500).send({ error: Error.message });
    }
});

app.post('/logOut', (req, res) => {
    try {
        signOut(auth)
            .then((resp) => {
                res.status(200).send({
                    mensaje: "Que tengas un lindo dia, hasta luego"
                });
            })
            .catch((error) => {
                res.status(500).send({ error: error });
            })
    } catch (error) {

    }
});


app.post('/createUser', async (req, res) => {
    try {
        const baseDatos = client.db("Examen_UX");
        const colecion = baseDatos.collection("Users");

        const Email = req.body.email;
        const contrasena = req.body.Contrasena;
        const nombre = req.body.Nombre;
        const apellido = req.body.Apellido;

        const documento = {
            Email: Email,
            nombre: nombre,
            apellido: apellido,
        };

        const responseFirebase = await createUserWithEmailAndPassword(auth, Email, contrasena);
        const responseMongo = await colecion.insertOne(documento);
        res.status(201).send(
            {
                mensaje: "Usuario creado exitosamente en Firebase y MongoDB",
                idUsuarioMongo: responseMongo.insertedId,
                idUsuarioFirebase: responseFirebase.user.uid
            }
        );

    } catch (error) {
        res.status(500).send(
            {
                mensaje: "algo salio mal lo sentimos",
                repuesta: error
            }
        );
    }

}
);


app.post('/createPost', async (req, res) => {
    try {
        const db = client.db("Examen_UX");
        const postCollection = db.collection("Post");

        const { title, content, authorId } = req.body;

        const newPost = {
            title,
            content,
            authorId:  ObjectId.createFromHexString(authorId),
            createdAt: new Date()
        };

        const result = await postCollection.insertOne(newPost);

        res.status(201).send({
            mensaje: "Post creado exitosamente",
            postId: result.insertedId
        });
    } catch (error) {
        res.status(500).send({
            mensaje: "Error al crear el post",
            error: error.message
        });
    }
});

app.get('/listPost', async (req, res) => {
    try {
        const db = client.db("Examen_UX");
        const postCollection = db.collection("Post");

        const posts = await postCollection.find({}).toArray();

        res.status(200).send({ posts });
    } catch (error) {
        res.status(500).send({
            mensaje: "Error al obtener los posts",
            error: error.message
        });
    }
});

app.put('/editPost/:id', async (req, res) => {
    try {
        const db = client.db("Examen_UX");
        const postCollection = db.collection("Post");

        const postId = req.params.id;
        const { title, content, authorId } = req.body;

        const update = {
            $set: {
                title,
                content,
                authorId: ObjectId.createFromHexString(authorId),
                updatedAt: new Date()
            }
        };

        const result = await postCollection.updateOne({ _id: new ObjectId(postId) }, update);

        if (result.matchedCount === 0) {
            return res.status(404).send({ mensaje: "Post no encontrado" });
        }

        res.status(200).send({ mensaje: "Post actualizado exitosamente" });
    } catch (error) {
        res.status(500).send({
            mensaje: "Error al actualizar el post",
            error: error.message
        });
    }
});

app.delete('/deletePost/:id', async (req, res) => {
    try {
        const db = client.db("Examen_UX");
        const postCollection = db.collection("Post");

        const postId = req.params.id;

        const result = await postCollection.deleteOne({ _id: new ObjectId(postId) });

        if (result.deletedCount === 0) {
            return res.status(404).send({ mensaje: "Post no encontrado" });
        }

        res.status(200).send({ mensaje: "Post eliminado exitosamente" });
    } catch (error) {
        res.status(500).send({
            mensaje: "Error al eliminar el post",
            error: error.message
        });
    }
});