import { getNestedProperty } from "./utils";

export class ForeignKeyCreator {
    constructor(mongoModel, mongoD) {
        this.mongoModel = mongoModel;
        this.modelName = mongoModel.modelName;
        this.mongoD = mongoD;
    }

    async create(models) {
        if (!Array.isArray(models)) models = [models];
        const fkEntries = Object.entries(this.mongoModel._FKS);

        const toFindIds = [];

        await Promise.all(
            fkEntries.map(async ([modelName, fks]) => {
                if (!this.mongoD.models[modelName]) return;

                const ids = new Set();

                await Promise.all(
                    fks.map(async (fk) => {
                        models.map(async (modelObj) => {
                            const modelsValues = await getNestedProperty(modelObj, fk.path);

                            if (Array.isArray(modelsValues)) {
                                modelsValues.forEach((value) => {
                                    ids.add(value._id.toString());
                                });
                            } else {
                                ids.add(modelsValues._id.toString());
                            }
                        })
                    })
                )

                toFindIds.push([modelName, [...ids]]);
            })
        );

        await Promise.all(
            toFindIds.map(async ([modelName, ids]) => {
                const found = await this.mongoD.models[modelName].find({ 
                    _id: { 
                        $in: ids 
                    } 
                });
                if (found.length < ids.length) {
                    throw new Error(`Cannot find all linked IDs in model: ${modelName}`);
                }
            })
        );
    }
}
