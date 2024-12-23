import { ForeignKeyProcessor } from "./generateModel.js";
import { deleteFromMongoose } from "./utils.js";
import { ForeignKeyCreator } from "./creation.js";
import { ForeignKeyDeleter } from "./deletion.js";


export const foreignKeyProcess = async(mongoModel, mongoD, __mocks = null) => {
    const foreignKeyProcessor = new ForeignKeyProcessor(
        mongoModel,
        mongoD
    );
    
    if (__mocks) await foreignKeyProcessor.__mocktest(__mocks);

    try {
        await foreignKeyProcessor.processForeignKeys();
    } catch (e) {
        await deleteFromMongoose(mongoModel.modelName, mongoD);
        throw e;
    }
};

export const changeCreate = async(mongoModel, mongoD) => {
    mongoModel.Create = async (doc, checkExistence = true, callback) => {
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

export const changeDelete = async(mongoModel, mongoD) => {
    mongoModel.Delete = async (conditions, options) => {
        const deleter = new ForeignKeyDeleter(
            mongoModel, mongoD
        );

        return await deleter.delete(conditions, options);
    };
};
