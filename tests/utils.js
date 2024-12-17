import mongoose from "mongoose";


const connectMongoDb = async function connect(url) {
    const mongoOptions = {
        serverSelectionTimeoutMS: 5000,
    };

    return await mongoose.connect(url, mongoOptions);
};

export const cleanDb = async () => {
    const client = await connectMongoDb("mongodb+srv://jacksonjfs18:eUAqgrGoVxd5vboT@cluster0.o5i8utp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0");

    const db = client.connection.db;
    const collections = await db.listCollections().toArray();
    const dropPromises = collections.map(async (collection) => {
        await db.dropCollection(collection.name)
    });
    await Promise.all(dropPromises);

    for (let model in mongoose.models) {
        delete mongoose.models[model];
    }

    return client;
};

export const disconnectDb = async () => {
    await mongoose.disconnect();
};
