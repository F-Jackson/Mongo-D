import mongoose from "mongoose";
import { InitMongoModels } from "../mongoClass.js";


const connectMongoDb = async function connect(url) {
    const mongoOptions = {
        serverSelectionTimeoutMS: 5000,
    };

    return await mongoose.connect(url, mongoOptions);
};

export const cleanDb = async () => {
    const client = await connectMongoDb("");

    const db = client.connection.db;
    const collections = await db.listCollections().toArray();
    const dropPromises = collections.map(async (collection) => {
        await db.dropCollection(collection.name)
    });
    await Promise.all(dropPromises);

    for (let model in mongoose.models) {
        delete mongoose.models[model];
    }

    return [new InitMongoModels(), client];
};

export const disconnectDb = async () => {
    await mongoose.disconnect();
};
