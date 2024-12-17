import mongoose from "mongoose";


const connectMongoDb = async function connect(url) {
    const mongoOptions = {
        serverSelectionTimeoutMS: 5000,
    };

    return await mongoose.connect(url, mongoOptions);
};

export const cleanDb = async () => {
    const client = await connectMongoDb("mongodb+srv://jacksonjfs18:eUAqgrGoVxd5vboT@cluster0.o5i8utp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

    return client;
};

export const disconnectDb = async (client) => {
    const db = client.connection.db;
    const collections = await db.listCollections().toArray();
    const dropPromises = collections.map(async (collection) => {
        await db.dropCollection(collection.name)
    });
    await Promise.all(dropPromises);

    for (let model in client.models) {
        client.deleteModel(model);
        delete client.models[model];
    }

    Object.keys(client.__models).forEach(async (key) => {
        await client.__models[key].collection.drop();
        delete client.__models[key];
    });

    client.connection.models = {}; 
    client.connection.modelSchemas = {}; 
    client.connection.collections = {};

    await client.disconnect();
};
