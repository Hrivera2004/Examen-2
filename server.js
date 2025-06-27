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
        const credentials = await signInWithEmailAndPassword(auth, req.body.email, req.body.password);
        const db = client.db("Examen_UX");
        const usersCollection = db.collection("Users");
        const userdata = usersCollection.findOne({ Email: credentials.getUser().email });
        if (userdata === null) {
            res.status(404).send({ mensaje: "Usuario no encontrado" });
        };
        res.status(200).send({
            userdata: userdata
        });

    } catch (error) {
        res.status(500).send({ error: error });
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

app.put('/editarUsuario', async (req, res) => {
    try {

        const baseDatos = client.db("claseux");
        const coleccion = baseDatos.collection("alumnos");

        const filter = { username: req.body.username };
        const updateDocument = {
            $set: {
                nuevoCampo: req.body.nuevo,
                password: req.body.password,
            },
        };
        const response = await coleccion.updateOne(filter, updateDocument);


        res.status(200).send({
            response: response
        });

    } catch (error) {
        res.status(500).send({
            error: error
        });
    }
}
);

app.delete('/eliminarUsuario/:id', async (req, res) => {

    try {

        const baseDatos = client.db("claseux");
        const coleccion = baseDatos.collection("alumnos");
        const response = await coleccion.deleteOne({
            _id: new ObjectId(req.params.id)
        });
        if (response.deletedCount === 0) {
            res.status(400).send({
                mensaje: "No se encontró ningun documento con ese ID"
            });
        } else {
            res.status(200).send({
                mensaje: "Documento eliminado con exito!"
            });
        }

    } catch (error) {
        res.status(500).send({
            error: error
        });
    }
}
);

app.get('/getInfoUsuarios', async (req, res) => {
    try {

        const baseDatos = client.db("claseux");
        const coleccion = baseDatos.collection("alumnos");
        // select * from alumnos
        const response = await coleccion.find({}).toArray();


        res.status(200).send({
            response: response
        });

    } catch (error) {
        res.status(500).send({
            error: error
        });
    }
}
);
