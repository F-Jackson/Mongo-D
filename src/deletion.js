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
        isRequired, 
        isImmutable, 
        dealWithImmutable,
        recordsIds,
        metadata
    ) {

        if (isRequired || (isImmutable && dealWithImmutable === "delete")) {
            metadata.excluded.push(...recordsIds);
            return model.deleteMany({ _id: { $in: recordsIds } });
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
        records
    ) {
        const metadata = { updated: [], excluded: [] };

        const relatedModel = this.mongoD.__models[relatedModelName];
        if (!relatedModel._FKS) return;

        const { filterConditions, updatePaths, isRequired, isImmutable, isArray } =
            await this._getFilterConditionsAndPaths(models, foreignKeys);

        const relatedRecords = await relatedModel.find(filterConditions);
        const recordsIds = relatedRecords.map(record => record._id);
        
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

    async _processRelations(
        relations, 
        models, 
        dealWithImmutable
    ) {
        const records = {};

        const promises = Object.entries(relations).map(([relatedModelName, foreignKeys]) => {
            return this._processSingleRelation(
                relatedModelName, 
                foreignKeys, 
                models, 
                dealWithImmutable,
                records
            );
        });

        await Promise.all(promises);

        console.log(records);
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
