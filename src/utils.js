import mongoose from "mongoose";


export const deleteFromMongoose = async(name) => {
    delete mongoose.models[name];
    delete mongoose.connection.models[name];
}

export const getNestedProperty = async(obj, path) => {
    return path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}