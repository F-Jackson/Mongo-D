import mongoose from "mongoose";
import { 
    changeCreate, 
    changeDelete,
    foreignKeyProcess 
} from "./modelChangeFuncs";
import { changeClient } from "./clientChangeFuncs";


class Schema {
    constructor(obj, options) {
        const mongoSchema = class extends mongoose.Schema {};

        const properties = {};
        const originalPath = mongoSchema.prototype.path;

        mongoSchema.prototype.path = function (path, obj) {
            if (!obj) {
                return originalPath.call(this, path);
            }

            properties[path] = obj;
            return originalPath.call(this, path, obj);
        };

        const schema = new mongoSchema(obj, options);
        schema.__properties = properties;

        return schema;
    }
}

const Model = (name, schema, collection, options) => {
    if (!mongoose.__models) {
        mongoose.__models = {};
    } else if (mongoose.__models[name]) {
        throw new Error("Model already exists");
    }

    const model = mongoose.model(name, schema, collection, options);

    mongoose.__models[name] = model;

    return model;
};

async function InitModels (
    client
) {
    if (!client) throw new Error("Need to pass mongoose client");

    await changeClient(client);
/*    await Promise.all(
        Object.entries(client.__models).map(async ([_, model]) => {
            if (client.__sincedModels.has(model.modelName)) return;

            client.__sincedModels.add(model.modelName); 
            await foreignKeyProcess(model, client);
            await changeCreate(model, client);
            await changeDelete(model, client);
        })
    );*/
};

export { Schema, InitModels, Model };
