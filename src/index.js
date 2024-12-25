import { 
    changeCreate, 
    changeDelete,
    foreignKeyProcess 
} from "./modelChangeFuncs";
import { changeClient } from "./clientChangeFuncs";


class Schema {
    constructor(mongoose, obj, options) {
        const mongoSchema = class extends mongoose.Schema {};

        const properties = {};
        const fields = new Set([]);
        const originalPath = mongoSchema.prototype.path;

        mongoSchema.prototype.path = function (path, obj) {
            if (!obj) {
                return originalPath.call(this, path);
            }

            fields.add(path);
            properties[path] = obj;
            return originalPath.call(this, path, obj);
        };

        const schema = new mongoSchema(obj, options);
        schema.__properties = properties;
        schema.__fields = fields;

        return schema;
    }
}

const Model = (mongoose, name, schema, collection, options) => {
    if (!mongoose.__models) {
        mongoose["__models"] = {};
    } else if (mongoose.__models[name]) {
        throw new Error("Model already exists");
    }

    const model = mongoose.model(name, schema, collection, options);

    mongoose.__models[name] = model;

    return model;
};

async function InitModels (
    client,
    __mocks = null
) {
    if (!client) throw new Error("Need to pass mongoose client");

    changeClient(client);
    await Promise.all(
        Object.entries(client.__models).map(async ([_, model]) => {
            if (client.__sincedModels.has(model.modelName)) return;

            client.__sincedModels.add(model.modelName);
            await foreignKeyProcess(model, client, __mocks);
            await changeCreate(model, client);
            await changeDelete(model, client);
        })
    );
};

export { Schema, InitModels, Model };
