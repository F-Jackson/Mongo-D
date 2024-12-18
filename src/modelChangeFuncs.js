import { ForeignKeyProcessor } from "./generateModel.js";
import { deleteFromMongoose } from "./utils.js";
import { ForeignKeyCreator } from "./creation.js";
import { ForeignKeyDeleter } from "./deletion.js";


export const foreignKeyProcess = async(mongoModel, mongoD, __mocks) => {
    const foreignKeyProcessor = new ForeignKeyProcessor(
        mongoModel,
        mongoD
    );
    
    await foreignKeyProcessor.__mocktest(__mocks);

    try {
        await foreignKeyProcessor.processForeignKeys();
    } catch (e) {
        console.log(mongoD.__models)
        await deleteFromMongoose(mongoModel.modelName);
        throw e;
    }
};

export const changeCreate = async(mongoModel, mongoD) => {
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

export const changeDelete = async(mongoModel, mongoD) => {
    mongoModel.Delete = async (conditions, options) => {
        const deleter = new ForeignKeyDeleter(
            mongoModel, mongoD
        );

        await deleter.delete(conditions, options);
    };
};
