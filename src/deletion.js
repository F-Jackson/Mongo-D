import mongoose from "mongoose";

export class ForeignKeyDeleter {
    constructor(mongoModel, mongoD) {
        this.mongoModel = mongoModel;
        this.modelName = mongoModel.modelName;
        this.mongoD = mongoD;
        this.session = null;
    }

    async _getFilterConditionsAndPaths(
        models, 
        foreignKeys
    ) {
        const filterConditions = {};
        const updatePaths = {};
        let isRequired = false;
        let isImmutable = false;
        let isArray = false;

        for (const fk of foreignKeys) {
            const path = fk.path.join(".");
            isRequired = isRequired || fk.required;
            isImmutable = isImmutable || fk.immutable;
            isArray = isArray || fk.array;

            if (!filterConditions[path]) {
                filterConditions[path] = { $in: [] };
                updatePaths[path] = null;
            }

            for (const model of models) {
                filterConditions[path].$in.push(model._id);
            }
        }

        return { filterConditions, updatePaths, isRequired, isImmutable, isArray };
    }

    async _handleRequiredOrImmutableRecords(
        model, 
        filterConditions,
        isRequired, 
        isImmutable, 
        dealWithImmutable,
        recordsIds,
        metadata
    ) {

        if (isRequired || (isImmutable && dealWithImmutable === "delete")) {
            metadata.excluded.push(...recordsIds);
            /*const [deletedCount, related]*/
            return 
        } else if (!isImmutable || dealWithImmutable === "keep") {
            metadata.updated.push(...recordsIds);
            return model.updateMany(
                { _id: { $in: recordsIds } },
                { $set: filterConditions }
            );
        } else {
            throw new Error('`dealWithImmutable` must be either "keep" or "delete".');
        }
    }

    async _handleArrayRecords(
        model, 
        filterConditions, 
        recordsIds,
        metadata
    ) {
        const updateFilters = await Promise.all(
            recordsIds.map(async (id) => {
                const updateFilter = {
                    filter: {
                        _id: id
                    },
                    update: {
                        $pullAll: {}
                    }
                };

                await Promise.all(
                    Object.entries(filterConditions).map(async ([key, value]) => {
                        updateFilter.update["$pullAll"][key] = value["$in"]
                    })
                )

                return {
                    updateOne: updateFilter
                };
            })
        );

        metadata.updated.push(...recordsIds);

        return await model.bulkWrite(updateFilters);
    }

    async _processSingleRelation(
        relatedModelName, 
        foreignKeys, 
        models, 
        dealWithImmutable,
        records,
        relatedCount
    ) {
        const metadata = { updated: [], excluded: [] };

        const relatedModel = this.mongoD.__models[relatedModelName];
        if (!relatedModel._FKS) return;

        const { filterConditions, updatePaths, isRequired, isImmutable, isArray } =
            await this._getFilterConditionsAndPaths(models, foreignKeys);

        const relatedRecords = await relatedModel.find(filterConditions);
        const recordsIds = relatedRecords.map(record => record._id);
        relatedCount.count += recordsIds.length;

        if (isArray) {
            await this._handleArrayRecords(
                relatedModel,
                filterConditions,
                recordsIds,
                metadata
            );
        } else {
            await this._handleRequiredOrImmutableRecords(
                relatedModel,
                updatePaths,
                isRequired,
                isImmutable,
                dealWithImmutable,
                recordsIds,
                metadata
            );
        }

        records[relatedModelName] = metadata;
    }

    async _processRelations__(
        relations, 
        models, 
        dealWithImmutable,
        direction
    ) {
        const records = {};
        let relatedCount = { count: 0 };

        const promises = Object.entries(relations).map(([relatedModelName, foreignKeys]) => {
            return this._processSingleRelation(
                relatedModelName, 
                foreignKeys, 
                models, 
                dealWithImmutable,
                records,
                relatedCount
            );
        });

        await Promise.all(promises);

        return [ relatedCount.count, records ];
    }

    async getObjs (
        conditions,
        classObj
    ) {
        const populateFields = [];
        
        if (classObj._FKS) {
            populateFields = Object.entries(classObj._FKS).flatMap(([modelName, fks]) => {
                const model = this.mongoModel.__models[modelName];
                if (!model) throw new Error(`Can not find ${modelName} in __models, its linked?`);

                const paths = fks.map((fk) => fk.path.join("."));

                if (model._FKS) {

                }
            });
        }    
        // Popule todos os campos que contêm ObjectId
        return await classObj
            .find(conditions)
            .populate(populateFields.join(" "))
            .exec();
    };

    async _processRelations(
        relations, 
        models, 
        dealWithImmutable,
        direction
    ) {
        if (!relations) return;

        const records = {};
        let relatedCount = { count: 0 };

        const promises = Object.entries(relations).map(([relatedModelName, foreignKeys]) => {
            return this._processSingleRelation(
                relatedModelName, 
                foreignKeys, 
                models, 
                dealWithImmutable,
                records,
                relatedCount
            );
        });

        await Promise.all(promises);

        return [ relatedCount.count, records ];
    }

    async _getLastsRelations(mongoModel) {
        const result = [];
    
        for (const [modelName, values] of Object.entries(mongoModel._FKS)) {
            for (const value of values) {
                const entry = { path: value.path.join(".") };
    
                const relatedModel = mongoose.__models[modelName];
                if (relatedModel && relatedModel._FKS) {
                    const subPopulate = await getLastsRelations(relatedModel);
                    if (subPopulate.length > 0) {
                        entry.populate = subPopulate.length === 1 ? subPopulate[0] : subPopulate;
                    }
                }
    
                result.push(entry);
            }
        }
    
        return result;
    }

    async _setKwargs(kwargs) {
        if (!kwargs.dealWithImmutable) kwargs.dealWithImmutable = "delete";
        if (!kwargs.autoCommitTransaction) kwargs.autoCommitTransaction = true;
        if (!kwargs.direction) kwargs.direction = "foward";
    }

    async _initializeSession() {
        this.session = await this.mongoD.startSession();
        this.session.startTransaction();
    }

    async commit() {
        try {
            await this.session.commitTransaction();
        } catch (error) {
            await this.session.abortTransaction();
            throw error;
        } finally {
            this.session.endSession();
        }
    }

    async delete(
        conditions,
        kwargs
    ) {
        if (!kwargs) kwargs = {};
        if (typeof kwargs !== "object") throw new Error("Invalid kwargs: must be an object");
        await this._setKwargs(kwargs);

        await this._initializeSession();

        try {
            const relations = this.mongoD.__relations[this.modelName];

            const toPopulateModels = this.mongoModel._FKS ? await this._getLastsRelations(this.mongoModel) : "";
            const models = await this.mongoModel.find(conditions).populate(toPopulateModels);
    
            console.log(models);

            if (!models.length) return;
    
            if (kwargs.direction === "foward" || kwargs.direction === "both") {
                await this._processRelations(
                    relations, 
                    models, 
                    kwargs.dealWithImmutable,
                    kwargs.direction
                );
            }
    
            if (kwargs.autoCommitTransaction) {
                await this.commit();
            }
    
            return [ result.deletedCount, relatedCount, records];
        } catch (e) {
            this.session.endSession();
            throw e;
        }
    }
}

let commands = [];
let asPaths = [];

export async function aggregate(id, model, as, com) {
    const n = [{ $match: { _id: id.toString() } }];
    for (let i = 0; i < as.length; i++) {
        n.push({ $lookup: com[i] });
        n.push({ $unwind: as[i] })

        /*if (i === as.length - 1) {
            n.push({ $replaceRoot: { newRoot: com[i].localField } })
        }*/
    }
    console.log(n);

    const c = await model.aggregate(n);
    console.log(c);
};
