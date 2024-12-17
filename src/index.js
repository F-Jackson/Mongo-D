import mongoose from "mongoose";
import { ForeignKeyProcessor } from "./generateModel.js";
import { deleteFromMongoose } from "./utils.js";
import { ForeignKeyCreator } from "./creation.js";
import { ForeignKeyDeleter } from "./deletion.js";


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

    NewSchema(obj, options) {
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

    MongoModel (
        name,
        schema,
        collection,
        options,
        __mocks
    ) {
        if (name in this.models) throw new Error("Model already exists");

        const makeModel = async () => {
            const mongoModel = await mongoose.model(name, schema, collection, options);

            try {
                const foreignKeyProcessor = new ForeignKeyProcessor(
                    mongoModel,
                    this
                );
                await foreignKeyProcessor.__mocktest(__mocks);
                await foreignKeyProcessor.processForeignKeys();

                mongoModel.dropCollection = async () => {
                    await mongoModel.collection.drop();
                    await deleteFromMongoose(name);

                    this.removeRelations(name);
                    delete this.models[name];
                };

                mongoModel.Create = async (doc, checkExistence = true, callback) => {
                    if (checkExistence && mongoModel._FKS) {
                        const creator = new ForeignKeyCreator(
                            mongoModel, this
                        );
                        await creator.create(doc);
                    }

                    const models = await mongoModel.create(doc, callback);
                    return models;
                };

                mongoModel.Delete = async (conditions, options) => {
                    const deleter = new ForeignKeyDeleter(
                        mongoModel, this
                    );

                    await deleter.delete(conditions, options);
                };
            
                this.models[name] = mongoModel;
            } catch (err) {
                await deleteFromMongoose(name);

                throw err;
            }

            return mongoModel;
        };

        return makeModel();
    };
}
