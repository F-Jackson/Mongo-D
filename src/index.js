import mongoose from "mongoose";
import { 
    changeCreate, 
    changeDelete, 
    changeDrop, 
    foreignKeyProcess 
} from "./modelChangeFuncs";
import { changeClient } from "./clientChangeFuncs";


class Schema extends mongoose.Schema {
    constructor(obj, options) {
        super(obj, options);
        this.__properties = {};

        for (const path in obj) {
            if (obj.hasOwnProperty(path)) {
                this.__properties[path] = obj[path];
            }
        }
    }

    getProperties() {
        return this.__properties;
    }
}

async function InitModels (
    client,
    __mocks
) {
    await changeClient(client);

    Promise.all(
        client.models.map(async (model) => {
            await foreignKeyProcess(model, client, __mocks);
            await changeDrop(model, model.modelName, client);
            await changeCreate(model, client);
            await changeDelete(model, client);
        })
    );
};

export { Schema, InitModels };
