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

export const disconnectDb = async () => {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const dropPromises = collections.map(async (collection) => {
        await db.dropCollection(collection.name)
    });
    await Promise.all(dropPromises);

    for (let model in mongoose.models) {
        mongoose.deleteModel(model);
        delete mongoose.models[model];
    }

    Object.keys(mongoose.__models).forEach((key) => {
        delete mongoose.__models[key];
    });

    mongoose.models = {};
    mongoose.modelSchemas = {};

    await mongoose.disconnect();
};
