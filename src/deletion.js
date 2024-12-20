export class ForeignKeyDeleter {
    constructor(mongoModel, mongoD) {
        this.mongoModel = mongoModel;
        this.modelName = mongoModel.modelName;
        this.mongoD = mongoD;
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
        recordsIds, 
        isRequired, 
        isImmutable, 
        dealWithImmutable,
        metaData
    ) {

        if (isRequired || (isImmutable && dealWithImmutable === "delete")) {
            metaData.excluded.push(...recordsIds);
            return model.deleteMany({ _id: { $in: recordsIds } });
        } else if (!isImmutable || dealWithImmutable === "keep") {
            metaData.updated.push(...recordsIds);
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
        relatedRecords,
        recordsIds,
        metaData
    ) {
        metaData.updated.push(...recordsIds);

        const updateFilters = await Promise.all(
            relatedRecords.map(async (md) => {
                const updateFilter = {
                    filter: {
                        _id: md._id
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

        return await model.bulkWrite(updateFilters);
    }

    async _processSingleRelation(
        relatedModelName, 
        foreignKeys, 
        models, 
        dealWithImmutable
    ) {
        const metaData = {
            updated: [],
            excluded: []
        };

        const relatedModel = this.mongoD.__models[relatedModelName];
        if (!relatedModel._FKS) return;

        const { filterConditions, updatePaths, isRequired, isImmutable, isArray } =
            await this._getFilterConditionsAndPaths(models, foreignKeys);

        const relatedRecords = await relatedModel.find(filterConditions);
        const recordsIds = relatedRecords.map(record => record._id);
        
        if (isArray) {
            return this._handleArrayRecords(
                relatedModel,
                filterConditions,
                relatedRecords,
                recordsIds,
                metaData
            );
        } else {
            return this._handleRequiredOrImmutableRecords(
                relatedModel,
                updatePaths,
                recordsIds,
                isRequired,
                isImmutable,
                dealWithImmutable,
                metaData
            );
        }
    }

    async _processRelations(
        relations, 
        models, 
        dealWithImmutable
    ) {
        const promises = Object.entries(relations).map(([relatedModelName, foreignKeys]) => {
            return this._processSingleRelation(relatedModelName, foreignKeys, models, dealWithImmutable);
        });

        await Promise.all(promises);
    }

    async delete(
        conditions, 
        dealWithImmutable = "delete"
    ) {
        const relations = this.mongoD.__relations[this.modelName];
        const models = await this.mongoModel.find(conditions);

        if (!models.length) return;

        await this._processRelations(relations, models, dealWithImmutable);

        await this.mongoModel.deleteMany(conditions);
    }
}
