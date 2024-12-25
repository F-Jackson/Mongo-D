export class GenerateBack {
    _makeAddField(model, addFields) {
        const newField = {
            [`_$_${model.modelName}`]: {
                $mergeObjects: [
                    `$${model.collection.name}`
                ],
            }
        }

        addFields.push(newField);
        
        return addFields[addFields.length - 1][[`_$_${model.modelName}`]]["$mergeObjects"];
    }

    _finishMakeAddField(model, addFields) {
        const newField = {
            [`_$_${model.modelName}`]: `${model.collection.name}`
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
        stop,
        options,
        addFields,
        oldName = ""
    ) {
        const entries = [];
        const relations = this.mongoD.__relations[mongoModel.modelName];
    
        for (const [modelName, values] of Object.entries(relations)) {
            const model = this.mongoD.__models[modelName];
            if (!model && !stop) break;

            let entry;
            const collectionName = model.collection.name;

            if (options.stop.collection === collectionName) {
                if (options.stop.bruteForce) stop = true;
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
                const toAdd = this._makeAddField(model, addFields);

                const modelRelationsEntries = await this._aggregate(
                    model, 
                    projects, 
                    stop,
                    options,
                    toAdd,
                    collectionName
                );

                entries.push(...modelRelationsEntries);
            } else {
                this._finishMakeAddField(model, addFields);
            }
        }

        return entries;
    }

    async makeAggregate(options) {
        const projects = new Set([]);
        const stop = false;
        const addFields = [];

        const relations = await this._aggregate(
            this.mongoModel, 
            projects,
            stop,
            options,
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

        this.relationsToAggregate = relations;
    }
}