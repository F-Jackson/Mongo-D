export class ForeignKeyDeleter {
    constructor(mongoModel, mongoD) {
        this.mongoModel = mongoModel;
        this.modelName = mongoModel.modelName;
        this.mongoD = mongoD;
    }

    async getFilterConditionsAndPaths(
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

    async handleRequiredOrImmutableRecords(
        model, 
        filterConditions, 
        relatedRecords, 
        isRequired, 
        isImmutable, 
        dealWithImmutable
    ) {
        const relatedIds = relatedRecords.map(record => record._id);

        if (isRequired || (isImmutable && dealWithImmutable === "delete")) {
            return model.deleteMany({ _id: { $in: relatedIds } });
        } else if (!isImmutable || dealWithImmutable === "keep") {
            return model.updateMany(
                { _id: { $in: relatedIds } },
                { $set: filterConditions }
            );
        } else {
            throw new Error('`dealWithImmutable` must be either "keep" or "delete".');
        }
    }

    async handleArrayRecords(
        model, 
        filterConditions, 
        relatedRecords
    ) {
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

    async processSingleRelation(
        relatedModelName, 
        foreignKeys, 
        models, 
        dealWithImmutable
    ) {
        const relatedModel = this.mongoD.models[relatedModelName];
        if (!relatedModel._FKS) return;

        const { filterConditions, updatePaths, isRequired, isImmutable, isArray } =
            await this.getFilterConditionsAndPaths(models, foreignKeys);

        const relatedRecords = await relatedModel.find(filterConditions);
        
        if (isArray) {
            return this.handleArrayRecords(
                relatedModel,
                filterConditions,
                relatedRecords
            );
        } else {
            return this.handleRequiredOrImmutableRecords(
                relatedModel,
                updatePaths,
                relatedRecords,
                isRequired,
                isImmutable,
                dealWithImmutable,
            );
        }
    }

    async processRelations(
        relations, 
        models, 
        dealWithImmutable
    ) {
        const promises = Object.entries(relations).map(([relatedModelName, foreignKeys]) => {
            return this.processSingleRelation(relatedModelName, foreignKeys, models, dealWithImmutable);
        });

        await Promise.all(promises);
    }

    async delete(
        conditions, 
        dealWithImmutable = "delete"
    ) {
        const relations = this.mongoD.relations[this.modelName];
        const models = await this.mongoModel.find(conditions);

        if (!models.length) return;

        await this.processRelations(relations, models, dealWithImmutable);

        await this.mongoModel.deleteMany(conditions);
    }
}
