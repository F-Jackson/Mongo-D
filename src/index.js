import mongoose from "mongoose";
import { ForeignKeyProcessor } from "./generateModel.js";
import { deleteFromMongoose } from "./utils.js";
import { ForeignKeyCreator } from "./creation.js";
import { ForeignKeyDeleter } from "./deletion.js";


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

const foreignKeyProcess = async(mongoModel, mongoD, __mocks) => {
    const foreignKeyProcessor = new ForeignKeyProcessor(
        mongoModel,
        mongoD
    );
    await foreignKeyProcessor.__mocktest(__mocks);
    await foreignKeyProcessor.processForeignKeys();
};

const changeDrop = async(mongoModel, name, mongoD) => {
    mongoModel.dropCollection = async () => {
        await mongoModel.collection.drop();
        await deleteFromMongoose(name);

        mongoD.removeRelations(name);
        delete mongoD.models[name];
    };
};

const changeCreate = async(mongoModel, mongoD) => {
    mongoModel.Create = async (doc, checkExistence, callback) => {
        if (checkExistence && mongoModel._FKS) {
            const creator = new ForeignKeyCreator(
                mongoModel, mongoD
            );
            await creator.create(doc);
        }

        const models = await mongoModel.create(doc, callback);
        return models;
    };
};

const changeDelete = async(mongoModel, mongoD) => {
    mongoModel.Delete = async (conditions, options) => {
        const deleter = new ForeignKeyDeleter(
            mongoModel, mongoD
        );

        await deleter.delete(conditions, options);
    };
};

async function InitModels (
    client,
    __mocks
) {
    Promise.all(
        mongoose.models.map(async (model) => {
            await foreignKeyProcess(model, client, __mocks);
            await changeDrop(model, model.modelName, client);
            await changeCreate(model, client);
            await changeDelete(model, client);
        })
    );
};

export class InitMongoModels {
    constructor() {
        this.models = {};
        this.relations = {};
        this.oldRelations = {};
        this.Schema = mongoose.Schema;
    }

    addRelations(fks, modelName) {
        fks.forEach(([name, fk]) => {
            if (!this.relations[name]) this.relations[name] = {};

            this.relations[name][modelName] = fk;
        });
    }

    removeRelations(name) {
        if (this.relations[name]) {
            Promise.all(
                Object.keys(this.relations[name]).map(async (modelName) => {
                    const model = this.models[modelName];
                    if (model && model._FKS && model._FKS[name]) {
                        delete model._FKS[name];
                    }
                })
            );
            delete this.relations[name];
        }

        if (this.oldRelations[name]) delete this.oldRelations[name];
    }

    saveRelations() {
        this.oldRelations = JSON.parse(JSON.stringify(this.relations));
    };

    resetRelations() {
        this.relations = JSON.parse(JSON.stringify(this.oldRelations));
    }
}

export { Schema, Model };
