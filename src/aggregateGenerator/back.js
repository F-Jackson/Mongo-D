export class GenerateBack {
    constructor(options, mongoD, maxDepth = 100) {
        this.options = options;
        this.mongoD = mongoD;
        this.stop = false;
        this.maxDepth = maxDepth;
    }

    _generateFieldName(modelName) {
        return `_$_${modelName}`;
    }

    _createAddFieldEntry(modelName, addFields) {
        const fieldName = this._generateFieldName(modelName);
        const newField = {
            [fieldName]: {
                $mergeObjects: [`$${modelName}`],
            },
        };
        addFields.push(newField);
        return newField[fieldName]["$mergeObjects"];
    }

    _finalizeAddFieldEntry(modelName, collectionName, addFields) {
        const fieldName = this._generateFieldName(modelName);
        const newField = {
            [fieldName]: collectionName,
        };
        addFields.push(newField);
    }

    _createSingleLookup(collectionName, parentField, path) {
        const fullPath = parentField ? `${parentField}._id` : "_id";
        return [
            {
                $lookup: {
                    from: collectionName,
                    localField: fullPath,
                    foreignField: path.join("."),
                    as: collectionName,
                },
            },
            {
                $unwind: `$${collectionName}`,
            },
        ];
    }

    _createMultiLookup(collectionName, parentField, values) {
        const fullPath = parentField ? `${parentField}._id` : "_id";
        return [
            {
                $lookup: {
                    from: collectionName,
                    let: { [`${parentField}_id`]: `$${fullPath}` },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: values.map((value) => ({
                                        $eq: [`$${value.path.join(".")}`, `$$${parentField}_id`],
                                    })),
                                },
                            },
                        },
                    ],
                    as: collectionName,
                },
            },
            {
                $unwind: `$${collectionName}`,
            },
        ];
    }

    async _aggregate(model, projectedFields, addFields, parentField = "") {
        if (!this.mongoD.__relations[model.modelName]) return [];
        if (this.maxDepth-- < 0) throw new Error("Exceeded maximum depth");

        const pipeline = [];
        const relations = this.mongoD.__relations[model.modelName];

        for (const [relatedModelName, values] of Object.entries(relations)) {
            const relatedModel = this.mongoD.__models[relatedModelName];
            if (!relatedModel || this.stop) continue;

            const collectionName = relatedModel.collection.name;
            if (this._shouldStopProcessing(collectionName)) break;

            let lookupStages;
            if (values.length === 1) {
                lookupStages = this._createSingleLookup(
                    collectionName,
                    parentField,
                    values[0].path
                );
            } else {
                lookupStages = this._createMultiLookup(
                    collectionName,
                    parentField,
                    values
                );
            }

            projectedFields.add(collectionName);
            pipeline.push(...lookupStages);

            if (this.mongoD.__relations[relatedModelName]) {
                const nestedFields = this._createAddFieldEntry(relatedModelName, addFields);
                const nestedPipeline = await this._aggregate(
                    relatedModel,
                    projectedFields,
                    nestedFields,
                    collectionName
                );
                pipeline.push(...nestedPipeline);
            } else {
                this._finalizeAddFieldEntry(relatedModelName, collectionName, addFields);
            }
        }

        return pipeline;
    }

    _shouldStopProcessing(collectionName) {
        if (this.options.stop.collection === collectionName) {
            if (this.options.stop.bruteForce) this.stop = true;
            return true;
        }
        return this.stop;
    }

    async makeAggregate(model) {
        if (!model) throw new Error("A valid MongoDB model must be provided");

        const projectedFields = new Set();
        const addFields = [];

        const relationsPipeline = await this._aggregate(
            model,
            projectedFields,
            addFields
        );

        const projectionStage = {
            $project: Object.fromEntries(
                Array.from(projectedFields).map((field) => [field, 0])
            ),
        };

        const addFieldsStage = {
            $addFields: {
                __relatedTo__: addFields,
            },
        };

        const deduplicationStages = [
            {
                $group: {
                    _id: "$_id",
                    uniqueDocument: { $first: "$$ROOT" },
                },
            },
            {
                $replaceRoot: { newRoot: "$uniqueDocument" },
            },
        ];

        return [...relationsPipeline, addFieldsStage, projectionStage, ...deduplicationStages];
    }
}
