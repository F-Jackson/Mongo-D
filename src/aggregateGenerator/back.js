export class GenerateBack {
    constructor(options, mongoD) {
        this.options = options;
        this.mongoD = mongoD;
        this.stop = false;
    }

    _fieldName(modelName) {
        return `_$_${modelName}`;
    }

    _makeAddField(modelName, addFields) {
        const newField = {
            [this._fieldName(modelName)]: {
                $mergeObjects: [
                    `$${modelName}`
                ],
            }
        }

        addFields.push(newField);
        
        return addFields[addFields.length - 1][this._fieldName(modelName)]["$mergeObjects"];
    }

    _finishMakeAddField(modelName, collectionName, addFields) {
        const newField = {
            [this._fieldName(modelName)]: `${collectionName}`
        }

        addFields.push(newField);
    }

    _makeSingle(collectionName, oldName, path) {
        return [
            {
                $lookup: {
                    from: collectionName,
                    localField: `${oldName}${oldName ? "." : ""}_id`,
                    foreignField: path.join("."),
                    as: collectionName,
                }
            },
            {
                $unwind: `$${collectionName}`
            }
        ];
    }

    _makeMulti(collectionName, oldName, values) {
        return [
            {
                $lookup: {
                    from: collectionName,
                    let: { [`${oldName}_id`]: `$${oldName}${oldName ? "." : ""}_id` },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: values.map(value => (
                                        { $eq: [ `$${value.path.join(".")}`, `$$${oldName}_id`] }
                                    )),
                                },
                            },
                        },
                    ],
                    as: collectionName,
                }
            },
            {
                $unwind: `$${collectionName}`
            }
        ]
    }

    async _aggregate(
        mongoModel, 
        projects,
        addFields,
        oldName = ""
    ) {
        const entries = [];
        const relations = this.mongoD.__relations[mongoModel.modelName];
    
        for (const [modelName, values] of Object.entries(relations)) {
            const model = this.mongoD.__models[modelName];
            if (!model && !this.stop) break;

            let entry;
            const collectionName = model.collection.name;

            if (this.options.stop.collection === collectionName) {
                if (this.options.stop.bruteForce) this.stop = true;
                break;
            }

            if (values.length === 1) {
                entry = this._makeSingle(
                    collectionName,
                    oldName,
                    values[0].path
                );
            } else {
                entry = this._makeMulti(
                    collectionName,
                    oldName,
                    values
                );
            }

            const modelRelations = this.mongoD.__relations[modelName];

            projects.add(collectionName);
            entries.push(...entry);
            if (modelRelations) {
                const toAdd = this._makeAddField(modelName, addFields);

                const modelRelationsEntries = await this._aggregate(
                    model, 
                    projects,
                    toAdd,
                    collectionName
                );

                entries.push(...modelRelationsEntries);
            } else {
                this._finishMakeAddField(modelName, collectionName, addFields);
            }
        }

        return entries;
    }

    async makeAggregate(mongoModel) {
        const projects = new Set([]);
        const addFields = [];

        const relations = await this._aggregate(
            mongoModel, 
            projects,
            addFields,
        );

        const toProjects = {
            $project: Object.fromEntries(
                Array.from(projects).map((pj) => [pj, 0])
            ),
        };

        const toAddFields = {
            "$addFields": {
                "__relatedTo__": addFields,
            }
        }

        const groupFields = [
            {
                '$group': {
                    _id: '$_id', // Agrupando por _id para remover duplicados
                    uniqueDocuments: { '$first': '$$ROOT' } // Mantendo um único documento por _id
                }
            },
            {
                '$replaceRoot': {
                    newRoot: '$uniqueDocuments' // Retornando os documentos únicos
                }
            }
        ]

        relations.push(toAddFields);
        relations.push(toProjects);
        relations.push(...groupFields);

        return relations;
    }
}